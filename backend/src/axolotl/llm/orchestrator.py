"""Chat orchestration: streams LLM events and handles tool-call rounds."""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import col, select

from axolotl.config import get_settings
from axolotl.db.models import Message, Session
from axolotl.llm.client import VLLMClient
from axolotl.llm.events import ChatEvent
from axolotl.llm.tools import execute_tool, registry

logger = structlog.get_logger(__name__)


async def _load_history(db: AsyncSession, session_id: int) -> list[dict[str, Any]]:
    """Load the full message history for a session in OpenAI format."""
    result = await db.execute(
        select(Message).where(Message.session_id == session_id).order_by(col(Message.created_at))
    )
    messages = result.scalars().all()

    history: list[dict[str, Any]] = []
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


async def stream_chat(
    *,
    db: AsyncSession,
    session: Session,
    client: VLLMClient,
    model: str,
    enabled_tools: list[str] | None = None,
) -> AsyncIterator[ChatEvent]:
    """Run the full LLM loop: stream deltas, execute tools, loop up to N rounds.

    ``enabled_tools`` filters which registered tools are exposed to the model.
    Pass ``None`` to fall back to the registry defaults, or ``[]`` to disable
    tool-calling entirely.
    """
    settings = get_settings()
    assert session.id is not None
    history = await _load_history(db, session.id)
    tool_specs = registry.specs_for(enabled_tools)

    for round_n in range(settings.max_tool_rounds + 1):
        is_last_round = round_n == settings.max_tool_rounds
        tools = None if (is_last_round or not tool_specs) else tool_specs

        yield ChatEvent(event="message.start", data={"round": round_n})

        reasoning_parts: list[str] = []
        content_parts: list[str] = []
        tool_calls_acc: dict[int, dict[str, str]] = {}
        usage: dict[str, Any] | None = None
        finish_reason: str | None = None

        async for chunk in client.stream_chat(
            messages=history,
            model=model,
            tools=tools,
            temperature=settings.vllm_temperature,
            top_p=settings.vllm_top_p,
            top_k=settings.vllm_top_k,
            min_p=settings.vllm_min_p,
            presence_penalty=settings.vllm_presence_penalty,
            repetition_penalty=settings.vllm_repetition_penalty,
            max_tokens=settings.vllm_max_tokens,
            enable_thinking=settings.vllm_enable_thinking,
        ):
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
                reasoning_parts.append(rsn)
                yield ChatEvent(event="reasoning.delta", data={"text": rsn})

            if content := delta.get("content"):
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

        content_str = "".join(content_parts)
        reasoning_str = "".join(reasoning_parts) or None
        tool_calls = _finalize_tool_calls(tool_calls_acc)

        assistant_msg = Message(
            session_id=session.id,
            role="assistant",
            content=content_str or None,
            reasoning=reasoning_str,
            tool_calls=tool_calls or None,
            message_metadata={"usage": usage} if usage else {},
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
            yield ChatEvent(
                event="message.done",
                data={
                    "message_id": assistant_msg.id,
                    "finish_reason": finish_reason or "stop",
                    "usage": usage,
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

            result = await execute_tool(tc["function"]["name"], args)
            result_json = json.dumps(result, ensure_ascii=False)

            tool_msg = Message(
                session_id=session.id,
                role="tool",
                tool_call_id=tc["id"],
                content=result_json,
            )
            db.add(tool_msg)
            await db.commit()

            history.append({"role": "tool", "tool_call_id": tc["id"], "content": result_json})
            yield ChatEvent(
                event="tool.result",
                data={"id": tc["id"], "result": result},
            )

    yield ChatEvent(
        event="error",
        data={"message": f"Max tool rounds ({settings.max_tool_rounds}) exceeded"},
    )
