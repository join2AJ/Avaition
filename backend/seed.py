"""Creates the database schema (if not already migrated) and seeds:
roles + per-vertical permissions, one Admin user, sample zones, a
job-role -> zone matrix, sample entity categories with their document
requirements and checklist items (Clause TBD placeholders where the exact
BCAS clause number is not yet known).

Run after `alembic upgrade head`, or standalone against a fresh dev DB:
    python seed.py
"""
from app.config import settings
from app.core.security import hash_password
from app.database import Base, SessionLocal, engine
from app.models.checklist import ChecklistItemTemplate
from app.models.entity import EntityCategory, EntityDocumentRequirement
from app.models.guideline import GuidelineClause, TBD_DESCRIPTION
from app.models.role_permission import Permission, Role, VerticalEnum
from app.models.user import User
from app.models.zone import JobRoleZoneMatrix, Zone

ORDER = "AVSEC Order 02/2022"

# (role_name, {vertical: (create, read, update, delete)})
ROLE_PERMISSIONS = {
    "admin": {v: (True, True, True, True) for v in VerticalEnum},
    "bcas": {
        VerticalEnum.entities: (False, True, True, False),
        VerticalEnum.individuals: (False, True, False, False),
        VerticalEnum.committees: (False, True, False, False),
        VerticalEnum.zones: (False, True, True, False),
        VerticalEnum.documents: (False, True, False, False),
        VerticalEnum.reports: (False, True, False, False),
        VerticalEnum.penalties: (True, True, True, False),
    },
    "pass_section": {
        VerticalEnum.entities: (True, True, True, False),
        VerticalEnum.individuals: (True, True, True, False),
        VerticalEnum.committees: (True, True, True, False),
        VerticalEnum.zones: (True, True, False, False),
        VerticalEnum.documents: (True, True, True, False),
        VerticalEnum.reports: (False, True, False, False),
        VerticalEnum.penalties: (False, True, False, False),
    },
    "entity": {
        VerticalEnum.entities: (False, True, False, False),
        VerticalEnum.individuals: (True, True, False, False),
        VerticalEnum.committees: (False, True, False, False),
        VerticalEnum.zones: (True, True, False, False),
        VerticalEnum.documents: (True, True, False, False),
        VerticalEnum.reports: (False, True, False, False),
        VerticalEnum.penalties: (False, True, False, False),
    },
    "others": {
        VerticalEnum.entities: (False, True, False, False),
        VerticalEnum.individuals: (True, True, False, False),
        VerticalEnum.committees: (False, True, False, False),
        VerticalEnum.zones: (True, True, False, False),
        VerticalEnum.documents: (True, True, False, False),
        VerticalEnum.reports: (False, False, False, False),
        VerticalEnum.penalties: (False, True, False, False),
    },
}

ZONES = [
    ("Apron / Airside", "APRON"),
    ("Terminal - Landside", "TERM-LS"),
    ("Terminal - Airside (SHA)", "TERM-SHA"),
    ("Cargo Complex", "CARGO"),
    ("ATC Tower", "ATC"),
    ("Fuel Farm", "FUEL"),
    ("Runway / Taxiway", "RWY"),
]

JOB_ROLE_ZONE_MATRIX = [
    ("Ramp Agent", "APRON"),
    ("Ramp Agent", "RWY"),
    ("Cargo Handler", "CARGO"),
    ("Cargo Handler", "APRON"),
    ("Terminal Staff", "TERM-LS"),
    ("Security Screener", "TERM-SHA"),
    ("Security Screener", "APRON"),
    ("Fuel Technician", "FUEL"),
    ("Fuel Technician", "APRON"),
    ("ATC Support Engineer", "ATC"),
]

ENTITY_CATEGORIES = {
    "Ground Handling Agency": [
        "Security Programme",
        "Security Clearance",
        "Contract with Airport Operator",
        "NCASP Compliance Declaration",
        "AOP Linkage Certificate",
    ],
    "Caterer": [
        "Security Programme",
        "Security Clearance",
        "Contract with Airport Operator",
        "FSSAI / Health Clearance",
    ],
    "Fuel Supplier": [
        "Security Programme",
        "Security Clearance",
        "Contract with Airport Operator",
        "PESO License",
    ],
    "Government Agency": [
        "Deputation Order",
        "Security Clearance",
    ],
    "Others": [
        "Security Clearance",
        "Contract / Work Order",
    ],
}


def get_or_create_clause(db, clause: str, description: str = TBD_DESCRIPTION) -> GuidelineClause:
    existing = db.query(GuidelineClause).filter_by(order_no=ORDER, clause=clause).first()
    if existing:
        return existing
    row = GuidelineClause(order_no=ORDER, clause=clause, description=description)
    db.add(row)
    db.flush()
    return row


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # --- Roles + Permissions ---
        roles = {}
        for name in ROLE_PERMISSIONS:
            role = db.query(Role).filter_by(name=name).first()
            if not role:
                role = Role(name=name, description=name.replace("_", " ").title())
                db.add(role)
                db.flush()
            roles[name] = role

        for name, verticals in ROLE_PERMISSIONS.items():
            role = roles[name]
            for vertical, (c, r, u, d) in verticals.items():
                perm = (
                    db.query(Permission)
                    .filter_by(role_id=role.id, vertical=vertical)
                    .first()
                )
                if not perm:
                    perm = Permission(role_id=role.id, vertical=vertical)
                    db.add(perm)
                perm.can_create, perm.can_read, perm.can_update, perm.can_delete = c, r, u, d

        # --- Admin user ---
        admin = db.query(User).filter_by(email=settings.admin_email).first()
        if not admin:
            admin = User(
                email=settings.admin_email,
                hashed_password=hash_password(settings.admin_password),
                full_name="Portal Administrator",
                role_id=roles["admin"].id,
            )
            db.add(admin)

        # --- Zones ---
        zone_by_code = {}
        for name, code in ZONES:
            zone = db.query(Zone).filter_by(code=code).first()
            if not zone:
                clause = get_or_create_clause(db, "5.2", "Zone classification and access control")
                zone = Zone(name=name, code=code, clause_id=clause.id)
                db.add(zone)
                db.flush()
            zone_by_code[code] = zone

        # --- Job role -> zone matrix ---
        for job_role, code in JOB_ROLE_ZONE_MATRIX:
            exists = (
                db.query(JobRoleZoneMatrix)
                .filter_by(job_role=job_role, zone_id=zone_by_code[code].id)
                .first()
            )
            if not exists:
                clause = get_or_create_clause(db, "5.4", "Job-role based zone entitlement")
                db.add(
                    JobRoleZoneMatrix(
                        job_role=job_role, zone_id=zone_by_code[code].id, clause_id=clause.id
                    )
                )

        # --- Entity categories + document requirements + checklist items ---
        doc_clause = get_or_create_clause(db, "4.1", "Mandatory entity documentation")
        checklist_clause = get_or_create_clause(db, "4.3", "Application checklist requirements")
        for category_name, docs in ENTITY_CATEGORIES.items():
            category = db.query(EntityCategory).filter_by(name=category_name).first()
            if not category:
                category = EntityCategory(name=category_name)
                db.add(category)
                db.flush()

            for doc_name in docs:
                req = (
                    db.query(EntityDocumentRequirement)
                    .filter_by(category_id=category.id, name=doc_name)
                    .first()
                )
                if not req:
                    db.add(
                        EntityDocumentRequirement(
                            category_id=category.id, name=doc_name, clause_id=doc_clause.id
                        )
                    )

                item = (
                    db.query(ChecklistItemTemplate)
                    .filter_by(category_id=category.id, name=doc_name)
                    .first()
                )
                if not item:
                    db.add(
                        ChecklistItemTemplate(
                            category_id=category.id, name=doc_name, clause_id=checklist_clause.id
                        )
                    )

        db.commit()
        print("Seed complete.")
        print(f"Admin login: {settings.admin_email} / {settings.admin_password}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
