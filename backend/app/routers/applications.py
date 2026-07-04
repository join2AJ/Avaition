from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import RequirePermission, assert_entity_scope
from app.database import get_db
from app.models.application import Application, ApplicationComment, ApplicationStatus
from app.models.checklist import Checklist, ChecklistItemStatus, ChecklistItemTemplate
from app.models.entity import Entity
from app.models.individual import Individual
from app.models.role_permission import VerticalEnum
from app.models.user import User
from app.schemas.application import (
    ApplicationCommentCreate,
    ApplicationCommentOut,
    ApplicationCreate,
    ApplicationDetailOut,
    ApplicationOut,
    ChecklistItemStatusOut,
    ChecklistItemUpload,
    ChecklistOut,
)
from app.services.audit_service import record_audit

router = APIRouter(prefix="/api/applications", tags=["applications"])


def _checklist_out(checklist: Checklist) -> ChecklistOut:
    return ChecklistOut(
        id=checklist.id,
        is_complete=checklist.is_complete,
        items=[
            ChecklistItemStatusOut(
                id=item.id,
                template_id=item.template_id,
                name=item.template.name,
                clause_badge=item.template.clause.badge,
                is_mandatory=item.template.is_mandatory,
                file_path=item.file_path,
                uploaded=item.uploaded,
                verified=item.verified,
            )
            for item in checklist.item_statuses
        ],
    )


def _application_detail(app_row: Application) -> ApplicationDetailOut:
    base = ApplicationOut.model_validate(app_row)
    return ApplicationDetailOut(
        **base.model_dump(),
        checklist=_checklist_out(app_row.checklist) if app_row.checklist else None,
    )


@router.post("", response_model=ApplicationDetailOut, status_code=status.HTTP_201_CREATED)
def create_application(
    payload: ApplicationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(RequirePermission(VerticalEnum.individuals, "create")),
):
    assert_entity_scope(user, payload.entity_id)

    entity = db.query(Entity).filter(Entity.id == payload.entity_id).first()
    if entity is None:
        raise HTTPException(status_code=404, detail="Entity not found")
    if entity.status.value != "active":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Entity is {entity.status.value}; new applications are blocked",
        )

    individual = db.query(Individual).filter(Individual.id == payload.individual_id).first()
    if individual is None or individual.entity_id != entity.id:
        raise HTTPException(status_code=404, detail="Individual not found for this entity")

    templates = (
        db.query(ChecklistItemTemplate).filter(ChecklistItemTemplate.category_id == entity.category_id).all()
    )
    if not templates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No checklist template configured for this entity's category",
        )

    application = Application(
        entity_id=entity.id,
        individual_id=individual.id,
        created_by=user.id,
        status=ApplicationStatus.checklist_pending,
    )
    db.add(application)
    db.flush()

    checklist = Checklist(application_id=application.id)
    db.add(checklist)
    db.flush()
    for template in templates:
        db.add(ChecklistItemStatus(checklist_id=checklist.id, template_id=template.id))

    db.commit()
    db.refresh(application)

    record_audit(
        db, actor_id=user.id, action="create", object_type="Application", object_id=application.id,
        after={"entity_id": entity.id, "individual_id": individual.id},
    )
    return _application_detail(application)


@router.get("", response_model=list[ApplicationOut])
def list_applications(
    entity_id: int | None = None,
    app_status: ApplicationStatus | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(RequirePermission(VerticalEnum.individuals, "read")),
):
    query = db.query(Application)
    if user.role.name == "entity":
        query = query.filter(Application.entity_id == user.entity_id)
    elif entity_id is not None:
        query = query.filter(Application.entity_id == entity_id)
    if app_status is not None:
        query = query.filter(Application.status == app_status)
    return query.all()


@router.get("/{application_id}", response_model=ApplicationDetailOut)
def get_application(
    application_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(RequirePermission(VerticalEnum.individuals, "read")),
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found")
    assert_entity_scope(user, application.entity_id)
    return _application_detail(application)


@router.post("/{application_id}/checklist/{item_status_id}/upload", response_model=ChecklistItemStatusOut)
def upload_checklist_item(
    application_id: int,
    item_status_id: int,
    payload: ChecklistItemUpload,
    db: Session = Depends(get_db),
    user: User = Depends(RequirePermission(VerticalEnum.documents, "update")),
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found")
    assert_entity_scope(user, application.entity_id)

    item = (
        db.query(ChecklistItemStatus)
        .filter(ChecklistItemStatus.id == item_status_id, ChecklistItemStatus.checklist_id == application.checklist.id)
        .first()
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Checklist item not found")

    item.file_path = payload.file_path
    item.uploaded = True
    item.uploaded_at = datetime.utcnow()
    # A re-upload invalidates any prior verification.
    item.verified = False
    item.verified_by = None
    item.verified_at = None
    db.commit()
    db.refresh(item)

    return ChecklistItemStatusOut(
        id=item.id, template_id=item.template_id, name=item.template.name, clause_badge=item.template.clause.badge,
        is_mandatory=item.template.is_mandatory, file_path=item.file_path, uploaded=item.uploaded, verified=item.verified,
    )


@router.post("/{application_id}/checklist/{item_status_id}/verify", response_model=ChecklistItemStatusOut)
def verify_checklist_item(
    application_id: int,
    item_status_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(RequirePermission(VerticalEnum.documents, "update")),
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found")

    item = (
        db.query(ChecklistItemStatus)
        .filter(ChecklistItemStatus.id == item_status_id, ChecklistItemStatus.checklist_id == application.checklist.id)
        .first()
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Checklist item not found")
    if not item.uploaded:
        raise HTTPException(status_code=400, detail="Item must be uploaded before it can be verified")

    item.verified = True
    item.verified_by = user.id
    item.verified_at = datetime.utcnow()
    db.commit()
    db.refresh(item)

    return ChecklistItemStatusOut(
        id=item.id, template_id=item.template_id, name=item.template.name, clause_badge=item.template.clause.badge,
        is_mandatory=item.template.is_mandatory, file_path=item.file_path, uploaded=item.uploaded, verified=item.verified,
    )


@router.post("/{application_id}/clarify", response_model=ApplicationDetailOut)
def send_to_clarification(
    application_id: int,
    payload: ApplicationCommentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(RequirePermission(VerticalEnum.individuals, "update")),
):
    """Moves a deficient application into the pre-committee clarification
    queue with a dedicated comment thread.
    """
    application = db.query(Application).filter(Application.id == application_id).first()
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found")
    if application.status != ApplicationStatus.checklist_pending:
        raise HTTPException(
            status_code=400, detail="Only applications in checklist_pending can be sent to clarification"
        )

    before = {"status": application.status.value}
    application.status = ApplicationStatus.clarification
    db.add(ApplicationComment(application_id=application.id, author_id=user.id, comment=payload.comment))
    db.commit()

    record_audit(
        db, actor_id=user.id, action="send_to_clarification", object_type="Application", object_id=application.id,
        before=before, after={"status": application.status.value, "comment": payload.comment},
    )
    db.refresh(application)
    return _application_detail(application)


@router.post("/{application_id}/resubmit", response_model=ApplicationDetailOut)
def resubmit_application(
    application_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(RequirePermission(VerticalEnum.individuals, "update")),
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found")
    assert_entity_scope(user, application.entity_id)
    if application.status != ApplicationStatus.clarification:
        raise HTTPException(status_code=400, detail="Only applications in clarification can be resubmitted")

    before = {"status": application.status.value}
    application.status = ApplicationStatus.checklist_pending
    db.commit()

    record_audit(
        db, actor_id=user.id, action="resubmit", object_type="Application", object_id=application.id,
        before=before, after={"status": application.status.value},
    )
    db.refresh(application)
    return _application_detail(application)


@router.get("/{application_id}/comments", response_model=list[ApplicationCommentOut])
def list_comments(
    application_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(RequirePermission(VerticalEnum.individuals, "read")),
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found")
    assert_entity_scope(user, application.entity_id)
    return application.comments


@router.post("/{application_id}/comments", response_model=ApplicationCommentOut)
def add_comment(
    application_id: int,
    payload: ApplicationCommentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(RequirePermission(VerticalEnum.individuals, "update")),
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found")
    assert_entity_scope(user, application.entity_id)

    comment = ApplicationComment(application_id=application.id, author_id=user.id, comment=payload.comment)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment
