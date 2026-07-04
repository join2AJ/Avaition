from datetime import datetime

from pydantic import BaseModel, field_validator

from app.models.committee import CommitteeDecision


class CommitteeCreate(BaseModel):
    scheduled_date: datetime
    location: str | None = None

    @field_validator("scheduled_date")
    @classmethod
    def reject_past_dates(cls, value: datetime) -> datetime:
        # AVSEC Order 02/2022 — Clause TBD: committee date may be today or any
        # forward date; back-dating must be impossible. Enforced server-side
        # regardless of what the client sends.
        now = datetime.now(value.tzinfo) if value.tzinfo else datetime.now()
        if value.date() < now.date():
            raise ValueError("Committee date cannot be in the past")
        return value


class CommitteeOut(BaseModel):
    id: int
    scheduled_date: datetime
    location: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class CommitteeScheduleApplication(BaseModel):
    application_id: int
    committee_id: int


class CommitteeDecisionUpdate(BaseModel):
    decision: CommitteeDecision
    decision_notes: str | None = None
