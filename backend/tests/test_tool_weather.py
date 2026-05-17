"""Unit tests for the ``get_weather`` tool (Open-Meteo, no network)."""

from __future__ import annotations

from collections.abc import Callable
from typing import Any

import httpx
import pytest

from axolotl.llm.tools.weather import GetWeatherTool

# Capture the real class *before* any monkeypatch fires; otherwise the
# factory below would recurse into itself (``httpx.AsyncClient`` after
# patching IS the factory) and raise ``got multiple values for
# transport``.
_REAL_ASYNC_CLIENT = httpx.AsyncClient


def _patch_client(
    monkeypatch: pytest.MonkeyPatch,
    handler: Callable[[httpx.Request], httpx.Response],
) -> None:
    """Swap ``httpx.AsyncClient`` for one wired to the given mock handler."""
    transport = httpx.MockTransport(handler)

    def factory(**kw: Any) -> httpx.AsyncClient:
        return _REAL_ASYNC_CLIENT(transport=transport, **kw)

    monkeypatch.setattr(httpx, "AsyncClient", factory)


@pytest.mark.asyncio
async def test_weather_schema_is_well_formed() -> None:
    tool = GetWeatherTool()
    schema = tool.parameters_schema
    assert schema["type"] == "object"
    assert "location" in schema["properties"]
    assert schema["required"] == ["location"]
    assert schema["properties"]["units"]["enum"] == ["celsius", "fahrenheit"]


@pytest.mark.asyncio
async def test_weather_happy_path(monkeypatch: pytest.MonkeyPatch) -> None:
    """Geocode → forecast → structured response."""

    def handler(request: httpx.Request) -> httpx.Response:
        if "geocoding-api" in request.url.host:
            return httpx.Response(
                200,
                json={
                    "results": [
                        {
                            "name": "Paris",
                            "country": "France",
                            "admin1": "Île-de-France",
                            "latitude": 48.85,
                            "longitude": 2.35,
                        }
                    ]
                },
            )
        return httpx.Response(
            200,
            json={
                "timezone": "Europe/Paris",
                "current": {
                    "time": "2026-05-17T10:00",
                    "temperature_2m": 18.4,
                    "weather_code": 3,
                    "wind_speed_10m": 12.0,
                    "relative_humidity_2m": 60,
                },
                "daily": {
                    "time": ["2026-05-17", "2026-05-18", "2026-05-19"],
                    "temperature_2m_max": [21.0, 19.5, 22.8],
                    "temperature_2m_min": [12.0, 11.5, 13.0],
                    "weather_code": [3, 61, 0],
                    "precipitation_probability_max": [10, 80, 5],
                },
            },
        )

    _patch_client(monkeypatch, handler)

    result = await GetWeatherTool().run({"location": "Paris", "days": 3})

    assert result["location"]["name"] == "Paris"
    assert result["location"]["country"] == "France"
    assert result["units"] == "celsius"
    assert result["current"]["temperature"] == 18.4
    assert result["current"]["conditions"] == "overcast"
    assert len(result["forecast"]) == 3
    assert result["forecast"][1]["conditions"] == "light rain"
    assert result["forecast"][1]["precipitation_probability_pct"] == 80


@pytest.mark.asyncio
async def test_weather_empty_location() -> None:
    out = await GetWeatherTool().run({"location": "  "})
    assert out == {"error": "Empty location"}


@pytest.mark.asyncio
async def test_weather_unknown_location(monkeypatch: pytest.MonkeyPatch) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, json={"results": []})

    _patch_client(monkeypatch, handler)

    out = await GetWeatherTool().run({"location": "Nowhereland"})
    assert "Location not found" in out["error"]


@pytest.mark.asyncio
async def test_weather_clamps_days(monkeypatch: pytest.MonkeyPatch) -> None:
    """``days`` is clamped to [1, 7] before the API call."""
    captured: dict[str, Any] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        if "geocoding-api" in request.url.host:
            return httpx.Response(
                200,
                json={"results": [{"name": "X", "latitude": 0, "longitude": 0}]},
            )
        captured["forecast_days"] = request.url.params.get("forecast_days")
        return httpx.Response(
            200,
            json={"current": {}, "daily": {"time": []}},
        )

    _patch_client(monkeypatch, handler)

    await GetWeatherTool().run({"location": "X", "days": 99})
    assert captured["forecast_days"] == "7"
