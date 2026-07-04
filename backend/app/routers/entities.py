from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import RequirePermission, assert_entity_scope, get_current_user
from app.database import get_db
from app.models.entity import (
    Entity,
    EntityCategory,
    EntityDocument,
    EntityDocumentRequirement,
    EntityStatus,
)
from app.models.role_permission import VerticalEnum
from app.models.user import User
from app.schemas.entity import (
    EntityCreate,
    EntityDocumentOut,
    EntityDocumentUpload,
    EntityOut,
    EntityStatusUpdate,
)
from app.services.audit_service import record_audit

router = APIRouter(prefix="/api/entities", tags=["entities"])


def _to_entity_out(entity: Entity) -> EntityOut:
    return EntityOut(
        id=entity.id,
        name=entity.name,
        category_id=entity.category_id,
        category_name=entity.category.name,
        strength=entity.strength,
        contract_start=entity.contract_start,
        contract_end=entity.contract_end,
        aop_linked=entity.aop_linked,
        status=entity.status,
        status_reason=entity.status_reason,
        self_service_login_allowed=entity.self_service_login_allowed,
        created_at=entity.created_at,
    )


@router.post("", response_model=EntityOut, status_code=status.HTTP_201_CREATED)
def create_entity(
    payload: EntityCreate,
    db: Session = Depends(get_db),
    user: User = Depends(RequirePermission(VerticalEnum.entities, "create")),
):
    category = db.query(EntityCategory).filter(EntityCategory.id == payload.category_id).first()
    if category is None:
        raise HTTPException(status_code=404, detail="Entity category not found")

    entity = Entity(
        name=payload.name,
        category_id=payload.category_id,
        strength=payload.strength,
        contract_start=payload.contract_start,
        contract_end=payload.contract_end,
        aop_linked=payload.aop_linked,
    )
    db.add(entity)
    db.flush()

    # Seed a pending EntityDocument row for every requirement in this
    # category so the entity profile shows the full live compliance
    # checklist from day one.
    requirements = (
        db.query(EntityDocumentRequirement).filter(EntityDocumentRequirement.category_id == category.id).all()
    )
    for req in requirements:
        db.add(EntityDocument(entity_id=entity.id, requirement_id=req.id))

    db.commit()
    db.refresh(entity)

    record_audit(
        db,
        actor_id=user.id,
        action="create",
        object_type="Entity",
        object_id=entity.id,
        after={"name": entity.name, "category_id": entity.category_id, "policy_reference": payload.policy_reference},
    )
    return _to_entity_out(entity)


@router.get("", response_model=list[EntityOut])
def list_entities(
    db: Session = Depends(get_db),
    user: User = Depends(RequirePermission(VerticalEnum.entities, "read")),
):
    query = db.query(Entity)
    if user.role.name == "entity":
        query = query.filter(Entity.id == user.entity_id)
    return [_to_entity_out(e) for e in query.all()]


@router.get("/{entity_id}", response_model=EntityOut)
def get_entity(
    entity_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(RequirePermission(VerticalEnum.entities, "read")),
):
    assert_entity_scope(user, entity_id)
    entity = db.query(Entity).filter(Entity.id == entity_id).first()
    if entity is None:
        raise HTTPException(status_code=404, detail="Entity not found")
    return _to_entity_out(entity)


@router.get("/{entity_id}/documents", response_model=list[EntityDocumentOut])
def list_entity_documents(
    entity_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(RequirePermission(VerticalEnum.documents, "read")),
):
    assert_entity_scope(user, entity_id)
    docs = db.query(EntityDocument).filter(EntityDocument.entity_id == entity_id).all()
    return [
        EntityDocumentOut(
            id=d.id,
            requirement_id=d.requirement_id,
            requirement_name=d.requirement.name,
            clause_badge=d.requirement.clause.badge,
            expiry_date=d.expiry_date,
            verification_state=d.verification_state,
            is_mandatory=d.requirement.is_mandatory,
        )
        for d in docs
    ]


@router.post("/{entity_id}/documents/{document_id}/upload", response_model=EntityDocumentOut)
def upload_entity_document(
    entity_id: int,
    document_id: int,
    payload: EntityDocumentUpload,
    db: Session = Depends(get_db),
    user: User = Depends(RequirePermission(VerticalEnum.documents, "update")),
):
    assert_entity_scope(user, entity_id)
    doc = (
        db.query(EntityDocument)
        .filter(EntityDocument.id == document_id, EntityDocument.entity_id == entity_id)
        .first()
    )
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")

    from app.models.entity import DocumentVerificationState

    doc.file_path = payload.file_path
    doc.expiry_date = payload.expiry_date
    doc.verification_state = DocumentVerificationState.uploaded
    doc.uploaded_at = datetime.utcnow()
    db.commit()
    db.refresh(doc)

    return EntityDocumentOut(
        id=doc.id,
        requirement_id=doc.requirement_id,
        requirement_name=doc.requirement.name,
        clause_badge=doc.requirement.clause.badge,
        expiry_date=doc.expiry_date,
        verification_state=doc.verification_state,
        is_mandatory=doc.requirement.is_mandatory,
    )


@router.post("/{entity_id}/documents/{document_id}/verify", response_model=EntityDocumentOut)
def verify_entity_document(
    entity_id: int,
    document_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(RequirePermission(VerticalEnum.documents, "update")),
):
    from app.models.entity import DocumentVerificationState

    doc = (
        db.query(EntityDocument)
        .filter(EntityDocument.id == document_id, EntityDocument.entity_id == entity_id)
        .first()
    )
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.verification_state != DocumentVerificationState.uploaded:
        raise HTTPException(status_code=400, detail="Document must be uploaded before it can be verified")

    doc.verification_state = DocumentVerificationState.verified
    doc.verified_by = user.id
    doc.verified_at = datetime.utcnow()
    db.commit()
    db.refresh(doc)

    return EntityDocumentOut(
        id=doc.id,
        requirement_id=doc.requirement_id,
        requirement_name=doc.requirement.name,
        clause_badge=doc.requirement.clause.badge,
        expiry_date=doc.expiry_date,
        verification_state=doc.verification_state,
        is_mandatory=doc.requirement.is_mandatory,
    )


@router.post("/{entity_id}/status", response_model=EntityOut)
def update_entity_status(
    entity_id: int,
    payload: EntityStatusUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(RequirePermission(VerticalEnum.entities, "update")),
):
    """Suspend or archive an entity. Both require a written justification,
    are timestamped, and are visible to BCAS via the read permission on the
    entities vertical.
    """
    entity = db.query(Entity).filter(Entity.id == entity_id).first()
    if entity is None:
        raise HTTPException(status_code=404, detail="Entity not found")
    if payload.status == EntityStatus.active:
        raise HTTPException(status_code=400, detail="Use this endpoint only to suspend or archive an entity")
    if not payload.reason.strip():
        raise HTTPException(status_code=400, detail="A written justification is required")

    before = {"status": entity.status.value}
    entity.status = payload.status
    entity.status_reason = payload.reason
    entity.status_changed_at = datetime.utcnow()
    entity.status_changed_by = user.id
    db.commit()
    db.refresh(entity)

    record_audit(
        db,
        actor_id=user.id,
        action=f"status_change_{payload.status.value}",
        object_type="Entity",
        object_id=entity.id,
        before=before,
        after={"status": entity.status.value, "reason": payload.reason},
    )
    return _to_entity_out(entity)
