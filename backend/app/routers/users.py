from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.security import hash_password
from app.database import get_db
from app.models.entity import Entity
from app.models.role_permission import Role
from app.models.user import User
from app.schemas.user import UserCreate, UserOut
from app.services.audit_service import record_audit

router = APIRouter(prefix="/api/users", tags=["users"])


def _require_admin(user: User = Depends(get_current_user)) -> User:
    # User/login provisioning is an Admin super-user capability, not a
    # per-vertical CRUD operation, so it is gated on the role directly
    # rather than through RequirePermission.
    if user.role.name != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only Admin can manage user logins")
    return user


def _to_user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role_name=user.role.name,
        entity_id=user.entity_id,
        is_active=user.is_active,
        created_at=user.created_at,
    )


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(get_db), admin: User = Depends(_require_admin)):
    role = db.query(Role).filter(Role.name == payload.role_name).first()
    if role is None:
        raise HTTPException(status_code=404, detail="Role not found")

    if db.query(User).filter(User.email == payload.email).first() is not None:
        raise HTTPException(status_code=400, detail="A user with this email already exists")

    entity = None
    if role.name == "entity":
        if payload.entity_id is None:
            raise HTTPException(status_code=400, detail="entity_id is required for Entity-role logins")
        entity = db.query(Entity).filter(Entity.id == payload.entity_id).first()
        if entity is None:
            raise HTTPException(status_code=404, detail="Entity not found")
        if not entity.self_service_login_allowed:
            # AVSEC Order 02/2022 — Clause TBD: self-service Entity login is
            # granted only above the 15-personnel threshold; below it, Pass
            # Section Staff must create individuals on the entity's behalf.
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Entity '{entity.name}' has {entity.strength} personnel (<= 15); "
                    "self-service login cannot be provisioned. Pass Section Staff must "
                    "create individual applications on this entity's behalf instead."
                ),
            )
    elif payload.entity_id is not None:
        raise HTTPException(status_code=400, detail="entity_id may only be set for Entity-role logins")

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role_id=role.id,
        entity_id=entity.id if entity else None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    record_audit(
        db,
        actor_id=admin.id,
        action="create",
        object_type="User",
        object_id=user.id,
        after={"email": user.email, "role": role.name, "entity_id": user.entity_id},
    )
    return _to_user_out(user)


@router.get("", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), admin: User = Depends(_require_admin)):
    return [_to_user_out(u) for u in db.query(User).all()]
