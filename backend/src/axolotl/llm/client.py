"""Async vLLM client (OpenAI-compatible chat completions with SSE streaming)."""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from functools import lru_cache
from typing import Any

import httpx
import structlog

from axolotl.config import get_settings

logger = structlog.get_logger(__name__)


class VLLMClient:
    """Thin async wrapper around the vLLM /v1/chat/completions endpoint."""

    def __init__(self, base_url: str, api_key: str = "EMPTY", timeout: float = 300.0) -> None:
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(timeout, connect=10.0),
            headers={"Authorization": f"Bearer {api_key}"},
        )

    async def aclose(self) -> None:
        await self._client.aclose()

    async def stream_chat(
        self,
        *,
        messages: list[dict[str, Any]],
        model: str,
        tools: list[dict[str, Any]] | None = None,
        tool_choice: str | dict[str, Any] = "auto",
        temperature: float = 1.0,
        top_p: float = 0.95,
        top_k: int | None = 20,
        min_p: float = 0.0,
        presence_penalty: float = 1.5,
        repetition_penalty: float = 1.0,
        max_tokens: int = 8192,
        enable_thinking: bool = True,
    ) -> AsyncIterator[dict[str, Any]]:
        """Stream OpenAI-style chat completion chunks as Python dicts."""
        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "stream": True,
            "stream_options": {"include_usage": True},
            "temperature": temperature,
            "top_p": top_p,
            "min_p": min_p,
            "presence_penalty": presence_penalty,
            "max_tokens": max_tokens,
        }
        if top_k is not None:
            payload["top_k"] = top_k
        if repetition_penalty != 1.0:
            payload["repetition_penalty"] = repetition_penalty
        if tools:
            payload["tools"] = tools
            payload["tool_choice"] = tool_choice
        if enable_thinking:
            payload["chat_template_kwargs"] = {"enable_thinking": True}

        url = f"{self._base_url}/chat/completions"
        async with self._client.stream("POST", url, json=payload) as resp:
            resp.raise_for_status()
            async for line in resp.aiter_lines():
                if not line or not line.startswith("data:"):
                    continue
                data = line[len("data:") :].strip()
                if data == "[DONE]":
                    break
                try:
                    yield json.loads(data)
                except json.JSONDecodeError:
                    logger.warning("vllm.stream.bad_chunk", chunk=data[:200])
                    continue


@lru_cache(maxsize=1)
def get_llm_client() -> VLLMClient:
    """Return a process-wide vLLM client (single-instance, reused across requests)."""
    settings = get_settings()
    return VLLMClient(base_url=settings.vllm_api_url, api_key=settings.vllm_api_key)
