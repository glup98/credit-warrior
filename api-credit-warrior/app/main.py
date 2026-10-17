from fastapi import FastAPI

from app.api.v1.router import api_v1_router
from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.gzip_middleware import ContentNegotiatedGZipMiddleware
from app.core.security import configure_security


def create_app() -> FastAPI:
    """Application factory for Credit Warrior Backend."""
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    app.add_middleware(ContentNegotiatedGZipMiddleware, minimum_size=1000)
    configure_security(app, settings)
    register_exception_handlers(app)
    app.include_router(api_v1_router)

    @app.get("/health", tags=["system"])
    def health_check() -> dict[str, str]:
        return {"status": "ok", "service": "api-credit-warrior"}

    return app


app = create_app()
