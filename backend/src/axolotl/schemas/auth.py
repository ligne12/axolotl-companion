"""Pydantic DTOs for auth endpoints."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


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
    created_at: datetime


class UserUpdate(BaseModel):
    """Partial profile update. All fields optional; only non-``None`` values
    are applied. ``username`` goes through the same uniqueness check as
    registration."""

    username: str | None = Field(
        default=None, min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$"
    )
    avatar_url: str | None = Field(default=None, max_length=500)
    locality: str | None = Field(default=None, max_length=80)
