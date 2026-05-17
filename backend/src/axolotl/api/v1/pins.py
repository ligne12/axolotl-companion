"""Pinned messages CRUD — promote any chat message to a /home card."""

from __future__ import annotations

import structlog
from fastapi import APIRouter, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import col, select

from axolotl.api.deps import CurrentUser, DbSession
from axolotl.db.models import Message, PinnedMessage, Session
from axolotl.schemas.pin import PinCreate, PinPublic, PinUpdate

logger = structlog.get_logger(__name__)
router = APIRouter()

# Excerpt cap for the /home card — keeps payload small and matches the
# 500 chars the UI shows above its "expand" affordance.
_EXCERPT_CHARS = 500


def _to_public(pin: PinnedMessage, message: Message) -> PinPublic:
    """Render a ``(PinnedMessage, Message)`` pair as the DTO the API ships."""
    body = (message.content or "").strip()
    excerpt = body if len(body) <= _EXCERPT_CHARS else body[:_EXCERPT_CHARS]
    return PinPublic(
        id=pin.id or 0,
        title=pin.title,
        position=pin.position,
        created_at=pin.created_at,
        message_id=message.id,
        session_id=message.session_id,
        role=message.role,
        excerpt=excerpt,
    )


async def _own_pin(db: DbSession, pin_id: int, user_id: int) -> PinnedMessage:
    """Fetch a pin owned by ``user_id`` or raise 404."""
    pin = await db.get(PinnedMessage, pin_id)
    if pin is None or pin.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pin not found")
    return pin


@router.get("", response_model=list[PinPublic])
async def list_pins(current_user: CurrentUser, db: DbSession) -> list[PinPublic]:
    """List the user's pinned messages, ordered by ``position`` then creation."""
    assert current_user.id is not None
    stmt = (
        select(PinnedMessage, Message)
        .join(Message, col(Message.id) == col(PinnedMessage.message_id))
        .where(col(PinnedMessage.user_id) == current_user.id)
        .order_by(col(PinnedMessage.position), col(PinnedMessage.created_at))
    )
    result = await db.execute(stmt)
    rows = list(result.all())
    return [_to_public(pin, message) for pin, message in rows]


@router.post("", response_model=PinPublic, status_code=status.HTTP_201_CREATED)
async def create_pin(
    payload: PinCreate,
    current_user: CurrentUser,
    db: DbSession,
) -> PinPublic:
    """Pin a message. 404 if the message belongs to another user's session,
    409 if already pinned."""
    assert current_user.id is not None

    # Authz: the message must belong to one of the user's sessions.
    stmt = (
        select(Message, Session)
        .join(Session, col(Session.id) == col(Message.session_id))
        .where(col(Message.id) == payload.message_id)
        .where(col(Session.user_id) == current_user.id)
    )
    result = await db.execute(stmt)
    row = result.first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    message, _session = row

    # New pins land at the end of the list by default.
    existing_stmt = (
        select(PinnedMessage)
        .where(col(PinnedMessage.user_id) == current_user.id)
        .order_by(col(PinnedMessage.position).desc())
        .limit(1)
    )
    last = (await db.execute(existing_stmt)).scalar_one_or_none()
    next_position = (last.position + 1) if last else 0

    pin = PinnedMessage(
        user_id=current_user.id,
        message_id=payload.message_id,
        title=payload.title,
        position=next_position,
    )
    db.add(pin)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Message already pinned",
        ) from exc
    await db.refresh(pin)
    logger.info("pins.create", user_id=current_user.id, pin_id=pin.id)
    return _to_public(pin, message)


@router.patch("/{pin_id}", response_model=PinPublic)
async def update_pin(
    pin_id: int,
    payload: PinUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> PinPublic:
    """Patch the pin's title and/or position."""
    assert current_user.id is not None
    pin = await _own_pin(db, pin_id, current_user.id)
    if payload.title is not None:
        pin.title = payload.title
    if payload.position is not None:
        pin.position = payload.position
    db.add(pin)
    await db.commit()
    await db.refresh(pin)
    message = await db.get(Message, pin.message_id)
    if message is None:
        # Shouldn't happen given the FK cascade, but mypy + defensive.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pin orphaned")
    logger.info("pins.update", user_id=current_user.id, pin_id=pin.id)
    return _to_public(pin, message)


@router.delete("/{pin_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pin(
    pin_id: int,
    current_user: CurrentUser,
    db: DbSession,
) -> None:
    """Unpin a message. 404 if the pin doesn't belong to the caller."""
    assert current_user.id is not None
    pin = await _own_pin(db, pin_id, current_user.id)
    await db.delete(pin)
    await db.commit()
    logger.info("pins.delete", user_id=current_user.id, pin_id=pin_id)
