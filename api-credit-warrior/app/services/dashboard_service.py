import uuid
from collections import defaultdict
from datetime import date
from decimal import Decimal

from sqlalchemy.orm import Session

from app.models.base import CurrencyEnum
from app.models.card import Card
from app.models.expense import Expense
from app.repositories.card_fee_repo import CardFeeRepository
from app.repositories.expense_repo import ExpenseRepository
from app.schemas.dashboard import (
    ActiveInstallmentItem,
    ActiveInstallmentShare,
    CardMonthlySummary,
    CardPersonBreakdown,
    DashboardProjectionResponse,
    DashboardSummaryResponse,
    PersonMonthlySummary,
)
from app.services.billing_engine import (
    SplitSpec,
    YearMonth,
    compute_default_next_period,
    compute_installment_amount,
    compute_person_shares,
    currency_quantum,
    effective_day_of_month,
    get_installment_index,
    payment_to_statement_period,
    prorate_maintenance_fee,
    resolve_card_monthly_fee,
    resolve_first_payment_period,
)


class DashboardService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.expense_repo = ExpenseRepository(db)
        self.card_fee_repo = CardFeeRepository(db)

    def get_monthly_summary(
        self,
        *,
        reference_date: date,
        period: str | None = None,
        preloaded_expenses: list[Expense] | None = None,
        preloaded_fee_overrides: dict[uuid.UUID, Decimal] | None = None,
    ) -> DashboardSummaryResponse:
        target_ym = (
            YearMonth.parse(period)
            if period is not None
            else compute_default_next_period(reference_date)
        )
        expenses = (
            preloaded_expenses
            if preloaded_expenses is not None
            else self.expense_repo.list_expenses()
        )
        period_str = str(target_ym)

        if preloaded_fee_overrides is None:
            fee_records = self.card_fee_repo.get_fees_by_period(period_str)
            fee_overrides = {cid: rec.fee for cid, rec in fee_records.items()}
        else:
            fee_overrides = preloaded_fee_overrides

        totals_by_currency: dict[CurrencyEnum, Decimal] = {
            CurrencyEnum.CLP: Decimal("0"),
            CurrencyEnum.USD: Decimal("0.00"),
        }

        card_totals: dict[uuid.UUID, Decimal] = defaultdict(lambda: Decimal("0"))
        card_person_totals: dict[uuid.UUID, dict[uuid.UUID, Decimal]] = defaultdict(
            lambda: defaultdict(lambda: Decimal("0"))
        )
        cards_by_id: dict[uuid.UUID, Card] = {}

        person_names: dict[uuid.UUID, str] = {}
        person_currency_totals: dict[uuid.UUID, dict[CurrencyEnum, Decimal]] = defaultdict(
            lambda: {CurrencyEnum.CLP: Decimal("0"), CurrencyEnum.USD: Decimal("0.00")}
        )

        active_items: list[ActiveInstallmentItem] = []

        for exp in expenses:
            card = exp.card
            first_payment = resolve_first_payment_period(
                purchase_date=exp.purchase_date,
                closing_day=card.closing_day,
                due_day=card.due_day,
                first_billing_override=exp.first_billing_override,
            )
            k = get_installment_index(first_payment, target_ym)
            if not (1 <= k <= exp.installments_count):
                continue

            inst_amount = compute_installment_amount(
                total_amount=exp.total_amount,
                installments_count=exp.installments_count,
                installment_number=k,
                currency=card.currency,
            )
            split_specs = [
                SplitSpec(
                    person_id=s.person_id,
                    person_name=s.person.name,
                    split_type=s.split_type,
                    percentage=s.percentage,
                    fixed_amount=s.fixed_amount,
                )
                for s in exp.splits
            ]
            shares = compute_person_shares(
                installment_amount=inst_amount,
                total_amount=exp.total_amount,
                splits=split_specs,
                currency=card.currency,
            )

            totals_by_currency[card.currency] += inst_amount
            card_totals[card.id] += inst_amount
            cards_by_id[card.id] = card

            share_dtos: list[ActiveInstallmentShare] = []
            for sh in shares:
                person_names[sh.person_id] = sh.person_name
                card_person_totals[card.id][sh.person_id] += sh.amount
                person_currency_totals[sh.person_id][card.currency] += sh.amount
                share_dtos.append(
                    ActiveInstallmentShare(
                        person_id=sh.person_id,
                        person_name=sh.person_name,
                        amount=sh.amount,
                    )
                )

            active_items.append(
                ActiveInstallmentItem(
                    expense_id=exp.id,
                    description=exp.description,
                    card_id=card.id,
                    card_name=card.name,
                    currency=card.currency,
                    purchase_date=exp.purchase_date,
                    installment_number=k,
                    installments_count=exp.installments_count,
                    installment_label=f"{k}/{exp.installments_count}",
                    installment_amount=inst_amount,
                    person_shares=share_dtos,
                )
            )

        by_card: list[CardMonthlySummary] = []

        for card_id, card in cards_by_id.items():
            statement_ym = payment_to_statement_period(target_ym, card.closing_day, card.due_day)
            closing_date = effective_day_of_month(
                statement_ym.year,
                statement_ym.month,
                card.closing_day,
            )
            due_date = effective_day_of_month(target_ym.year, target_ym.month, card.due_day)

            purchases_total = card_totals[card_id]
            override_fee = fee_overrides.get(card_id)

            maintenance_fee = resolve_card_monthly_fee(
                card_is_active=card.is_active,
                purchases_total=purchases_total,
                default_fee=card.default_monthly_fee,
                override_fee=override_fee,
                currency=card.currency,
            )

            totals_by_currency[card.currency] += maintenance_fee

            participant_ids = list(card_person_totals[card_id].keys())
            fee_shares = prorate_maintenance_fee(
                fee=maintenance_fee,
                participant_ids=participant_ids,
                currency=card.currency,
            )
            fee_map = {sh.person_id: sh.fee_share for sh in fee_shares}
            quantum = currency_quantum(card.currency)

            person_breakdown: list[CardPersonBreakdown] = []
            for pid, purchases_amount in card_person_totals[card_id].items():
                fee_share = fee_map.get(pid, Decimal("0").quantize(quantum))
                person_currency_totals[pid][card.currency] += fee_share
                person_breakdown.append(
                    CardPersonBreakdown(
                        person_id=pid,
                        person_name=person_names[pid],
                        purchases_amount=purchases_amount,
                        fee_share=fee_share,
                        amount_due=purchases_amount + fee_share,
                    )
                )

            total_due = purchases_total + maintenance_fee
            by_card.append(
                CardMonthlySummary(
                    card_id=card_id,
                    card_name=card.name,
                    currency=card.currency,
                    closing_date=closing_date,
                    due_date=due_date,
                    purchases_total=purchases_total,
                    maintenance_fee=maintenance_fee,
                    total_due=total_due,
                    by_person=person_breakdown,
                )
            )

        by_person: list[PersonMonthlySummary] = [
            PersonMonthlySummary(
                person_id=pid,
                person_name=person_names[pid],
                totals_by_currency=currency_map,
            )
            for pid, currency_map in person_currency_totals.items()
        ]

        return DashboardSummaryResponse(
            period=period_str,
            totals_by_currency=totals_by_currency,
            by_card=by_card,
            by_person=by_person,
            active_installments=active_items,
        )

    def get_projection(
        self,
        *,
        reference_date: date,
        start_period: str | None = None,
        months: int = 6,
    ) -> DashboardProjectionResponse:
        start_ym = (
            YearMonth.parse(start_period)
            if start_period is not None
            else compute_default_next_period(reference_date)
        )
        period_strings = [str(start_ym.add_months(i)) for i in range(months)]
        expenses = self.expense_repo.list_expenses()
        batch_fees = self.card_fee_repo.get_fees_by_periods(period_strings)

        fees_by_period: dict[str, dict[uuid.UUID, Decimal]] = defaultdict(dict)
        for (card_id, p_str), rec in batch_fees.items():
            fees_by_period[p_str][card_id] = rec.fee

        periods: list[DashboardSummaryResponse] = []
        for p_str in period_strings:
            periods.append(
                self.get_monthly_summary(
                    reference_date=reference_date,
                    period=p_str,
                    preloaded_expenses=expenses,
                    preloaded_fee_overrides=fees_by_period[p_str],
                )
            )

        return DashboardProjectionResponse(
            start_period=str(start_ym),
            months=months,
            periods=periods,
        )
