import uuid
from collections.abc import Sequence
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.card_monthly_fee import CardMonthlyFee


class CardFeeRepository:
    """Repository managing monthly fee overrides for credit cards."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_card_and_period(
        self,
        card_id: uuid.UUID,
        period: str,
    ) -> CardMonthlyFee | None:
        """Fetch a single monthly fee override by card and period, or None if not found."""
        stmt = select(CardMonthlyFee).where(
            CardMonthlyFee.card_id == card_id,
            CardMonthlyFee.period == period,
        )
        return self.db.scalar(stmt)

    def upsert_monthly_fee(
        self,
        card_id: uuid.UUID,
        period: str,
        fee: Decimal,
    ) -> CardMonthlyFee:
        """Create or update a monthly fee override for a card and period idempotently."""
        existing = self.get_by_card_and_period(card_id, period)
        if existing is not None:
            existing.fee = fee
            self.db.commit()
            self.db.refresh(existing)
            return existing

        record = CardMonthlyFee(
            card_id=card_id,
            period=period,
            fee=fee,
        )
        self.db.add(record)
        self.db.commit()
        self.db.refresh(record)
        return record

    def list_by_card(self, card_id: uuid.UUID) -> list[CardMonthlyFee]:
        """List all monthly fee overrides for a card ordered chronologically ascending."""
        stmt = (
            select(CardMonthlyFee)
            .where(CardMonthlyFee.card_id == card_id)
            .order_by(CardMonthlyFee.period.asc())
        )
        return list(self.db.scalars(stmt).all())

    def delete_by_card_and_period(
        self,
        card_id: uuid.UUID,
        period: str,
    ) -> bool:
        """Delete a monthly fee override if it exists. Returns True if deleted, False otherwise."""
        existing = self.get_by_card_and_period(card_id, period)
        if existing is None:
            return False

        self.db.delete(existing)
        self.db.commit()
        return True

    def get_fees_by_period(self, period: str) -> dict[uuid.UUID, CardMonthlyFee]:
        """Fetch all fee overrides for a given period across all cards in a single query."""
        stmt = select(CardMonthlyFee).where(CardMonthlyFee.period == period)
        records = self.db.scalars(stmt).all()
        return {rec.card_id: rec for rec in records}

    def get_fees_by_periods(
        self, periods: Sequence[str]
    ) -> dict[tuple[uuid.UUID, str], CardMonthlyFee]:
        """Fetch all fee overrides for a sequence of periods in a single grouped query."""
        if not periods:
            return {}
        stmt = select(CardMonthlyFee).where(CardMonthlyFee.period.in_(periods))
        records = self.db.scalars(stmt).all()
        return {(rec.card_id, rec.period): rec for rec in records}

