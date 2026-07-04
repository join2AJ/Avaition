from sqlalchemy import Column, Integer, String, Text, DateTime, func

from app.database import Base

TBD_DESCRIPTION = "Clause TBD - verify against official BCAS copy"


class GuidelineClause(Base):
    """A single referenceable rule from a BCAS AVSEC order (or an internal
    company standard when order_no is 'INTERNAL'). Every mandatory field,
    checklist item, and workflow gate in the system points at one of these
    rows so the regulatory reference is data-driven, never hard-coded.
    """

    __tablename__ = "guideline_clauses"

    id = Column(Integer, primary_key=True)
    order_no = Column(String(64), nullable=False, default="AVSEC Order 02/2022")
    clause = Column(String(32), nullable=False)
    sub_clause = Column(String(32), nullable=True)
    description = Column(Text, nullable=False, default=TBD_DESCRIPTION)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    @property
    def badge(self) -> str:
        clause = f"{self.clause}.{self.sub_clause}" if self.sub_clause else self.clause
        return f"[{self.order_no} — Clause {clause}]"
