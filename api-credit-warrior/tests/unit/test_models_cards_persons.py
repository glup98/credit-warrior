import uuid

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError
from app.models import Card, CurrencyEnum, Person


def test_create_card_model_defaults_and_persistence(db_session: Session) -> None:
    card = Card(
        name="Visa Santander",
        last_four_digits="4321",
        currency=CurrencyEnum.CLP,
        closing_day=25,
        due_day=10,
    )
    db_session.add(card)
    db_session.commit()
    db_session.refresh(card)

    assert isinstance(card.id, uuid.UUID)
    assert card.name == "Visa Santander"
    assert card.last_four_digits == "4321"
    assert card.currency == CurrencyEnum.CLP
    assert card.closing_day == 25
    assert card.due_day == 10
    assert card.is_active is True
    assert card.created_at is not None
    assert card.updated_at is not None


def test_card_check_constraint_rejects_invalid_closing_day(db_session: Session) -> None:
    invalid_card = Card(
        name="Invalid Card",
        currency=CurrencyEnum.USD,
        closing_day=32,
        due_day=10,
    )
    db_session.add(invalid_card)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_create_person_model_and_unique_constraint(db_session: Session) -> None:
    person = Person(name="Anyi", color_hex="#FF5733")
    db_session.add(person)
    db_session.commit()
    db_session.refresh(person)

    assert isinstance(person.id, uuid.UUID)
    assert person.name == "Anyi"
    assert person.color_hex == "#FF5733"
    assert person.is_active is True

    duplicate = Person(name="Anyi")
    db_session.add(duplicate)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_conflict_error_has_409_status() -> None:
    err = ConflictError("Person 'Anyi' already exists.")
    assert err.status_code == 409
    assert err.message == "Person 'Anyi' already exists."


def test_cards_and_persons_composite_indexes() -> None:
    card_indexes = {idx.name for idx in Card.__table__.indexes}
    assert "ix_cards_is_active_name" in card_indexes

    person_indexes = {idx.name for idx in Person.__table__.indexes}
    assert "ix_persons_is_active_name" in person_indexes

