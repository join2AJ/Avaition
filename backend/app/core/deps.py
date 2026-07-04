from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.database import get_db
from app.models.role_permission import Permission, VerticalEnum
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    payload = decode_access_token(token)
    if payload is None or "sub" not in payload:
        raise CREDENTIALS_EXCEPTION
    user = db.query(User).filter(User.id == int(payload["sub"])).first()
    if user is None or not user.is_active:
        raise CREDENTIALS_EXCEPTION
    return user


def get_current_active_user(user: User = Depends(get_current_user)) -> User:
    return user


class RequirePermission:
    """RBAC dependency: enforces a per-vertical CRUD flag on the caller's
    role. Used as a route dependency, e.g.:

        @router.post("/entities", dependencies=[Depends(RequirePermission(VerticalEnum.entities, "create"))])
    """

    def __init__(self, vertical: VerticalEnum, operation: str):
        if operation not in ("create", "read", "update", "delete"):
            raise ValueError(f"Invalid operation: {operation}")
        self.vertical = vertical
        self.operation = operation

    def __call__(self, db: Session = Depends(get_db), user: User = Depends(get_current_user)) -> User:
        permission = (
            db.query(Permission)
            .filter(Permission.role_id == user.role_id, Permission.vertical == self.vertical)
            .first()
        )
        allowed = permission is not None and getattr(permission, f"can_{self.operation}", False)
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.role.name}' lacks '{self.operation}' permission on '{self.vertical.value}'",
            )
        return user
