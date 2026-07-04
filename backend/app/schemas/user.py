from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role_name: str
    entity_id: int | None = None


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role_name: str
    entity_id: int | None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
