import uuid
from datetime import date
from decimal import Decimal

from pydantic import BaseModel

from app.models.base import CurrencyEnum


class CardPersonBreakdown(BaseModel):
    person_id: uuid.UUID
    person_name: str
    purchases_amount: Decimal = Decimal("0")
    fee_share: Decimal = Decimal("0")
    amount_due: Decimal


class CardMonthlySummary(BaseModel):
    card_id: uuid.UUID
    card_name: str
    currency: CurrencyEnum
    closing_date: date
    due_date: date
    purchases_total: Decimal = Decimal("0")
    maintenance_fee: Decimal = Decimal("0")
    total_due: Decimal
    by_person: list[CardPersonBreakdown]


class PersonMonthlySummary(BaseModel):
    person_id: uuid.UUID
    person_name: str
    totals_by_currency: dict[CurrencyEnum, Decimal]


class ActiveInstallmentShare(BaseModel):
    person_id: uuid.UUID
    person_name: str
    amount: Decimal


class ActiveInstallmentItem(BaseModel):
    expense_id: uuid.UUID
    description: str
    card_id: uuid.UUID
    card_name: str
    currency: CurrencyEnum
    purchase_date: date
    installment_number: int
    installments_count: int
    installment_label: str
    installment_amount: Decimal
    person_shares: list[ActiveInstallmentShare]


class DashboardSummaryResponse(BaseModel):
    period: str
    totals_by_currency: dict[CurrencyEnum, Decimal]
    by_card: list[CardMonthlySummary]
    by_person: list[PersonMonthlySummary]
    active_installments: list[ActiveInstallmentItem]


class DashboardProjectionResponse(BaseModel):
    start_period: str
    months: int
    periods: list[DashboardSummaryResponse]
