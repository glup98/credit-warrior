import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.person import Person
from app.schemas.person import PersonCreate, PersonRead, PersonUpdate
from app.services.person_service import PersonService

router = APIRouter(prefix="/persons", tags=["persons"])

DbSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[PersonRead])
def list_persons(
    db: DbSession,
    is_active: bool | None = None,
) -> list[Person]:
    return PersonService(db).list_persons(is_active=is_active)


@router.post("", response_model=PersonRead, status_code=status.HTTP_201_CREATED)
def create_person(payload: PersonCreate, db: DbSession) -> Person:
    return PersonService(db).create_person(payload)


@router.get("/{person_id}", response_model=PersonRead)
def get_person(person_id: uuid.UUID, db: DbSession) -> Person:
    return PersonService(db).get_person(person_id)


@router.patch("/{person_id}", response_model=PersonRead)
def update_person(person_id: uuid.UUID, payload: PersonUpdate, db: DbSession) -> Person:
    return PersonService(db).update_person(person_id, payload)


@router.delete("/{person_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_person(person_id: uuid.UUID, db: DbSession) -> Response:
    PersonService(db).delete_person(person_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
