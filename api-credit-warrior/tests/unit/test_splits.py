import uuid
from decimal import Decimal

from app.models.base import CurrencyEnum, SplitTypeEnum
from app.services.billing_engine import SplitSpec, compute_person_shares


def test_equal_split_50_50_odd_clp_installment_rf04() -> None:
    p1 = uuid.uuid4()
    p2 = uuid.uuid4()
    splits = [
        SplitSpec(person_id=p1, person_name="Anyi", split_type=SplitTypeEnum.EQUAL),
        SplitSpec(person_id=p2, person_name="Augusto", split_type=SplitTypeEnum.EQUAL),
    ]
    # Odd CLP installment: 33333 -> 16667 and 16666
    shares = compute_person_shares(
        installment_amount=Decimal("33333"),
        total_amount=Decimal("100000"),
        splits=splits,
        currency=CurrencyEnum.CLP,
    )
    assert [s.amount for s in shares] == [Decimal("16667"), Decimal("16666")]
    assert sum(s.amount for s in shares) == Decimal("33333")


def test_percentage_and_fixed_amount_splits_rf04() -> None:
    p1 = uuid.uuid4()
    p2 = uuid.uuid4()

    pct_splits = [
        SplitSpec(
            person_id=p1,
            person_name="Anyi",
            split_type=SplitTypeEnum.PERCENTAGE,
            percentage=Decimal("70.00"),
        ),
        SplitSpec(
            person_id=p2,
            person_name="Augusto",
            split_type=SplitTypeEnum.PERCENTAGE,
            percentage=Decimal("30.00"),
        ),
    ]
    pct_shares = compute_person_shares(
        installment_amount=Decimal("33.34"),
        total_amount=Decimal("100.00"),
        splits=pct_splits,
        currency=CurrencyEnum.USD,
    )
    assert [s.amount for s in pct_shares] == [Decimal("23.34"), Decimal("10.00")]
    assert sum(s.amount for s in pct_shares) == Decimal("33.34")

    fixed_splits = [
        SplitSpec(
            person_id=p1,
            person_name="Anyi",
            split_type=SplitTypeEnum.FIXED_AMOUNT,
            fixed_amount=Decimal("200000"),
        ),
        SplitSpec(
            person_id=p2,
            person_name="Augusto",
            split_type=SplitTypeEnum.FIXED_AMOUNT,
            fixed_amount=Decimal("100000"),
        ),
    ]
    fixed_shares = compute_person_shares(
        installment_amount=Decimal("100000"),
        total_amount=Decimal("300000"),
        splits=fixed_splits,
        currency=CurrencyEnum.CLP,
    )
    assert [s.amount for s in fixed_shares] == [Decimal("66667"), Decimal("33333")]
    assert sum(s.amount for s in fixed_shares) == Decimal("100000")
