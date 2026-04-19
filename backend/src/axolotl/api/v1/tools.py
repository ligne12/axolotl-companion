"""Endpoints to list and toggle tools available for the current user."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from axolotl.api.deps import CurrentUser, DbSession
from axolotl.llm.tools import registry
from axolotl.schemas.tools import ToolInfo, ToolToggle
from axolotl.services.settings_store import get_enabled_tools, set_enabled_tools

router = APIRouter()


@router.get("", response_model=list[ToolInfo])
async def list_tools(current_user: CurrentUser, db: DbSession) -> list[ToolInfo]:
    """List every available tool with its ``enabled`` state for the current user."""
    assert current_user.id is not None
    enabled = set(await get_enabled_tools(db, current_user.id, defaults=registry.default_enabled()))
    return [
        ToolInfo(
            name=t.name,
            title=t.title,
            description=t.description,
            category=t.category,
            icon=t.icon,
            enabled=t.name in enabled,
        )
        for t in registry.all()
    ]


@router.put("/{name}", response_model=ToolInfo)
async def toggle_tool(
    name: str,
    payload: ToolToggle,
    current_user: CurrentUser,
    db: DbSession,
) -> ToolInfo:
    """Enable or disable a tool for the current user."""
    assert current_user.id is not None
    tool = registry.get(name)
    if tool is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown tool")

    enabled = await get_enabled_tools(db, current_user.id, defaults=registry.default_enabled())
    enabled_set = set(enabled)
    if payload.enabled:
        enabled_set.add(name)
    else:
        enabled_set.discard(name)
    await set_enabled_tools(db, current_user.id, sorted(enabled_set))

    return ToolInfo(
        name=tool.name,
        title=tool.title,
        description=tool.description,
        category=tool.category,
        icon=tool.icon,
        enabled=payload.enabled,
    )
