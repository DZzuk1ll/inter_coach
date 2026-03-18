import json
import uuid

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.interview import InterviewSession
from app.models.message import Message
from app.models.project import Project
from app.prompts.followup import INTERVIEW_CONTEXT_TEMPLATE, START_INTERVIEW_PROMPT
from app.prompts.interview_phases import (
    FOLLOWUP_DECISION_PROMPT,
    INTERVIEWER_SYSTEM_PROMPT,
    PHASE_CONFIGS,
)
from app.services.knowledge_service import search_for_evaluation, search_for_questioning
from app.services.llm_client import LLMClient

log = structlog.get_logger()


def _get_questions_for_phase(question_pool: list[dict], phase: int) -> list[dict]:
    return [q for q in question_pool if q.get("phase") == phase]


def _get_current_question_index(messages: list[Message], phase: int) -> int:
    """Count how many interviewer questions have been asked in the current phase."""
    count = 0
    for msg in messages:
        if msg.role == "interviewer" and msg.phase == phase:
            count += 1
    # Subtract 1 because the first message is the opening, not a counted question
    return max(0, count - 1)


def _count_followups(messages: list[Message], phase: int) -> int:
    """Count consecutive followups for the current question."""
    count = 0
    for msg in reversed(messages):
        if msg.role == "interviewer" and msg.phase == phase:
            count += 1
        elif msg.role == "candidate":
            continue
        else:
            break
    return max(0, count - 1)


async def start_interview(
    db: AsyncSession,
    project: Project,
    user_id: uuid.UUID,
    llm_client: LLMClient,
) -> tuple[InterviewSession, Message]:
    """Start a new interview session and generate the opening message."""

    analysis = project.analysis_result or {}
    question_pool = analysis.get("question_pool", [])
    overview = analysis.get("overview", {})

    # Create session
    session = InterviewSession(
        project_id=project.id,
        user_id=user_id,
        status="in_progress",
        current_phase=1,
    )
    db.add(session)
    await db.flush()

    # Get Phase 1 questions
    phase1_questions = _get_questions_for_phase(question_pool, 1)
    first_question = phase1_questions[0] if phase1_questions else {
        "question": "请介绍一下你的这个项目，它的背景和目标是什么？",
        "intent": "验证项目整体理解",
        "expected_points": ["项目背景", "技术栈", "个人角色"],
    }

    # Get methodology guidance
    methodology_docs = await search_for_questioning(1, overview.get("description", ""))
    methodology = "\n".join(methodology_docs) if methodology_docs else ""

    # Build prompt
    overview_text = f"项目：{overview.get('description', project.name)}\n"
    overview_text += f"技术栈：{overview.get('language', '')} / {overview.get('framework', '')}\n"
    overview_text += f"架构：{overview.get('architecture', '')}"

    prompt = START_INTERVIEW_PROMPT.format(
        project_overview=overview_text,
        first_question=first_question.get("question", ""),
    )

    system_prompt = INTERVIEWER_SYSTEM_PROMPT.format(
        phase_name=PHASE_CONFIGS[1]["name"],
        phase_guidance=PHASE_CONFIGS[1]["guidance"],
        methodology=methodology,
    )

    # Generate opening
    response_text = await llm_client.chat(
        [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        temperature=0.7,
    )

    # Save message
    message = Message(
        session_id=session.id,
        role="interviewer",
        content=response_text,
        phase=1,
        metadata_={"question_index": 0, "question_data": first_question},
    )
    db.add(message)
    await db.flush()

    await log.ainfo(
        "interview_started",
        session_id=str(session.id),
        project_id=str(project.id),
    )

    return session, message


async def process_answer(
    db: AsyncSession,
    session: InterviewSession,
    candidate_content: str,
    llm_client: LLMClient,
) -> Message:
    """Process a candidate's answer and generate the interviewer's response."""

    project_result = await db.execute(
        select(Project).where(Project.id == session.project_id)
    )
    project = project_result.scalar_one()
    analysis = project.analysis_result or {}
    question_pool = analysis.get("question_pool", [])
    overview = analysis.get("overview", {})
    code_context = analysis.get("code_context", {})

    # Load message history
    msg_result = await db.execute(
        select(Message)
        .where(Message.session_id == session.id)
        .order_by(Message.created_at)
    )
    history_messages = list(msg_result.scalars().all())

    # Save candidate message
    candidate_msg = Message(
        session_id=session.id,
        role="candidate",
        content=candidate_content,
        phase=session.current_phase,
    )
    db.add(candidate_msg)
    await db.flush()
    history_messages.append(candidate_msg)

    # Current phase info
    current_phase = session.current_phase
    phase_questions = _get_questions_for_phase(question_pool, current_phase)
    question_idx = _get_current_question_index(history_messages, current_phase)
    followup_count = _count_followups(history_messages, current_phase)

    current_q = (
        phase_questions[min(question_idx, len(phase_questions) - 1)]
        if phase_questions
        else {}
    )

    # Get methodology guidance
    methodology_docs = await search_for_questioning(
        current_phase,
        current_q.get("question", ""),
    )
    eval_docs = await search_for_evaluation(candidate_content[:200])
    methodology = "\n".join(methodology_docs + eval_docs)

    # Build context
    relevant_code = ""
    code_ref = current_q.get("code_reference", {})
    if code_ref and code_ref.get("file"):
        file_path = code_ref["file"]
        if file_path in code_context:
            relevant_code = f"```\n# {file_path}\n{code_context[file_path][:1000]}\n```"
        elif code_ref.get("snippet"):
            relevant_code = f"```\n{code_ref['snippet']}\n```"

    context = INTERVIEW_CONTEXT_TEMPLATE.format(
        overview=overview.get("description", ""),
        current_question=current_q.get("question", ""),
        question_intent=current_q.get("intent", ""),
        expected_points=", ".join(current_q.get("expected_points", [])),
        code_context=relevant_code,
        followup_angles=", ".join(current_q.get("followup_angles", [])),
    )

    # Build system prompt
    phase_config = PHASE_CONFIGS.get(current_phase, PHASE_CONFIGS[1])
    system_prompt = INTERVIEWER_SYSTEM_PROMPT.format(
        phase_name=phase_config["name"],
        phase_guidance=phase_config["guidance"],
        methodology=methodology,
    )

    # Build decision prompt
    all_phases_done = current_phase >= 4 and question_idx >= len(phase_questions) - 1
    decision_prompt = FOLLOWUP_DECISION_PROMPT.format(followup_count=followup_count)

    # Build chat messages
    chat_messages = [{"role": "system", "content": system_prompt}]
    chat_messages.append({"role": "user", "content": f"面试上下文：\n{context}"})

    # Add conversation history (last 10 messages)
    for msg in history_messages[-10:]:
        role = "assistant" if msg.role == "interviewer" else "user"
        chat_messages.append({"role": role, "content": msg.content})

    chat_messages.append({
        "role": "user",
        "content": decision_prompt,
    })

    # Get LLM decision
    decision_data = await llm_client.chat_json(
        chat_messages,
        temperature=0.6,
        max_tokens=2000,
    )

    evaluation = decision_data.get("evaluation", "含糊")
    decision = decision_data.get("decision", "followup")
    response_text = decision_data.get("response", "")
    new_phase = decision_data.get("new_phase")

    # Handle phase transition
    if decision == "next_phase" and new_phase and new_phase <= 4:
        session.current_phase = new_phase
    elif decision == "end_interview":
        session.status = "completed"
    elif decision == "next_question":
        pass  # Same phase, next question
    elif decision == "hint_and_move":
        pass  # Give hint, then next question

    await db.flush()

    # Save interviewer message
    interviewer_msg = Message(
        session_id=session.id,
        role="interviewer",
        content=response_text,
        phase=session.current_phase,
        metadata_={
            "evaluation": evaluation,
            "decision": decision,
            "question_index": question_idx,
        },
    )
    db.add(interviewer_msg)
    await db.flush()

    await log.ainfo(
        "answer_processed",
        session_id=str(session.id),
        phase=session.current_phase,
        evaluation=evaluation,
        decision=decision,
    )

    return interviewer_msg


async def end_interview(
    db: AsyncSession,
    session: InterviewSession,
) -> InterviewSession:
    session.status = "completed"
    await db.flush()
    await log.ainfo("interview_ended", session_id=str(session.id))
    return session
