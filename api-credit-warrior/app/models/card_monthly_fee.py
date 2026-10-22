import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, ForeignKey, Index, Numeric, String, UniqueConstraint, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.card import Card


class CardMonthlyFee(Base, TimestampMixin):
    """Explicit monthly fee override for a card in a given YYYY-MM period."""

    __tablename__ = "card_monthly_fees"
    __table_args__ = (
        UniqueConstraint("card_id", "period", name="uq_card_monthly_fees_card_period"),
        CheckConstraint("fee >= 0", name="ck_card_monthly_fees_fee_non_negative"),
        Index("ix_card_monthly_fees_period_card_id", "period", "card_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    card_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("cards.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    period: Mapped[str] = mapped_column(String(7), nullable=False)  # YYYY-MM
    fee: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)

    card: Mapped["Card"] = relationship("Card", back_populates="monthly_fees")
