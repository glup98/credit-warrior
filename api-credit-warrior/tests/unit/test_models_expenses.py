from datetime import date
from decimal import Decimal

import pytest
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Card, CurrencyEnum, Expense, ExpenseSplit, Person, SplitTypeEnum


def test_expense_and_splits_cascade_and_restrict(db_session: Session) -> None:
    card = Card(name="Visa", currency=CurrencyEnum.CLP, closing_day=25, due_day=10)
    p1 = Person(name="Anyi")
    p2 = Person(name="Augusto")
    db_session.add_all([card, p1, p2])
    db_session.commit()

    expense = Expense(
        card_id=card.id,
        description="Lavadora",
        total_amount=Decimal("300000"),
        purchase_date=date(2026, 10, 16),
        installments_count=3,
    )
    expense.splits.append(ExpenseSplit(person_id=p1.id, split_type=SplitTypeEnum.EQUAL))
    expense.splits.append(ExpenseSplit(person_id=p2.id, split_type=SplitTypeEnum.EQUAL))
    db_session.add(expense)
    db_session.commit()

    # RESTRICT prevents deleting Card or Person while referenced by Expense / ExpenseSplit
    db_session.delete(card)
    with pytest.raises(IntegrityError):
        db_session.commit()
    db_session.rollback()

    # Deleting Expense cascades to ExpenseSplit
    exp_to_delete = db_session.scalar(select(Expense).where(Expense.id == expense.id))
    assert exp_to_delete is not None
    db_session.delete(exp_to_delete)
    db_session.commit()

    remaining_splits = list(db_session.scalars(select(ExpenseSplit)).all())
    assert remaining_splits == []


def test_expense_and_splits_composite_indexes() -> None:
    exp_indexes = {idx.name for idx in Expense.__table__.indexes}
    assert "ix_expenses_purchase_date_created_at" in exp_indexes
    assert "ix_expenses_card_id_purchase_date" in exp_indexes

    split_indexes = {idx.name for idx in ExpenseSplit.__table__.indexes}
    assert "ix_expense_splits_person_id_expense_id" in split_indexes

