from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import RequirePermission
from app.database import get_db
from app.models.application import Application, ApplicationStatus
from app.models.committee import ApplicationCommitteeLink, Committee, CommitteeDecision
from app.models.role_permission import VerticalEnum
from app.models.user import User
from app.routers.applications import _application_detail
from app.schemas.application import ApplicationDetailOut
from app.schemas.committee import (
    CommitteeCreate,
    CommitteeDecisionUpdate,
    CommitteeOut,
    CommitteeScheduleApplication,
)
from app.services.audit_service import record_audit

router = APIRouter(prefix="/api/committees", tags=["committees"])


@router.post("", response_model=CommitteeOut, status_code=status.HTTP_201_CREATED)
def create_committee(
    payload: CommitteeCreate,
    db: Session = Depends(get_db),
    user: User = Depends(RequirePermission(VerticalEnum.committees, "create")),
):
    # Back-dating is rejected by the CommitteeCreate validator already; this
    # is the second, server-side enforcement point independent of any
    # client-side date-picker restriction.
    committee = Committee(scheduled_date=payload.scheduled_date, location=payload.location, created_by=user.id)
    db.add(committee)
    db.commit()
    db.refresh(committee)

    record_audit(
        db, actor_id=user.id, action="create", object_type="Committee", object_id=committee.id,
        after={"scheduled_date": committee.scheduled_date.isoformat()},
    )
    return committee


@router.get("", response_model=list[CommitteeOut])
def list_committees(
    db: Session = Depends(get_db),
    user: User = Depends(RequirePermission(VerticalEnum.committees, "read")),
):
    return db.query(Committee).order_by(Committee.scheduled_date).all()


@router.post("/schedule-application", response_model=ApplicationDetailOut)
def schedule_application(
    payload: CommitteeScheduleApplication,
    db: Session = Depends(get_db),
    user: User = Depends(RequirePermission(VerticalEnum.committees, "update")),
):
    application = db.query(Application).filter(Application.id == payload.application_id).first()
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found")
    if application.status != ApplicationStatus.checklist_pending:
        raise HTTPException(
            status_code=400, detail="Only applications with a complete checklist can be scheduled to committee"
        )
    if application.checklist is None or not application.checklist.is_complete:
        raise HTTPException(
            status_code=400,
            detail="All mandatory checklist items must be uploaded and verified before committee scheduling",
        )

    committee = db.query(Committee).filter(Committee.id == payload.committee_id).first()
    if committee is None:
        raise HTTPException(status_code=404, detail="Committee not found")
    if committee.scheduled_date.date() < datetime.now(committee.scheduled_date.tzinfo).date():
        # Defensive re-check: a committee date can't have been created in the
        # past, but guard anyway since it may be read back at any later time.
        raise HTTPException(status_code=400, detail="Cannot schedule against a committee with a past date")

    before = {"status": application.status.value}
    application.status = ApplicationStatus.committee_scheduled
    db.add(ApplicationCommitteeLink(application_id=application.id, committee_id=committee.id))
    db.commit()

    record_audit(
        db, actor_id=user.id, action="schedule_committee", object_type="Application", object_id=application.id,
        before=before, after={"status": application.status.value, "committee_id": committee.id},
    )
    db.refresh(application)
    return _application_detail(application)


@router.post("/decide/{application_id}", response_model=ApplicationDetailOut)
def decide_application(
    application_id: int,
    payload: CommitteeDecisionUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(RequirePermission(VerticalEnum.committees, "update")),
):
    application = db.query(Application).filter(Application.id == application_id).first()
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found")
    if application.status != ApplicationStatus.committee_scheduled:
        raise HTTPException(status_code=400, detail="Application is not currently committee-scheduled")
    if payload.decision == CommitteeDecision.pending:
        raise HTTPException(status_code=400, detail="Decision must be approved or rejected")

    link = (
        db.query(ApplicationCommitteeLink)
        .filter(ApplicationCommitteeLink.application_id == application.id)
        .order_by(ApplicationCommitteeLink.id.desc())
        .first()
    )
    if link is None:
        raise HTTPException(status_code=400, detail="Application has no committee link")

    if payload.decision == CommitteeDecision.rejected and not (payload.decision_notes or "").strip():
        raise HTTPException(status_code=400, detail="A reason is required to reject an application")

    link.decision = payload.decision
    link.decision_notes = payload.decision_notes
    link.decided_at = datetime.utcnow()
    link.decided_by = user.id

    before = {"status": application.status.value}
    application.status = (
        ApplicationStatus.approved if payload.decision == CommitteeDecision.approved else ApplicationStatus.rejected
    )
    db.commit()

    record_audit(
        db, actor_id=user.id, action="committee_decision", object_type="Application", object_id=application.id,
        before=before, after={"status": application.status.value, "notes": payload.decision_notes},
    )
    db.refresh(application)
    return _application_detail(application)
