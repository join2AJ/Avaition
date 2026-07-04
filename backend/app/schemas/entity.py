from datetime import date, datetime

from pydantic import BaseModel

from app.models.entity import DocumentVerificationState, EntityStatus


class EntityCreate(BaseModel):
    name: str
    category_id: int
    strength: int = 0
    contract_start: date | None = None
    contract_end: date | None = None
    aop_linked: bool = False
    policy_reference: str  # mandatory: guideline clause or internal standard cited for this creation


class EntityDocumentOut(BaseModel):
    id: int
    requirement_id: int
    requirement_name: str
    clause_badge: str
    expiry_date: date | None
    verification_state: DocumentVerificationState
    is_mandatory: bool

    model_config = {"from_attributes": True}


class EntityOut(BaseModel):
    id: int
    name: str
    category_id: int
    category_name: str
    strength: int
    contract_start: date | None
    contract_end: date | None
    aop_linked: bool
    status: EntityStatus
    status_reason: str | None
    self_service_login_allowed: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class EntityStatusUpdate(BaseModel):
    status: EntityStatus
    reason: str  # mandatory written justification, per spec


class EntityDocumentUpload(BaseModel):
    file_path: str
    expiry_date: date | None = None
