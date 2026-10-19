import uuid

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, EntityNotFoundError
from app.models.person import Person
from app.repositories.person_repo import PersonRepository
from app.schemas.person import PersonCreate, PersonUpdate


class PersonService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = PersonRepository(db)

    def list_persons(self, *, is_active: bool | None = None) -> list[Person]:
        return self.repo.list_persons(is_active=is_active)

    def get_person(self, person_id: uuid.UUID) -> Person:
        person = self.repo.get_by_id(person_id)
        if person is None:
            raise EntityNotFoundError("Person", person_id)
        return person

    def create_person(self, payload: PersonCreate) -> Person:
        existing = self.repo.get_by_name_ci(payload.name)
        if existing is not None:
            raise ConflictError(f"Person with name '{payload.name}' already exists.")
        return self.repo.create(payload)

    def update_person(self, person_id: uuid.UUID, payload: PersonUpdate) -> Person:
        person = self.get_person(person_id)
        if payload.name is not None:
            existing = self.repo.get_by_name_ci(payload.name)
            if existing is not None and existing.id != person.id:
                raise ConflictError(f"Person with name '{payload.name}' already exists.")
        return self.repo.update(person, payload)

    def delete_person(self, person_id: uuid.UUID) -> None:
        person = self.get_person(person_id)
        try:
            self.repo.delete(person)
        except IntegrityError as exc:
            self.db.rollback()
            raise ConflictError(
                "Cannot delete person because they have associated expense splits."
            ) from exc
