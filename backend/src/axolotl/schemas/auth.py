"""Pydantic DTOs for auth endpoints."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from axolotl.schemas.params import HyperParams

TimeFormat = Literal["12h", "24h"]
TemperatureUnit = Literal["C", "F"]


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginRequest(BaseModel):
    username: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"  # noqa: S105  # OAuth2 scheme name, not a secret
    access_expires_at: datetime
    refresh_expires_at: datetime


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    email: EmailStr
    avatar_url: str | None = None
    locality: str | None = None
    time_format: TimeFormat = "24h"
    temperature_unit: TemperatureUnit = "C"
    defaults: HyperParams = Field(default_factory=HyperParams)
    default_persona_id: int | None = None
    created_at: datetime


class UserUpdate(BaseModel):
    """Partial profile update. All fields optional; only non-``None`` values
    are applied. ``username`` goes through the same uniqueness check as
    registration. ``default_persona_id`` supports explicit ``null`` to detach
    — "unset" vs "set to None" is distinguished via ``model_fields_set``."""

    username: str | None = Field(
        default=None, min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$"
    )
    avatar_url: str | None = Field(default=None, max_length=500)
    locality: str | None = Field(default=None, max_length=80)
    time_format: TimeFormat | None = None
    temperature_unit: TemperatureUnit | None = None
    defaults: HyperParams | None = None
    default_persona_id: int | None = None
