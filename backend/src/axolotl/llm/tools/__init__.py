"""Tool catalog for LLM function-calling (extensible, per-user toggleable)."""

from __future__ import annotations

from typing import Any

from axolotl.llm.tools.base import Tool, ToolRegistry
from axolotl.llm.tools.calculator import CalculatorTool
from axolotl.llm.tools.clock import CurrentTimeTool
from axolotl.llm.tools.weather import GetWeatherTool
from axolotl.llm.tools.web_search import WebSearchTool

# Global registry — built-in tools are registered here. To add a new tool,
# implement a subclass of ``Tool`` and register it below.
registry = ToolRegistry()
registry.register(WebSearchTool())
registry.register(GetWeatherTool())
registry.register(CurrentTimeTool())
registry.register(CalculatorTool())


async def execute_tool(name: str, arguments: dict[str, Any]) -> dict[str, Any]:
    """Invoke a registered tool by name. Returns its JSON-serialisable result."""
    tool = registry.get(name)
    if tool is None:
        return {"error": f"Unknown tool: {name}"}
    try:
        return await tool.run(arguments)
    except Exception as exc:
        return {"error": f"{type(exc).__name__}: {exc}"}


__all__ = ["Tool", "ToolRegistry", "execute_tool", "registry"]
