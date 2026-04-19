"""Tool registry: a pluggable catalog of named tools with metadata.

Each tool exposes:
- a stable ``name`` (used in OpenAI function-call payloads)
- UI-friendly metadata (``title``, ``description``, ``category``, ``icon``)
- an OpenAI-compatible ``spec`` (for the ``tools`` field of chat completions)
- an async ``run()`` callable

Per-user enable/disable is stored in the ``settings`` table under the key
``tools.enabled`` as a JSON list of tool names.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any


class Tool(ABC):
    """Base class for a function-callable tool exposed to the LLM."""

    name: str
    title: str
    description: str
    category: str = "general"
    icon: str | None = None
    enabled_by_default: bool = True

    @property
    @abstractmethod
    def parameters_schema(self) -> dict[str, Any]:
        """Return a JSON Schema object for the tool parameters."""

    @abstractmethod
    async def run(self, arguments: dict[str, Any]) -> dict[str, Any]:
        """Execute the tool and return a JSON-serialisable result."""

    @property
    def openai_spec(self) -> dict[str, Any]:
        """Return the OpenAI ``tools`` entry for this tool."""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters_schema,
            },
        }


class ToolRegistry:
    """In-process registry of available tools keyed by ``name``."""

    def __init__(self) -> None:
        self._tools: dict[str, Tool] = {}

    def register(self, tool: Tool) -> None:
        if tool.name in self._tools:
            raise ValueError(f"Tool already registered: {tool.name}")
        self._tools[tool.name] = tool

    def get(self, name: str) -> Tool | None:
        return self._tools.get(name)

    def all(self) -> list[Tool]:
        return list(self._tools.values())

    def names(self) -> list[str]:
        return list(self._tools.keys())

    def specs_for(self, enabled_names: list[str] | None) -> list[dict[str, Any]]:
        """Return OpenAI tool specs for the subset of enabled tools.

        If ``enabled_names`` is ``None``, returns specs for every
        tool flagged ``enabled_by_default``.
        """
        if enabled_names is None:
            return [t.openai_spec for t in self._tools.values() if t.enabled_by_default]
        return [self._tools[n].openai_spec for n in enabled_names if n in self._tools]

    def default_enabled(self) -> list[str]:
        return [t.name for t in self._tools.values() if t.enabled_by_default]
