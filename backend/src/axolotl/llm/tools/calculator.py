"""Symbolic + numeric calculator backed by SymPy.

The model is bad at 4-digit arithmetic and very bad at calculus; this
tool delegates both to SymPy. The exposed surface is intentionally
minimal: one expression string, evaluated through ``sympify`` into
SymPy's own AST so no host Python code runs.

Supports anything ``sympy`` parses — ``2*3 + 5``, ``integrate(x**2, x)``,
``diff(sin(x), x)``, ``solve(x**2 - 4, x)``, ``Matrix([[1,2],[3,4]]).det()``,
``factor(x**3 - 1)`` — and optionally numerical evaluation to N digits.
"""

from __future__ import annotations

from typing import Any

import sympy as sp  # type: ignore[import-untyped]
from sympy.parsing.sympy_parser import (  # type: ignore[import-untyped]
    parse_expr,
    standard_transformations,
)

from axolotl.llm.tools.base import Tool

_TRANSFORMATIONS = standard_transformations
# Hard cap on the expression length so a model can't blow up the parser
# by handing in an enormous symbolic chunk.
_MAX_EXPRESSION_LENGTH = 2_000


class CalculatorTool(Tool):
    """Evaluate or simplify a math expression with SymPy."""

    name = "calculator"
    title = "Calculator"
    description = (
        "Evaluate a math expression with SymPy. Supports arithmetic "
        "('2**16 - 1'), algebra ('factor(x**3 - 1)', 'solve(x**2 - 4, x)'), "
        "calculus ('integrate(x**2, x)', 'diff(sin(x), x)'), and any other "
        "SymPy callable. Pass ``precision`` to force numerical evaluation to "
        "N digits."
    )
    category = "math"
    icon = "calculator"
    enabled_by_default = True

    @property
    def parameters_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "expression": {
                    "type": "string",
                    "description": (
                        "A SymPy-parsable expression. Examples: '2**32', "
                        "'integrate(x**2, (x, 0, 1))', 'solve(x**2 + 2*x - 3, x)', "
                        "'factor(x**3 - 1)'."
                    ),
                },
                "precision": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 100,
                    "description": (
                        "If set, evaluate the result numerically to N significant "
                        "digits (uses ``sympy.N``). Leave unset for an exact / "
                        "symbolic answer."
                    ),
                },
            },
            "required": ["expression"],
        }

    async def run(self, arguments: dict[str, Any]) -> dict[str, Any]:
        expression = str(arguments.get("expression", "")).strip()
        if not expression:
            return {"error": "Empty expression"}
        if len(expression) > _MAX_EXPRESSION_LENGTH:
            return {"error": f"Expression too long (>{_MAX_EXPRESSION_LENGTH} chars)"}

        try:
            parsed = parse_expr(
                expression,
                transformations=_TRANSFORMATIONS,
                evaluate=True,
            )
        except (SyntaxError, sp.SympifyError, TypeError, ValueError) as exc:
            return {"error": f"Could not parse expression: {exc}"}

        result: dict[str, Any] = {
            "expression": expression,
            "result": str(parsed),
            "latex": sp.latex(parsed),
        }

        precision = arguments.get("precision")
        if precision is not None:
            try:
                digits = max(1, min(100, int(precision)))
                result["numeric"] = str(sp.N(parsed, digits))
            except (TypeError, ValueError) as exc:
                return {"error": f"Numerical evaluation failed: {exc}"}

        return result
