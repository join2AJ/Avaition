from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class CurrentUserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: str
    entity_id: int | None = None

    model_config = {"from_attributes": True}
