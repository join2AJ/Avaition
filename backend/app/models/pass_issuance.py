import enum

from sqlalchemy import Column, Integer, ForeignKey, DateTime, Date, Boolean, Text, Enum, func
from sqlalchemy.orm import relationship

from app.database import Base


class SurrenderReason(str, enum.Enum):
    terminated = "terminated"
    expired = "expired"
    deceased = "deceased"
    other = "other"


class PassIssuance(Base):
    """The issued AEP itself: issue date, expiry, and — where applicable —
    surrender details. Late surrender (surrendered_at well after the
    terminated/expired/deceased event) triggers the BCAS + Entity
    notification and penalty workflow.
    """

    __tablename__ = "pass_issuances"

    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("applications.id"), unique=True, nullable=False)
    individual_id = Column(Integer, ForeignKey("individuals.id"), nullable=False)
    issued_at = Column(DateTime(timezone=True), server_default=func.now())
    expiry_date = Column(Date, nullable=False)

    surrender_reason = Column(Enum(SurrenderReason), nullable=True)
    surrender_event_date = Column(Date, nullable=True)  # date the termination/expiry/death actually occurred
    surrendered_at = Column(DateTime(timezone=True), nullable=True)  # date the pass was physically surrendered
    is_late_surrender = Column(Boolean, default=False, nullable=False)

    application = relationship("Application", back_populates="pass_issuance")
    individual = relationship("Individual")
