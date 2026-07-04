import enum

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Enum, func
from sqlalchemy.orm import relationship

from app.database import Base


class CommitteeDecision(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class Committee(Base):
    __tablename__ = "committees"

    id = Column(Integer, primary_key=True)
    scheduled_date = Column(DateTime(timezone=True), nullable=False)
    location = Column(String(255), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    application_links = relationship("ApplicationCommitteeLink", back_populates="committee")


class ApplicationCommitteeLink(Base):
    __tablename__ = "application_committee_links"

    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    committee_id = Column(Integer, ForeignKey("committees.id"), nullable=False)
    decision = Column(Enum(CommitteeDecision), default=CommitteeDecision.pending, nullable=False)
    decision_notes = Column(Text, nullable=True)
    decided_at = Column(DateTime(timezone=True), nullable=True)
    decided_by = Column(Integer, ForeignKey("users.id"), nullable=True)

    application = relationship("Application", back_populates="committee_links")
    committee = relationship("Committee", back_populates="application_links")
