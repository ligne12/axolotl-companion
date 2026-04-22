"""Shared sampling-hyperparameter DTO. Used for both user-level defaults
(``User.defaults``) and per-session overrides (``Session.overrides``).

All fields are optional — the orchestrator merges
``settings → user.defaults → session.overrides`` at chat time.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class HyperParams(BaseModel):
    """Partial sampling-parameter map. Every field may be absent."""

    model_config = ConfigDict(extra="forbid")

    temperature: float | None = Field(default=None, ge=0.0, le=2.0)
    top_p: float | None = Field(default=None, ge=0.0, le=1.0)
    top_k: int | None = Field(default=None, ge=1, le=500)
    min_p: float | None = Field(default=None, ge=0.0, le=1.0)
    presence_penalty: float | None = Field(default=None, ge=-2.0, le=2.0)
    repetition_penalty: float | None = Field(default=None, ge=0.0, le=2.0)
    max_tokens: int | None = Field(default=None, ge=1, le=32768)
    enable_thinking: bool | None = None
