"""Unit tests for the SymPy-backed ``calculator`` tool."""

from __future__ import annotations

import pytest

from axolotl.llm.tools.calculator import CalculatorTool


@pytest.mark.asyncio
async def test_calc_schema() -> None:
    schema = CalculatorTool().parameters_schema
    assert schema["required"] == ["expression"]


@pytest.mark.asyncio
async def test_calc_arithmetic() -> None:
    out = await CalculatorTool().run({"expression": "2**32 + 1"})
    assert out["result"] == "4294967297"


@pytest.mark.asyncio
async def test_calc_symbolic_integrate() -> None:
    out = await CalculatorTool().run({"expression": "integrate(x**2, x)"})
    assert "x**3/3" in out["result"]


@pytest.mark.asyncio
async def test_calc_solve() -> None:
    out = await CalculatorTool().run({"expression": "solve(x**2 - 4, x)"})
    # Result is a list — render order is deterministic in SymPy.
    assert "-2" in out["result"] and "2" in out["result"]


@pytest.mark.asyncio
async def test_calc_factor() -> None:
    out = await CalculatorTool().run({"expression": "factor(x**3 - 1)"})
    assert "(x - 1)" in out["result"]


@pytest.mark.asyncio
async def test_calc_precision() -> None:
    out = await CalculatorTool().run({"expression": "pi", "precision": 25})
    assert out["numeric"].startswith("3.14159265358979")


@pytest.mark.asyncio
async def test_calc_invalid_expression() -> None:
    out = await CalculatorTool().run({"expression": "2 ++ syntax error ((("})
    assert "Could not parse" in out["error"]


@pytest.mark.asyncio
async def test_calc_empty_expression() -> None:
    out = await CalculatorTool().run({"expression": "   "})
    assert out == {"error": "Empty expression"}


@pytest.mark.asyncio
async def test_calc_oversize_expression() -> None:
    out = await CalculatorTool().run({"expression": "1+" * 1500})
    assert "too long" in out["error"]
