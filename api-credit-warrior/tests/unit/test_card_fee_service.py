import uuid
from decimal import Decimal

import pytest
from sqlalchemy.orm import Session

from app.core.exceptions import EntityNotFoundError
from app.models.base import CurrencyEnum, FeeSourceEnum
from app.models.card import Card
from app.services.card_fee_service import CardFeeService


def _create_test_card(
    db: Session,
    *,
    currency: CurrencyEnum = CurrencyEnum.CLP,
    default_monthly_fee: Decimal = Decimal("1500"),
    name: str = "Test Credit Card",
) -> Card:
    card = Card(
        name=name,
        currency=currency,
        closing_day=20,
        due_day=5,
        default_monthly_fee=default_monthly_fee,
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


def test_set_fee_card_not_found_raises_entity_not_found_error(db_session: Session) -> None:
    service = CardFeeService(db_session)
    non_existent_card_id = uuid.uuid4()

    with pytest.raises(EntityNotFoundError) as exc_info:
        service.set_fee(non_existent_card_id, "2026-11", Decimal("3500"))

    assert str(non_existent_card_id) in str(exc_info.value)


def test_set_fee_normalizes_fee_clp_and_returns_override_response(db_session: Session) -> None:
    card = _create_test_card(
        db_session,
        currency=CurrencyEnum.CLP,
        default_monthly_fee=Decimal("1000"),
    )
    service = CardFeeService(db_session)

    response = service.set_fee(card.id, "2026-11", Decimal("3500.80"))

    assert response.card_id == card.id
    assert response.period == "2026-11"
    assert response.fee == Decimal("3501")  # Quantized to CLP integer quantum
    assert response.source == FeeSourceEnum.OVERRIDE


def test_set_fee_normalizes_fee_usd_and_returns_override_response(db_session: Session) -> None:
    card = _create_test_card(
        db_session,
        currency=CurrencyEnum.USD,
        default_monthly_fee=Decimal("10.00"),
    )
    service = CardFeeService(db_session)

    response = service.set_fee(card.id, "2026-11", Decimal("12.3456"))

    assert response.card_id == card.id
    assert response.period == "2026-11"
    assert response.fee == Decimal("12.35")  # Quantized to USD 2 decimal places
    assert response.source == FeeSourceEnum.OVERRIDE


def test_set_fee_updates_existing_override_idempotently(db_session: Session) -> None:
    card = _create_test_card(db_session, currency=CurrencyEnum.CLP)
    service = CardFeeService(db_session)

    first_response = service.set_fee(card.id, "2026-11", Decimal("2000"))
    assert first_response.fee == Decimal("2000")

    updated_response = service.set_fee(card.id, "2026-11", Decimal("2500"))
    assert updated_response.fee == Decimal("2500")

    fees = service.list_fees(card.id)
    assert len(fees) == 1
    assert fees[0].fee == Decimal("2500")


def test_get_fee_card_not_found_raises_entity_not_found_error(db_session: Session) -> None:
    service = CardFeeService(db_session)
    non_existent_card_id = uuid.uuid4()

    with pytest.raises(EntityNotFoundError) as exc_info:
        service.get_fee(non_existent_card_id, "2026-11")

    assert str(non_existent_card_id) in str(exc_info.value)


def test_get_fee_returns_card_default_when_no_override_exists(db_session: Session) -> None:
    card = _create_test_card(
        db_session,
        currency=CurrencyEnum.CLP,
        default_monthly_fee=Decimal("1500"),
    )
    service = CardFeeService(db_session)

    response = service.get_fee(card.id, "2026-11")

    assert response.card_id == card.id
    assert response.period == "2026-11"
    assert response.fee == Decimal("1500")
    assert response.source == FeeSourceEnum.CARD_DEFAULT


def test_get_fee_returns_override_when_override_exists(db_session: Session) -> None:
    card = _create_test_card(
        db_session,
        currency=CurrencyEnum.CLP,
        default_monthly_fee=Decimal("1500"),
    )
    service = CardFeeService(db_session)

    service.set_fee(card.id, "2026-11", Decimal("4000"))

    response = service.get_fee(card.id, "2026-11")
    assert response.card_id == card.id
    assert response.period == "2026-11"
    assert response.fee == Decimal("4000")
    assert response.source == FeeSourceEnum.OVERRIDE

    # Another period still yields CARD_DEFAULT
    other_response = service.get_fee(card.id, "2026-12")
    assert other_response.fee == Decimal("1500")
    assert other_response.source == FeeSourceEnum.CARD_DEFAULT


def test_list_fees_card_not_found_raises_entity_not_found_error(db_session: Session) -> None:
    service = CardFeeService(db_session)
    non_existent_card_id = uuid.uuid4()

    with pytest.raises(EntityNotFoundError) as exc_info:
        service.list_fees(non_existent_card_id)

    assert str(non_existent_card_id) in str(exc_info.value)


def test_list_fees_returns_empty_list_when_no_overrides(db_session: Session) -> None:
    card = _create_test_card(db_session)
    service = CardFeeService(db_session)

    assert service.list_fees(card.id) == []


def test_list_fees_returns_overrides_ordered_chronologically(db_session: Session) -> None:
    card = _create_test_card(db_session, currency=CurrencyEnum.CLP)
    service = CardFeeService(db_session)

    service.set_fee(card.id, "2026-12", Decimal("3000"))
    service.set_fee(card.id, "2026-10", Decimal("1000"))
    service.set_fee(card.id, "2026-11", Decimal("2000"))

    results = service.list_fees(card.id)

    assert len(results) == 3
    assert [r.period for r in results] == ["2026-10", "2026-11", "2026-12"]
    assert [r.fee for r in results] == [Decimal("1000"), Decimal("2000"), Decimal("3000")]
    assert all(r.source == FeeSourceEnum.OVERRIDE for r in results)


def test_delete_fee_card_not_found_raises_entity_not_found_error(db_session: Session) -> None:
    service = CardFeeService(db_session)
    non_existent_card_id = uuid.uuid4()

    with pytest.raises(EntityNotFoundError) as exc_info:
        service.delete_fee(non_existent_card_id, "2026-11")

    assert str(non_existent_card_id) in str(exc_info.value)


def test_delete_fee_override_not_found_raises_entity_not_found_error(db_session: Session) -> None:
    card = _create_test_card(db_session)
    service = CardFeeService(db_session)

    with pytest.raises(EntityNotFoundError) as exc_info:
        service.delete_fee(card.id, "2026-11")

    assert "CardMonthlyFee" in str(exc_info.value)


def test_delete_fee_successfully_removes_override(db_session: Session) -> None:
    card = _create_test_card(
        db_session,
        currency=CurrencyEnum.CLP,
        default_monthly_fee=Decimal("1200"),
    )
    service = CardFeeService(db_session)

    service.set_fee(card.id, "2026-11", Decimal("3500"))
    assert service.get_fee(card.id, "2026-11").source == FeeSourceEnum.OVERRIDE

    service.delete_fee(card.id, "2026-11")

    # Falling back to card default after deletion
    fallback = service.get_fee(card.id, "2026-11")
    assert fallback.source == FeeSourceEnum.CARD_DEFAULT
    assert fallback.fee == Decimal("1200")

    # Deleting again raises EntityNotFoundError
    with pytest.raises(EntityNotFoundError):
        service.delete_fee(card.id, "2026-11")
