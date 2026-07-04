import enum

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Numeric, Text, Enum, func
from sqlalchemy.orm import relationship

from app.database import Base


class PenaltyStatus(str, enum.Enum):
    open = "open"
    resolved = "resolved"


class Penalty(Base):
    """Raised only by BCAS, and only with a mandatory written justification,
    typically in response to a late surrender or other non-compliance.
    """

    __tablename__ = "penalties"

    id = Column(Integer, primary_key=True)
    entity_id = Column(Integer, ForeignKey("entities.id"), nullable=False)
    pass_issuance_id = Column(Integer, ForeignKey("pass_issuances.id"), nullable=True)
    raised_by = Column(Integer, ForeignKey("users.id"), nullable=False)  # BCAS user
    justification = Column(Text, nullable=False)
    amount = Column(Numeric(12, 2), nullable=True)
    status = Column(Enum(PenaltyStatus), default=PenaltyStatus.open, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    entity = relationship("Entity")
    pass_issuance = relationship("PassIssuance")
    justifications = relationship("EntityJustification", back_populates="penalty")


class EntityJustification(Base):
    """The entity's written response to a late surrender or suspension,
    submitted through the portal. May be linked to a Penalty once BCAS
    reviews it.
    """

    __tablename__ = "entity_justifications"

    id = Column(Integer, primary_key=True)
    entity_id = Column(Integer, ForeignKey("entities.id"), nullable=False)
    pass_issuance_id = Column(Integer, ForeignKey("pass_issuances.id"), nullable=True)
    penalty_id = Column(Integer, ForeignKey("penalties.id"), nullable=True)
    justification_text = Column(Text, nullable=False)
    submitted_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())

    entity = relationship("Entity")
    pass_issuance = relationship("PassIssuance")
    penalty = relationship("Penalty", back_populates="justifications")
