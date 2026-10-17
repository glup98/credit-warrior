import logging

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.exc import TimeoutError as SATimeoutError

logger = logging.getLogger(__name__)


class DomainError(Exception):
    """Base exception for domain and business rule violations."""

    def __init__(self, message: str, status_code: int = status.HTTP_400_BAD_REQUEST) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class EntityNotFoundError(DomainError):
    """Raised when a requested resource does not exist."""

    def __init__(self, entity: str, entity_id: object) -> None:
        super().__init__(
            message=f"{entity} with id '{entity_id}' was not found.",
            status_code=status.HTTP_404_NOT_FOUND,
        )


class ConflictError(DomainError):
    """Raised when an operation violates a uniqueness or state conflict constraint."""

    def __init__(self, message: str) -> None:
        super().__init__(
            message=message,
            status_code=status.HTTP_409_CONFLICT,
        )


def register_exception_handlers(app: FastAPI) -> None:
    """Register global exception handlers that never leak raw SQL errors to clients."""

    @app.exception_handler(DomainError)
    async def domain_error_handler(_request: Request, exc: DomainError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.message},
        )

    @app.exception_handler(SATimeoutError)
    async def sqlalchemy_timeout_handler(_request: Request, exc: SATimeoutError) -> JSONResponse:
        logger.error("Database connection pool saturated: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "detail": "Database connection pool saturated. Service temporarily unavailable."
            },
        )

    @app.exception_handler(SQLAlchemyError)
    async def sqlalchemy_error_handler(_request: Request, exc: SQLAlchemyError) -> JSONResponse:
        # Log diagnostic info internally without exposing raw SQL error details to the client
        logger.error("Database operation failed: %s", exc.__class__.__name__)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "A database error occurred while processing your request."},
        )
