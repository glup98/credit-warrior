from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.dashboard import DashboardProjectionResponse, DashboardSummaryResponse
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def get_reference_date() -> date:
    """Injectable reference date provider at the HTTP boundary."""
    return date.today()


DbSession = Annotated[Session, Depends(get_db)]
RefDate = Annotated[date, Depends(get_reference_date)]


@router.get("/summary", response_model=DashboardSummaryResponse)
def get_dashboard_summary(
    db: DbSession,
    reference_date: RefDate,
    period: str | None = None,
) -> DashboardSummaryResponse:
    return DashboardService(db).get_monthly_summary(
        reference_date=reference_date,
        period=period,
    )


@router.get("/projection", response_model=DashboardProjectionResponse)
def get_dashboard_projection(
    db: DbSession,
    reference_date: RefDate,
    start_period: str | None = None,
    months: int = Query(default=6, ge=1, le=24),
) -> DashboardProjectionResponse:
    return DashboardService(db).get_projection(
        reference_date=reference_date,
        start_period=start_period,
        months=months,
    )
