from starlette.datastructures import Headers
from starlette.middleware.gzip import GZipMiddleware, GZipResponder, IdentityResponder
from starlette.types import ASGIApp, Receive, Scope, Send


class ContentNegotiatedGZipMiddleware(GZipMiddleware):
    """GZip middleware adhering strictly to HTTP content negotiation (RFC 9110).

    Starlette's default GZipMiddleware uses a naive substring check ('gzip' in Accept-Encoding)
    which incorrectly compresses responses when a client explicitly declines gzip via quality
    weight 'q=0' (e.g. 'Accept-Encoding: gzip;q=0'). This middleware parses quality weights
    and only enables GZipResponder when gzip is genuinely accepted (q > 0).
    """

    @staticmethod
    def is_gzip_accepted(accept_encoding: str) -> bool:
        if not accept_encoding:
            return False
        for entry in accept_encoding.split(","):
            parts = [p.strip() for p in entry.split(";")]
            encoding = parts[0].lower()
            if encoding in ("gzip", "*"):
                is_rejected = False
                for param in parts[1:]:
                    if param.lower().startswith("q="):
                        try:
                            if float(param[2:].strip()) <= 0:
                                is_rejected = True
                        except ValueError:
                            pass
                if not is_rejected:
                    return True
        return False

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = Headers(scope=scope)
        accept_encoding = headers.get("Accept-Encoding", "")
        responder: ASGIApp
        if self.is_gzip_accepted(accept_encoding):
            responder = GZipResponder(
                self.app,
                self.minimum_size,
                compresslevel=self.compresslevel,
                thread_minimum_size=self.thread_minimum_size,
                exclude_content_types=self.exclude_content_types,
            )
        else:
            responder = IdentityResponder(
                self.app,
                self.minimum_size,
                exclude_content_types=self.exclude_content_types,
            )

        await responder(scope, receive, send)
