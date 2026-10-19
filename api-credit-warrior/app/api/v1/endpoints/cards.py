import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.base import CurrencyEnum
from app.models.card import Card
from app.schemas.card import CardCreate, CardRead, CardUpdate
from app.services.card_service import CardService

router = APIRouter(prefix="/cards", tags=["cards"])

DbSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[CardRead])
def list_cards(
    db: DbSession,
    is_active: bool | None = None,
    currency: CurrencyEnum | None = None,
) -> list[Card]:
    return CardService(db).list_cards(is_active=is_active, currency=currency)


@router.post("", response_model=CardRead, status_code=status.HTTP_201_CREATED)
def create_card(payload: CardCreate, db: DbSession) -> Card:
    return CardService(db).create_card(payload)


@router.get("/{card_id}", response_model=CardRead)
def get_card(card_id: uuid.UUID, db: DbSession) -> Card:
    return CardService(db).get_card(card_id)


@router.patch("/{card_id}", response_model=CardRead)
def update_card(card_id: uuid.UUID, payload: CardUpdate, db: DbSession) -> Card:
    return CardService(db).update_card(card_id, payload)


@router.delete("/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_card(card_id: uuid.UUID, db: DbSession) -> Response:
    CardService(db).delete_card(card_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
