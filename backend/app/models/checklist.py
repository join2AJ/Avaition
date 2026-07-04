from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship

from app.database import Base


class ChecklistItemTemplate(Base):
    """Category-driven checklist item definition, derived from AVSEC Order
    02/2022. Instantiated onto every Application raised for that category.
    """

    __tablename__ = "checklist_item_templates"

    id = Column(Integer, primary_key=True)
    category_id = Column(Integer, ForeignKey("entity_categories.id"), nullable=False)
    name = Column(String(255), nullable=False)
    clause_id = Column(Integer, ForeignKey("guideline_clauses.id"), nullable=False)
    is_mandatory = Column(Boolean, default=True, nullable=False)

    category = relationship("EntityCategory", back_populates="checklist_items")
    clause = relationship("GuidelineClause")


class Checklist(Base):
    """One checklist instance per Application, holding the per-item
    upload/verification state.
    """

    __tablename__ = "checklists"

    id = Column(Integer, primary_key=True)
    application_id = Column(Integer, ForeignKey("applications.id"), unique=True, nullable=False)

    application = relationship("Application", back_populates="checklist")
    item_statuses = relationship("ChecklistItemStatus", back_populates="checklist", cascade="all, delete-orphan")

    @property
    def is_complete(self) -> bool:
        mandatory = [s for s in self.item_statuses if s.template.is_mandatory]
        return len(mandatory) > 0 and all(s.uploaded and s.verified for s in mandatory)


class ChecklistItemStatus(Base):
    """Uploaded and Verified are tracked as two distinct states — an
    application cannot advance past checklist gating until both are true
    for every mandatory item.
    """

    __tablename__ = "checklist_item_statuses"

    id = Column(Integer, primary_key=True)
    checklist_id = Column(Integer, ForeignKey("checklists.id"), nullable=False)
    template_id = Column(Integer, ForeignKey("checklist_item_templates.id"), nullable=False)
    file_path = Column(String(512), nullable=True)
    uploaded = Column(Boolean, default=False, nullable=False)
    uploaded_at = Column(DateTime(timezone=True), nullable=True)
    verified = Column(Boolean, default=False, nullable=False)
    verified_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)

    checklist = relationship("Checklist", back_populates="item_statuses")
    template = relationship("ChecklistItemTemplate")
