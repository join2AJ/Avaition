from datetime import datetime

from pydantic import BaseModel


class IndividualCreate(BaseModel):
    entity_id: int
    full_name: str
    job_role: str
    id_proof_number: str | None = None


class IndividualOut(BaseModel):
    id: int
    entity_id: int
    full_name: str
    job_role: str
    id_proof_number: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
