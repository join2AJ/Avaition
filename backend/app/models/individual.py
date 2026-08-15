from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, func
from sqlalchemy.orm import relationship

from app.database import Base


class Individual(Base):
    __tablename__ = "individuals"

    id = Column(Integer, primary_key=True)
    entity_id = Column(Integer, ForeignKey("entities.id"), nullable=False)
    full_name = Column(String(255), nullable=False)
    job_role = Column(String(128), nullable=False)  # drives JobRoleZoneMatrix lookups
    id_proof_number = Column(String(128), nullable=True)
    photo_path = Column(String(512), nullable=True)
    # An entity may authorize a self-check login for this individual so they
    # can track their own application status (read-only, own records).
    login_authorized = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    entity = relationship("Entity", back_populates="individuals")
    applications = relationship("Application", back_populates="individual")
    zone_assignments = relationship("ZoneAssignment", back_populates="individual")
    zone_escalations = relationship("ZoneEscalation", back_populates="individual")
