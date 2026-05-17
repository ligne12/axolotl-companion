"""Unit tests for the ``current_time`` tool."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest

from axolotl.llm.tools.clock import CurrentTimeTool


@pytest.mark.asyncio
async def test_clock_schema() -> None:
    schema = CurrentTimeTool().parameters_schema
    assert schema["type"] == "object"
    assert "timezone" in schema["properties"]
    assert "until" in schema["properties"]


@pytest.mark.asyncio
async def test_clock_default_utc() -> None:
    out = await CurrentTimeTool().run({})
    assert out["timezone"] == "UTC"
    assert out["now_utc"].endswith("+00:00")
    assert out["weekday"]


@pytest.mark.asyncio
async def test_clock_paris_tz() -> None:
    out = await CurrentTimeTool().run({"timezone": "Europe/Paris"})
    assert out["timezone"] == "Europe/Paris"
    # ``now_local`` is offset from UTC by +01:00 or +02:00 depending on DST.
    assert "+01:00" in out["now_local"] or "+02:00" in out["now_local"]


@pytest.mark.asyncio
async def test_clock_unknown_timezone() -> None:
    out = await CurrentTimeTool().run({"timezone": "Atlantis/Lost"})
    assert "Unknown timezone" in out["error"]


@pytest.mark.asyncio
async def test_clock_countdown_future() -> None:
    future = (datetime.now(UTC) + timedelta(days=30)).isoformat()
    out = await CurrentTimeTool().run({"until": future})
    assert out["countdown"]["is_past"] is False
    assert out["countdown"]["days"] in (29, 30)


@pytest.mark.asyncio
async def test_clock_countdown_past() -> None:
    past = (datetime.now(UTC) - timedelta(hours=5)).isoformat()
    out = await CurrentTimeTool().run({"until": past})
    assert out["countdown"]["is_past"] is True
    assert out["countdown"]["total_seconds"] < 0


@pytest.mark.asyncio
async def test_clock_invalid_until() -> None:
    out = await CurrentTimeTool().run({"until": "not-a-date"})
    assert "Invalid 'until'" in out["error"]
