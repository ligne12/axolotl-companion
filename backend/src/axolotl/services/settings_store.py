"""Per-user key-value settings stored in the ``settings`` table."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any, cast

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from axolotl.db.models import Setting

KEY_ENABLED_TOOLS = "tools.enabled"


async def get_setting(db: AsyncSession, user_id: int, key: str) -> Any | None:
    """Read a user setting by key, or ``None`` if unset."""
    result = await db.execute(select(Setting).where(Setting.user_id == user_id, Setting.key == key))
    row = result.scalar_one_or_none()
    return row.value if row else None


async def set_setting(db: AsyncSession, user_id: int, key: str, value: Any) -> None:
    """Upsert a user setting."""
    result = await db.execute(select(Setting).where(Setting.user_id == user_id, Setting.key == key))
    row = result.scalar_one_or_none()
    if row is None:
        db.add(Setting(user_id=user_id, key=key, value=value))
    else:
        row.value = value
        row.updated_at = datetime.now(UTC)
        db.add(row)
    await db.commit()


async def get_enabled_tools(db: AsyncSession, user_id: int, defaults: list[str]) -> list[str]:
    """Return the list of tool names enabled for a user (fallback to ``defaults``)."""
    stored = await get_setting(db, user_id, KEY_ENABLED_TOOLS)
    if stored is None:
        return defaults
    return cast("list[str]", stored)


async def set_enabled_tools(db: AsyncSession, user_id: int, names: list[str]) -> None:
    await set_setting(db, user_id, KEY_ENABLED_TOOLS, names)
