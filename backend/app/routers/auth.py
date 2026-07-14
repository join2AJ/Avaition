import threading
import time

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.database import get_db
from app.models.user import User
from app.schemas.auth import CurrentUserResponse, LoginRequest, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])

# --- Brute-force throttle -------------------------------------------------
# In-memory sliding-window limiter keyed by client IP + email. Sufficient for a
# single process; front it with a shared store (Redis) for multi-instance.
_MAX_FAILURES = 8
_WINDOW_SECONDS = 300
_LOCKOUT_SECONDS = 300
_failures: dict[str, list[float]] = {}
_lock = threading.Lock()

# A valid bcrypt hash to verify against when the account does not exist, so the
# response takes the same time whether or not the email is registered (kills the
# timing side-channel used to enumerate valid users).
_DUMMY_HASH = hash_password("timing-equalizer-not-a-real-password")


def _throttle_key(request: Request, email: str) -> str:
    ip = request.client.host if request.client else "unknown"
    return f"{ip}|{email.lower()}"


def _check_rate_limit(key: str) -> None:
    now = time.time()
    with _lock:
        hits = [t for t in _failures.get(key, []) if now - t < _WINDOW_SECONDS]
        _failures[key] = hits
        if len(hits) >= _MAX_FAILURES:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many failed attempts. Try again later.",
                headers={"Retry-After": str(_LOCKOUT_SECONDS)},
            )


def _record_failure(key: str) -> None:
    with _lock:
        _failures.setdefault(key, []).append(time.time())


def _clear(key: str) -> None:
    with _lock:
        _failures.pop(key, None)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    key = _throttle_key(request, payload.email)
    _check_rate_limit(key)

    user = db.query(User).filter(User.email == payload.email).first()
    # Always run a verification (dummy hash when the user is missing) so timing
    # is constant regardless of whether the email exists.
    ok = verify_password(payload.password, user.hashed_password if user else _DUMMY_HASH)

    if user is None or not ok:
        _record_failure(key)
        # Uniform message — never reveal whether the email or password was wrong.
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    if not user.is_active:
        _record_failure(key)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")

    _clear(key)
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
