import enum

from sqlalchemy import (
    Column,
    Integer,
    String,
    Boolean,
    ForeignKey,
    DateTime,
    Date,
    Text,
    Enum,
    func,
)
from sqlalchemy.orm import relationship

from app.database import Base


class EntityStatus(str, enum.Enum):
    active = "active"
    suspended = "suspended"
    archived = "archived"


class DocumentVerificationState(str, enum.Enum):
    pending = "pending"
    uploaded = "uploaded"
    verified = "verified"
    rejected = "rejected"


class EntityCategory(Base):
    """Admin-configurable category (e.g. Ground Handler, Caterer, Government
    Agency). Drives which document requirements + checklist items apply.
    """

    __tablename__ = "entity_categories"

    id = Column(Integer, primary_key=True)
    name = Column(String(128), unique=True, nullable=False)
    description = Column(String(255), nullable=True)

    document_requirements = relationship("EntityDocumentRequirement", back_populates="category")
    checklist_items = relationship("ChecklistItemTemplate", back_populates="category")
    entities = relationship("Entity", back_populates="category")


class Entity(Base):
    __tablename__ = "entities"

    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    category_id = Column(Integer, ForeignKey("entity_categories.id"), nullable=False)
    strength = Column(Integer, nullable=False, default=0)  # personnel count; >15 unlocks self-service login
    contract_start = Column(Date, nullable=True)
    contract_end = Column(Date, nullable=True)
    aop_linked = Column(Boolean, default=False, nullable=False)
    status = Column(Enum(EntityStatus), default=EntityStatus.active, nullable=False)
    status_reason = Column(Text, nullable=True)
    status_changed_at = Column(DateTime(timezone=True), nullable=True)
    status_changed_by = Column(
        Integer, ForeignKey("users.id", use_alter=True, name="fk_entities_status_changed_by_users"), nullable=True
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    category = relationship("EntityCategory", back_populates="entities")
    users = relationship("User", back_populates="entity", foreign_keys="User.entity_id")
    documents = relationship("EntityDocument", back_populates="entity")
    individuals = relationship("Individual", back_populates="entity")
    applications = relationship("Application", back_populates="entity")
    zone_entitlements = relationship("EntityZoneEntitlement", back_populates="entity")
    material_items = relationship("MaterialItem", back_populates="entity")
    vehicles = relationship("Vehicle", back_populates="entity")

    @property
    def self_service_login_allowed(self) -> bool:
        """AVSEC Order 02/2022 — Clause TBD: entities with >15 personnel may
        onboard their own Entity-role login; below that, Pass Section staff
        creates individuals on the entity's behalf.
        """
        return self.strength > 15


class EntityDocumentRequirement(Base):
    """Template row: for a given category, which document is mandatory and
    under which clause. Admin-configurable, seeded from the guideline.
    """

    __tablename__ = "entity_document_requirements"

    id = Column(Integer, primary_key=True)
    category_id = Column(Integer, ForeignKey("entity_categories.id"), nullable=False)
    name = Column(String(255), nullable=False)  # e.g. "Security Programme", "NCASP Compliance", "AOP Linkage"
    clause_id = Column(Integer, ForeignKey("guideline_clauses.id"), nullable=False)
    is_mandatory = Column(Boolean, default=True, nullable=False)
    requires_expiry = Column(Boolean, default=True, nullable=False)

    category = relationship("EntityCategory", back_populates="document_requirements")
    clause = relationship("GuidelineClause")
    documents = relationship("EntityDocument", back_populates="requirement")


class EntityDocument(Base):
    """Actual uploaded/tracked document instance for an entity, satisfying
    an EntityDocumentRequirement (Security Programme, Security Clearance,
    Contract, NCASP, AOP linkage, etc.)
    """

    __tablename__ = "entity_documents"

    id = Column(Integer, primary_key=True)
    entity_id = Column(Integer, ForeignKey("entities.id"), nullable=False)
    requirement_id = Column(Integer, ForeignKey("entity_document_requirements.id"), nullable=False)
    file_path = Column(String(512), nullable=True)
    expiry_date = Column(Date, nullable=True)
    verification_state = Column(
        Enum(DocumentVerificationState), default=DocumentVerificationState.pending, nullable=False
    )
    uploaded_at = Column(DateTime(timezone=True), nullable=True)
    verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)

    entity = relationship("Entity", back_populates="documents")
    requirement = relationship("EntityDocumentRequirement", back_populates="documents")
