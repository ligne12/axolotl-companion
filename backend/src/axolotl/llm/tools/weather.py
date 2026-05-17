"""Open-Meteo weather tool — geocode a location, return current + forecast.

Open-Meteo is free, key-less, and CORS-open; it pairs a geocoding API
(``geocoding-api.open-meteo.com``) with a forecast endpoint
(``api.open-meteo.com``). We chain the two so the LLM can ask for
"Paris" or "Tokyo" without hand-rolling coordinates.
"""

from __future__ import annotations

from typing import Any

import httpx
import structlog

from axolotl.llm.tools.base import Tool

logger = structlog.get_logger(__name__)

_GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search"
_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
_HTTP_TIMEOUT = 8.0

# WMO weather codes (https://open-meteo.com/en/docs#weathervariables) — we map
# the codes the model is most likely to receive into short, model-friendly
# labels rather than dumping the full table.
_WEATHER_CODES: dict[int, str] = {
    0: "clear sky",
    1: "mainly clear",
    2: "partly cloudy",
    3: "overcast",
    45: "fog",
    48: "depositing rime fog",
    51: "light drizzle",
    53: "moderate drizzle",
    55: "dense drizzle",
    61: "light rain",
    63: "moderate rain",
    65: "heavy rain",
    71: "light snow",
    73: "moderate snow",
    75: "heavy snow",
    77: "snow grains",
    80: "light rain showers",
    81: "moderate rain showers",
    82: "violent rain showers",
    85: "light snow showers",
    86: "heavy snow showers",
    95: "thunderstorm",
    96: "thunderstorm with light hail",
    99: "thunderstorm with heavy hail",
}


def _describe_code(code: int | None) -> str:
    if code is None:
        return "unknown"
    return _WEATHER_CODES.get(int(code), f"weather code {code}")


class GetWeatherTool(Tool):
    """Look up the current weather and a short forecast for a named place."""

    name = "get_weather"
    title = "Weather forecast"
    description = (
        "Look up current conditions and a short forecast for a named location "
        "(city, region, or 'city, country'). Useful for time-sensitive small "
        "talk and planning. Uses the free, key-less Open-Meteo API. Coordinates "
        "are resolved by name — no need to pass latitude/longitude."
    )
    category = "info"
    icon = "cloud-sun"
    enabled_by_default = True

    @property
    def parameters_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "location": {
                    "type": "string",
                    "description": (
                        "Place name. Examples: 'Paris', 'Tokyo', "
                        "'Montpellier, France', 'Brooklyn, NY'."
                    ),
                },
                "units": {
                    "type": "string",
                    "enum": ["celsius", "fahrenheit"],
                    "default": "celsius",
                    "description": "Temperature unit (default celsius).",
                },
                "days": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 7,
                    "default": 3,
                    "description": "Number of forecast days to include (1-7).",
                },
            },
            "required": ["location"],
        }

    async def run(self, arguments: dict[str, Any]) -> dict[str, Any]:
        location = str(arguments.get("location", "")).strip()
        if not location:
            return {"error": "Empty location"}

        units = str(arguments.get("units", "celsius")).lower()
        if units not in {"celsius", "fahrenheit"}:
            units = "celsius"

        days = int(arguments.get("days", 3) or 3)
        days = max(1, min(7, days))

        async with httpx.AsyncClient(
            timeout=_HTTP_TIMEOUT,
            headers={"User-Agent": "axolotl-companion/0.1"},
        ) as client:
            try:
                geo = await client.get(
                    _GEOCODE_URL,
                    params={"name": location, "count": 1, "language": "en", "format": "json"},
                )
                geo.raise_for_status()
                geo_data = geo.json()
            except httpx.HTTPError as exc:
                logger.warning("weather.geocode_error", error=str(exc), location=location)
                return {"error": f"Geocoding failed: {exc}"}

            results = geo_data.get("results") or []
            if not results:
                return {"error": f"Location not found: {location}"}
            top = results[0]

            try:
                forecast = await client.get(
                    _FORECAST_URL,
                    params={
                        "latitude": top["latitude"],
                        "longitude": top["longitude"],
                        "current": "temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m",
                        "daily": "temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max",
                        "forecast_days": days,
                        "timezone": "auto",
                        "temperature_unit": units,
                    },
                )
                forecast.raise_for_status()
                fc_data = forecast.json()
            except httpx.HTTPError as exc:
                logger.warning("weather.forecast_error", error=str(exc), location=location)
                return {"error": f"Forecast lookup failed: {exc}"}

        current = fc_data.get("current") or {}
        daily = fc_data.get("daily") or {}
        dates: list[str] = daily.get("time") or []
        highs: list[float] = daily.get("temperature_2m_max") or []
        lows: list[float] = daily.get("temperature_2m_min") or []
        codes: list[int] = daily.get("weather_code") or []
        rain_probs: list[int] = daily.get("precipitation_probability_max") or []

        daily_forecast = [
            {
                "date": date,
                "high": highs[i] if i < len(highs) else None,
                "low": lows[i] if i < len(lows) else None,
                "conditions": _describe_code(codes[i] if i < len(codes) else None),
                "precipitation_probability_pct": (rain_probs[i] if i < len(rain_probs) else None),
            }
            for i, date in enumerate(dates)
        ]

        return {
            "location": {
                "name": top.get("name"),
                "country": top.get("country"),
                "admin1": top.get("admin1"),
                "latitude": top.get("latitude"),
                "longitude": top.get("longitude"),
                "timezone": fc_data.get("timezone"),
            },
            "units": units,
            "current": {
                "temperature": current.get("temperature_2m"),
                "humidity_pct": current.get("relative_humidity_2m"),
                "wind_speed_kmh": current.get("wind_speed_10m"),
                "conditions": _describe_code(current.get("weather_code")),
                "observed_at": current.get("time"),
            },
            "forecast": daily_forecast,
        }
