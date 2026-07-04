from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON, func
from sqlalchemy.orm import relationship

from app.database import Base


class AuditLog(Base):
    """Append-only. Never updated or deleted after insert."""

    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    action = Column(String(64), nullable=False)  # e.g. create, update, suspend, schedule_committee
    object_type = Column(String(64), nullable=False)
    object_id = Column(Integer, nullable=True)
    before_json = Column(JSON, nullable=True)
    after_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    actor = relationship("User")
