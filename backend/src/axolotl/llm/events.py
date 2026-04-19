"""SSE event definitions for the chat stream."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Literal

EventType = Literal[
    "message.start",
    "reasoning.delta",
    "message.delta",
    "tool.call",
    "tool.result",
    "message.done",
    "error",
]


@dataclass(slots=True, frozen=True)
class ChatEvent:
    """A single SSE event emitted by the chat orchestrator."""

    event: EventType
    data: dict[str, Any]

    def to_sse(self) -> dict[str, str]:
        """Convert to the ``sse_starlette`` ``EventSourceResponse`` format."""
        return {"event": self.event, "data": json.dumps(self.data, ensure_ascii=False)}
