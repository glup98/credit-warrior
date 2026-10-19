import calendar
import uuid
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date
from decimal import ROUND_FLOOR, ROUND_HALF_UP, Decimal

from app.core.exceptions import DomainError
from app.models.base import CurrencyEnum, SplitTypeEnum


@dataclass(frozen=True, order=True)
class YearMonth:
    """Immutable value object representing a (year, month) billing/payment period."""

    year: int
    month: int

    def __post_init__(self) -> None:
        if not (1 <= self.month <= 12):
            raise DomainError(f"Invalid month: {self.month}. Must be between 1 and 12.")

    @classmethod
    def parse(cls, value: str) -> "YearMonth":
        try:
            parts = value.strip().split("-")
            if len(parts) != 2:
                raise ValueError
            return cls(year=int(parts[0]), month=int(parts[1]))
        except ValueError as exc:
            raise DomainError(f"Invalid period format '{value}'. Expected 'YYYY-MM'.") from exc

    @classmethod
    def from_date(cls, d: date) -> "YearMonth":
        return cls(year=d.year, month=d.month)

    def add_months(self, delta: int) -> "YearMonth":
        total_months = (self.year * 12 + (self.month - 1)) + delta
        new_year, new_month_zero = divmod(total_months, 12)
        return YearMonth(year=new_year, month=new_month_zero + 1)

    def __str__(self) -> str:
        return f"{self.year:04d}-{self.month:02d}"


@dataclass(frozen=True)
class SplitSpec:
    """Pure domain representation of an ExpenseSplit for calculation."""

    person_id: uuid.UUID
    person_name: str
    split_type: SplitTypeEnum
    percentage: Decimal | None = None
    fixed_amount: Decimal | None = None


@dataclass(frozen=True)
class PersonShareResult:
    """Calculated share for a person on a specific installment."""

    person_id: uuid.UUID
    person_name: str
    amount: Decimal


@dataclass(frozen=True)
class ParticipantFeeShare:
    """Calculated maintenance fee share for a person."""

    person_id: uuid.UUID
    fee_share: Decimal



def currency_quantum(currency: CurrencyEnum) -> Decimal:
    """Return the minimum monetary unit for a currency (CLP: 1, USD: 0.01)."""
    if currency == CurrencyEnum.CLP:
        return Decimal("1")
    return Decimal("0.01")


def effective_day_of_month(year: int, month: int, configured_day: int) -> date:
    """Clamp a configured day (1-31) to the actual number of days in (year, month)."""
    _, max_day = calendar.monthrange(year, month)
    return date(year, month, min(configured_day, max_day))


def compute_first_statement_period(purchase_date: date, closing_day: int) -> YearMonth:
    """Determine the statement closing period (YYYY-MM) for installment #1."""
    purchase_ym = YearMonth.from_date(purchase_date)
    closing_date_in_month = effective_day_of_month(
        purchase_ym.year,
        purchase_ym.month,
        closing_day,
    )
    if purchase_date <= closing_date_in_month:
        return purchase_ym
    return purchase_ym.add_months(1)


def statement_to_payment_period(
    statement_period: YearMonth,
    closing_day: int,
    due_day: int,
) -> YearMonth:
    """Map a statement closing period to the calendar period when payment is due."""
    if due_day > closing_day:
        return statement_period
    return statement_period.add_months(1)


def payment_to_statement_period(
    payment_period: YearMonth,
    closing_day: int,
    due_day: int,
) -> YearMonth:
    """Map a payment due period back to its corresponding statement closing period."""
    if due_day > closing_day:
        return payment_period
    return payment_period.add_months(-1)


def resolve_first_payment_period(
    purchase_date: date,
    closing_day: int,
    due_day: int,
    first_billing_override: str | None = None,
) -> YearMonth:
    """Return the payment period (YYYY-MM) for installment #1."""
    if first_billing_override:
        return YearMonth.parse(first_billing_override)
    first_statement = compute_first_statement_period(purchase_date, closing_day)
    return statement_to_payment_period(first_statement, closing_day, due_day)


def compute_default_next_period(reference_date: date) -> YearMonth:
    """Pure function returning the next calendar month (YYYY-MM) relative to reference_date."""
    return YearMonth.from_date(reference_date).add_months(1)


def get_installment_index(
    first_payment_period: YearMonth,
    target_payment_period: YearMonth,
) -> int:
    """Return 1-based installment index k for target_payment_period."""
    return (
        (target_payment_period.year - first_payment_period.year) * 12
        + (target_payment_period.month - first_payment_period.month)
        + 1
    )


def compute_installment_amount(
    total_amount: Decimal,
    installments_count: int,
    installment_number: int,
    currency: CurrencyEnum,
) -> Decimal:
    """Calculate exact amount for installment k (1..N), absorbing remainder in k=1."""
    if installments_count < 1:
        raise DomainError("installments_count must be >= 1.")
    if not (1 <= installment_number <= installments_count):
        raise DomainError(
            f"installment_number {installment_number} out of range 1..{installments_count}."
        )

    quantum = currency_quantum(currency)
    normalized_total = Decimal(total_amount).quantize(quantum, rounding=ROUND_HALF_UP)

    if installments_count == 1:
        return normalized_total

    base_installment = (normalized_total / Decimal(installments_count)).quantize(
        quantum,
        rounding=ROUND_FLOOR,
    )
    remainder = normalized_total - (base_installment * Decimal(installments_count))

    if installment_number == 1:
        return base_installment + remainder
    return base_installment


def compute_person_shares(
    installment_amount: Decimal,
    total_amount: Decimal,
    splits: Sequence[SplitSpec],
    currency: CurrencyEnum,
) -> list[PersonShareResult]:
    """Prorate a monthly installment_amount across participants while preserving exact sum."""
    if not splits:
        raise DomainError("At least one split participant is required.")

    quantum = currency_quantum(currency)
    normalized_installment = Decimal(installment_amount).quantize(quantum, rounding=ROUND_HALF_UP)
    count = len(splits)

    results: list[PersonShareResult] = []
    allocated = Decimal("0")

    for idx, split in enumerate(splits):
        is_last = idx == count - 1
        if is_last:
            share = normalized_installment - allocated
        else:
            if split.split_type == SplitTypeEnum.EQUAL:
                weight = Decimal("1") / Decimal(count)
            elif split.split_type == SplitTypeEnum.PERCENTAGE:
                if split.percentage is None:
                    raise DomainError("Missing percentage in PERCENTAGE split.")
                weight = Decimal(split.percentage) / Decimal("100")
            elif split.split_type == SplitTypeEnum.FIXED_AMOUNT:
                if split.fixed_amount is None or total_amount <= 0:
                    raise DomainError("Invalid fixed_amount in FIXED_AMOUNT split.")
                weight = Decimal(split.fixed_amount) / Decimal(total_amount)
            else:
                raise DomainError(f"Unsupported split_type: {split.split_type}")

            share = (normalized_installment * weight).quantize(quantum, rounding=ROUND_HALF_UP)
            allocated += share

        results.append(
            PersonShareResult(
                person_id=split.person_id,
                person_name=split.person_name,
                amount=share,
            )
        )

    return results


def resolve_card_monthly_fee(
    card_is_active: bool,
    purchases_total: Decimal,
    default_fee: Decimal,
    override_fee: Decimal | None,
    currency: CurrencyEnum,
) -> Decimal:
    """Determine the effective maintenance fee to charge for a card in a given period.

    Returns Decimal('0') if card is inactive or has no active purchase installments.
    Otherwise returns quantized override_fee if present, or default_fee.
    """
    quantum = currency_quantum(currency)
    if not card_is_active or purchases_total <= Decimal("0"):
        return Decimal("0").quantize(quantum)
    effective = override_fee if override_fee is not None else default_fee
    return Decimal(effective).quantize(quantum, rounding=ROUND_HALF_UP)


def prorate_maintenance_fee(
    fee: Decimal,
    participant_ids: Sequence[uuid.UUID],
    currency: CurrencyEnum,
) -> list[ParticipantFeeShare]:
    """Prorate maintenance fee across active participants ordered by UUID ascending.

    Applies ROUND_FLOOR ensuring:
    1. base_share = quantize_floor(fee / M, quantum)
    2. share_i = base_share for i in 1..M-1
    3. share_M = fee - (base_share * (M - 1))
    Guarantees share_M >= base_share >= 0 and exact sum preservation.
    """
    if not participant_ids:
        return []

    quantum = currency_quantum(currency)
    sorted_pids = sorted(set(participant_ids))
    if not sorted_pids:
        return []

    normalized_fee = Decimal(fee).quantize(quantum, rounding=ROUND_HALF_UP)
    if normalized_fee <= Decimal("0"):
        zero = Decimal("0").quantize(quantum)
        return [ParticipantFeeShare(person_id=pid, fee_share=zero) for pid in sorted_pids]

    count = len(sorted_pids)
    if count == 1:
        return [ParticipantFeeShare(person_id=sorted_pids[0], fee_share=normalized_fee)]

    base_share = (normalized_fee / Decimal(count)).quantize(quantum, rounding=ROUND_FLOOR)
    remainder = normalized_fee - (base_share * Decimal(count - 1))

    results: list[ParticipantFeeShare] = []
    for idx, pid in enumerate(sorted_pids):
        is_last = idx == count - 1
        share = remainder if is_last else base_share
        results.append(ParticipantFeeShare(person_id=pid, fee_share=share))

    return results

