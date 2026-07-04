import enum

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    ForeignKey,
    DateTime,
    Text,
    Enum,
    func,
)
from sqlalchemy.orm import relationship

from app.database import Base


class Zone(Base):
    __tablename__ = "zones"

    id = Column(Integer, primary_key=True)
    name = Column(String(128), nullable=False)
    code = Column(String(32), unique=True, nullable=False)
    description = Column(String(255), nullable=True)
    clause_id = Column(Integer, ForeignKey("guideline_clauses.id"), nullable=True)

    clause = relationship("GuidelineClause")


class JobRoleZoneMatrix(Base):
    """Which zones a given job role justifies access to. Used to validate
    zone requests against the individual's actual need.
    """

    __tablename__ = "job_role_zone_matrix"

    id = Column(Integer, primary_key=True)
    job_role = Column(String(128), nullable=False, index=True)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=False)
    clause_id = Column(Integer, ForeignKey("guideline_clauses.id"), nullable=True)

    zone = relationship("Zone")
    clause = relationship("GuidelineClause")


class EntityZoneEntitlement(Base):
    """Zones an entity is permitted to request for its personnel, set by
    Admin at onboarding and at every contract renewal.
    """

    __tablename__ = "entity_zone_entitlements"

    id = Column(Integer, primary_key=True)
    entity_id = Column(Integer, ForeignKey("entities.id"), nullable=False)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=False)
    granted_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    granted_at = Column(DateTime(timezone=True), server_default=func.now())
    contract_cycle_start = Column(DateTime(timezone=True), nullable=True)

    entity = relationship("Entity", back_populates="zone_entitlements")
    zone = relationship("Zone")


class ZoneAssignmentStatus(str, enum.Enum):
    active = "active"
    revoked = "revoked"


class ZoneAssignment(Base):
    """Full historical record of zone assignments for an individual. A row
    is never deleted or overwritten on change — it is revoked, and a new
    row is created — so the complete history persists.
    """

    __tablename__ = "zone_assignments"

    id = Column(Integer, primary_key=True)
    individual_id = Column(Integer, ForeignKey("individuals.id"), nullable=False)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=False)
    assigned_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    assigned_at = Column(DateTime(timezone=True), server_default=func.now())
    revoked_at = Column(DateTime(timezone=True), nullable=True)
    revoked_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(Enum(ZoneAssignmentStatus), default=ZoneAssignmentStatus.active, nullable=False)
    escalation_id = Column(Integer, ForeignKey("zone_escalations.id"), nullable=True)

    individual = relationship("Individual", back_populates="zone_assignments")
    zone = relationship("Zone")


class ZoneEscalationStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class ZoneEscalation(Base):
    """Created when a requested zone exceeds the entity's contract scope OR
    the individual's job-role need. Submission is hard-blocked until both a
    letterhead PDF and typed justification are attached; routed to BCAS /
    committee review flagged as an escalated zone request.
    """

    __tablename__ = "zone_escalations"

    id = Column(Integer, primary_key=True)
    individual_id = Column(Integer, ForeignKey("individuals.id"), nullable=False)
    zone_id = Column(Integer, ForeignKey("zones.id"), nullable=False)
    justification_text = Column(Text, nullable=False)
    letterhead_path = Column(String(512), nullable=False)
    exceeds_contract = Column(Boolean, default=False, nullable=False)
    exceeds_job_role = Column(Boolean, default=False, nullable=False)
    status = Column(Enum(ZoneEscalationStatus), default=ZoneEscalationStatus.pending, nullable=False)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    review_notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    individual = relationship("Individual", back_populates="zone_escalations")
    zone = relationship("Zone")
