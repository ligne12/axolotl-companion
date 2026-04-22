"""Personas CRUD — named system prompts (+ per-persona defaults) the user
can attach to a session."""

from __future__ import annotations

import structlog
from fastapi import APIRouter, HTTPException, status
from sqlmodel import col, select

from axolotl.api.deps import CurrentUser, DbSession
from axolotl.db.models import Persona
from axolotl.schemas.persona import PersonaCreate, PersonaPublic, PersonaUpdate

logger = structlog.get_logger(__name__)
router = APIRouter()


async def _get_user_persona(db: DbSession, persona_id: int, user_id: int) -> Persona:
    """Fetch a persona owned by ``user_id`` or raise 404.

    Built-in personas (``is_builtin=True, user_id=None``) are readable by any
    user but not patchable / deletable — callers must gate that separately.
    """
    result = await db.execute(select(Persona).where(Persona.id == persona_id))
    persona = result.scalar_one_or_none()
    if persona is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Persona not found")
    if persona.user_id != user_id and not persona.is_builtin:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Persona not found")
    return persona


@router.get("", response_model=list[PersonaPublic])
async def list_personas(current_user: CurrentUser, db: DbSession) -> list[Persona]:
    """List the current user's personas + any built-ins."""
    assert current_user.id is not None
    stmt = (
        select(Persona)
        .where(
            (Persona.user_id == current_user.id) | (col(Persona.is_builtin).is_(True))
        )
        .order_by(col(Persona.created_at).desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.post("", response_model=PersonaPublic, status_code=status.HTTP_201_CREATED)
async def create_persona(
    payload: PersonaCreate,
    current_user: CurrentUser,
    db: DbSession,
) -> Persona:
    """Create a persona owned by the current user."""
    assert current_user.id is not None
    persona = Persona(
        user_id=current_user.id,
        name=payload.name,
        system_prompt=payload.system_prompt,
        params=payload.params,
    )
    db.add(persona)
    await db.commit()
    await db.refresh(persona)
    logger.info("personas.create", user_id=current_user.id, persona_id=persona.id)
    return persona


@router.get("/{persona_id}", response_model=PersonaPublic)
async def get_persona(
    persona_id: int,
    current_user: CurrentUser,
    db: DbSession,
) -> Persona:
    """Fetch one persona (owned by the user or a built-in)."""
    assert current_user.id is not None
    return await _get_user_persona(db, persona_id, current_user.id)


@router.patch("/{persona_id}", response_model=PersonaPublic)
async def update_persona(
    persona_id: int,
    payload: PersonaUpdate,
    current_user: CurrentUser,
    db: DbSession,
) -> Persona:
    """Patch a persona. Built-ins are read-only — 403 on edit."""
    assert current_user.id is not None
    persona = await _get_user_persona(db, persona_id, current_user.id)
    if persona.is_builtin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Built-in personas are read-only",
        )
    if payload.name is not None:
        persona.name = payload.name
    if payload.system_prompt is not None:
        persona.system_prompt = payload.system_prompt
    if payload.params is not None:
        persona.params = payload.params
    db.add(persona)
    await db.commit()
    await db.refresh(persona)
    logger.info("personas.update", user_id=current_user.id, persona_id=persona.id)
    return persona


@router.delete("/{persona_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_persona(
    persona_id: int,
    current_user: CurrentUser,
    db: DbSession,
) -> None:
    """Delete one of the user's personas. Built-ins can't be removed."""
    assert current_user.id is not None
    persona = await _get_user_persona(db, persona_id, current_user.id)
    if persona.is_builtin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Built-in personas are read-only",
        )
    await db.delete(persona)
    await db.commit()
    logger.info("personas.delete", user_id=current_user.id, persona_id=persona_id)
