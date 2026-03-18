from sqlalchemy.orm import Mapped, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"

    projects: Mapped[list["Project"]] = relationship(  # noqa: F821
        back_populates="user",
        cascade="all, delete-orphan",
    )
    interview_sessions: Mapped[list["InterviewSession"]] = relationship(  # noqa: F821
        back_populates="user",
        cascade="all, delete-orphan",
    )
