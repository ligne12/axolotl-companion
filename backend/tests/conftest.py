"""Shared pytest fixtures for backend tests.

Uses a test-only async engine with ``NullPool`` so that each connection is
opened/closed without binding to a specific event loop — the classic cure for
the ``Future attached to a different loop`` error with asyncpg.
"""

from __future__ import annotations

from collections.abc import AsyncIterator

import pytest_asyncio
import sqlalchemy as sa
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool
from sqlmodel import SQLModel

from axolotl.config import get_settings
from axolotl.db.base import get_db
from axolotl.main import app

_settings = get_settings()

test_engine = create_async_engine(
    _settings.database_url,
    poolclass=NullPool,
    echo=False,
)

TestSessionLocal = async_sessionmaker(
    test_engine,
    expire_on_commit=False,
    class_=AsyncSession,
)


async def _override_get_db() -> AsyncIterator[AsyncSession]:
    async with TestSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


app.dependency_overrides[get_db] = _override_get_db


@pytest_asyncio.fixture(autouse=True)
async def _setup_db() -> AsyncIterator[None]:
    """Create and drop all tables around each test (isolated state)."""
    async with test_engine.begin() as conn:
        await conn.execute(sa.text("CREATE EXTENSION IF NOT EXISTS citext"))
        await conn.execute(sa.text("CREATE EXTENSION IF NOT EXISTS pgcrypto"))
        await conn.run_sync(SQLModel.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.drop_all)


@pytest_asyncio.fixture
async def db() -> AsyncIterator[AsyncSession]:
    async with TestSessionLocal() as session:
        yield session


@pytest_asyncio.fixture
async def client() -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
