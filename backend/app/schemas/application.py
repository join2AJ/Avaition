from datetime import datetime

from pydantic import BaseModel

from app.models.application import ApplicationStatus


class ApplicationCreate(BaseModel):
    entity_id: int
    individual_id: int


class ChecklistItemStatusOut(BaseModel):
    id: int
    template_id: int
    name: str
    clause_badge: str
    is_mandatory: bool
    file_path: str | None
    uploaded: bool
    verified: bool

    model_config = {"from_attributes": True}


class ChecklistOut(BaseModel):
    id: int
    is_complete: bool
    items: list[ChecklistItemStatusOut]


class ApplicationOut(BaseModel):
    id: int
    entity_id: int
    individual_id: int
    status: ApplicationStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ApplicationDetailOut(ApplicationOut):
    checklist: ChecklistOut | None = None


class ChecklistItemUpload(BaseModel):
    file_path: str


class ChecklistItemVerify(BaseModel):
    verified: bool


class ApplicationCommentCreate(BaseModel):
    comment: str


class ApplicationCommentOut(BaseModel):
    id: int
    author_id: int
    comment: str
    created_at: datetime

    model_config = {"from_attributes": True}
