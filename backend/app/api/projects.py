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
from app.services.resume_parser import extract_text_from_pdf

log = structlog.get_logger()

router = APIRouter(prefix="/projects", tags=["projects"])

ANALYSIS_STATUS_MESSAGES = {
    "pending": "等待分析...",
    "analyzing": "正在分析项目...",
    "completed": "分析完成",
    "failed": "分析失败",
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

    # If failed, include error message
    if project.analysis_status == "failed" and project.analysis_result:
        error = project.analysis_result.get("error", "")
        if error:
            message = f"分析失败: {error}"

    return success_response(
        AnalysisStatusResponse(
            status=project.analysis_status,
            message=message,
        )
    )
