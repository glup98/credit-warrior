import uuid
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.expense import Expense
from app.schemas.expense import (
    ExpenseCreate,
    ExpenseRead,
    ExpenseScheduleResponse,
    ExpenseUpdate,
)
from app.services.expense_service import ExpenseService

router = APIRouter(prefix="/expenses", tags=["expenses"])

DbSession = Annotated[Session, Depends(get_db)]


@router.get("", response_model=list[ExpenseRead])
def list_expenses(
    db: DbSession,
    card_id: uuid.UUID | None = None,
    person_id: uuid.UUID | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    active_in_period: str | None = None,
) -> list[Expense]:
    return ExpenseService(db).list_expenses(
        card_id=card_id,
        person_id=person_id,
        date_from=date_from,
        date_to=date_to,
        active_in_period=active_in_period,
    )


@router.post("", response_model=ExpenseRead, status_code=status.HTTP_201_CREATED)
def create_expense(payload: ExpenseCreate, db: DbSession) -> Expense:
    return ExpenseService(db).create_expense(payload)


@router.get("/{expense_id}", response_model=ExpenseRead)
def get_expense(expense_id: uuid.UUID, db: DbSession) -> Expense:
    return ExpenseService(db).get_expense(expense_id)


@router.put("/{expense_id}", response_model=ExpenseRead)
def update_expense(
    expense_id: uuid.UUID,
    payload: ExpenseUpdate,
    db: DbSession,
) -> Expense:
    return ExpenseService(db).update_expense(expense_id, payload)


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_expense(expense_id: uuid.UUID, db: DbSession) -> Response:
    ExpenseService(db).delete_expense(expense_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{expense_id}/schedule", response_model=ExpenseScheduleResponse)
def get_expense_schedule(expense_id: uuid.UUID, db: DbSession) -> ExpenseScheduleResponse:
    return ExpenseService(db).build_schedule(expense_id)
