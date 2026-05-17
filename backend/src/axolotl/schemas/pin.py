"""Pydantic DTOs for pinned messages."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class PinCreate(BaseModel):
    """Body for ``POST /v1/pins``."""

    message_id: UUID
    title: str = Field(min_length=1, max_length=200)


class PinUpdate(BaseModel):
    """Body for ``PATCH /v1/pins/{id}`` — partial update."""

    title: str | None = Field(default=None, min_length=1, max_length=200)
    position: int | None = Field(default=None, ge=0)


class PinPublic(BaseModel):
    """Serialised pin as returned by the API.

    Carries enough denormalised message context (``session_id``, an
    excerpt, role) so the home dashboard can render the card without a
    second request per pin.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    position: int
    created_at: datetime
    message_id: UUID
    session_id: UUID
    role: str
    excerpt: str
