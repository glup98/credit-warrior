import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.person import Person
from app.schemas.person import PersonCreate, PersonUpdate


class PersonRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_persons(self, *, is_active: bool | None = None) -> list[Person]:
        stmt = select(Person).order_by(Person.name.asc())
        if is_active is not None:
            stmt = stmt.where(Person.is_active == is_active)
        return list(self.db.scalars(stmt).all())

    def get_by_id(self, person_id: uuid.UUID) -> Person | None:
        stmt = select(Person).where(Person.id == person_id)
        return self.db.scalar(stmt)

    def get_by_ids(self, person_ids: list[uuid.UUID]) -> list[Person]:
        if not person_ids:
            return []
        stmt = select(Person).where(Person.id.in_(person_ids))
        return list(self.db.scalars(stmt).all())

    def get_by_name_ci(self, name: str) -> Person | None:
        stmt = select(Person).where(func.lower(Person.name) == name.lower())
        return self.db.scalar(stmt)

    def create(self, payload: PersonCreate) -> Person:
        person = Person(**payload.model_dump())
        self.db.add(person)
        self.db.commit()
        self.db.refresh(person)
        return person

    def update(self, person: Person, payload: PersonUpdate) -> Person:
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(person, field, value)
        self.db.commit()
        self.db.refresh(person)
        return person

    def delete(self, person: Person) -> None:
        self.db.delete(person)
        self.db.commit()
