"""Current-time / timezone-conversion / countdown tool — stdlib-only.

The model is bad at clock math: it routinely forgets DST, miscounts
days to a date, or mistypes ISO-8601. This tool delegates everything
to ``datetime`` + ``zoneinfo`` and returns a structured payload the
model can paraphrase.
"""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from axolotl.llm.tools.base import Tool


def _parse_iso(value: str) -> datetime:
    """Parse a string in ISO-8601 or RFC-3339 form, naive or aware."""
    # ``fromisoformat`` accepts a trailing ``Z`` only since 3.11; we're on
    # 3.12, so just hand it off.
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _humanise_delta(delta: timedelta) -> str:
    total = int(abs(delta).total_seconds())
    sign = "in " if delta.total_seconds() >= 0 else "ago "
    days, rem = divmod(total, 86_400)
    hours, rem = divmod(rem, 3_600)
    minutes, seconds = divmod(rem, 60)
    parts: list[str] = []
    if days:
        parts.append(f"{days}d")
    if hours:
        parts.append(f"{hours}h")
    if minutes and not days:
        parts.append(f"{minutes}m")
    if not parts:
        parts.append(f"{seconds}s")
    body = " ".join(parts)
    return f"{sign}{body}" if delta.total_seconds() < 0 else f"{body} {sign.strip()}"


class CurrentTimeTool(Tool):
    """Return the current time (and optionally a countdown) in a chosen timezone."""

    name = "current_time"
    title = "Current time"
    description = (
        "Return the current date and time. Optionally pass an IANA timezone "
        "(e.g. 'Europe/Paris', 'Asia/Tokyo') to localise the answer, and/or "
        "a target ISO-8601 timestamp ('until') to get a countdown (days/hours "
        "left, or how long ago for a past date)."
    )
    category = "info"
    icon = "clock"
    enabled_by_default = True

    @property
    def parameters_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "timezone": {
                    "type": "string",
                    "description": (
                        "IANA timezone name. Examples: 'UTC', 'Europe/Paris', "
                        "'America/New_York', 'Asia/Tokyo'. Defaults to UTC."
                    ),
                },
                "until": {
                    "type": "string",
                    "description": (
                        "Optional ISO-8601 timestamp; if provided, the result "
                        "includes a countdown (or 'time since' if in the past). "
                        "Examples: '2026-12-25', '2027-01-01T00:00:00+01:00'."
                    ),
                },
            },
        }

    async def run(self, arguments: dict[str, Any]) -> dict[str, Any]:
        tz_name = str(arguments.get("timezone", "UTC") or "UTC").strip()
        try:
            tz = ZoneInfo(tz_name)
        except ZoneInfoNotFoundError:
            return {"error": f"Unknown timezone: {tz_name}"}

        now_utc = datetime.now(UTC)
        now_local = now_utc.astimezone(tz)

        payload: dict[str, Any] = {
            "timezone": tz_name,
            "now_utc": now_utc.isoformat(),
            "now_local": now_local.isoformat(),
            "weekday": now_local.strftime("%A"),
            "date": now_local.date().isoformat(),
            "time": now_local.strftime("%H:%M:%S"),
        }

        until = arguments.get("until")
        if isinstance(until, str) and until.strip():
            try:
                target = _parse_iso(until.strip())
            except ValueError as exc:
                return {"error": f"Invalid 'until' timestamp: {exc}"}
            if target.tzinfo is None:
                target = target.replace(tzinfo=tz)
            delta = target.astimezone(UTC) - now_utc
            payload["countdown"] = {
                "target": target.isoformat(),
                "total_seconds": int(delta.total_seconds()),
                "days": delta.days,
                "human": _humanise_delta(delta),
                "is_past": delta.total_seconds() < 0,
            }

        return payload
