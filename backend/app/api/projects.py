import asyncio
import os
import uuid

import structlog
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db_session
from app.dependencies import LLMConfig, get_anonymous_user, get_llm_config
from app.models.user import User
from app.prompts.resume_advice import RESUME_ADVICE_PROMPT
from app.schemas.common import error_response, success_response
from app.schemas.project import (
    AnalysisStatusResponse,
    ProjectListItem,
    ProjectRead,
)
from app.services.project_service import (
    create_project,
    delete_project,
    get_project,
    list_projects,
    run_analysis_task,
)
from app.services.llm_client import LLMClient
from app.services.resume_parser import extract_text_from_pdf

log = structlog.get_logger()

router = APIRouter(prefix="/projects", tags=["projects"])

ANALYSIS_STATUS_MESSAGES = {
    "pending": "等待分析...",
    "analyzing": "正在分析项目...",
    "completed": "分析完成",
    "failed": "分析失败",
}

ANALYSIS_STATUS_PROGRESS = {
    "pending": 5,
    "analyzing": 50,
    "completed": 100,
    "failed": 100,
}


@router.post("")
async def create_new_project(
    name: str = Form(...),
    source_type: str = Form(...),
    jd_text: str = Form(...),
    github_url: str = Form(None),
    zip_file: UploadFile | None = File(None),
    resume_file: UploadFile = File(...),
    user: User = Depends(get_anonymous_user),
    llm_config: LLMConfig = Depends(get_llm_config),
    db: AsyncSession = Depends(get_db_session),
):
    settings = get_settings()

    # Validate source
    if source_type == "github_url":
        if not github_url:
            raise HTTPException(status_code=400, detail="GitHub URL is required")
        source_ref = github_url
        zip_path = None
    elif source_type == "zip_upload":
        if not zip_file:
            raise HTTPException(status_code=400, detail="Zip file is required")

        # Check file size
        content = await zip_file.read()
        if len(content) > settings.app.max_zip_size_mb * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail=f"Zip file exceeds {settings.app.max_zip_size_mb}MB limit",
            )

        # Save to temp
        os.makedirs(settings.app.temp_dir, exist_ok=True)
        zip_path = os.path.join(settings.app.temp_dir, f"{uuid.uuid4()}.zip")
        with open(zip_path, "wb") as f:
            f.write(content)
        source_ref = zip_path
    else:
        raise HTTPException(status_code=400, detail="Invalid source_type")

    # Parse resume PDF
    resume_bytes = await resume_file.read()
    if not resume_bytes:
        raise HTTPException(status_code=400, detail="Resume file is empty")

    resume_text = await extract_text_from_pdf(resume_bytes)
    if not resume_text.strip():
        raise HTTPException(
            status_code=400,
            detail="Could not extract text from resume PDF",
        )

    # Create project
    project = await create_project(
        db=db,
        user_id=user.id,
        name=name,
        source_type=source_type,
        source_ref=source_ref,
        resume_text=resume_text,
        jd_text=jd_text,
    )

    # Launch background analysis
    asyncio.create_task(
        run_analysis_task(
            project_id=project.id,
            llm_config=llm_config,
            source_type=source_type,
            source_ref=source_ref,
            resume_text=resume_text,
            jd_text=jd_text,
            zip_path=zip_path if source_type == "zip_upload" else None,
        )
    )

    return success_response(ProjectRead.model_validate(project))


@router.get("")
async def list_user_projects(
    user: User = Depends(get_anonymous_user),
    db: AsyncSession = Depends(get_db_session),
):
    projects = await list_projects(db, user.id)
    return success_response(
        [ProjectListItem.model_validate(p) for p in projects]
    )


@router.get("/{project_id}")
async def get_project_detail(
    project_id: uuid.UUID,
    user: User = Depends(get_anonymous_user),
    db: AsyncSession = Depends(get_db_session),
):
    project = await get_project(db, project_id, user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return success_response(ProjectRead.model_validate(project))


@router.delete("/{project_id}")
async def delete_user_project(
    project_id: uuid.UUID,
    user: User = Depends(get_anonymous_user),
    db: AsyncSession = Depends(get_db_session),
):
    deleted = await delete_project(db, project_id, user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Project not found")
    return success_response({"message": "项目已删除"})


@router.get("/{project_id}/analysis-status")
async def get_analysis_status(
    project_id: uuid.UUID,
    user: User = Depends(get_anonymous_user),
    db: AsyncSession = Depends(get_db_session),
):
    project = await get_project(db, project_id, user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    message = ANALYSIS_STATUS_MESSAGES.get(project.analysis_status, "未知状态")
    progress = ANALYSIS_STATUS_PROGRESS.get(project.analysis_status, 0)

    # Use fine-grained step info from analysis_result if available
    if project.analysis_result:
        step_msg = project.analysis_result.get("step_message")
        step_progress = project.analysis_result.get("progress")
        if step_msg:
            message = step_msg
        if step_progress is not None:
            progress = step_progress

    # If failed, include error message
    if project.analysis_status == "failed" and project.analysis_result:
        error = project.analysis_result.get("error", "")
        if error:
            message = f"分析失败: {error}"

    return success_response(
        AnalysisStatusResponse(
            status=project.analysis_status,
            message=message,
            progress=progress,
        )
    )


@router.get("/{project_id}/resume-advice")
async def get_resume_advice(
    project_id: uuid.UUID,
    user: User = Depends(get_anonymous_user),
    llm_config: LLMConfig = Depends(get_llm_config),
    db: AsyncSession = Depends(get_db_session),
):
    project = await get_project(db, project_id, user.id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.analysis_status != "completed":
        raise HTTPException(status_code=400, detail="项目分析尚未完成")

    analysis = project.analysis_result or {}
    triangulation = analysis.get("triangulation", {})
    overview = analysis.get("overview", {})

    overview_text = (
        f"项目：{overview.get('description', project.name)}\n"
        f"技术栈：{overview.get('language', '')} / {overview.get('framework', '')}\n"
        f"架构：{overview.get('architecture', '')}"
    )

    prompt = RESUME_ADVICE_PROMPT.format(
        resume_text=project.resume_text[:3000],
        jd_text=project.jd_text[:2000],
        matches=", ".join(triangulation.get("matches", [])),
        exaggerations=", ".join(triangulation.get("exaggerations", [])),
        gaps=", ".join(triangulation.get("gaps", [])),
        highlights=", ".join(triangulation.get("highlights", [])),
        overview=overview_text,
    )

    llm_client = LLMClient(llm_config)
    advice = await llm_client.chat_json(
        [{"role": "user", "content": prompt}],
        temperature=0.5,
        max_tokens=3000,
    )

    return success_response(advice)
