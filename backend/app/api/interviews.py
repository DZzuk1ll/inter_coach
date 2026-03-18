import uuid

import structlog
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db_session
from app.dependencies import LLMConfig, get_anonymous_user, get_llm_config
from app.models.interview import InterviewSession
from app.models.project import Project
from app.models.user import User
from app.schemas.common import success_response
from app.schemas.interview import InterviewListItem, InterviewRead
from app.schemas.message import MessageCreate, MessageRead
from app.services.interview_engine import end_interview, process_answer, start_interview
from app.services.llm_client import LLMClient

log = structlog.get_logger()

router = APIRouter(tags=["interviews"])


@router.post("/projects/{project_id}/interviews")
async def create_interview(
    project_id: uuid.UUID,
    user: User = Depends(get_anonymous_user),
    llm_config: LLMConfig = Depends(get_llm_config),
    db: AsyncSession = Depends(get_db_session),
):
    # Verify project exists and is analyzed
    result = await db.execute(
        select(Project).where(
            Project.id == project_id,
            Project.user_id == user.id,
        )
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.analysis_status != "completed":
        raise HTTPException(
            status_code=400,
            detail="项目分析尚未完成，请等待分析完成后再开始面试",
        )

    llm_client = LLMClient(llm_config)
    session, first_message = await start_interview(db, project, user.id, llm_client)

    # Reload with messages
    result = await db.execute(
        select(InterviewSession)
        .options(selectinload(InterviewSession.messages))
        .where(InterviewSession.id == session.id)
    )
    session = result.scalar_one()

    return success_response(InterviewRead.model_validate(session))


@router.get("/interviews")
async def list_interviews(
    user: User = Depends(get_anonymous_user),
    db: AsyncSession = Depends(get_db_session),
):
    result = await db.execute(
        select(InterviewSession)
        .where(InterviewSession.user_id == user.id)
        .order_by(InterviewSession.created_at.desc())
    )
    sessions = result.scalars().all()

    items = []
    for s in sessions:
        # Get project name
        proj_result = await db.execute(
            select(Project.name).where(Project.id == s.project_id)
        )
        project_name = proj_result.scalar_one_or_none()

        items.append(InterviewListItem(
            id=s.id,
            project_id=s.project_id,
            status=s.status,
            current_phase=s.current_phase,
            created_at=s.created_at,
            project_name=project_name,
        ))

    return success_response(items)


@router.get("/interviews/{interview_id}")
async def get_interview(
    interview_id: uuid.UUID,
    user: User = Depends(get_anonymous_user),
    db: AsyncSession = Depends(get_db_session),
):
    result = await db.execute(
        select(InterviewSession)
        .options(selectinload(InterviewSession.messages))
        .where(
            InterviewSession.id == interview_id,
            InterviewSession.user_id == user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Interview not found")

    return success_response(InterviewRead.model_validate(session))


@router.post("/interviews/{interview_id}/messages")
async def send_message(
    interview_id: uuid.UUID,
    body: MessageCreate,
    user: User = Depends(get_anonymous_user),
    llm_config: LLMConfig = Depends(get_llm_config),
    db: AsyncSession = Depends(get_db_session),
):
    result = await db.execute(
        select(InterviewSession).where(
            InterviewSession.id == interview_id,
            InterviewSession.user_id == user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Interview not found")
    if session.status != "in_progress":
        raise HTTPException(status_code=400, detail="面试已结束")

    llm_client = LLMClient(llm_config)
    interviewer_msg = await process_answer(db, session, body.content, llm_client)

    return success_response(MessageRead.model_validate(interviewer_msg))


@router.post("/interviews/{interview_id}/end")
async def end_interview_session(
    interview_id: uuid.UUID,
    user: User = Depends(get_anonymous_user),
    db: AsyncSession = Depends(get_db_session),
):
    result = await db.execute(
        select(InterviewSession)
        .options(selectinload(InterviewSession.messages))
        .where(
            InterviewSession.id == interview_id,
            InterviewSession.user_id == user.id,
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Interview not found")

    session = await end_interview(db, session)
    return success_response(InterviewRead.model_validate(session))
