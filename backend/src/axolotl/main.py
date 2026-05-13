"""FastAPI application entrypoint."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from axolotl import __version__
from axolotl.config import get_settings
from axolotl.core.rate_limit import limiter

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Startup / shutdown hooks."""
    settings = get_settings()
    logger.info("axolotl.startup", env=settings.env, version=__version__)
    yield
    logger.info("axolotl.shutdown")


def create_app() -> FastAPI:
    """Build and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="Axolotl Companion API",
        version=__version__,
        description="Backend API for Axolotl Companion",
        lifespan=lifespan,
        docs_url="/docs" if settings.env != "production" else None,
        redoc_url="/redoc" if settings.env != "production" else None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Per-IP rate limiting (slowapi + Redis). The handlers opt-in via
    # ``@limiter.limit("...")`` — nothing is throttled by default. The
    # ``SlowAPIMiddleware`` wires ``request.state.view_rate_limit`` so
    # ``X-RateLimit-*`` headers come through on every limited response.
    # The exception handler is slowapi's own — it knows the exception
    # carries the ``Retry-After`` headers, the ``view_rate_limit``
    # snapshot, etc.
    app.state.limiter = limiter
    app.add_middleware(SlowAPIMiddleware)
    # slowapi types ``_rate_limit_exceeded_handler`` with the narrow
    # ``RateLimitExceeded`` parameter; Starlette wants the generic
    # ``Exception`` shape on the handler signature, so we tell mypy to
    # trust the registration.
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]

    @app.get("/health", tags=["system"])
    async def health() -> dict[str, str]:
        """Liveness probe."""
        return {"status": "ok", "version": __version__}

    from axolotl.api.v1 import auth as auth_router
    from axolotl.api.v1 import config as config_router
    from axolotl.api.v1 import mcp as mcp_router
    from axolotl.api.v1 import personas as personas_router
    from axolotl.api.v1 import sessions as sessions_router
    from axolotl.api.v1 import tools as tools_router

    app.include_router(auth_router.router, prefix="/auth", tags=["auth"])
    app.include_router(sessions_router.router, prefix="/v1/sessions", tags=["sessions"])
    app.include_router(tools_router.router, prefix="/v1/tools", tags=["tools"])
    app.include_router(personas_router.router, prefix="/v1/personas", tags=["personas"])
    app.include_router(mcp_router.router, prefix="/v1/mcp", tags=["mcp"])
    app.include_router(config_router.router, prefix="/v1/config", tags=["config"])

    return app


app = create_app()
