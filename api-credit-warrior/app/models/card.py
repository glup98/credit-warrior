import uuid
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Enum,
    Index,
    Numeric,
    SmallInteger,
    String,
    Uuid,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, CurrencyEnum, TimestampMixin

if TYPE_CHECKING:
    from app.models.card_monthly_fee import CardMonthlyFee
    from app.models.expense import Expense


class Card(Base, TimestampMixin):
    """Credit Card entity with billing closing day and payment due day configuration."""

    __tablename__ = "cards"
    __table_args__ = (
        CheckConstraint("closing_day BETWEEN 1 AND 31", name="ck_cards_closing_day"),
        CheckConstraint("due_day BETWEEN 1 AND 31", name="ck_cards_due_day"),
        CheckConstraint(
            "default_monthly_fee >= 0",
            name="ck_cards_default_monthly_fee_non_negative",
        ),
        Index("ix_cards_is_active_name", "is_active", "name"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    # Masked identifier: only the last 4 digits are ever stored (PII/PCI safe)
    last_four_digits: Mapped[str | None] = mapped_column(String(4), nullable=True)
    currency: Mapped[CurrencyEnum] = mapped_column(
        Enum(CurrencyEnum, name="currency_enum"),
        default=CurrencyEnum.CLP,
        nullable=False,
    )
    closing_day: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    due_day: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    default_monthly_fee: Mapped[Decimal] = mapped_column(
        Numeric(14, 2),
        default=Decimal("0"),
        server_default=text("0"),
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    expenses: Mapped[list["Expense"]] = relationship(
        "Expense",
        back_populates="card",
        passive_deletes=True,
    )
    monthly_fees: Mapped[list["CardMonthlyFee"]] = relationship(
        "CardMonthlyFee",
        back_populates="card",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

