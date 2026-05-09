"""Minimal MCP (Model Context Protocol) client over Streamable HTTP.

We don't pull in the upstream ``mcp`` SDK because (a) it's still pre-1.0
and re-shapes its async API every minor release, (b) for the two
operations we need — ``tools/list`` and ``tools/call`` — the JSON-RPC
envelope is trivial to write by hand against ``httpx``.

If the spec evolves past ``initialize``-less calls, swap this module for
the SDK without touching the rest of the codebase: only ``list_tools``
and ``call_tool`` are exported.
"""

from __future__ import annotations

from typing import Any

import httpx
import structlog

logger = structlog.get_logger(__name__)


class MCPError(RuntimeError):
    """Raised when an MCP server returns an error envelope or a transport
    failure. Caller should surface the message — it lands in the
    ``last_sync_error`` column for the UI to display."""


def _envelope(
    method: str, params: dict[str, Any] | None = None, request_id: int = 1
) -> dict[str, Any]:
    return {
        "jsonrpc": "2.0",
        "id": request_id,
        "method": method,
        "params": params or {},
    }


def _headers(auth_token: str | None) -> dict[str, str]:
    h = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
    }
    if auth_token:
        h["Authorization"] = f"Bearer {auth_token}"
    return h


async def _post_json(url: str, payload: dict[str, Any], auth_token: str | None) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.post(url, json=payload, headers=_headers(auth_token))
        except httpx.TimeoutException as exc:
            raise MCPError(f"Timeout contacting {url}") from exc
        except httpx.RequestError as exc:
            raise MCPError(f"Network error contacting {url}: {exc}") from exc
    if resp.status_code >= 400:
        raise MCPError(f"HTTP {resp.status_code} from {url}")
    try:
        data = resp.json()
    except ValueError as exc:
        raise MCPError(f"Non-JSON response from {url}") from exc
    if isinstance(data, dict) and "error" in data:
        err = data["error"]
        msg = err.get("message", "unknown") if isinstance(err, dict) else str(err)
        raise MCPError(f"MCP error: {msg}")
    return data


async def list_tools(url: str, auth_token: str | None) -> list[dict[str, Any]]:
    """Call ``tools/list`` and return the normalised tool list.

    Each entry has ``name``, ``description``, ``parameters_schema``. Extra
    fields the server emits are dropped — this is the canonical tool
    snapshot we persist on ``MCPServer.synced_tools``.
    """
    data = await _post_json(url, _envelope("tools/list"), auth_token)
    raw = data.get("result", {}).get("tools", [])
    if not isinstance(raw, list):
        raise MCPError("Malformed tools/list response (missing tools array)")
    out: list[dict[str, Any]] = []
    for t in raw:
        if not isinstance(t, dict) or "name" not in t:
            continue
        out.append(
            {
                "name": str(t["name"]),
                "description": str(t.get("description", "") or ""),
                # MCP uses "inputSchema" as the parameters JSON Schema.
                "parameters_schema": t.get("inputSchema") or t.get("parameters_schema") or {},
            }
        )
    logger.info("mcp.list_tools", url=url, count=len(out))
    return out


async def call_tool(
    url: str, auth_token: str | None, name: str, arguments: dict[str, Any]
) -> dict[str, Any]:
    """Call ``tools/call`` for ``name`` with ``arguments`` and return the
    flattened result. The envelope stays a JSON-RPC single response — we
    don't subscribe to streaming for the MVP."""
    payload = _envelope("tools/call", {"name": name, "arguments": arguments})
    data = await _post_json(url, payload, auth_token)
    result = data.get("result", {})
    if not isinstance(result, dict):
        raise MCPError("Malformed tools/call response")
    return result
