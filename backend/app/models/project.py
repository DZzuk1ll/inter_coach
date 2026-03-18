import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Project(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "projects"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255))
    source_type: Mapped[str] = mapped_column(String(20))  # "github_url" | "zip_upload"
    source_ref: Mapped[str] = mapped_column(String(500))  # GitHub URL or zip file path
    resume_text: Mapped[str] = mapped_column(Text)
    jd_text: Mapped[str] = mapped_column(Text)
    analysis_status: Mapped[str] = mapped_column(
        String(20),
        default="pending",
    )  # "pending" | "analyzing" | "completed" | "failed"
    analysis_result: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    user: Mapped["User"] = relationship(back_populates="projects")  # noqa: F821
    interview_sessions: Mapped[list["InterviewSession"]] = relationship(  # noqa: F821
        back_populates="project",
        cascade="all, delete-orphan",
    )
