"""Auth endpoints: register, login, refresh, logout, me."""

from __future__ import annotations

from datetime import UTC, datetime

import jwt
import sqlalchemy as sa
import structlog
from fastapi import APIRouter, HTTPException, status
from sqlmodel import col, select

from axolotl.api.deps import CurrentUser, DbSession
from axolotl.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    hash_token,
    verify_password,
)
from axolotl.db import RefreshToken, User
from axolotl.schemas.auth import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenPair,
    UserPublic,
    UserUpdate,
)

logger = structlog.get_logger(__name__)
router = APIRouter()


async def _issue_tokens(db: DbSession, user: User) -> TokenPair:
    """Create an access + refresh pair and persist the refresh hash."""
    assert user.id is not None  # a persisted User always has an id
    access, access_exp = create_access_token(user.id)
    refresh, refresh_exp, refresh_hash = create_refresh_token(user.id)

    db.add(
        RefreshToken(
            user_id=user.id,
            token_hash=refresh_hash,
            expires_at=refresh_exp,
        )
    )
    await db.commit()

    return TokenPair(
        access_token=access,
        refresh_token=refresh,
        access_expires_at=access_exp,
        refresh_expires_at=refresh_exp,
    )


@router.post("/register", response_model=UserPublic, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: DbSession) -> User:
    """Register a new user."""
    existing = await db.execute(
        select(User).where(
            sa.or_(
                col(User.username) == payload.username,
                col(User.email) == payload.email,
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username or email already taken",
        )

    user = User(
        username=payload.username,
        email=payload.email,
        password_hash=hash_password(payload.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    logger.info("auth.register", user_id=user.id, username=user.username)
    return user


@router.post("/login", response_model=TokenPair)
async def login(payload: LoginRequest, db: DbSession) -> TokenPair:
    """Exchange username/password for an access + refresh token."""
    result = await db.execute(select(User).where(User.username == payload.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    tokens = await _issue_tokens(db, user)
    logger.info("auth.login", user_id=user.id)
    return tokens


@router.post("/refresh", response_model=TokenPair)
async def refresh(payload: RefreshRequest, db: DbSession) -> TokenPair:
    """Rotate a refresh token: revoke the old one, issue a new pair."""
    try:
        decoded = decode_token(payload.refresh_token, expected_type="refresh")
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        ) from exc

    token_hash = hash_token(payload.refresh_token)
    result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    stored = result.scalar_one_or_none()
    if not stored or stored.revoked_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token revoked",
        )

    stored.revoked_at = datetime.now(UTC)
    db.add(stored)

    user_result = await db.execute(select(User).where(User.id == int(decoded["sub"])))
    user = user_result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return await _issue_tokens(db, user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(payload: RefreshRequest, db: DbSession) -> None:
    """Revoke a refresh token (idempotent — always returns 204)."""
    token_hash = hash_token(payload.refresh_token)
    result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    stored = result.scalar_one_or_none()
    if stored and stored.revoked_at is None:
        stored.revoked_at = datetime.now(UTC)
        db.add(stored)
        await db.commit()


@router.get("/me", response_model=UserPublic)
async def me(current_user: CurrentUser) -> User:
    """Return the currently authenticated user."""
    return current_user


@router.patch("/me", response_model=UserPublic)
async def update_me(
    payload: UserUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> User:
    """Patch the current user's profile. Only non-``None`` fields are applied.

    A username change is guarded against collision with another account.
    """
    if payload.username is not None and payload.username != current_user.username:
        existing = await db.execute(
            select(User).where(
                col(User.username) == payload.username,
                col(User.id) != current_user.id,
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already taken",
            )
        current_user.username = payload.username

    if payload.avatar_url is not None:
        current_user.avatar_url = payload.avatar_url or None
    if payload.locality is not None:
        current_user.locality = payload.locality.strip() or None
    if payload.time_format is not None:
        current_user.time_format = payload.time_format
    if payload.temperature_unit is not None:
        current_user.temperature_unit = payload.temperature_unit

    current_user.updated_at = datetime.now(UTC)
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    logger.info("auth.update_me", user_id=current_user.id)
    return current_user
