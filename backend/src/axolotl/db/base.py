"""Async SQLAlchemy engine + session factory."""

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlmodel import SQLModel

from axolotl.config import get_settings

_settings = get_settings()

engine = create_async_engine(
    _settings.database_url,
    echo=_settings.env == "development" and _settings.log_level == "debug",
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10,
)

async_session: async_sessionmaker[AsyncSession] = async_sessionmaker(
    engine,
    expire_on_commit=False,
    class_=AsyncSession,
)

# Re-export for Alembic autogenerate to discover the metadata
Base = SQLModel


async def get_db() -> AsyncIterator[AsyncSession]:
    """Yield a transactional async session and close it at the end of a request."""
    async with async_session() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
