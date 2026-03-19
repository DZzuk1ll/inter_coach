import json
import uuid

import structlog
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db_session
from app.dependencies import LLMConfig, get_anonymous_user, get_llm_config
from app.models.interview import InterviewSession
from app.models.message import Message
from app.models.project import Project
from app.models.user import User
from app.schemas.common import success_response
from app.schemas.interview import InterviewCreate, InterviewListItem, InterviewRead
from app.schemas.message import MessageCreate, MessageRead
from app.services.interview_engine import (
    end_interview,
    evaluate_and_decide,
    generate_response_stream,
    process_answer,
    start_interview,
)
from app.services.llm_client import LLMClient
from app.services.review_service import generate_review_report

log = structlog.get_logger()

router = APIRouter(tags=["interviews"])


@router.post("/projects/{project_id}/interviews")
async def create_interview(
    project_id: uuid.UUID,
    body: InterviewCreate | None = None,
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

    # Multi-project: load additional projects if specified
    additional_project_ids = (body.additional_project_ids if body else None) or []
    session_config: dict = {}
    if additional_project_ids:
        valid_ids = []
        for pid in additional_project_ids:
            res = await db.execute(
                select(Project).where(
                    Project.id == pid,
                    Project.user_id == user.id,
                    Project.analysis_status == "completed",
                )
            )
            if res.scalar_one_or_none():
                valid_ids.append(str(pid))
        if valid_ids:
            session_config["additional_project_ids"] = valid_ids

    llm_client = LLMClient(llm_config)
    session, first_message = await start_interview(
        db, project, user.id, llm_client, session_config=session_config or None,
    )

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


@router.post("/interviews/{interview_id}/messages/stream")
async def send_message_stream(
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

    # Step 1: Evaluate and decide (non-streaming)
    decision_result = await evaluate_and_decide(db, session, body.content, llm_client)

    async def sse_generator():
        # Send decision event
        decision_event = {
            "evaluation": decision_result["evaluation"],
            "decision": decision_result["decision"],
        }
        yield f"event: decision\ndata: {json.dumps(decision_event, ensure_ascii=False)}\n\n"

        # Step 2: Stream the response
        full_response = ""
        async for chunk in generate_response_stream(session, decision_result, llm_client):
            full_response += chunk
            yield f"data: {json.dumps({'content': chunk}, ensure_ascii=False)}\n\n"

        # Step 3: Save the complete message
        interviewer_msg = Message(
            session_id=session.id,
            role="interviewer",
            content=full_response,
            phase=session.current_phase,
            metadata_={
                "evaluation": decision_result["evaluation"],
                "decision": decision_result["decision"],
                "question_index": decision_result["question_index"],
            },
        )
        db.add(interviewer_msg)
        await db.flush()

        # Send done event with message ID
        yield f"event: done\ndata: {json.dumps({'message_id': str(interviewer_msg.id)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        sse_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/interviews/{interview_id}/end")
async def end_interview_session(
    interview_id: uuid.UUID,
    user: User = Depends(get_anonymous_user),
    llm_config: LLMConfig = Depends(get_llm_config),
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

    # Generate review report
    try:
        llm_client = LLMClient(llm_config)
        report = await generate_review_report(db, session, llm_client)
        session.config = {**(session.config or {}), "review_report": report}
        await db.flush()
    except Exception as e:
        await log.aerror("review_report_failed", error=str(e))

    await db.refresh(session, attribute_names=["updated_at"])
    return success_response(InterviewRead.model_validate(session))
