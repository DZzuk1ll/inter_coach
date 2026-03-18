import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class MessageCreate(BaseModel):
    content: str


class MessageRead(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    role: str
    content: str
    phase: int
    metadata_: dict[str, Any] | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
