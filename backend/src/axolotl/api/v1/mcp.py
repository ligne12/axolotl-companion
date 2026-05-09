"""MCP servers CRUD + sync endpoint.

Per-user records, encrypted bearer token at rest. Sync calls the server's
``tools/list`` (see ``axolotl.llm.mcp_client``) and persists the result on
the row so chat completions don't pay the round-trip on every send.
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import structlog
from fastapi import APIRouter, HTTPException, status
from sqlmodel import col, select

from axolotl.api.deps import CurrentUser, DbSession
from axolotl.core.secrets import decrypt_secret, encrypt_secret
from axolotl.db.models import MCPServer
from axolotl.llm.mcp_client import MCPError, list_tools
from axolotl.schemas.mcp import (
    MCPServerCreate,
    MCPServerPublic,
    MCPServerUpdate,
    MCPSyncResult,
    MCPToolInfo,
)

logger = structlog.get_logger(__name__)
router = APIRouter()


def _to_public(s: MCPServer) -> MCPServerPublic:
    """Hand-roll the read DTO so we can derive ``has_auth_token`` and never
    leak the cipher text. ``synced_tools`` is the JSONB array as Python
    dicts — Pydantic re-validates each through ``MCPToolInfo``."""
    return MCPServerPublic.model_validate(
        {
            "id": s.id,
            "name": s.name,
            "url": s.url,
            "transport": s.transport,
            "has_auth_token": bool(s.auth_token_cipher),
            "enabled": s.enabled,
            "synced_tools": [MCPToolInfo.model_validate(t) for t in s.synced_tools],
            "last_synced_at": s.last_synced_at,
            "last_sync_error": s.last_sync_error,
            "created_at": s.created_at,
            "updated_at": s.updated_at,
        }
    )


async def _get_user_server(db: DbSession, server_id: int, user_id: int) -> MCPServer:
    result = await db.execute(
        select(MCPServer).where(MCPServer.id == server_id, MCPServer.user_id == user_id)
    )
    server = result.scalar_one_or_none()
    if server is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="MCP server not found")
    return server


# -----------------------------------------------------------------------------
# CRUD
# -----------------------------------------------------------------------------
@router.get("/servers", response_model=list[MCPServerPublic])
async def list_servers(current_user: CurrentUser, db: DbSession) -> list[MCPServerPublic]:
    """List the current user's MCP servers, oldest first (insertion order)."""
    assert current_user.id is not None
    result = await db.execute(
        select(MCPServer)
        .where(MCPServer.user_id == current_user.id)
        .order_by(col(MCPServer.created_at))
    )
    return [_to_public(s) for s in result.scalars().all()]


@router.post("/servers", response_model=MCPServerPublic, status_code=status.HTTP_201_CREATED)
async def create_server(
    payload: MCPServerCreate, current_user: CurrentUser, db: DbSession
) -> MCPServerPublic:
    """Register a new MCP server. ``auth_token`` (if provided) is Fernet-encrypted
    before persisting and never echoed back."""
    assert current_user.id is not None
    server = MCPServer(
        user_id=current_user.id,
        name=payload.name.strip(),
        url=str(payload.url),
        transport=payload.transport,
        auth_token_cipher=encrypt_secret(payload.auth_token) if payload.auth_token else None,
        enabled=payload.enabled,
    )
    db.add(server)
    try:
        await db.commit()
    except Exception as exc:  # IntegrityError on the (user_id, name) unique
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An MCP server with that name already exists",
        ) from exc
    await db.refresh(server)
    logger.info("mcp.servers.create", user_id=current_user.id, server_id=server.id)
    return _to_public(server)


@router.get("/servers/{server_id}", response_model=MCPServerPublic)
async def get_server(server_id: int, current_user: CurrentUser, db: DbSession) -> MCPServerPublic:
    assert current_user.id is not None
    server = await _get_user_server(db, server_id, current_user.id)
    return _to_public(server)


@router.patch("/servers/{server_id}", response_model=MCPServerPublic)
async def update_server(
    server_id: int,
    payload: MCPServerUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> MCPServerPublic:
    """Partial update. ``auth_token`` semantics: omit to leave the existing
    cipher in place; pass empty string to clear; pass any non-empty value
    to replace."""
    assert current_user.id is not None
    server = await _get_user_server(db, server_id, current_user.id)

    if payload.name is not None:
        server.name = payload.name.strip()
    if payload.url is not None:
        server.url = str(payload.url)
    if payload.transport is not None:
        server.transport = payload.transport
    if "auth_token" in payload.model_fields_set:
        if not payload.auth_token:
            server.auth_token_cipher = None
        else:
            server.auth_token_cipher = encrypt_secret(payload.auth_token)
    if payload.enabled is not None:
        server.enabled = payload.enabled

    server.updated_at = datetime.now(UTC)
    db.add(server)
    try:
        await db.commit()
    except Exception as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An MCP server with that name already exists",
        ) from exc
    await db.refresh(server)
    return _to_public(server)


@router.delete("/servers/{server_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_server(server_id: int, current_user: CurrentUser, db: DbSession) -> None:
    assert current_user.id is not None
    server = await _get_user_server(db, server_id, current_user.id)
    await db.delete(server)
    await db.commit()
    logger.info("mcp.servers.delete", user_id=current_user.id, server_id=server_id)


# -----------------------------------------------------------------------------
# Sync — pull the server's tool list and persist it on the row
# -----------------------------------------------------------------------------
@router.post("/servers/{server_id}/sync", response_model=MCPSyncResult)
async def sync_server(server_id: int, current_user: CurrentUser, db: DbSession) -> MCPSyncResult:
    assert current_user.id is not None
    server = await _get_user_server(db, server_id, current_user.id)
    token = decrypt_secret(server.auth_token_cipher) if server.auth_token_cipher else None

    try:
        tools: list[dict[str, Any]] = await list_tools(server.url, token)
    except MCPError as exc:
        # Persist the failure for the UI to display, then bubble a 502.
        server.last_sync_error = str(exc)[:500]
        server.updated_at = datetime.now(UTC)
        db.add(server)
        await db.commit()
        await db.refresh(server)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Sync failed: {exc}",
        ) from exc

    server.synced_tools = tools
    server.last_synced_at = datetime.now(UTC)
    server.last_sync_error = None
    server.updated_at = datetime.now(UTC)
    db.add(server)
    await db.commit()
    await db.refresh(server)
    return MCPSyncResult(server=_to_public(server), tools_count=len(tools))
