import enum

from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Enum, UniqueConstraint
from sqlalchemy.orm import relationship

from app.database import Base


class VerticalEnum(str, enum.Enum):
    entities = "entities"
    individuals = "individuals"
    committees = "committees"
    zones = "zones"
    documents = "documents"
    reports = "reports"
    penalties = "penalties"


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True)
    name = Column(String(32), unique=True, nullable=False)
    # admin | bcas | pass_section | entity | others
    description = Column(String(255), nullable=True)

    permissions = relationship("Permission", back_populates="role", cascade="all, delete-orphan")
    users = relationship("User", back_populates="role")


class Permission(Base):
    """Per-vertical CRUD flags for a role. Admin builds these via the
    permission-assignment UI; every route enforces them through the RBAC
    dependency in app.core.deps.
    """

    __tablename__ = "permissions"
    __table_args__ = (UniqueConstraint("role_id", "vertical", name="uq_role_vertical"),)

    id = Column(Integer, primary_key=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    vertical = Column(Enum(VerticalEnum), nullable=False)
    can_create = Column(Boolean, default=False, nullable=False)
    can_read = Column(Boolean, default=False, nullable=False)
    can_update = Column(Boolean, default=False, nullable=False)
    can_delete = Column(Boolean, default=False, nullable=False)

    role = relationship("Role", back_populates="permissions")
