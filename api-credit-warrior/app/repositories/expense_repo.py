import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models.expense import Expense, ExpenseSplit
from app.schemas.expense import ExpenseCreate, ExpenseUpdate


class ExpenseRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_expenses(
        self,
        *,
        card_id: uuid.UUID | None = None,
        person_id: uuid.UUID | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
    ) -> list[Expense]:
        stmt = (
            select(Expense)
            .options(
                selectinload(Expense.card),
                selectinload(Expense.splits).selectinload(ExpenseSplit.person),
            )
            .order_by(Expense.purchase_date.desc(), Expense.created_at.desc())
        )
        if card_id is not None:
            stmt = stmt.where(Expense.card_id == card_id)
        if person_id is not None:
            stmt = stmt.join(Expense.splits).where(ExpenseSplit.person_id == person_id)
        if date_from is not None:
            stmt = stmt.where(Expense.purchase_date >= date_from)
        if date_to is not None:
            stmt = stmt.where(Expense.purchase_date <= date_to)
        return list(self.db.scalars(stmt).unique().all())

    def get_by_id(self, expense_id: uuid.UUID) -> Expense | None:
        stmt = (
            select(Expense)
            .options(
                selectinload(Expense.card),
                selectinload(Expense.splits).selectinload(ExpenseSplit.person),
            )
            .where(Expense.id == expense_id)
        )
        return self.db.scalar(stmt)

    def create(self, payload: ExpenseCreate) -> Expense:
        expense = Expense(
            card_id=payload.card_id,
            description=payload.description,
            total_amount=payload.total_amount,
            purchase_date=payload.purchase_date,
            installments_count=payload.installments_count,
            first_billing_override=payload.first_billing_override,
            notes=payload.notes,
        )
        for split_in in payload.splits:
            expense.splits.append(
                ExpenseSplit(
                    person_id=split_in.person_id,
                    split_type=split_in.split_type,
                    percentage=split_in.percentage,
                    fixed_amount=split_in.fixed_amount,
                )
            )
        self.db.add(expense)
        self.db.commit()
        return self.get_by_id(expense.id)  # type: ignore[return-value]

    def update(self, expense: Expense, payload: ExpenseUpdate) -> Expense:
        expense.card_id = payload.card_id
        expense.description = payload.description
        expense.total_amount = payload.total_amount
        expense.purchase_date = payload.purchase_date
        expense.installments_count = payload.installments_count
        expense.first_billing_override = payload.first_billing_override
        expense.notes = payload.notes

        expense.splits.clear()
        self.db.flush()

        for split_in in payload.splits:
            expense.splits.append(
                ExpenseSplit(
                    person_id=split_in.person_id,
                    split_type=split_in.split_type,
                    percentage=split_in.percentage,
                    fixed_amount=split_in.fixed_amount,
                )
            )
        self.db.commit()
        return self.get_by_id(expense.id)  # type: ignore[return-value]

    def delete(self, expense: Expense) -> None:
        self.db.delete(expense)
        self.db.commit()
