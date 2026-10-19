from datetime import date
from decimal import Decimal

import pytest

from app.core.exceptions import DomainError
from app.models.base import CurrencyEnum
from app.services.billing_engine import (
    YearMonth,
    compute_first_statement_period,
    compute_installment_amount,
    effective_day_of_month,
    get_installment_index,
    payment_to_statement_period,
    resolve_first_payment_period,
    statement_to_payment_period,
)


def test_year_month_parse_and_add_months() -> None:
    ym = YearMonth.parse("2026-10")
    assert ym == YearMonth(2026, 10)
    assert str(ym.add_months(3)) == "2027-01"
    assert str(ym.add_months(-10)) == "2025-12"

    with pytest.raises(DomainError):
        YearMonth.parse("2026-13")
    with pytest.raises(DomainError):
        YearMonth.parse("invalid")


def test_effective_day_of_month_short_and_leap_years() -> None:
    # Non-leap February
    assert effective_day_of_month(2026, 2, 31) == date(2026, 2, 28)
    # Leap February
    assert effective_day_of_month(2028, 2, 31) == date(2028, 2, 29)
    # 30-day month (April)
    assert effective_day_of_month(2026, 4, 31) == date(2026, 4, 30)


def test_first_statement_and_payment_periods_rf01_rf02() -> None:
    # Card closes on 25th, due on 10th of next month (due_day <= closing_day)
    # 1. Purchase on or before closing_day (2026-10-25) -> statement 2026-10 -> payment 2026-11
    stmt1 = compute_first_statement_period(date(2026, 10, 25), closing_day=25)
    assert str(stmt1) == "2026-10"
    pay1 = resolve_first_payment_period(date(2026, 10, 25), closing_day=25, due_day=10)
    assert str(pay1) == "2026-11"
    assert payment_to_statement_period(pay1, closing_day=25, due_day=10) == stmt1

    # 2. Purchase after closing_day (2026-10-26) -> statement 2026-11 -> payment 2026-12
    stmt2 = compute_first_statement_period(date(2026, 10, 26), closing_day=25)
    assert str(stmt2) == "2026-11"
    pay2 = resolve_first_payment_period(date(2026, 10, 26), closing_day=25, due_day=10)
    assert str(pay2) == "2026-12"

    # 3. Year rollover: Purchase on 2026-12-26 -> statement 2027-01 -> payment 2027-02
    pay_rollover = resolve_first_payment_period(date(2026, 12, 26), closing_day=25, due_day=10)
    assert str(pay_rollover) == "2027-02"

    # 4. Card where due_day > closing_day (closes on 5th, due on 20th of same month)
    pay_same_month = statement_to_payment_period(YearMonth(2026, 10), closing_day=5, due_day=20)
    assert str(pay_same_month) == "2026-10"
    assert payment_to_statement_period(pay_same_month, closing_day=5, due_day=20) == YearMonth(
        2026, 10
    )

    # 5. Override takes precedence
    pay_override = resolve_first_payment_period(
        date(2026, 10, 16),
        closing_day=25,
        due_day=10,
        first_billing_override="2027-01",
    )
    assert str(pay_override) == "2027-01"


def test_installment_index_and_amounts_clp_and_usd_rf03() -> None:
    first_pay = YearMonth(2026, 11)
    assert get_installment_index(first_pay, YearMonth(2026, 10)) == 0
    assert get_installment_index(first_pay, YearMonth(2026, 11)) == 1
    assert get_installment_index(first_pay, YearMonth(2026, 12)) == 2
    assert get_installment_index(first_pay, YearMonth(2027, 1)) == 3

    # CLP: $100,000 in 3 installments -> 33334, 33333, 33333
    total_clp = Decimal("100000")
    clp_installments = [
        compute_installment_amount(total_clp, 3, k, CurrencyEnum.CLP) for k in range(1, 4)
    ]
    assert clp_installments == [Decimal("33334"), Decimal("33333"), Decimal("33333")]
    assert sum(clp_installments) == total_clp

    # USD: $100.00 in 3 installments -> 33.34, 33.33, 33.33
    total_usd = Decimal("100.00")
    usd_installments = [
        compute_installment_amount(total_usd, 3, k, CurrencyEnum.USD) for k in range(1, 4)
    ]
    assert usd_installments == [Decimal("33.34"), Decimal("33.33"), Decimal("33.33")]
    assert sum(usd_installments) == total_usd


def test_compute_default_next_period_and_dashboard_schema() -> None:
    from app.schemas.dashboard import DashboardSummaryResponse
    from app.services.billing_engine import compute_default_next_period

    assert str(compute_default_next_period(date(2026, 10, 16))) == "2026-11"
    assert str(compute_default_next_period(date(2026, 12, 31))) == "2027-01"

    empty_summary = DashboardSummaryResponse(
        period="2026-11",
        totals_by_currency={CurrencyEnum.CLP: Decimal("0"), CurrencyEnum.USD: Decimal("0.00")},
        by_card=[],
        by_person=[],
        active_installments=[],
    )
    assert empty_summary.period == "2026-11"
