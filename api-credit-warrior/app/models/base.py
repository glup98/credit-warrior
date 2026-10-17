import enum
from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """Declarative base for all SQLAlchemy 2.0 ORM models."""


class TimestampMixin:
    """Reusable created_at and updated_at timestamp columns."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class CurrencyEnum(enum.StrEnum):
    """Supported card billing currencies."""

    CLP = "CLP"
    USD = "USD"


class SplitTypeEnum(enum.StrEnum):
    """Supported expense division strategies across persons."""

    EQUAL = "EQUAL"
    PERCENTAGE = "PERCENTAGE"
    FIXED_AMOUNT = "FIXED_AMOUNT"


class FeeSourceEnum(enum.StrEnum):
    """Source indicator for monthly maintenance fee (default or explicit override)."""

    CARD_DEFAULT = "CARD_DEFAULT"
    OVERRIDE = "OVERRIDE"

