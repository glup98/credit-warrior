import uuid
from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    desc,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SplitTypeEnum, TimestampMixin

if TYPE_CHECKING:
    from app.models.card import Card
    from app.models.person import Person


class Expense(Base, TimestampMixin):
    """Master purchase record. Individual monthly installments are computed on-the-fly."""

    __tablename__ = "expenses"
    __table_args__ = (
        CheckConstraint("total_amount > 0", name="ck_expenses_total_amount_positive"),
        CheckConstraint(
            "installments_count BETWEEN 1 AND 120",
            name="ck_expenses_installments_range",
        ),
        Index(
            "ix_expenses_purchase_date_created_at",
            desc("purchase_date"),
            desc("created_at"),
        ),
        Index("ix_expenses_card_id_purchase_date", "card_id", "purchase_date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    card_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("cards.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    purchase_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    installments_count: Mapped[int] = mapped_column(SmallInteger, default=1, nullable=False)
    first_billing_override: Mapped[str | None] = mapped_column(String(7), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    card: Mapped["Card"] = relationship("Card", back_populates="expenses")
    splits: Mapped[list["ExpenseSplit"]] = relationship(
        "ExpenseSplit",
        back_populates="expense",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class ExpenseSplit(Base):
    """Allocation of an Expense across one or more Persons."""

    __tablename__ = "expense_splits"
    __table_args__ = (
        UniqueConstraint("expense_id", "person_id", name="uq_expense_person"),
        CheckConstraint(
            "percentage IS NULL OR (percentage > 0 AND percentage <= 100)",
            name="ck_expense_splits_percentage",
        ),
        CheckConstraint(
            "fixed_amount IS NULL OR fixed_amount > 0",
            name="ck_expense_splits_fixed_amount",
        ),
        Index("ix_expense_splits_person_id_expense_id", "person_id", "expense_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    expense_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("expenses.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    person_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("persons.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    split_type: Mapped[SplitTypeEnum] = mapped_column(
        Enum(SplitTypeEnum, name="split_type_enum"),
        default=SplitTypeEnum.EQUAL,
        nullable=False,
    )
    percentage: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    fixed_amount: Mapped[Decimal | None] = mapped_column(Numeric(14, 2), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    expense: Mapped["Expense"] = relationship("Expense", back_populates="splits")
    person: Mapped["Person"] = relationship("Person", back_populates="splits")
