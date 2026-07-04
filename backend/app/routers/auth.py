from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.security import create_access_token, verify_password
from app.database import get_db
from app.models.user import User
from app.schemas.auth import CurrentUserResponse, LoginRequest, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")
    token = create_access_token(subject=str(user.id), extra_claims={"role": user.role.name})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=CurrentUserResponse)
def me(user: User = Depends(get_current_user)):
    return CurrentUserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role.name,
        entity_id=user.entity_id,
    )
