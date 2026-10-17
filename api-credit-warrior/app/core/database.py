from collections.abc import Generator
from typing import Any

from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()


def create_engine_for_url(
    database_url: str,
    *,
    pool_size: int = 10,
    max_overflow: int = 20,
    pool_recycle: int = 1800,
    pool_timeout: int = 30,
) -> Engine:
    """Create a SQLAlchemy Engine with dialect-aware pooling parameters."""
    is_sqlite = database_url.startswith("sqlite")
    engine_kwargs: dict[str, Any] = {
        "pool_pre_ping": True,
    }
    if is_sqlite:
        engine_kwargs["connect_args"] = {"check_same_thread": False}
    else:
        engine_kwargs.update(
            {
                "pool_size": pool_size,
                "max_overflow": max_overflow,
                "pool_recycle": pool_recycle,
                "pool_timeout": pool_timeout,
            }
        )
    return create_engine(database_url, **engine_kwargs)


engine = create_engine_for_url(
    settings.database_url,
    pool_size=settings.db_pool_size,
    max_overflow=settings.db_max_overflow,
    pool_recycle=settings.db_pool_recycle,
    pool_timeout=settings.db_pool_timeout,
)

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


def get_db() -> Generator[Session, None, None]:
    """Provide a transactional database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
