import uuid

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.exceptions import ConflictError, EntityNotFoundError
from app.models.base import CurrencyEnum
from app.models.card import Card
from app.repositories.card_repo import CardRepository
from app.schemas.card import CardCreate, CardUpdate


class CardService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = CardRepository(db)

    def list_cards(
        self,
        *,
        is_active: bool | None = None,
        currency: CurrencyEnum | None = None,
    ) -> list[Card]:
        return self.repo.list_cards(is_active=is_active, currency=currency)

    def get_card(self, card_id: uuid.UUID) -> Card:
        card = self.repo.get_by_id(card_id)
        if card is None:
            raise EntityNotFoundError("Card", card_id)
        return card

    def create_card(self, payload: CardCreate) -> Card:
        return self.repo.create(payload)

    def update_card(self, card_id: uuid.UUID, payload: CardUpdate) -> Card:
        card = self.get_card(card_id)
        return self.repo.update(card, payload)

    def delete_card(self, card_id: uuid.UUID) -> None:
        card = self.get_card(card_id)
        try:
            self.repo.delete(card)
        except IntegrityError as exc:
            self.db.rollback()
            raise ConflictError(
                "Cannot delete card because it has associated expenses."
            ) from exc
