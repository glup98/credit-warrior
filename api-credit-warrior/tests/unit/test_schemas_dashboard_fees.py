import json
import uuid
from datetime import date
from decimal import Decimal

from app.models.base import CurrencyEnum
from app.schemas.dashboard import (
    CardMonthlySummary,
    CardPersonBreakdown,
    DashboardSummaryResponse,
)


def test_card_person_breakdown_defaults() -> None:
    pid = uuid.uuid4()
    breakdown = CardPersonBreakdown(
        person_id=pid,
        person_name="Anyi",
        amount_due=Decimal("15000"),
    )
    assert breakdown.person_id == pid
    assert breakdown.person_name == "Anyi"
    assert breakdown.amount_due == Decimal("15000")
    assert breakdown.purchases_amount == Decimal("0")
    assert breakdown.fee_share == Decimal("0")


def test_card_person_breakdown_explicit_values() -> None:
    pid = uuid.uuid4()
    breakdown = CardPersonBreakdown(
        person_id=pid,
        person_name="Augusto",
        purchases_amount=Decimal("25000"),
        fee_share=Decimal("1667"),
        amount_due=Decimal("26667"),
    )
    assert breakdown.purchases_amount == Decimal("25000")
    assert breakdown.fee_share == Decimal("1667")
    assert breakdown.amount_due == Decimal("26667")


def test_card_person_breakdown_serialization_and_deserialization() -> None:
    pid = uuid.uuid4()
    # Deserialization from minimal dict (retrocompatibility)
    raw_data = {
        "person_id": str(pid),
        "person_name": "Anyi",
        "amount_due": "5000.50",
    }
    obj = CardPersonBreakdown.model_validate(raw_data)
    assert obj.purchases_amount == Decimal("0")
    assert obj.fee_share == Decimal("0")
    assert obj.amount_due == Decimal("5000.50")

    # Serialization includes all fields
    dumped = obj.model_dump()
    assert dumped["purchases_amount"] == Decimal("0")
    assert dumped["fee_share"] == Decimal("0")
    assert dumped["amount_due"] == Decimal("5000.50")

    # Round trip with explicit fee fields
    full_data = {
        "person_id": str(pid),
        "person_name": "Anyi",
        "purchases_amount": "4000.00",
        "fee_share": "1000.50",
        "amount_due": "5000.50",
    }
    obj_full = CardPersonBreakdown.model_validate(full_data)
    assert obj_full.purchases_amount == Decimal("4000.00")
    assert obj_full.fee_share == Decimal("1000.50")
    assert obj_full.amount_due == Decimal("5000.50")

    json_str = obj_full.model_dump_json()
    parsed_json = json.loads(json_str)
    assert parsed_json["purchases_amount"] == "4000.00"
    assert parsed_json["fee_share"] == "1000.50"


def test_card_monthly_summary_defaults() -> None:
    card_id = uuid.uuid4()
    summary = CardMonthlySummary(
        card_id=card_id,
        card_name="CMR Falabella",
        currency=CurrencyEnum.CLP,
        closing_date=date(2026, 10, 25),
        due_date=date(2026, 11, 10),
        total_due=Decimal("50000"),
        by_person=[],
    )
    assert summary.card_id == card_id
    assert summary.card_name == "CMR Falabella"
    assert summary.currency == CurrencyEnum.CLP
    assert summary.closing_date == date(2026, 10, 25)
    assert summary.due_date == date(2026, 11, 10)
    assert summary.total_due == Decimal("50000")
    assert summary.purchases_total == Decimal("0")
    assert summary.maintenance_fee == Decimal("0")
    assert summary.by_person == []


def test_card_monthly_summary_explicit_values() -> None:
    card_id = uuid.uuid4()
    pid = uuid.uuid4()
    person_item = CardPersonBreakdown(
        person_id=pid,
        person_name="Anyi",
        purchases_amount=Decimal("45000"),
        fee_share=Decimal("5000"),
        amount_due=Decimal("50000"),
    )
    summary = CardMonthlySummary(
        card_id=card_id,
        card_name="Santander USD",
        currency=CurrencyEnum.USD,
        closing_date=date(2026, 10, 20),
        due_date=date(2026, 11, 5),
        purchases_total=Decimal("45000"),
        maintenance_fee=Decimal("5000"),
        total_due=Decimal("50000"),
        by_person=[person_item],
    )
    assert summary.purchases_total == Decimal("45000")
    assert summary.maintenance_fee == Decimal("5000")
    assert summary.total_due == Decimal("50000")
    assert len(summary.by_person) == 1
    assert summary.by_person[0].purchases_amount == Decimal("45000")
    assert summary.by_person[0].fee_share == Decimal("5000")


def test_card_monthly_summary_serialization_and_deserialization() -> None:
    card_id = uuid.uuid4()
    pid = uuid.uuid4()

    # Deserialization from minimal dict without fee fields
    raw_data = {
        "card_id": str(card_id),
        "card_name": "Visa",
        "currency": "CLP",
        "closing_date": "2026-10-25",
        "due_date": "2026-11-10",
        "total_due": "35000",
        "by_person": [
            {
                "person_id": str(pid),
                "person_name": "Augusto",
                "amount_due": "35000",
            }
        ],
    }
    summary = CardMonthlySummary.model_validate(raw_data)
    assert summary.purchases_total == Decimal("0")
    assert summary.maintenance_fee == Decimal("0")
    assert summary.total_due == Decimal("35000")
    assert summary.by_person[0].purchases_amount == Decimal("0")
    assert summary.by_person[0].fee_share == Decimal("0")

    # Model dump includes fee fields
    dumped = summary.model_dump()
    assert "purchases_total" in dumped
    assert "maintenance_fee" in dumped
    assert "total_due" in dumped
    assert "purchases_amount" in dumped["by_person"][0]
    assert "fee_share" in dumped["by_person"][0]


def test_dashboard_summary_response_contains_fee_breakdowns() -> None:
    card_id = uuid.uuid4()
    pid = uuid.uuid4()

    card_summary = CardMonthlySummary(
        card_id=card_id,
        card_name="Visa",
        currency=CurrencyEnum.CLP,
        closing_date=date(2026, 10, 25),
        due_date=date(2026, 11, 10),
        purchases_total=Decimal("45000"),
        maintenance_fee=Decimal("5000"),
        total_due=Decimal("50000"),
        by_person=[
            CardPersonBreakdown(
                person_id=pid,
                person_name="Anyi",
                purchases_amount=Decimal("45000"),
                fee_share=Decimal("5000"),
                amount_due=Decimal("50000"),
            )
        ],
    )

    resp = DashboardSummaryResponse(
        period="2026-11",
        totals_by_currency={CurrencyEnum.CLP: Decimal("50000")},
        by_card=[card_summary],
        by_person=[],
        active_installments=[],
    )

    dumped = resp.model_dump()
    assert dumped["by_card"][0]["purchases_total"] == Decimal("45000")
    assert dumped["by_card"][0]["maintenance_fee"] == Decimal("5000")
    assert dumped["by_card"][0]["total_due"] == Decimal("50000")
    assert dumped["by_card"][0]["by_person"][0]["purchases_amount"] == Decimal("45000")
    assert dumped["by_card"][0]["by_person"][0]["fee_share"] == Decimal("5000")
    assert dumped["by_card"][0]["by_person"][0]["amount_due"] == Decimal("50000")
