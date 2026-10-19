import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.base import CurrencyEnum
from app.models.card import Card
from app.schemas.card import CardCreate, CardUpdate


class CardRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_cards(
        self,
        *,
        is_active: bool | None = None,
        currency: CurrencyEnum | None = None,
    ) -> list[Card]:
        stmt = select(Card).order_by(Card.name.asc())
        if is_active is not None:
            stmt = stmt.where(Card.is_active == is_active)
        if currency is not None:
            stmt = stmt.where(Card.currency == currency)
        return list(self.db.scalars(stmt).all())

    def get_by_id(self, card_id: uuid.UUID) -> Card | None:
        stmt = select(Card).where(Card.id == card_id)
        return self.db.scalar(stmt)

    def create(self, payload: CardCreate) -> Card:
        card = Card(**payload.model_dump())
        self.db.add(card)
        self.db.commit()
        self.db.refresh(card)
        return card

    def update(self, card: Card, payload: CardUpdate) -> Card:
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(card, field, value)
        self.db.commit()
        self.db.refresh(card)
        return card

    def delete(self, card: Card) -> None:
        self.db.delete(card)
        self.db.commit()
