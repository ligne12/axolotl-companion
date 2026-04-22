"""Pydantic DTOs for personas."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class PersonaPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    system_prompt: str
    params: dict[str, Any] = Field(default_factory=dict)
    is_builtin: bool
    created_at: datetime


class PersonaCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    system_prompt: str = Field(min_length=1, max_length=20_000)
    params: dict[str, Any] = Field(default_factory=dict)


class PersonaUpdate(BaseModel):
    """Partial update — only non-``None`` fields are applied."""

    name: str | None = Field(default=None, min_length=1, max_length=100)
    system_prompt: str | None = Field(default=None, min_length=1, max_length=20_000)
    params: dict[str, Any] | None = None
