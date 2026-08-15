from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Date, Boolean, func
from sqlalchemy.orm import relationship

from app.database import Base


class MaterialItem(Base):
    """MATERIAL pillar subject — a controlled tool needing a ToT card. Belongs
    to the same shared Entity that sponsors the entity's MAN and VEHICLE
    applications (§10.2, Annexure C).
    """

    __tablename__ = "material_items"

    id = Column(Integer, primary_key=True)
    entity_id = Column(Integer, ForeignKey("entities.id"), nullable=False)
    description = Column(String(255), nullable=False)  # e.g. "AME Toolkit · V. Singh"
    tool_category = Column(String(8), nullable=True)   # Annexure C category A–G
    carried_by_individual_id = Column(Integer, ForeignKey("individuals.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    entity = relationship("Entity", back_populates="material_items")
    applications = relationship("Application", back_populates="material_item")


class Vehicle(Base):
    """VEHICLE pillar subject — a vehicle needing a VEP (+ driver ADP). Belongs
    to the same shared Entity (§14).
    """

    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True)
    entity_id = Column(Integer, ForeignKey("entities.id"), nullable=False)
    registration_no = Column(String(32), nullable=False)
    vehicle_type = Column(String(64), nullable=True)  # pushback tug, cargo van…
    rc_valid = Column(Boolean, default=False, nullable=False)
    puc_valid = Column(Boolean, default=False, nullable=False)
    fitness_valid = Column(Boolean, default=False, nullable=False)
    adp_driver = Column(String(128), nullable=True)   # Airside Driving Permit holder
    rfid_tag = Column(String(64), nullable=True)
    vep_expiry = Column(Date, nullable=True)          # max 1 year, non-transferable
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    entity = relationship("Entity", back_populates="vehicles")
    applications = relationship("Application", back_populates="vehicle")
