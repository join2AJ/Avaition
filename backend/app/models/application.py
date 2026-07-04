import enum

from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Enum, func
from sqlalchemy.orm import relationship

from app.database import Base


class ApplicationStatus(str, enum.Enum):
    draft = "draft"
    checklist_pending = "checklist_pending"
    clarification = "clarification"
    committee_scheduled = "committee_scheduled"
    approved = "approved"
    rejected = "rejected"
    issued = "issued"
    surrendered = "surrendered"


class Application(Base):
    __tablename__ = "applications"

    id = Column(Integer, primary_key=True)
    entity_id = Column(Integer, ForeignKey("entities.id"), nullable=False)
    individual_id = Column(Integer, ForeignKey("individuals.id"), nullable=False)
    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.draft, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    entity = relationship("Entity", back_populates="applications")
    individual = relationship("Individual", back_populates="applications")
    checklist = relationship("Checklist", back_populates="application", uselist=False, cascade="all, delete-orphan")
    comments = relationship("ApplicationComment", back_populates="application", cascade="all, delete-orphan")
    committee_links = relationship("ApplicationCommitteeLink", back_populates="application")
    pass_issuance = relationship("PassIssuance", back_populates="application", uselist=False)


class ApplicationComment(Base):
    """Clarification-loop comment thread. An application in the
    'clarification' state gets a dedicated queue + re-submission flow built
    on top of this thread.
    """

    __tablename__ = "application_comments"

    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("applications.id"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    comment = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    application = relationship("Application", back_populates="comments")
