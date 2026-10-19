import uuid
from datetime import date
from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.models.base import SplitTypeEnum
from app.schemas.expense import ExpenseCreate, ExpenseSplitInput


def test_expense_create_valid_equal_percentage_and_fixed() -> None:
    card_id = uuid.uuid4()
    p1 = uuid.uuid4()
    p2 = uuid.uuid4()

    # 1. EQUAL
    exp_eq = ExpenseCreate(
        card_id=card_id,
        description="  Aspiradora Robot  ",
        total_amount=Decimal("300000"),
        purchase_date=date(2026, 10, 16),
        installments_count=3,
        splits=[
            ExpenseSplitInput(person_id=p1, split_type=SplitTypeEnum.EQUAL),
            ExpenseSplitInput(person_id=p2, split_type=SplitTypeEnum.EQUAL),
        ],
    )
    assert exp_eq.description == "Aspiradora Robot"

    # 2. PERCENTAGE summing to 100.00
    exp_pct = ExpenseCreate(
        card_id=card_id,
        description="Supermercado",
        total_amount=Decimal("100000"),
        purchase_date=date(2026, 10, 16),
        installments_count=1,
        splits=[
            ExpenseSplitInput(
                person_id=p1,
                split_type=SplitTypeEnum.PERCENTAGE,
                percentage=Decimal("60.00"),
            ),
            ExpenseSplitInput(
                person_id=p2,
                split_type=SplitTypeEnum.PERCENTAGE,
                percentage=Decimal("40.00"),
            ),
        ],
    )
    assert len(exp_pct.splits) == 2

    # 3. FIXED_AMOUNT summing to total_amount
    exp_fix = ExpenseCreate(
        card_id=card_id,
        description="Cena",
        total_amount=Decimal("50000"),
        purchase_date=date(2026, 10, 16),
        installments_count=1,
        splits=[
            ExpenseSplitInput(
                person_id=p1,
                split_type=SplitTypeEnum.FIXED_AMOUNT,
                fixed_amount=Decimal("30000"),
            ),
            ExpenseSplitInput(
                person_id=p2,
                split_type=SplitTypeEnum.FIXED_AMOUNT,
                fixed_amount=Decimal("20000"),
            ),
        ],
    )
    assert exp_fix.total_amount == Decimal("50000")


def test_expense_create_rejects_broken_invariants_rf06() -> None:
    card_id = uuid.uuid4()
    p1 = uuid.uuid4()
    p2 = uuid.uuid4()

    # Duplicate person_id in splits
    with pytest.raises(ValidationError):
        ExpenseCreate(
            card_id=card_id,
            description="Test",
            total_amount=Decimal("10000"),
            purchase_date=date(2026, 10, 16),
            splits=[
                ExpenseSplitInput(person_id=p1, split_type=SplitTypeEnum.EQUAL),
                ExpenseSplitInput(person_id=p1, split_type=SplitTypeEnum.EQUAL),
            ],
        )

    # Mixed split_type
    with pytest.raises(ValidationError):
        ExpenseCreate(
            card_id=card_id,
            description="Test",
            total_amount=Decimal("10000"),
            purchase_date=date(2026, 10, 16),
            splits=[
                ExpenseSplitInput(person_id=p1, split_type=SplitTypeEnum.EQUAL),
                ExpenseSplitInput(
                    person_id=p2,
                    split_type=SplitTypeEnum.PERCENTAGE,
                    percentage=Decimal("50"),
                ),
            ],
        )

    # Percentage sum != 100
    with pytest.raises(ValidationError):
        ExpenseCreate(
            card_id=card_id,
            description="Test",
            total_amount=Decimal("10000"),
            purchase_date=date(2026, 10, 16),
            splits=[
                ExpenseSplitInput(
                    person_id=p1,
                    split_type=SplitTypeEnum.PERCENTAGE,
                    percentage=Decimal("50"),
                ),
                ExpenseSplitInput(
                    person_id=p2,
                    split_type=SplitTypeEnum.PERCENTAGE,
                    percentage=Decimal("40"),
                ),
            ],
        )

    # Fixed amount sum != total_amount
    with pytest.raises(ValidationError):
        ExpenseCreate(
            card_id=card_id,
            description="Test",
            total_amount=Decimal("10000"),
            purchase_date=date(2026, 10, 16),
            splits=[
                ExpenseSplitInput(
                    person_id=p1,
                    split_type=SplitTypeEnum.FIXED_AMOUNT,
                    fixed_amount=Decimal("5000"),
                ),
                ExpenseSplitInput(
                    person_id=p2,
                    split_type=SplitTypeEnum.FIXED_AMOUNT,
                    fixed_amount=Decimal("4000"),
                ),
            ],
        )
