"""Pydantic DTOs for the tools endpoints."""

from __future__ import annotations

from pydantic import BaseModel


class ToolInfo(BaseModel):
    name: str
    title: str
    description: str
    category: str
    icon: str | None
    enabled: bool


class ToolToggle(BaseModel):
    enabled: bool
