import asyncio
import os
import uuid

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import async_session_factory
from app.dependencies import LLMConfig
from app.models.project import Project
from app.services.analysis_engine import run_analysis
from app.services.llm_client import LLMClient
from app.services.repo_reader import read_github, read_zip
from app.services.resume_parser import parse_resume
from app.utils.cleanup import cleanup_temp_dir, cleanup_temp_file

log = structlog.get_logger()


async def create_project(
    db: AsyncSession,
    user_id: uuid.UUID,
    name: str,
    source_type: str,
    source_ref: str,
    resume_text: str,
    jd_text: str,
) -> Project:
    project = Project(
        user_id=user_id,
        name=name,
        source_type=source_type,
        source_ref=source_ref,
        resume_text=resume_text,
        jd_text=jd_text,
        analysis_status="pending",
    )
    db.add(project)
    await db.flush()
    return project


async def get_project(
    db: AsyncSession,
    project_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Project | None:
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.user_id == user_id,
        )
    )
    return result.scalar_one_or_none()


async def list_projects(
    db: AsyncSession,
    user_id: uuid.UUID,
) -> list[Project]:
    result = await db.execute(
        select(Project)
        .where(Project.user_id == user_id)
        .order_by(Project.created_at.desc())
    )
    return list(result.scalars().all())


async def delete_project(
    db: AsyncSession,
    project_id: uuid.UUID,
    user_id: uuid.UUID,
) -> bool:
    project = await get_project(db, project_id, user_id)
    if project is None:
        return False
    await db.delete(project)
    await db.flush()
    return True


async def _update_step(
    project_id: uuid.UUID,
    step_message: str,
    progress: int,
) -> None:
    """Update the analysis step message and progress percentage."""
    async with async_session_factory() as db:
        result = await db.execute(
            select(Project).where(Project.id == project_id)
        )
        project = result.scalar_one()
        project.analysis_result = {
            **(project.analysis_result or {}),
            "step_message": step_message,
            "progress": progress,
        }
        await db.commit()


async def run_analysis_task(
    project_id: uuid.UUID,
    llm_config: LLMConfig,
    source_type: str,
    source_ref: str,
    resume_text: str,
    jd_text: str,
    zip_path: str | None = None,
) -> None:
    """Background task: run full analysis pipeline."""
    settings = get_settings()
    llm_client = LLMClient(llm_config)
    temp_dirs: list[str] = []

    try:
        # Update status to analyzing
        async with async_session_factory() as db:
            result = await db.execute(
                select(Project).where(Project.id == project_id)
            )
            project = result.scalar_one()
            project.analysis_status = "analyzing"
            project.analysis_result = {"step_message": "正在读取代码仓库...", "progress": 10}
            await db.commit()

        await log.ainfo("analysis_task_start", project_id=str(project_id))

        # Step 1: Read repository
        if source_type == "github_url":
            repo_content = await read_github(source_ref)
        else:
            repo_content = await read_zip(source_ref)

        await _update_step(project_id, "正在解析简历...", 30)

        # Step 2: Parse resume
        resume_profile = await parse_resume(resume_text, llm_client)

        await _update_step(project_id, "正在分析代码结构...", 50)

        # Step 3: Run analysis
        analysis_result = await run_analysis(
            repo=repo_content,
            resume_text=resume_text,
            resume_profile=resume_profile,
            jd_text=jd_text,
            llm_client=llm_client,
        )

        await _update_step(project_id, "正在生成面试题目...", 85)

        # Step 4: Save result
        async with async_session_factory() as db:
            result = await db.execute(
                select(Project).where(Project.id == project_id)
            )
            project = result.scalar_one()
            analysis_result["step_message"] = "分析完成"
            analysis_result["progress"] = 100
            project.analysis_result = analysis_result
            project.analysis_status = "completed"
            await db.commit()

        await log.ainfo("analysis_task_complete", project_id=str(project_id))

    except Exception as e:
        await log.aerror(
            "analysis_task_failed",
            project_id=str(project_id),
            error=str(e),
        )
        try:
            async with async_session_factory() as db:
                result = await db.execute(
                    select(Project).where(Project.id == project_id)
                )
                project = result.scalar_one()
                project.analysis_status = "failed"
                project.analysis_result = {"error": str(e)}
                await db.commit()
        except Exception:
            pass

    finally:
        # Cleanup temp files
        if zip_path:
            await cleanup_temp_file(zip_path)
        for d in temp_dirs:
            await cleanup_temp_dir(d)
