import uuid
from decimal import Decimal

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Card, CardMonthlyFee, CurrencyEnum, FeeSourceEnum


def test_fee_source_enum_values() -> None:
    assert FeeSourceEnum.CARD_DEFAULT == "CARD_DEFAULT"
    assert FeeSourceEnum.OVERRIDE == "OVERRIDE"
    assert FeeSourceEnum("CARD_DEFAULT") == FeeSourceEnum.CARD_DEFAULT
    assert FeeSourceEnum("OVERRIDE") == FeeSourceEnum.OVERRIDE


def test_card_default_monthly_fee_persistence_and_default(db_session: Session) -> None:
    card_default = Card(
        name="Santander Life",
        currency=CurrencyEnum.CLP,
        closing_day=20,
        due_day=5,
    )
    db_session.add(card_default)
    db_session.commit()
    db_session.refresh(card_default)

    assert card_default.default_monthly_fee == Decimal("0")

    card_custom = Card(
        name="BCI Black",
        currency=CurrencyEnum.USD,
        closing_day=15,
        due_day=1,
        default_monthly_fee=Decimal("15.50"),
    )
    db_session.add(card_custom)
    db_session.commit()
    db_session.refresh(card_custom)

    assert card_custom.default_monthly_fee == Decimal("15.50")


def test_card_check_constraint_rejects_negative_default_monthly_fee(db_session: Session) -> None:
    invalid_card = Card(
        name="Negative Fee Card",
        currency=CurrencyEnum.CLP,
        closing_day=10,
        due_day=20,
        default_monthly_fee=Decimal("-1.00"),
    )
    db_session.add(invalid_card)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_card_monthly_fee_model_attributes_and_persistence(db_session: Session) -> None:
    card = Card(
        name="CMR Falabella",
        currency=CurrencyEnum.CLP,
        closing_day=25,
        due_day=10,
        default_monthly_fee=Decimal("3500"),
    )
    db_session.add(card)
    db_session.commit()

    monthly_fee = CardMonthlyFee(
        card_id=card.id,
        period="2026-11",
        fee=Decimal("4200.00"),
    )
    db_session.add(monthly_fee)
    db_session.commit()
    db_session.refresh(monthly_fee)

    assert isinstance(monthly_fee.id, uuid.UUID)
    assert monthly_fee.card_id == card.id
    assert monthly_fee.period == "2026-11"
    assert monthly_fee.fee == Decimal("4200.00")
    assert monthly_fee.created_at is not None
    assert monthly_fee.updated_at is not None
    assert monthly_fee.card.id == card.id
    assert len(card.monthly_fees) == 1
    assert card.monthly_fees[0].id == monthly_fee.id


def test_card_monthly_fee_unique_constraint_card_period(db_session: Session) -> None:
    card = Card(
        name="CMR Falabella",
        currency=CurrencyEnum.CLP,
        closing_day=25,
        due_day=10,
    )
    db_session.add(card)
    db_session.commit()

    fee1 = CardMonthlyFee(card_id=card.id, period="2026-11", fee=Decimal("3000"))
    fee2 = CardMonthlyFee(card_id=card.id, period="2026-11", fee=Decimal("4000"))
    db_session.add(fee1)
    db_session.commit()

    db_session.add(fee2)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_card_monthly_fee_check_constraint_rejects_negative_fee(db_session: Session) -> None:
    card = Card(
        name="CMR Falabella",
        currency=CurrencyEnum.CLP,
        closing_day=25,
        due_day=10,
    )
    db_session.add(card)
    db_session.commit()

    invalid_fee = CardMonthlyFee(
        card_id=card.id,
        period="2026-11",
        fee=Decimal("-0.01"),
    )
    db_session.add(invalid_fee)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()


def test_card_monthly_fees_cascade_delete(db_session: Session) -> None:
    card = Card(
        name="CMR Falabella",
        currency=CurrencyEnum.CLP,
        closing_day=25,
        due_day=10,
    )
    db_session.add(card)
    db_session.commit()

    fee1 = CardMonthlyFee(card_id=card.id, period="2026-11", fee=Decimal("3500"))
    fee2 = CardMonthlyFee(card_id=card.id, period="2026-12", fee=Decimal("4000"))
    card.monthly_fees.extend([fee1, fee2])
    db_session.commit()

    assert len(card.monthly_fees) == 2

    # Delete card (no expenses associated), should cascade delete card_monthly_fees
    db_session.delete(card)
    db_session.commit()

    remaining_fees = list(db_session.scalars(select(CardMonthlyFee)).all())
    assert remaining_fees == []


def test_card_monthly_fee_composite_index() -> None:
    index_names = {idx.name for idx in CardMonthlyFee.__table__.indexes}
    assert "ix_card_monthly_fees_period_card_id" in index_names

