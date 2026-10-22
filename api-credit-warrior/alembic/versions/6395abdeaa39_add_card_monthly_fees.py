"""add_card_monthly_fees

Revision ID: 6395abdeaa39
Revises: 9fa7b2e51222
Create Date: 2026-10-22 14:42:10.003305

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "6395abdeaa39"
down_revision: str | None = "9fa7b2e51222"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "cards",
        sa.Column(
            "default_monthly_fee",
            sa.Numeric(precision=14, scale=2),
            server_default="0",
            nullable=False,
        ),
    )
    op.create_check_constraint(
        "ck_cards_default_monthly_fee_non_negative",
        "cards",
        "default_monthly_fee >= 0",
    )
    op.create_table(
        "card_monthly_fees",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("card_id", sa.Uuid(), nullable=False),
        sa.Column("period", sa.String(length=7), nullable=False),
        sa.Column("fee", sa.Numeric(precision=14, scale=2), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("fee >= 0", name="ck_card_monthly_fees_fee_non_negative"),
        sa.ForeignKeyConstraint(["card_id"], ["cards.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("card_id", "period", name="uq_card_monthly_fees_card_period"),
    )
    op.create_index(
        op.f("ix_card_monthly_fees_card_id"),
        "card_monthly_fees",
        ["card_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_card_monthly_fees_card_id"), table_name="card_monthly_fees")
    op.drop_table("card_monthly_fees")
    op.drop_constraint("ck_cards_default_monthly_fee_non_negative", "cards", type_="check")
    op.drop_column("cards", "default_monthly_fee")
