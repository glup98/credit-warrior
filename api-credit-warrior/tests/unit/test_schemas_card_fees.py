import uuid
from decimal import Decimal

import pytest
from pydantic import ValidationError

from app.models.base import FeeSourceEnum
from app.schemas.card import CardCreate, CardRead, CardUpdate
from app.schemas.card_fee import (
    CardMonthlyFeeCreateOrUpdate,
    CardMonthlyFeeResponse,
)


def test_card_create_default_monthly_fee_default() -> None:
    card = CardCreate(
        name="Santander Life",
        closing_day=20,
        due_day=5,
    )
    assert card.default_monthly_fee == Decimal("0")


def test_card_create_default_monthly_fee_custom_valid() -> None:
    card = CardCreate(
        name="Santander Life",
        closing_day=20,
        due_day=5,
        default_monthly_fee=Decimal("4500.50"),
    )
    assert card.default_monthly_fee == Decimal("4500.50")

    card_zero = CardCreate(
        name="Santander Life",
        closing_day=20,
        due_day=5,
        default_monthly_fee=Decimal("0"),
    )
    assert card_zero.default_monthly_fee == Decimal("0")

    card_str = CardCreate(
        name="Santander Life",
        closing_day=20,
        due_day=5,
        default_monthly_fee="3000",  # type: ignore[arg-type]
    )
    assert card_str.default_monthly_fee == Decimal("3000")


def test_card_create_default_monthly_fee_rejects_negative_or_null() -> None:
    with pytest.raises(ValidationError):
        CardCreate(
            name="Santander Life",
            closing_day=20,
            due_day=5,
            default_monthly_fee=Decimal("-1.00"),
        )

    with pytest.raises(ValidationError):
        CardCreate(
            name="Santander Life",
            closing_day=20,
            due_day=5,
            default_monthly_fee="-0.01",  # type: ignore[arg-type]
        )

    with pytest.raises(ValidationError):
        CardCreate(
            name="Santander Life",
            closing_day=20,
            due_day=5,
            default_monthly_fee=None,  # type: ignore[arg-type]
        )


def test_card_create_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        CardCreate(
            name="Santander Life",
            closing_day=20,
            due_day=5,
            extra_field="unwanted",  # type: ignore[call-arg]
        )


def test_card_update_default_monthly_fee_valid_and_omitted() -> None:
    upd_empty = CardUpdate()
    assert upd_empty.default_monthly_fee is None

    upd_valid = CardUpdate(default_monthly_fee=Decimal("2500"))
    assert upd_valid.default_monthly_fee == Decimal("2500")

    upd_zero = CardUpdate(default_monthly_fee=Decimal("0"))
    assert upd_zero.default_monthly_fee == Decimal("0")


def test_card_update_default_monthly_fee_rejects_negative() -> None:
    with pytest.raises(ValidationError):
        CardUpdate(default_monthly_fee=Decimal("-1"))

    with pytest.raises(ValidationError):
        CardUpdate(default_monthly_fee="-0.50")  # type: ignore[arg-type]


def test_card_update_rejects_extra_fields() -> None:
    with pytest.raises(ValidationError):
        CardUpdate(
            default_monthly_fee=Decimal("100"),
            forbidden_extra="bad",  # type: ignore[call-arg]
        )


def test_card_read_includes_default_monthly_fee() -> None:
    card_id = uuid.uuid4()
    card_read = CardRead(
        id=card_id,
        name="Santander Life",
        closing_day=20,
        due_day=5,
        default_monthly_fee=Decimal("3500"),
        created_at="2026-10-22T10:00:00Z",  # type: ignore[arg-type]
        updated_at="2026-10-22T10:00:00Z",  # type: ignore[arg-type]
    )
    assert card_read.default_monthly_fee == Decimal("3500")


def test_card_monthly_fee_create_or_update_valid() -> None:
    dto_positive = CardMonthlyFeeCreateOrUpdate(fee=Decimal("3500.00"))
    assert dto_positive.fee == Decimal("3500.00")

    dto_zero = CardMonthlyFeeCreateOrUpdate(fee=Decimal("0"))
    assert dto_zero.fee == Decimal("0")

    dto_str = CardMonthlyFeeCreateOrUpdate(fee="1200")  # type: ignore[arg-type]
    assert dto_str.fee == Decimal("1200")


def test_card_monthly_fee_create_or_update_rejects_negative_or_null_or_missing() -> None:
    with pytest.raises(ValidationError):
        CardMonthlyFeeCreateOrUpdate(fee=Decimal("-1"))

    with pytest.raises(ValidationError):
        CardMonthlyFeeCreateOrUpdate(fee="-0.01")  # type: ignore[arg-type]

    with pytest.raises(ValidationError):
        CardMonthlyFeeCreateOrUpdate(fee=None)  # type: ignore[arg-type]

    with pytest.raises(ValidationError):
        CardMonthlyFeeCreateOrUpdate()  # type: ignore[call-arg]


def test_card_monthly_fee_create_or_update_forbids_extra_fields() -> None:
    with pytest.raises(ValidationError):
        CardMonthlyFeeCreateOrUpdate(
            fee=Decimal("1000"),
            extra="disallowed",  # type: ignore[call-arg]
        )


def test_card_monthly_fee_response_valid() -> None:
    card_id = uuid.uuid4()
    resp_override = CardMonthlyFeeResponse(
        card_id=card_id,
        period="2026-11",
        fee=Decimal("3500"),
        source=FeeSourceEnum.OVERRIDE,
    )
    assert resp_override.card_id == card_id
    assert resp_override.period == "2026-11"
    assert resp_override.fee == Decimal("3500")
    assert resp_override.source == FeeSourceEnum.OVERRIDE
    assert resp_override.source == "OVERRIDE"

    resp_default = CardMonthlyFeeResponse(
        card_id=card_id,
        period="2026-01",
        fee=Decimal("0"),
        source=FeeSourceEnum.CARD_DEFAULT,
    )
    assert resp_default.source == FeeSourceEnum.CARD_DEFAULT
    assert resp_default.source == "CARD_DEFAULT"


def test_card_monthly_fee_response_from_attributes() -> None:
    card_id = uuid.uuid4()

    class FeeRecord:
        def __init__(self) -> None:
            self.card_id = card_id
            self.period = "2026-07"
            self.fee = Decimal("1800.50")
            self.source = FeeSourceEnum.OVERRIDE

    resp = CardMonthlyFeeResponse.model_validate(FeeRecord())
    assert resp.card_id == card_id
    assert resp.period == "2026-07"
    assert resp.fee == Decimal("1800.50")
    assert resp.source == FeeSourceEnum.OVERRIDE


@pytest.mark.parametrize(
    "valid_period",
    ["2026-01", "2026-09", "2026-10", "2026-12", "1999-06", "2099-11"],
)
def test_card_monthly_fee_response_valid_periods(valid_period: str) -> None:
    card_id = uuid.uuid4()
    resp = CardMonthlyFeeResponse(
        card_id=card_id,
        period=valid_period,
        fee=Decimal("100"),
        source=FeeSourceEnum.CARD_DEFAULT,
    )
    assert resp.period == valid_period


@pytest.mark.parametrize(
    "invalid_period",
    [
        "2026-00",
        "2026-13",
        "2026-1",
        "2026-001",
        "26-11",
        "2026/11",
        "2026.11",
        "202611",
        "invalid",
        "",
        "2026-20",
    ],
)
def test_card_monthly_fee_response_invalid_periods(invalid_period: str) -> None:
    card_id = uuid.uuid4()
    with pytest.raises(ValidationError):
        CardMonthlyFeeResponse(
            card_id=card_id,
            period=invalid_period,
            fee=Decimal("100"),
            source=FeeSourceEnum.OVERRIDE,
        )


def test_card_monthly_fee_response_invalid_source_or_card_id() -> None:
    card_id = uuid.uuid4()
    with pytest.raises(ValidationError):
        CardMonthlyFeeResponse(
            card_id=card_id,
            period="2026-11",
            fee=Decimal("100"),
            source="INVALID_SOURCE",  # type: ignore[arg-type]
        )

    with pytest.raises(ValidationError):
        CardMonthlyFeeResponse(
            card_id="not-a-uuid",  # type: ignore[arg-type]
            period="2026-11",
            fee=Decimal("100"),
            source=FeeSourceEnum.OVERRIDE,
        )
