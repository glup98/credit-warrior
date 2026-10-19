import pytest
from pydantic import ValidationError

from app.models.base import CurrencyEnum
from app.schemas.card import CardCreate, CardUpdate
from app.schemas.person import PersonCreate, PersonUpdate


def test_card_create_valid_and_strips_name() -> None:
    schema = CardCreate(
        name="  CMR Falabella  ",
        last_four_digits="1234",
        currency=CurrencyEnum.CLP,
        closing_day=31,
        due_day=1,
    )
    assert schema.name == "CMR Falabella"
    assert schema.last_four_digits == "1234"
    assert schema.closing_day == 31
    assert schema.due_day == 1
    assert schema.is_active is True


@pytest.mark.parametrize(
    "payload",
    [
        {"name": "   ", "closing_day": 15, "due_day": 5},
        {"name": "Visa", "closing_day": 0, "due_day": 5},
        {"name": "Visa", "closing_day": 32, "due_day": 5},
        {"name": "Visa", "closing_day": 15, "due_day": 0},
        {"name": "Visa", "closing_day": 15, "due_day": 32},
        {"name": "Visa", "closing_day": 15, "due_day": 5, "last_four_digits": "4532111122223333"},
        {"name": "Visa", "closing_day": 15, "due_day": 5, "last_four_digits": "12a4"},
        {"name": "Visa", "closing_day": 15, "due_day": 5, "unknown_field": "hack"},
    ],
)
def test_card_create_rejects_invalid_inputs(payload: dict[str, object]) -> None:
    with pytest.raises(ValidationError):
        CardCreate(**payload)  # type: ignore[arg-type]


def test_card_update_strips_name_and_forbids_extra() -> None:
    upd = CardUpdate(name="  Nueva Tarjeta ")
    assert upd.name == "Nueva Tarjeta"

    with pytest.raises(ValidationError):
        CardUpdate(name="   ")

    with pytest.raises(ValidationError):
        CardUpdate(extra_field=123)  # type: ignore[call-arg]


def test_person_create_valid_and_strips_name() -> None:
    person = PersonCreate(name="  Anyi  ", color_hex="#a1B2c3")
    assert person.name == "Anyi"
    assert person.color_hex == "#a1B2c3"
    assert person.is_active is True


@pytest.mark.parametrize(
    "payload",
    [
        {"name": "   "},
        {"name": ""},
        {"name": "Augusto", "color_hex": "FF5733"},
        {"name": "Augusto", "color_hex": "#GGGGGG"},
        {"name": "Augusto", "color_hex": "#123"},
        {"name": "Augusto", "unexpected": True},
    ],
)
def test_person_create_rejects_invalid_inputs(payload: dict[str, object]) -> None:
    with pytest.raises(ValidationError):
        PersonCreate(**payload)  # type: ignore[arg-type]


def test_person_update_validation() -> None:
    upd = PersonUpdate(name="  Augusto  ", is_active=False)
    assert upd.name == "Augusto"
    assert upd.is_active is False

    with pytest.raises(ValidationError):
        PersonUpdate(name="   ")
