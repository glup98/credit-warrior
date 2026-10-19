import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.base import CurrencyEnum


class CardBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    last_four_digits: str | None = Field(default=None, pattern=r"^\d{4}$")
    currency: CurrencyEnum = Field(default=CurrencyEnum.CLP)
    closing_day: int = Field(..., ge=1, le=31)
    due_day: int = Field(..., ge=1, le=31)
    is_active: bool = Field(default=True)
    default_monthly_fee: Decimal = Field(default=Decimal("0"), ge=0)

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value


class CardCreate(CardBase):
    model_config = ConfigDict(extra="forbid")


class CardUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1, max_length=100)
    last_four_digits: str | None = Field(default=None, pattern=r"^\d{4}$")
    currency: CurrencyEnum | None = None
    closing_day: int | None = Field(default=None, ge=1, le=31)
    due_day: int | None = Field(default=None, ge=1, le=31)
    is_active: bool | None = None
    default_monthly_fee: Decimal | None = Field(default=None, ge=0)

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("default_monthly_fee")
    @classmethod
    def validate_non_null_default_monthly_fee(cls, value: Decimal | None) -> Decimal | None:
        if value is None:
            raise ValueError("default_monthly_fee cannot be null")
        return value


class CardRead(CardBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
