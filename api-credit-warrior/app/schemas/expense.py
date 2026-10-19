import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.base import SplitTypeEnum


class ExpenseSplitInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    person_id: uuid.UUID
    split_type: SplitTypeEnum = Field(default=SplitTypeEnum.EQUAL)
    percentage: Decimal | None = Field(default=None, gt=Decimal("0"), le=Decimal("100"))
    fixed_amount: Decimal | None = Field(default=None, gt=Decimal("0"))

    @model_validator(mode="after")
    def validate_split_fields(self) -> "ExpenseSplitInput":
        if self.split_type == SplitTypeEnum.EQUAL:
            if self.percentage is not None or self.fixed_amount is not None:
                raise ValueError("EQUAL split must not specify percentage or fixed_amount.")
        elif self.split_type == SplitTypeEnum.PERCENTAGE:
            if self.percentage is None or self.fixed_amount is not None:
                raise ValueError("PERCENTAGE split requires percentage and forbids fixed_amount.")
        elif self.split_type == SplitTypeEnum.FIXED_AMOUNT and (
            self.fixed_amount is None or self.percentage is not None
        ):
            raise ValueError("FIXED_AMOUNT split requires fixed_amount and forbids percentage.")
        return self


class ExpenseSplitRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    person_id: uuid.UUID
    split_type: SplitTypeEnum
    percentage: Decimal | None
    fixed_amount: Decimal | None


class ExpenseCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    card_id: uuid.UUID
    description: str = Field(..., min_length=1, max_length=255)
    total_amount: Decimal = Field(..., gt=Decimal("0"))
    purchase_date: date
    installments_count: int = Field(default=1, ge=1, le=120)
    first_billing_override: str | None = Field(
        default=None,
        pattern=r"^\d{4}-(0[1-9]|1[0-2])$",
    )
    notes: str | None = Field(default=None, max_length=2000)
    splits: list[ExpenseSplitInput] = Field(..., min_length=1)

    @field_validator("description", mode="before")
    @classmethod
    def strip_description(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value

    @model_validator(mode="after")
    def validate_splits_invariants(self) -> "ExpenseCreate":
        person_ids = [s.person_id for s in self.splits]
        if len(person_ids) != len(set(person_ids)):
            raise ValueError("Duplicate person_id in splits is not allowed.")

        split_types = {s.split_type for s in self.splits}
        if len(split_types) > 1:
            raise ValueError("All splits for a single expense must use the same split_type.")

        split_type = next(iter(split_types))
        if split_type == SplitTypeEnum.PERCENTAGE:
            total_pct = sum((s.percentage or Decimal("0")) for s in self.splits)
            if total_pct != Decimal("100"):
                raise ValueError(f"Sum of split percentages must equal 100.00 (got {total_pct}).")
        elif split_type == SplitTypeEnum.FIXED_AMOUNT:
            total_fixed = sum((s.fixed_amount or Decimal("0")) for s in self.splits)
            if total_fixed != self.total_amount:
                raise ValueError(
                    f"Sum of fixed_amount splits ({total_fixed}) "
                    f"must equal total_amount ({self.total_amount})."
                )
        return self


class ExpenseUpdate(ExpenseCreate):
    """Full replacement schema for updating an Expense and its splits."""


class ExpenseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    card_id: uuid.UUID
    description: str
    total_amount: Decimal
    purchase_date: date
    installments_count: int
    first_billing_override: str | None
    notes: str | None
    splits: list[ExpenseSplitRead]
    created_at: datetime
    updated_at: datetime


class PersonShareScheduleItem(BaseModel):
    person_id: uuid.UUID
    person_name: str
    amount: Decimal


class InstallmentScheduleItem(BaseModel):
    installment_number: int
    installments_count: int
    installment_label: str
    statement_period: str
    payment_period: str
    closing_date: date
    due_date: date
    installment_amount: Decimal
    person_shares: list[PersonShareScheduleItem]


class ExpenseScheduleResponse(BaseModel):
    expense_id: uuid.UUID
    description: str
    card_id: uuid.UUID
    card_name: str
    currency: str
    total_amount: Decimal
    installments_count: int
    schedule: list[InstallmentScheduleItem]
