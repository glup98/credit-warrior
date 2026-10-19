import uuid
from datetime import date

from sqlalchemy.orm import Session

from app.core.exceptions import EntityNotFoundError
from app.models.expense import Expense
from app.repositories.card_repo import CardRepository
from app.repositories.expense_repo import ExpenseRepository
from app.repositories.person_repo import PersonRepository
from app.schemas.expense import (
    ExpenseCreate,
    ExpenseScheduleResponse,
    ExpenseUpdate,
    InstallmentScheduleItem,
    PersonShareScheduleItem,
)
from app.services.billing_engine import (
    SplitSpec,
    YearMonth,
    compute_installment_amount,
    compute_person_shares,
    effective_day_of_month,
    get_installment_index,
    payment_to_statement_period,
    resolve_first_payment_period,
)


class ExpenseService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.card_repo = CardRepository(db)
        self.person_repo = PersonRepository(db)
        self.expense_repo = ExpenseRepository(db)

    def _validate_references(self, payload: ExpenseCreate) -> None:
        card = self.card_repo.get_by_id(payload.card_id)
        if card is None:
            raise EntityNotFoundError("Card", payload.card_id)

        person_ids = [s.person_id for s in payload.splits]
        found_persons = self.person_repo.get_by_ids(person_ids)
        if len(found_persons) != len(person_ids):
            found_set = {p.id for p in found_persons}
            missing = next(pid for pid in person_ids if pid not in found_set)
            raise EntityNotFoundError("Person", missing)

    def list_expenses(
        self,
        *,
        card_id: uuid.UUID | None = None,
        person_id: uuid.UUID | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        active_in_period: str | None = None,
    ) -> list[Expense]:
        expenses = self.expense_repo.list_expenses(
            card_id=card_id,
            person_id=person_id,
            date_from=date_from,
            date_to=date_to,
        )
        if active_in_period is None:
            return expenses

        target_ym = YearMonth.parse(active_in_period)
        active: list[Expense] = []
        for exp in expenses:
            first_payment = resolve_first_payment_period(
                purchase_date=exp.purchase_date,
                closing_day=exp.card.closing_day,
                due_day=exp.card.due_day,
                first_billing_override=exp.first_billing_override,
            )
            k = get_installment_index(first_payment, target_ym)
            if 1 <= k <= exp.installments_count:
                active.append(exp)
        return active

    def get_expense(self, expense_id: uuid.UUID) -> Expense:
        expense = self.expense_repo.get_by_id(expense_id)
        if expense is None:
            raise EntityNotFoundError("Expense", expense_id)
        return expense

    def create_expense(self, payload: ExpenseCreate) -> Expense:
        self._validate_references(payload)
        return self.expense_repo.create(payload)

    def update_expense(self, expense_id: uuid.UUID, payload: ExpenseUpdate) -> Expense:
        expense = self.get_expense(expense_id)
        self._validate_references(payload)
        return self.expense_repo.update(expense, payload)

    def delete_expense(self, expense_id: uuid.UUID) -> None:
        expense = self.get_expense(expense_id)
        self.expense_repo.delete(expense)

    def build_schedule(self, expense_id: uuid.UUID) -> ExpenseScheduleResponse:
        expense = self.get_expense(expense_id)
        card = expense.card

        first_payment = resolve_first_payment_period(
            purchase_date=expense.purchase_date,
            closing_day=card.closing_day,
            due_day=card.due_day,
            first_billing_override=expense.first_billing_override,
        )
        split_specs = [
            SplitSpec(
                person_id=s.person_id,
                person_name=s.person.name,
                split_type=s.split_type,
                percentage=s.percentage,
                fixed_amount=s.fixed_amount,
            )
            for s in expense.splits
        ]

        schedule_items: list[InstallmentScheduleItem] = []
        for k in range(1, expense.installments_count + 1):
            payment_ym = first_payment.add_months(k - 1)
            statement_ym = payment_to_statement_period(payment_ym, card.closing_day, card.due_day)

            closing_date = effective_day_of_month(
                statement_ym.year,
                statement_ym.month,
                card.closing_day,
            )
            due_date = effective_day_of_month(
                payment_ym.year,
                payment_ym.month,
                card.due_day,
            )

            inst_amount = compute_installment_amount(
                total_amount=expense.total_amount,
                installments_count=expense.installments_count,
                installment_number=k,
                currency=card.currency,
            )
            shares = compute_person_shares(
                installment_amount=inst_amount,
                total_amount=expense.total_amount,
                splits=split_specs,
                currency=card.currency,
            )

            schedule_items.append(
                InstallmentScheduleItem(
                    installment_number=k,
                    installments_count=expense.installments_count,
                    installment_label=f"{k}/{expense.installments_count}",
                    statement_period=str(statement_ym),
                    payment_period=str(payment_ym),
                    closing_date=closing_date,
                    due_date=due_date,
                    installment_amount=inst_amount,
                    person_shares=[
                        PersonShareScheduleItem(
                            person_id=sh.person_id,
                            person_name=sh.person_name,
                            amount=sh.amount,
                        )
                        for sh in shares
                    ],
                )
            )

        return ExpenseScheduleResponse(
            expense_id=expense.id,
            description=expense.description,
            card_id=card.id,
            card_name=card.name,
            currency=card.currency.value,
            total_amount=expense.total_amount,
            installments_count=expense.installments_count,
            schedule=schedule_items,
        )
