import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.interview import InterviewSession
from app.models.message import Message
from app.models.project import Project
from app.prompts.review_report import REVIEW_REPORT_PROMPT
from app.services.llm_client import LLMClient

log = structlog.get_logger()


async def generate_review_report(
    db: AsyncSession,
    session: InterviewSession,
    llm_client: LLMClient,
) -> dict:
    """Generate a review report for a completed interview session."""
    from sqlalchemy import select

    # Load project analysis
    project_result = await db.execute(
        select(Project).where(Project.id == session.project_id)
    )
    project = project_result.scalar_one()
    analysis = project.analysis_result or {}

    # Build analysis summary
    overview = analysis.get("overview", {})
    triangulation = analysis.get("triangulation", {})
    analysis_summary = (
        f"项目：{overview.get('description', project.name)}\n"
        f"技术栈：{overview.get('language', '')} / {overview.get('framework', '')}\n"
        f"架构：{overview.get('architecture', '')}\n"
        f"匹配项：{', '.join(triangulation.get('matches', []))}\n"
        f"存疑点：{', '.join(triangulation.get('exaggerations', []))}\n"
        f"空白：{', '.join(triangulation.get('gaps', []))}"
    )

    # Build conversation history
    msg_result = await db.execute(
        select(Message)
        .where(Message.session_id == session.id)
        .order_by(Message.created_at)
    )
    messages = list(msg_result.scalars().all())

    conversation_lines = []
    for msg in messages:
        role_label = "面试官" if msg.role == "interviewer" else "候选人"
        phase_label = f"[Phase {msg.phase}]"
        conversation_lines.append(f"{phase_label} {role_label}：{msg.content}")

    conversation_history = "\n\n".join(conversation_lines)

    # Generate report via LLM
    prompt = REVIEW_REPORT_PROMPT.format(
        analysis_summary=analysis_summary,
        conversation_history=conversation_history,
    )

    report = await llm_client.chat_json(
        [{"role": "user", "content": prompt}],
        temperature=0.5,
        max_tokens=2000,
    )

    await log.ainfo(
        "review_report_generated",
        session_id=str(session.id),
        overall_score=report.get("overall_score"),
    )

    return report
