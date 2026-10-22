import uuid
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.models.base import FeeSourceEnum


class CardMonthlyFeeCreateOrUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    fee: Decimal = Field(..., ge=0)


class CardMonthlyFeeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    card_id: uuid.UUID
    period: str = Field(..., pattern=r"^\d{4}-(0[1-9]|1[0-2])$")
    fee: Decimal
    source: FeeSourceEnum
