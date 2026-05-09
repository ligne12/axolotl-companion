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

import contextlib
import json
from typing import Any

import httpx
import structlog

logger = structlog.get_logger(__name__)

_PROTOCOL_VERSION = "2025-06-18"
_CLIENT_NAME = "axolotl-companion"
_CLIENT_VERSION = "0.1.0"


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


def _parse_sse_payload(body: str, url: str) -> dict[str, Any]:
    """Pull the first JSON-RPC ``message`` payload out of an SSE response.

    Streamable-HTTP MCP servers MAY answer a single POST with
    ``text/event-stream``; we just want the one ``data:`` frame that
    carries the JSON-RPC response (Context7 / DeepWiki / GitHub MCP all
    do this). Multi-event streaming isn't needed for ``tools/list`` or
    ``tools/call``.
    """
    for line in body.splitlines():
        if line.startswith("data:"):
            chunk = line[5:].strip()
            if not chunk:
                continue
            try:
                obj = json.loads(chunk)
            except json.JSONDecodeError:
                continue
            if isinstance(obj, dict) and ("result" in obj or "error" in obj):
                return obj
    raise MCPError(f"No JSON-RPC payload in SSE response from {url}")


def _decode_response(resp: httpx.Response, url: str) -> dict[str, Any]:
    ctype = resp.headers.get("content-type", "").lower()
    if "text/event-stream" in ctype:
        return _parse_sse_payload(resp.text, url)
    try:
        data = resp.json()
    except ValueError as exc:
        raise MCPError(f"Non-JSON response from {url}") from exc
    if not isinstance(data, dict):
        raise MCPError(f"Unexpected response shape from {url}")
    return data


async def _rpc(
    client: httpx.AsyncClient,
    url: str,
    payload: dict[str, Any],
    headers: dict[str, str],
) -> tuple[dict[str, Any], httpx.Response]:
    try:
        resp = await client.post(url, json=payload, headers=headers)
    except httpx.TimeoutException as exc:
        raise MCPError(f"Timeout contacting {url}") from exc
    except httpx.RequestError as exc:
        raise MCPError(f"Network error contacting {url}: {exc}") from exc
    if resp.status_code >= 400:
        raise MCPError(f"HTTP {resp.status_code} from {url}")
    data = _decode_response(resp, url)
    if "error" in data:
        err = data["error"]
        msg = err.get("message", "unknown") if isinstance(err, dict) else str(err)
        raise MCPError(f"MCP error: {msg}")
    return data, resp


async def _notify(
    client: httpx.AsyncClient,
    url: str,
    method: str,
    headers: dict[str, str],
) -> None:
    """Fire-and-forget JSON-RPC notification (no ``id`` field, no response expected).

    Notifications are advisory — never block the real call on transport
    failures here, the follow-up RPC will surface anything important.
    """
    payload: dict[str, Any] = {"jsonrpc": "2.0", "method": method, "params": {}}
    with contextlib.suppress(httpx.RequestError):
        await client.post(url, json=payload, headers=headers)


async def _initialize(
    client: httpx.AsyncClient, url: str, base_headers: dict[str, str]
) -> dict[str, str]:
    """Run the MCP handshake. Returns the headers to use for follow-ups
    (with ``Mcp-Session-Id`` set if the server returned one)."""
    init_payload = _envelope(
        "initialize",
        {
            "protocolVersion": _PROTOCOL_VERSION,
            "capabilities": {},
            "clientInfo": {"name": _CLIENT_NAME, "version": _CLIENT_VERSION},
        },
    )
    _, resp = await _rpc(client, url, init_payload, base_headers)
    follow_headers = dict(base_headers)
    session_id = resp.headers.get("mcp-session-id")
    if session_id:
        follow_headers["Mcp-Session-Id"] = session_id
    await _notify(client, url, "notifications/initialized", follow_headers)
    return follow_headers


async def list_tools(url: str, auth_token: str | None) -> list[dict[str, Any]]:
    """Call ``tools/list`` and return the normalised tool list.

    Each entry has ``name``, ``description``, ``parameters_schema``. Extra
    fields the server emits are dropped — this is the canonical tool
    snapshot we persist on ``MCPServer.synced_tools``.
    """
    base = _headers(auth_token)
    async with httpx.AsyncClient(timeout=15.0) as client:
        follow = await _initialize(client, url, base)
        data, _ = await _rpc(client, url, _envelope("tools/list"), follow)
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
    base = _headers(auth_token)
    payload = _envelope("tools/call", {"name": name, "arguments": arguments})
    async with httpx.AsyncClient(timeout=30.0) as client:
        follow = await _initialize(client, url, base)
        data, _ = await _rpc(client, url, payload, follow)
    result = data.get("result", {})
    if not isinstance(result, dict):
        raise MCPError("Malformed tools/call response")
    return result
