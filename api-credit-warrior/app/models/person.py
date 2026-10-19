import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Index, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.expense import ExpenseSplit


class Person(Base, TimestampMixin):
    """Master entity / tag representing a person who shares credit card expenses."""

    __tablename__ = "persons"
    __table_args__ = (Index("ix_persons_is_active_name", "is_active", "name"),)

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    color_hex: Mapped[str | None] = mapped_column(String(7), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    splits: Mapped[list["ExpenseSplit"]] = relationship(
        "ExpenseSplit",
        back_populates="person",
        passive_deletes=True,
    )
