"""Chat orchestration: streams LLM events and handles tool-call rounds."""

from __future__ import annotations

import asyncio
import json
import re
import time
from collections.abc import AsyncIterator
from typing import Any
from uuid import UUID

import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from axolotl.config import get_settings
from axolotl.core.secrets import decrypt_secret
from axolotl.db.models import MCPServer, Message, Persona, Session
from axolotl.llm.client import VLLMClient
from axolotl.llm.events import ChatEvent
from axolotl.llm.mcp_client import MCPError
from axolotl.llm.mcp_client import call_tool as mcp_call_tool
from axolotl.llm.tools import execute_tool, registry

logger = structlog.get_logger(__name__)


async def _load_persona_prompt(db: AsyncSession, persona_id: int | None) -> str | None:
    """Fetch the attached persona's system prompt, if any."""
    if persona_id is None:
        return None
    result = await db.execute(select(Persona).where(Persona.id == persona_id))
    persona = result.scalar_one_or_none()
    return persona.system_prompt if persona is not None else None


async def _load_history(
    db: AsyncSession, session_id: UUID, system_prompt: str | None = None
) -> list[dict[str, Any]]:
    """Load the session's message history in OpenAI format, optionally
    prepending a system message from the session's persona."""
    result = await db.execute(
        select(Message).where(Message.session_id == session_id).order_by(col(Message.created_at))
    )
    messages = result.scalars().all()

    history: list[dict[str, Any]] = []
    if system_prompt:
        history.append({"role": "system", "content": system_prompt})
    for m in messages:
        msg: dict[str, Any] = {"role": m.role}
        if m.content is not None:
            msg["content"] = m.content
        if m.role == "assistant" and m.tool_calls:
            msg["tool_calls"] = m.tool_calls
            msg.setdefault("content", None)
        if m.role == "tool" and m.tool_call_id:
            msg["tool_call_id"] = m.tool_call_id
        history.append(msg)
    return history


def _finalize_tool_calls(acc: dict[int, dict[str, str]]) -> list[dict[str, Any]]:
    """Turn accumulated streaming tool-call deltas into OpenAI-format entries."""
    out: list[dict[str, Any]] = []
    for idx in sorted(acc):
        tc = acc[idx]
        if not tc.get("name"):
            continue
        out.append(
            {
                "id": tc.get("id") or f"call_{idx}",
                "type": "function",
                "function": {
                    "name": tc["name"],
                    "arguments": tc.get("arguments", "") or "{}",
                },
            }
        )
    return out


_SAMPLING_KEYS = (
    "temperature",
    "top_p",
    "top_k",
    "min_p",
    "presence_penalty",
    "repetition_penalty",
    "max_tokens",
    "enable_thinking",
)


_MCP_TOOL_PREFIX = "mcp__"
_MCP_NAME_RE = re.compile(r"[^a-zA-Z0-9_-]")


def _mcp_tool_name(server_id: int, raw_name: str) -> str:
    """Encode an MCP tool name to OpenAI's allowed charset
    (`[a-zA-Z0-9_-]`). The server id is part of the prefix so the
    dispatcher can route back to the right MCP server without a name
    lookup; the original name is sanitised but preserved end-to-end."""
    safe = _MCP_NAME_RE.sub("_", raw_name)
    return f"{_MCP_TOOL_PREFIX}{server_id}__{safe}"


def _parse_mcp_tool_name(name: str) -> tuple[int, str] | None:
    """Inverse of :func:`_mcp_tool_name`. Returns (server_id, original_name)
    or ``None`` if the name isn't an MCP-prefixed tool."""
    if not name.startswith(_MCP_TOOL_PREFIX):
        return None
    body = name[len(_MCP_TOOL_PREFIX) :]
    sep = body.find("__")
    if sep <= 0:
        return None
    try:
        server_id = int(body[:sep])
    except ValueError:
        return None
    return server_id, body[sep + 2 :]


async def _load_mcp_tool_context(
    db: AsyncSession, user_id: int
) -> tuple[list[dict[str, Any]], dict[int, MCPServer]]:
    """Return (OpenAI tool specs, server_id → MCPServer) for the user's
    enabled MCP servers. The dict lets the dispatcher resolve a tool call
    back to the server's URL + auth without re-querying the DB."""
    result = await db.execute(
        select(MCPServer).where(MCPServer.user_id == user_id, MCPServer.enabled.is_(True))
    )
    servers = list(result.scalars().all())
    specs: list[dict[str, Any]] = []
    by_id: dict[int, MCPServer] = {}
    for server in servers:
        if server.id is None:
            continue
        by_id[server.id] = server
        for tool in server.synced_tools:
            raw_name = tool.get("name")
            if not isinstance(raw_name, str):
                continue
            specs.append(
                {
                    "type": "function",
                    "function": {
                        "name": _mcp_tool_name(server.id, raw_name),
                        "description": tool.get("description", "") or "",
                        "parameters": tool.get("parameters_schema") or {},
                    },
                }
            )
    return specs, by_id


async def _dispatch_tool(
    name: str,
    arguments: dict[str, Any],
    mcp_servers: dict[int, MCPServer],
) -> dict[str, Any]:
    """Route a tool call to the built-in registry or to the right MCP
    server. Errors are caught and surfaced as ``{"error": "..."}`` so the
    orchestrator can persist a tool message and the model can react."""
    parsed = _parse_mcp_tool_name(name)
    if parsed is None:
        return await execute_tool(name, arguments)
    server_id, original_name = parsed
    server = mcp_servers.get(server_id)
    if server is None or not server.enabled:
        return {"error": f"MCP server {server_id} not enabled"}
    token = decrypt_secret(server.auth_token_cipher) if server.auth_token_cipher else None
    try:
        return await mcp_call_tool(server.url, token, original_name, arguments)
    except MCPError as exc:
        return {"error": f"MCP call failed: {exc}"}


def _merge_sampling_params(
    *,
    user_defaults: dict[str, Any] | None,
    session_overrides: dict[str, Any] | None,
) -> dict[str, Any]:
    """Layer ``settings`` (base) → ``user_defaults`` → ``session_overrides``,
    keeping only keys the LLM client understands. Input dicts are the sparse
    JSONB maps stored on ``User.defaults`` / ``Session.overrides`` — their
    missing keys mean "fall through to the next layer"."""
    settings = get_settings()
    base: dict[str, Any] = {
        "temperature": settings.vllm_temperature,
        "top_p": settings.vllm_top_p,
        "top_k": settings.vllm_top_k,
        "min_p": settings.vllm_min_p,
        "presence_penalty": settings.vllm_presence_penalty,
        "repetition_penalty": settings.vllm_repetition_penalty,
        "max_tokens": settings.vllm_max_tokens,
        "enable_thinking": settings.vllm_enable_thinking,
    }
    for layer in (user_defaults, session_overrides):
        if not layer:
            continue
        for key in _SAMPLING_KEYS:
            value = layer.get(key)
            if value is not None:
                base[key] = value
    return base


async def stream_chat(
    *,
    db: AsyncSession,
    session: Session,
    client: VLLMClient,
    model: str,
    enabled_tools: list[str] | None = None,
    user_defaults: dict[str, Any] | None = None,
) -> AsyncIterator[ChatEvent]:
    """Run the full LLM loop: stream deltas, execute tools, loop up to N rounds.

    ``enabled_tools`` filters which registered tools are exposed to the model.
    Pass ``None`` to fall back to the registry defaults, or ``[]`` to disable
    tool-calling entirely.

    Sampling params are layered: global settings → ``user_defaults`` →
    ``session.overrides``.
    """
    settings = get_settings()
    assert session.id is not None
    system_prompt = await _load_persona_prompt(db, session.persona_id)
    history = await _load_history(db, session.id, system_prompt=system_prompt)
    tool_specs = registry.specs_for(enabled_tools)
    mcp_specs, mcp_servers = await _load_mcp_tool_context(db, session.user_id)
    tool_specs = [*tool_specs, *mcp_specs]
    sampling = _merge_sampling_params(
        user_defaults=user_defaults,
        session_overrides=session.overrides,
    )

    overall_start = time.monotonic()
    tool_durations_ms: dict[str, int] = {}

    for round_n in range(settings.max_tool_rounds + 1):
        is_last_round = round_n == settings.max_tool_rounds
        tools = None if (is_last_round or not tool_specs) else tool_specs

        yield ChatEvent(event="message.start", data={"round": round_n})

        reasoning_parts: list[str] = []
        content_parts: list[str] = []
        tool_calls_acc: dict[int, dict[str, str]] = {}
        usage: dict[str, Any] | None = None
        finish_reason: str | None = None
        round_start = time.monotonic()
        reasoning_start: float | None = None
        reasoning_end: float | None = None
        content_start: float | None = None

        stream = client.stream_chat(
            messages=history,
            model=model,
            tools=tools,
            **sampling,
        )

        try:
            async for chunk in stream:
                if chunk.get("usage"):
                    usage = chunk["usage"]

                choices = chunk.get("choices") or []
                if not choices:
                    continue
                choice = choices[0]
                if choice.get("finish_reason"):
                    finish_reason = choice["finish_reason"]
                delta = choice.get("delta", {})

                if rsn := (delta.get("reasoning") or delta.get("reasoning_content")):
                    if reasoning_start is None:
                        reasoning_start = time.monotonic()
                    reasoning_end = time.monotonic()
                    reasoning_parts.append(rsn)
                    yield ChatEvent(event="reasoning.delta", data={"text": rsn})

                if content := delta.get("content"):
                    if content_start is None:
                        content_start = time.monotonic()
                    content_parts.append(content)
                    yield ChatEvent(event="message.delta", data={"text": content})

                for tc in delta.get("tool_calls") or []:
                    idx = int(tc.get("index", 0))
                    slot = tool_calls_acc.setdefault(idx, {"id": "", "name": "", "arguments": ""})
                    if tc.get("id"):
                        slot["id"] = tc["id"]
                    fn = tc.get("function") or {}
                    if fn.get("name"):
                        slot["name"] = fn["name"]
                    if fn.get("arguments"):
                        slot["arguments"] += fn["arguments"]
        except asyncio.CancelledError:
            # Client disconnected (Stop button). The async-generator context
            # manager inside client.stream_chat closes the httpx stream on
            # exit, which makes vLLM detect the closed connection and abort.
            logger.info("chat.cancelled", reason="client_disconnect")
            raise

        round_end = time.monotonic()
        content_str = "".join(content_parts)
        reasoning_str = "".join(reasoning_parts) or None
        tool_calls = _finalize_tool_calls(tool_calls_acc)

        round_ms = int((round_end - round_start) * 1000)
        reasoning_ms = (
            int((reasoning_end - reasoning_start) * 1000)
            if reasoning_start is not None and reasoning_end is not None
            else None
        )
        content_ms = int((round_end - content_start) * 1000) if content_start is not None else None

        metadata: dict[str, Any] = {
            "timings": {
                "round_ms": round_ms,
                "reasoning_ms": reasoning_ms,
                "content_ms": content_ms,
            }
        }
        if usage:
            metadata["usage"] = usage

        assistant_msg = Message(
            session_id=session.id,
            role="assistant",
            content=content_str or None,
            reasoning=reasoning_str,
            tool_calls=tool_calls or None,
            message_metadata=metadata,
        )
        db.add(assistant_msg)
        await db.commit()
        await db.refresh(assistant_msg)

        history.append(
            {
                "role": "assistant",
                "content": content_str or None,
                **({"tool_calls": tool_calls} if tool_calls else {}),
            }
        )

        if not tool_calls:
            total_ms = int((time.monotonic() - overall_start) * 1000)
            yield ChatEvent(
                event="message.done",
                data={
                    "message_id": str(assistant_msg.id),
                    "finish_reason": finish_reason or "stop",
                    "usage": usage,
                    "timings": {
                        "total_ms": total_ms,
                        "round_ms": round_ms,
                        "reasoning_ms": reasoning_ms,
                        "content_ms": content_ms,
                        "tools_ms": tool_durations_ms or None,
                    },
                },
            )
            return

        for tc in tool_calls:
            args_raw = tc["function"]["arguments"]
            try:
                args = json.loads(args_raw) if args_raw else {}
            except json.JSONDecodeError:
                args = {}
            yield ChatEvent(
                event="tool.call",
                data={"id": tc["id"], "name": tc["function"]["name"], "arguments": args},
            )

            tool_start = time.monotonic()
            result = await _dispatch_tool(tc["function"]["name"], args, mcp_servers)
            duration_ms = int((time.monotonic() - tool_start) * 1000)
            tool_durations_ms[tc["id"]] = duration_ms
            result_json = json.dumps(result, ensure_ascii=False)

            tool_msg = Message(
                session_id=session.id,
                role="tool",
                tool_call_id=tc["id"],
                content=result_json,
                message_metadata={"timings": {"duration_ms": duration_ms}},
            )
            db.add(tool_msg)
            await db.commit()

            history.append({"role": "tool", "tool_call_id": tc["id"], "content": result_json})
            yield ChatEvent(
                event="tool.result",
                data={"id": tc["id"], "result": result, "duration_ms": duration_ms},
            )

    yield ChatEvent(
        event="error",
        data={"message": f"Max tool rounds ({settings.max_tool_rounds}) exceeded"},
    )
