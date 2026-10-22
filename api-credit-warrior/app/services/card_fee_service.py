import uuid
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy.orm import Session

from app.core.exceptions import EntityNotFoundError
from app.models.base import FeeSourceEnum
from app.repositories.card_fee_repo import CardFeeRepository
from app.repositories.card_repo import CardRepository
from app.schemas.card_fee import CardMonthlyFeeResponse
from app.services.billing_engine import currency_quantum


class CardFeeService:
    """Domain service for managing card monthly maintenance fees and overrides."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.card_repo = CardRepository(db)
        self.fee_repo = CardFeeRepository(db)

    def set_fee(
        self,
        card_id: uuid.UUID,
        period: str,
        fee: Decimal,
    ) -> CardMonthlyFeeResponse:
        """Register or update a monthly maintenance fee override for a card in a given period."""
        card = self.card_repo.get_by_id(card_id)
        if card is None:
            raise EntityNotFoundError("Card", card_id)

        quantum = currency_quantum(card.currency)
        normalized_fee = Decimal(fee).quantize(quantum, rounding=ROUND_HALF_UP)

        record = self.fee_repo.upsert_monthly_fee(
            card_id=card.id,
            period=period,
            fee=normalized_fee,
        )

        return CardMonthlyFeeResponse(
            card_id=record.card_id,
            period=record.period,
            fee=record.fee,
            source=FeeSourceEnum.OVERRIDE,
        )

    def get_fee(
        self,
        card_id: uuid.UUID,
        period: str,
    ) -> CardMonthlyFeeResponse:
        """Retrieve effective maintenance fee for a period (override or card default)."""
        card = self.card_repo.get_by_id(card_id)
        if card is None:
            raise EntityNotFoundError("Card", card_id)

        quantum = currency_quantum(card.currency)
        override = self.fee_repo.get_by_card_and_period(card_id=card.id, period=period)

        if override is not None:
            return CardMonthlyFeeResponse(
                card_id=card.id,
                period=period,
                fee=Decimal(override.fee).quantize(quantum, rounding=ROUND_HALF_UP),
                source=FeeSourceEnum.OVERRIDE,
            )

        return CardMonthlyFeeResponse(
            card_id=card.id,
            period=period,
            fee=Decimal(card.default_monthly_fee).quantize(quantum, rounding=ROUND_HALF_UP),
            source=FeeSourceEnum.CARD_DEFAULT,
        )

    def list_fees(self, card_id: uuid.UUID) -> list[CardMonthlyFeeResponse]:
        """List all registered fee overrides for a card, ordered chronologically ascending."""
        card = self.card_repo.get_by_id(card_id)
        if card is None:
            raise EntityNotFoundError("Card", card_id)

        quantum = currency_quantum(card.currency)
        overrides = self.fee_repo.list_by_card(card_id=card.id)

        return [
            CardMonthlyFeeResponse(
                card_id=item.card_id,
                period=item.period,
                fee=Decimal(item.fee).quantize(quantum, rounding=ROUND_HALF_UP),
                source=FeeSourceEnum.OVERRIDE,
            )
            for item in overrides
        ]

    def delete_fee(self, card_id: uuid.UUID, period: str) -> None:
        """Delete an existing fee override for a period, reverting back to card default."""
        card = self.card_repo.get_by_id(card_id)
        if card is None:
            raise EntityNotFoundError("Card", card_id)

        deleted = self.fee_repo.delete_by_card_and_period(card_id=card.id, period=period)
        if not deleted:
            raise EntityNotFoundError("CardMonthlyFee", f"{card_id}:{period}")
