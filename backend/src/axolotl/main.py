"""FastAPI application entrypoint."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from axolotl import __version__
from axolotl.config import get_settings

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

    @app.get("/health", tags=["system"])
    async def health() -> dict[str, str]:
        """Liveness probe."""
        return {"status": "ok", "version": __version__}

    from axolotl.api.v1 import auth as auth_router

    app.include_router(auth_router.router, prefix="/auth", tags=["auth"])

    return app


app = create_app()
