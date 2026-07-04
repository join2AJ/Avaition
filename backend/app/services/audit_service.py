from typing import Any

from sqlalchemy.orm import Session

from app.models.audit import AuditLog


def record_audit(
    db: Session,
    actor_id: int | None,
    action: str,
    object_type: str,
    object_id: int | None,
    before: dict[str, Any] | None = None,
    after: dict[str, Any] | None = None,
) -> AuditLog:
    entry = AuditLog(
        actor_id=actor_id,
        action=action,
        object_type=object_type,
        object_id=object_id,
        before_json=before,
        after_json=after,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
