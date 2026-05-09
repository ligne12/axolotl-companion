"""Pydantic DTOs for the MCP-server CRUD endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl

Transport = Literal["http"]
"""Supported MCP transports. Streamable HTTP is the primary spec — POST a
JSON-RPC, server responds with JSON (or with an SSE stream when a single
result isn't enough). For ``tools/list`` and current single-result tools
we only need the JSON path. ``sse`` and ``stdio`` are deferred (see
plan.md)."""


class MCPToolInfo(BaseModel):
    """Snapshot of one tool advertised by an MCP server, persisted in
    ``mcp_servers.synced_tools`` so chat completions don't pay the
    round-trip on every send."""

    name: str
    description: str = ""
    parameters_schema: dict[str, Any] = Field(default_factory=dict)


class MCPServerCreate(BaseModel):
    """Body for ``POST /v1/mcp/servers``. ``auth_token`` is the raw bearer
    token typed by the user; the API endpoint encrypts it at rest before
    persisting."""

    name: str = Field(min_length=1, max_length=100, pattern=r"^[a-zA-Z0-9_\- ]+$")
    url: HttpUrl
    transport: Transport = "http"
    auth_token: str | None = Field(default=None, max_length=500)
    enabled: bool = True


class MCPServerUpdate(BaseModel):
    """Partial update. Each field is optional; only present keys are
    applied. Pass ``auth_token: ""`` to clear the stored token, omit it to
    leave the existing token in place."""

    name: str | None = Field(
        default=None, min_length=1, max_length=100, pattern=r"^[a-zA-Z0-9_\- ]+$"
    )
    url: HttpUrl | None = None
    transport: Transport | None = None
    auth_token: str | None = Field(default=None, max_length=500)
    enabled: bool | None = None


class MCPServerPublic(BaseModel):
    """Read shape — never includes the auth token. ``has_auth_token`` is a
    boolean hint so the frontend can show 'token configured' vs an empty
    field without ever surfacing the secret."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    url: str
    transport: Transport
    has_auth_token: bool
    enabled: bool
    synced_tools: list[MCPToolInfo] = Field(default_factory=list)
    last_synced_at: datetime | None
    last_sync_error: str | None
    created_at: datetime
    updated_at: datetime


class MCPSyncResult(BaseModel):
    """Returned by ``POST /v1/mcp/servers/{id}/sync``. Mirrors what gets
    persisted on the row plus a friendly count for the toast."""

    server: MCPServerPublic
    tools_count: int
