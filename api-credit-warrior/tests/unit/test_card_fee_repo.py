import uuid
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.base import CurrencyEnum
from app.models.card import Card
from app.models.card_monthly_fee import CardMonthlyFee
from app.repositories.card_fee_repo import CardFeeRepository


def _create_test_card(db: Session, name: str = "Test Card") -> Card:
    card = Card(
        name=name,
        currency=CurrencyEnum.CLP,
        closing_day=20,
        due_day=5,
        default_monthly_fee=Decimal("1000.00"),
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


def test_upsert_monthly_fee_creates_new_record(db_session: Session) -> None:
    card = _create_test_card(db_session)
    repo = CardFeeRepository(db_session)

    fee_record = repo.upsert_monthly_fee(card.id, "2026-11", Decimal("3500.00"))

    assert isinstance(fee_record.id, uuid.UUID)
    assert fee_record.card_id == card.id
    assert fee_record.period == "2026-11"
    assert fee_record.fee == Decimal("3500.00")

    # Verify directly via DB query
    queried = repo.get_by_card_and_period(card.id, "2026-11")
    assert queried is not None
    assert queried.id == fee_record.id
    assert queried.fee == Decimal("3500.00")


def test_upsert_monthly_fee_updates_existing_record_idempotently(db_session: Session) -> None:
    card = _create_test_card(db_session)
    repo = CardFeeRepository(db_session)

    initial_record = repo.upsert_monthly_fee(card.id, "2026-11", Decimal("3500.00"))
    initial_id = initial_record.id

    # Update the fee for the same card and period
    updated_record = repo.upsert_monthly_fee(card.id, "2026-11", Decimal("4500.00"))

    assert updated_record.id == initial_id
    assert updated_record.fee == Decimal("4500.00")

    # Ensure no duplicate rows were created
    all_fees = list(
        db_session.scalars(
            select(CardMonthlyFee).where(
                CardMonthlyFee.card_id == card.id,
                CardMonthlyFee.period == "2026-11",
            )
        ).all()
    )
    assert len(all_fees) == 1
    assert all_fees[0].fee == Decimal("4500.00")


def test_get_by_card_and_period_returns_record_or_none(db_session: Session) -> None:
    card = _create_test_card(db_session)
    repo = CardFeeRepository(db_session)

    # When record does not exist
    assert repo.get_by_card_and_period(card.id, "2026-10") is None
    assert repo.get_by_card_and_period(uuid.uuid4(), "2026-11") is None

    # After record creation
    created = repo.upsert_monthly_fee(card.id, "2026-11", Decimal("2500.00"))
    fetched = repo.get_by_card_and_period(card.id, "2026-11")

    assert fetched is not None
    assert fetched.id == created.id
    assert fetched.fee == Decimal("2500.00")
    assert fetched.period == "2026-11"


def test_list_by_card_returns_chronologically_sorted_asc(db_session: Session) -> None:
    card1 = _create_test_card(db_session, name="Card 1")
    card2 = _create_test_card(db_session, name="Card 2")
    repo = CardFeeRepository(db_session)

    # Empty list when no records exist
    assert repo.list_by_card(card1.id) == []

    # Insert out-of-order periods for card 1
    repo.upsert_monthly_fee(card1.id, "2026-12", Decimal("3000.00"))
    repo.upsert_monthly_fee(card1.id, "2026-05", Decimal("1500.00"))
    repo.upsert_monthly_fee(card1.id, "2027-01", Decimal("4000.00"))
    repo.upsert_monthly_fee(card1.id, "2026-08", Decimal("2000.00"))

    # Insert a fee for card 2 (should not appear in card 1's list)
    repo.upsert_monthly_fee(card2.id, "2026-06", Decimal("9999.00"))

    fees_card1 = repo.list_by_card(card1.id)
    assert len(fees_card1) == 4
    assert [f.period for f in fees_card1] == ["2026-05", "2026-08", "2026-12", "2027-01"]
    assert all(f.card_id == card1.id for f in fees_card1)

    fees_card2 = repo.list_by_card(card2.id)
    assert len(fees_card2) == 1
    assert fees_card2[0].period == "2026-06"
    assert fees_card2[0].fee == Decimal("9999.00")


def test_delete_by_card_and_period_removes_record_and_returns_boolean(
    db_session: Session,
) -> None:
    card = _create_test_card(db_session)
    repo = CardFeeRepository(db_session)

    # Attempting to delete non-existent record returns False
    assert repo.delete_by_card_and_period(card.id, "2026-11") is False
    assert repo.delete_by_card_and_period(uuid.uuid4(), "2026-11") is False

    # Insert a record
    repo.upsert_monthly_fee(card.id, "2026-11", Decimal("3000.00"))
    assert repo.get_by_card_and_period(card.id, "2026-11") is not None

    # Deleting an existing record returns True
    assert repo.delete_by_card_and_period(card.id, "2026-11") is True

    # Record is no longer retrievable
    assert repo.get_by_card_and_period(card.id, "2026-11") is None

    # Deleting again returns False
    assert repo.delete_by_card_and_period(card.id, "2026-11") is False


def test_get_fees_by_period_returns_mapped_dict_or_empty(db_session: Session) -> None:
    card1 = _create_test_card(db_session, name="Card 1")
    card2 = _create_test_card(db_session, name="Card 2")
    repo = CardFeeRepository(db_session)

    # Empty when no records exist
    assert repo.get_fees_by_period("2026-11") == {}

    # Insert records for 2026-11 and 2026-12
    rec1 = repo.upsert_monthly_fee(card1.id, "2026-11", Decimal("3500.00"))
    rec2 = repo.upsert_monthly_fee(card2.id, "2026-11", Decimal("4500.00"))
    repo.upsert_monthly_fee(card1.id, "2026-12", Decimal("5000.00"))

    fees_2026_11 = repo.get_fees_by_period("2026-11")
    assert len(fees_2026_11) == 2
    assert fees_2026_11[card1.id].id == rec1.id
    assert fees_2026_11[card1.id].fee == Decimal("3500.00")
    assert fees_2026_11[card2.id].id == rec2.id
    assert fees_2026_11[card2.id].fee == Decimal("4500.00")


def test_get_fees_by_periods_handles_empty_sequence_without_db_query(
    db_session: Session,
) -> None:
    repo = CardFeeRepository(db_session)
    assert repo.get_fees_by_periods([]) == {}
    assert repo.get_fees_by_periods(()) == {}


def test_get_fees_by_periods_returns_composite_key_mapping(db_session: Session) -> None:
    card1 = _create_test_card(db_session, name="Card 1")
    card2 = _create_test_card(db_session, name="Card 2")
    repo = CardFeeRepository(db_session)

    rec1 = repo.upsert_monthly_fee(card1.id, "2026-10", Decimal("1000.00"))
    rec2 = repo.upsert_monthly_fee(card1.id, "2026-11", Decimal("2000.00"))
    rec3 = repo.upsert_monthly_fee(card2.id, "2026-11", Decimal("3000.00"))
    repo.upsert_monthly_fee(card2.id, "2026-12", Decimal("4000.00"))

    batch = repo.get_fees_by_periods(["2026-10", "2026-11"])
    assert len(batch) == 3
    assert (card1.id, "2026-10") in batch
    assert batch[(card1.id, "2026-10")].id == rec1.id
    assert (card1.id, "2026-11") in batch
    assert batch[(card1.id, "2026-11")].id == rec2.id
    assert (card2.id, "2026-11") in batch
    assert batch[(card2.id, "2026-11")].id == rec3.id
    assert (card2.id, "2026-12") not in batch

