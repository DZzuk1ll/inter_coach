import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class ProjectCreate(BaseModel):
    name: str
    source_type: str  # "github_url" | "zip_upload"
    github_url: str | None = None
    jd_text: str


class ProjectRead(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    source_type: str
    source_ref: str
    resume_text: str
    jd_text: str
    analysis_status: str
    analysis_result: dict[str, Any] | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectListItem(BaseModel):
    id: uuid.UUID
    name: str
    source_type: str
    analysis_status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AnalysisStatusResponse(BaseModel):
    status: str
    message: str
