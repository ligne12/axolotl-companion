"""Sessions CRUD + streaming chat endpoint."""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from typing import Annotated, Any

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import selectinload
from sqlmodel import col, select
from sse_starlette.sse import EventSourceResponse

from axolotl.api.deps import CurrentUser, DbSession
from axolotl.config import get_settings
from axolotl.db.models import Message, Session
from axolotl.llm import VLLMClient, get_llm_client, stream_chat
from axolotl.llm.tools import registry as tool_registry
from axolotl.schemas.session import (
    MessageCreate,
    MessagePublic,
    SessionCreate,
    SessionDetail,
    SessionPublic,
    SessionUpdate,
)
from axolotl.services.settings_store import get_enabled_tools

logger = structlog.get_logger(__name__)
router = APIRouter()


def _merge_tool_results(messages: list[Message]) -> list[MessagePublic]:
    """Attach each tool message's content as 'result' on the corresponding
    tool_call entry of the preceding assistant message, and drop the tool
    messages from the returned list."""
    # Index tool results + durations by tool_call_id
    results_by_id: dict[str, Any] = {}
    durations_by_id: dict[str, int] = {}
    for m in messages:
        if m.role == "tool" and m.tool_call_id and m.content is not None:
            try:
                results_by_id[m.tool_call_id] = json.loads(m.content)
            except json.JSONDecodeError:
                results_by_id[m.tool_call_id] = m.content
            dur = (m.message_metadata or {}).get("timings", {}).get("duration_ms")
            if isinstance(dur, int):
                durations_by_id[m.tool_call_id] = dur

    out: list[MessagePublic] = []
    for m in messages:
        if m.role == "tool":
            continue  # fold into assistant
        enriched_tool_calls: list[dict[str, Any]] | None = None
        if m.role == "assistant" and m.tool_calls:
            enriched_tool_calls = []
            for tc in m.tool_calls:
                tc_copy = dict(tc)
                tc_id = tc_copy.get("id")
                if tc_id and tc_id in results_by_id:
                    tc_copy["result"] = results_by_id[tc_id]
                if tc_id and tc_id in durations_by_id:
                    tc_copy["duration_ms"] = durations_by_id[tc_id]
                enriched_tool_calls.append(tc_copy)
        out.append(
            MessagePublic(
                id=m.id,
                role=m.role,
                content=m.content,
                reasoning=m.reasoning,
                tool_calls=enriched_tool_calls,
                tool_call_id=m.tool_call_id,
                created_at=m.created_at,
                metadata=m.message_metadata or None,
            )
        )
    return out


async def _get_user_session(db: DbSession, session_id: int, user_id: int) -> Session:
    """Fetch a session owned by ``user_id`` or raise 404."""
    result = await db.execute(
        select(Session).where(Session.id == session_id, Session.user_id == user_id)
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    return session


@router.get("", response_model=list[SessionPublic])
async def list_sessions(
    current_user: CurrentUser,
    db: DbSession,
    archived: bool = False,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[Session]:
    """List the current user's sessions, newest first."""
    stmt = (
        select(Session)
        .where(Session.user_id == current_user.id, Session.archived == archived)
        .order_by(col(Session.updated_at).desc())
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.post("", response_model=SessionPublic, status_code=status.HTTP_201_CREATED)
async def create_session(
    payload: SessionCreate,
    current_user: CurrentUser,
    db: DbSession,
) -> Session:
    """Create a new empty session."""
    assert current_user.id is not None
    session = Session(
        user_id=current_user.id,
        title=payload.title,
        persona_id=payload.persona_id,
        model=payload.model,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@router.get("/{session_id}", response_model=SessionDetail)
async def get_session(
    session_id: int,
    current_user: CurrentUser,
    db: DbSession,
) -> SessionDetail:
    """Return a session and all its messages."""
    assert current_user.id is not None
    result = await db.execute(
        select(Session)
        .where(Session.id == session_id, Session.user_id == current_user.id)
        .options(selectinload(Session.messages))  # type: ignore[arg-type]
    )
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    assert session.id is not None
    return SessionDetail(
        id=session.id,
        title=session.title,
        persona_id=session.persona_id,
        model=session.model,
        archived=session.archived,
        created_at=session.created_at,
        updated_at=session.updated_at,
        messages=_merge_tool_results(list(session.messages)),
    )


@router.patch("/{session_id}", response_model=SessionPublic)
async def update_session(
    session_id: int,
    payload: SessionUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> Session:
    """Update a session (title / archived flag)."""
    assert current_user.id is not None
    session = await _get_user_session(db, session_id, current_user.id)
    if payload.title is not None:
        session.title = payload.title
    if payload.archived is not None:
        session.archived = payload.archived
    session.updated_at = datetime.now(UTC)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: int,
    current_user: CurrentUser,
    db: DbSession,
) -> None:
    """Delete a session and all its messages."""
    assert current_user.id is not None
    session = await _get_user_session(db, session_id, current_user.id)
    await db.delete(session)
    await db.commit()


# -----------------------------------------------------------------------------
# Messages (non-streaming listing + streaming chat)
# -----------------------------------------------------------------------------
@router.get("/{session_id}/messages", response_model=list[MessagePublic])
async def list_messages(
    session_id: int,
    current_user: CurrentUser,
    db: DbSession,
) -> list[MessagePublic]:
    """Return the messages of a session, with tool results merged in."""
    assert current_user.id is not None
    await _get_user_session(db, session_id, current_user.id)
    result = await db.execute(
        select(Message).where(Message.session_id == session_id).order_by(col(Message.created_at))
    )
    return _merge_tool_results(list(result.scalars().all()))


@router.post("/{session_id}/messages")
async def post_message(
    session_id: int,
    payload: MessageCreate,
    current_user: CurrentUser,
    db: DbSession,
    llm: Annotated[VLLMClient, Depends(get_llm_client)],
) -> EventSourceResponse:
    """Post a user message and stream the assistant response as SSE."""
    assert current_user.id is not None
    session = await _get_user_session(db, session_id, current_user.id)

    assert session.id is not None
    user_msg = Message(session_id=session.id, role="user", content=payload.content)
    db.add(user_msg)

    # Auto-title from the first user message (manual renames stay sticky)
    if not session.title or session.title == "New conversation":
        auto = payload.content.strip().split("\n")[0][:80]
        if auto:
            session.title = auto

    session.updated_at = datetime.now(UTC)
    db.add(session)
    await db.commit()

    settings = get_settings()
    model_name = session.model or settings.vllm_served_model_name
    enabled_tools = await get_enabled_tools(
        db, current_user.id, defaults=tool_registry.default_enabled()
    )

    async def _generator() -> AsyncIterator[dict[str, str]]:
        async for event in stream_chat(
            db=db,
            session=session,
            client=llm,
            model=model_name,
            enabled_tools=enabled_tools,
        ):
            yield event.to_sse()

    return EventSourceResponse(_generator())
