import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel

from app.schemas.message import MessageRead


class InterviewCreate(BaseModel):
    config: dict[str, Any] | None = None


class InterviewRead(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    user_id: uuid.UUID
    status: str
    current_phase: int
    config: dict[str, Any] | None = None
    messages: list[MessageRead] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class InterviewListItem(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    status: str
    current_phase: int
    created_at: datetime
    project_name: str | None = None

    model_config = {"from_attributes": True}
