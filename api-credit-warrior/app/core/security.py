from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import Settings

# TODO(security): Authentication and Authorization are deferred in the MVP per business rules
# (Person entities operate as master tags without login). Before exposing this API outside a
# trusted network, implement:
# 1. OAuth2 / OpenID Connect or JWT authentication (or hardened __Host- HttpOnly cookies + CSRF).
# 2. Multi-Factor Authentication (MFA) and leaked-password detection if local passwords are used.
# 3. Resource ownership authorization checks on every Card, Person, and Expense query.
# 4. API Rate Limiting per IP and authenticated user.


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Inject strict HTTP security headers on all outgoing responses."""

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Cache-Control"] = "no-store"
        if request.url.path in {"/docs", "/redoc"}:
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                "style-src 'self' 'unsafe-inline' "
                "https://cdn.jsdelivr.net https://fonts.googleapis.com; "
                "img-src 'self' data: https://fastapi.tiangolo.com; "
                "font-src 'self' https://fonts.gstatic.com; "
                "frame-ancestors 'none'"
            )
        else:
            response.headers["Content-Security-Policy"] = (
                "default-src 'self'; frame-ancestors 'none'"
            )
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
        return response


def configure_security(app: FastAPI, settings: Settings) -> None:
    """Configure strict CORS policy and HTTP security headers middleware."""
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Accept", "Authorization"],
    )
