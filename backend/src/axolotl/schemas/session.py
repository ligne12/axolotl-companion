"""Pydantic DTOs for session + message endpoints."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from axolotl.schemas.params import HyperParams


# -----------------------------------------------------------------------------
# Sessions
# -----------------------------------------------------------------------------
class SessionCreate(BaseModel):
    title: str = Field(default="New conversation", max_length=200)
    persona_id: int | None = None
    model: str | None = Field(default=None, max_length=100)
    overrides: HyperParams = Field(default_factory=HyperParams)


class SessionUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    archived: bool | None = None
    persona_id: int | None = None
    model: str | None = Field(default=None, max_length=100)
    overrides: HyperParams | None = None


class SessionPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    persona_id: int | None
    model: str | None
    overrides: HyperParams = Field(default_factory=HyperParams)
    archived: bool
    created_at: datetime
    updated_at: datetime


class SessionDetail(SessionPublic):
    messages: list[MessagePublic] = Field(default_factory=list)


# -----------------------------------------------------------------------------
# Messages
# -----------------------------------------------------------------------------
class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=100_000)


class MessagePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    role: str
    content: str | None
    reasoning: str | None
    tool_calls: list[dict[str, Any]] | None
    tool_call_id: str | None
    created_at: datetime
    metadata: dict[str, Any] | None = None


# Finish forward ref
SessionDetail.model_rebuild()
