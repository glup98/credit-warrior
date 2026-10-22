import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.card_fee import (
    CardMonthlyFeeCreateOrUpdate,
    CardMonthlyFeeResponse,
)
from app.services.card_fee_service import CardFeeService

router = APIRouter(prefix="/cards/{card_id}/fees", tags=["card-fees"])

DbSession = Annotated[Session, Depends(get_db)]
PeriodPath = Annotated[str, Path(pattern=r"^\d{4}-(0[1-9]|1[0-2])$")]


@router.get("", response_model=list[CardMonthlyFeeResponse])
def list_card_fees(
    card_id: uuid.UUID,
    db: DbSession,
) -> list[CardMonthlyFeeResponse]:
    return CardFeeService(db).list_fees(card_id)


@router.put("/{period}", response_model=CardMonthlyFeeResponse)
def set_card_fee(
    card_id: uuid.UUID,
    period: PeriodPath,
    payload: CardMonthlyFeeCreateOrUpdate,
    db: DbSession,
) -> CardMonthlyFeeResponse:
    return CardFeeService(db).set_fee(card_id=card_id, period=period, fee=payload.fee)


@router.get("/{period}", response_model=CardMonthlyFeeResponse)
def get_card_fee(
    card_id: uuid.UUID,
    period: PeriodPath,
    db: DbSession,
) -> CardMonthlyFeeResponse:
    return CardFeeService(db).get_fee(card_id=card_id, period=period)


@router.delete("/{period}", status_code=status.HTTP_204_NO_CONTENT)
def delete_card_fee(
    card_id: uuid.UUID,
    period: PeriodPath,
    db: DbSession,
) -> Response:
    CardFeeService(db).delete_fee(card_id=card_id, period=period)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
