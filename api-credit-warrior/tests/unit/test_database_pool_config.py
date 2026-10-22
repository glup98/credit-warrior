import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_settings_database_pool_defaults() -> None:
    settings = Settings()
    assert settings.db_pool_size == 10
    assert settings.db_max_overflow == 20
    assert settings.db_pool_recycle == 1800
    assert settings.db_pool_timeout == 30


@pytest.mark.parametrize(
    ("field", "invalid_value"),
    [
        ("DB_POOL_SIZE", 0),
        ("DB_POOL_SIZE", -5),
        ("DB_MAX_OVERFLOW", -1),
        ("DB_POOL_RECYCLE", 0),
        ("DB_POOL_RECYCLE", -10),
        ("DB_POOL_TIMEOUT", 0),
        ("DB_POOL_TIMEOUT", -1),
    ],
)
def test_settings_pool_validation_fail_fast(field: str, invalid_value: int) -> None:
    with pytest.raises(ValidationError):
        Settings(**{field: invalid_value})  # type: ignore[arg-type]


def test_database_sqlite_engine_initializes_without_argument_errors() -> None:
    from app.core.database import create_engine_for_url

    # SQLite memory engine must initialize without ArgumentError
    engine = create_engine_for_url(
        "sqlite+pysqlite:///:memory:",
        pool_size=10,
        max_overflow=20,
        pool_recycle=1800,
        pool_timeout=30,
    )
    with engine.connect() as conn:
        assert conn is not None
