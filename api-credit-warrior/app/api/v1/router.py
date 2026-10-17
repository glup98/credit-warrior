from fastapi import APIRouter

from app.api.v1.endpoints import card_fees, cards, dashboard, expenses, persons

api_v1_router = APIRouter(prefix="/api/v1")
api_v1_router.include_router(cards.router)
api_v1_router.include_router(card_fees.router)
api_v1_router.include_router(persons.router)
api_v1_router.include_router(expenses.router)
api_v1_router.include_router(dashboard.router)
