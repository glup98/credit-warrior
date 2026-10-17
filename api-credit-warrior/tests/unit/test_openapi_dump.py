import json
from pathlib import Path

from app.main import app
from scripts.dump_openapi import dump_openapi


def test_openapi_schema_dump_and_content() -> None:
    # Execute dump
    dump_openapi()

    openapi_file = Path(__file__).resolve().parents[2] / "openapi.json"
    assert openapi_file.exists()

    content = json.loads(openapi_file.read_text(encoding="utf-8"))
    assert content["openapi"].startswith("3.")
    assert content["info"]["title"] == "Credit Warrior API"

    # Verify routes added in spec 004
    paths = content["paths"]
    assert "/api/v1/cards/{card_id}/fees" in paths
    assert "/api/v1/cards/{card_id}/fees/{period}" in paths

    # Verify schemas added/extended in spec 004
    schemas = content["components"]["schemas"]
    assert "CardMonthlyFeeResponse" in schemas
    assert "CardMonthlyFeeCreateOrUpdate" in schemas
    assert "FeeSourceEnum" in schemas

    # Check CardRead has default_monthly_fee
    card_read_props = schemas["CardRead"]["properties"]
    assert "default_monthly_fee" in card_read_props

    # Check CardMonthlySummary properties
    card_summary_props = schemas["CardMonthlySummary"]["properties"]
    assert "purchases_total" in card_summary_props
    assert "maintenance_fee" in card_summary_props
    assert "total_due" in card_summary_props

    # Check CardPersonBreakdown properties
    person_breakdown_props = schemas["CardPersonBreakdown"]["properties"]
    assert "purchases_amount" in person_breakdown_props
    assert "fee_share" in person_breakdown_props
    assert "amount_due" in person_breakdown_props

    # Ensure openapi.json is identical to app.openapi()
    assert content == app.openapi()
