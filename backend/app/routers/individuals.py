from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import RequirePermission, assert_entity_scope
from app.database import get_db
from app.models.entity import Entity
from app.models.individual import Individual
from app.models.role_permission import VerticalEnum
from app.models.user import User
from app.schemas.individual import IndividualCreate, IndividualOut
from app.services.audit_service import record_audit

router = APIRouter(prefix="/api/individuals", tags=["individuals"])


@router.post("", response_model=IndividualOut, status_code=status.HTTP_201_CREATED)
def create_individual(
    payload: IndividualCreate,
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
            detail=f"Entity is {entity.status.value}; new individuals/applications are blocked",
        )

    individual = Individual(
        entity_id=payload.entity_id,
        full_name=payload.full_name,
        job_role=payload.job_role,
        id_proof_number=payload.id_proof_number,
    )
    db.add(individual)
    db.commit()
    db.refresh(individual)

    record_audit(
        db, actor_id=user.id, action="create", object_type="Individual", object_id=individual.id,
        after={"entity_id": entity.id, "full_name": individual.full_name, "job_role": individual.job_role},
    )
    return individual


@router.get("", response_model=list[IndividualOut])
def list_individuals(
    entity_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(RequirePermission(VerticalEnum.individuals, "read")),
):
    query = db.query(Individual)
    if user.role.name == "entity":
        query = query.filter(Individual.entity_id == user.entity_id)
    elif entity_id is not None:
        query = query.filter(Individual.entity_id == entity_id)
    return query.all()


@router.get("/{individual_id}", response_model=IndividualOut)
def get_individual(
    individual_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(RequirePermission(VerticalEnum.individuals, "read")),
):
    individual = db.query(Individual).filter(Individual.id == individual_id).first()
    if individual is None:
        raise HTTPException(status_code=404, detail="Individual not found")
    assert_entity_scope(user, individual.entity_id)
    return individual
