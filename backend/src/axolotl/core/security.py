"""Password hashing + JWT encode/decode."""

from __future__ import annotations

import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

import bcrypt
import jwt

from axolotl.config import get_settings


# -----------------------------------------------------------------------------
# Passwords (bcrypt, modern API — no passlib)
# -----------------------------------------------------------------------------
def hash_password(plain: str) -> str:
    """Hash a plain-text password with bcrypt."""
    hashed = bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plain-text password against a bcrypt hash."""
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))


# -----------------------------------------------------------------------------
# JWT
# -----------------------------------------------------------------------------
TokenType = Literal["access", "refresh"]


def _now() -> datetime:
    return datetime.now(UTC)


def create_access_token(
    subject: str | int,
    expires_delta: timedelta | None = None,
) -> tuple[str, datetime]:
    """Create a signed JWT access token and return (token, exp)."""
    settings = get_settings()
    exp = _now() + (expires_delta or timedelta(minutes=settings.jwt_access_expire_minutes))
    payload: dict[str, Any] = {
        "sub": str(subject),
        "type": "access",
        "iat": int(_now().timestamp()),
        "exp": int(exp.timestamp()),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, exp


def create_refresh_token(
    subject: str | int,
    expires_delta: timedelta | None = None,
) -> tuple[str, datetime, str]:
    """Create a refresh token.

    Returns ``(raw_token, expires_at, token_hash)``. The raw token is returned
    to the client; only the hash should be stored in DB.
    """
    settings = get_settings()
    exp = _now() + (expires_delta or timedelta(days=settings.jwt_refresh_expire_days))
    jti = secrets.token_urlsafe(32)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "type": "refresh",
        "jti": jti,
        "iat": int(_now().timestamp()),
        "exp": int(exp.timestamp()),
    }
    token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
    return token, exp, hash_token(token)


def decode_token(token: str, expected_type: TokenType) -> dict[str, Any]:
    """Decode and validate a JWT. Raises ``jwt.PyJWTError`` on failure."""
    settings = get_settings()
    payload: dict[str, Any] = jwt.decode(
        token,
        settings.jwt_secret,
        algorithms=[settings.jwt_algorithm],
    )
    if payload.get("type") != expected_type:
        raise jwt.InvalidTokenError(f"Expected token type '{expected_type}'")
    return payload


def hash_token(token: str) -> str:
    """SHA-256 hash of a token (used to store refresh tokens in DB)."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
