from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Text, func
from sqlalchemy.orm import relationship

from app.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    entity_id = Column(Integer, ForeignKey("entities.id"), nullable=True)
    type = Column(String(64), nullable=False)  # e.g. expiry_reminder, late_surrender, clarification_requested
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
    entity = relationship("Entity")
