"""add_performance_indexes

Revision ID: c7b8d2e4f01a
Revises: 6395abdeaa39
Create Date: 2026-10-26 14:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c7b8d2e4f01a"
down_revision: str | None = "6395abdeaa39"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index(
        "ix_expenses_purchase_date_created_at",
        "expenses",
        [sa.text("purchase_date DESC"), sa.text("created_at DESC")],
        unique=False,
    )
    op.create_index(
        "ix_expenses_card_id_purchase_date",
        "expenses",
        ["card_id", "purchase_date"],
        unique=False,
    )
    op.create_index(
        "ix_card_monthly_fees_period_card_id",
        "card_monthly_fees",
        ["period", "card_id"],
        unique=False,
    )
    op.create_index(
        "ix_expense_splits_person_id_expense_id",
        "expense_splits",
        ["person_id", "expense_id"],
        unique=False,
    )
    op.create_index(
        "ix_cards_is_active_name",
        "cards",
        ["is_active", "name"],
        unique=False,
    )
    op.create_index(
        "ix_persons_is_active_name",
        "persons",
        ["is_active", "name"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_persons_is_active_name", table_name="persons")
    op.drop_index("ix_cards_is_active_name", table_name="cards")
    op.drop_index("ix_expense_splits_person_id_expense_id", table_name="expense_splits")
    op.drop_index("ix_card_monthly_fees_period_card_id", table_name="card_monthly_fees")
    op.drop_index("ix_expenses_card_id_purchase_date", table_name="expenses")
    op.drop_index("ix_expenses_purchase_date_created_at", table_name="expenses")
