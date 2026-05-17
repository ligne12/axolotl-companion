"""Pinned messages CRUD + authz integration tests."""

from __future__ import annotations

from typing import Any
from uuid import UUID

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from axolotl.db.models import Message


async def _register_and_login(client: AsyncClient, username: str = "alice") -> str:
    await client.post(
        "/auth/register",
        json={
            "username": username,
            "email": f"{username}@example.com",
            "password": "s3cret!!",
        },
    )
    resp = await client.post("/auth/login", json={"username": username, "password": "s3cret!!"})
    return str(resp.json()["access_token"])


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


async def _seed_message(
    db: AsyncSession,
    session_id: str,
    *,
    role: str = "assistant",
    content: str = "Pinned content sample.",
) -> UUID:
    """Insert one message directly via the DB session, return its id."""
    msg = Message(session_id=UUID(session_id), role=role, content=content)
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg.id


async def _create_session(client: AsyncClient, token: str) -> str:
    resp = await client.post("/v1/sessions", json={"title": "Pin source"}, headers=_auth(token))
    return str(resp.json()["id"])


@pytest.mark.asyncio
async def test_pin_create_list_and_delete(client: AsyncClient, db: AsyncSession) -> None:
    token = await _register_and_login(client)
    session_id = await _create_session(client, token)
    message_id = await _seed_message(db, session_id, content="One day I will pin this.")

    # Empty list to start
    resp = await client.get("/v1/pins", headers=_auth(token))
    assert resp.status_code == 200
    assert resp.json() == []

    # Create
    resp = await client.post(
        "/v1/pins",
        json={"message_id": str(message_id), "title": "Pinned recipe"},
        headers=_auth(token),
    )
    assert resp.status_code == 201
    pin: dict[str, Any] = resp.json()
    assert pin["title"] == "Pinned recipe"
    assert pin["position"] == 0
    assert pin["message_id"] == str(message_id)
    assert pin["session_id"] == session_id
    assert pin["role"] == "assistant"
    assert pin["excerpt"] == "One day I will pin this."
    pin_id = pin["id"]

    # List shows it
    resp = await client.get("/v1/pins", headers=_auth(token))
    assert resp.status_code == 200
    listing = resp.json()
    assert len(listing) == 1
    assert listing[0]["id"] == pin_id

    # Delete
    resp = await client.delete(f"/v1/pins/{pin_id}", headers=_auth(token))
    assert resp.status_code == 204
    resp = await client.get("/v1/pins", headers=_auth(token))
    assert resp.json() == []


@pytest.mark.asyncio
async def test_pin_position_auto_increments(client: AsyncClient, db: AsyncSession) -> None:
    token = await _register_and_login(client)
    session_id = await _create_session(client, token)
    m1 = await _seed_message(db, session_id, content="first")
    m2 = await _seed_message(db, session_id, content="second")
    m3 = await _seed_message(db, session_id, content="third")

    for i, mid in enumerate((m1, m2, m3)):
        resp = await client.post(
            "/v1/pins",
            json={"message_id": str(mid), "title": f"pin {i}"},
            headers=_auth(token),
        )
        assert resp.status_code == 201
        assert resp.json()["position"] == i

    resp = await client.get("/v1/pins", headers=_auth(token))
    titles = [p["title"] for p in resp.json()]
    assert titles == ["pin 0", "pin 1", "pin 2"]


@pytest.mark.asyncio
async def test_pin_duplicate_message_returns_409(client: AsyncClient, db: AsyncSession) -> None:
    token = await _register_and_login(client)
    session_id = await _create_session(client, token)
    message_id = await _seed_message(db, session_id)

    payload = {"message_id": str(message_id), "title": "first try"}
    resp = await client.post("/v1/pins", json=payload, headers=_auth(token))
    assert resp.status_code == 201

    resp = await client.post(
        "/v1/pins",
        json={"message_id": str(message_id), "title": "second try"},
        headers=_auth(token),
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_pin_patch_title_and_position(client: AsyncClient, db: AsyncSession) -> None:
    token = await _register_and_login(client)
    session_id = await _create_session(client, token)
    message_id = await _seed_message(db, session_id)

    resp = await client.post(
        "/v1/pins",
        json={"message_id": str(message_id), "title": "original"},
        headers=_auth(token),
    )
    pin_id = resp.json()["id"]

    resp = await client.patch(
        f"/v1/pins/{pin_id}",
        json={"title": "renamed", "position": 5},
        headers=_auth(token),
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["title"] == "renamed"
    assert body["position"] == 5


@pytest.mark.asyncio
async def test_pin_message_from_another_user_returns_404(
    client: AsyncClient, db: AsyncSession
) -> None:
    # Alice owns the session/message; Bob can't pin it.
    alice_token = await _register_and_login(client, "alice")
    alice_session = await _create_session(client, alice_token)
    alice_msg = await _seed_message(db, alice_session)

    bob_token = await _register_and_login(client, "bob")
    resp = await client.post(
        "/v1/pins",
        json={"message_id": str(alice_msg), "title": "stolen"},
        headers=_auth(bob_token),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_pin_delete_requires_ownership(client: AsyncClient, db: AsyncSession) -> None:
    alice_token = await _register_and_login(client, "alice")
    alice_session = await _create_session(client, alice_token)
    alice_msg = await _seed_message(db, alice_session)
    resp = await client.post(
        "/v1/pins",
        json={"message_id": str(alice_msg), "title": "hers"},
        headers=_auth(alice_token),
    )
    pin_id = resp.json()["id"]

    bob_token = await _register_and_login(client, "bob")
    resp = await client.delete(f"/v1/pins/{pin_id}", headers=_auth(bob_token))
    assert resp.status_code == 404

    # Alice's pin is still there.
    resp = await client.get("/v1/pins", headers=_auth(alice_token))
    assert len(resp.json()) == 1


@pytest.mark.asyncio
async def test_pin_requires_auth(client: AsyncClient) -> None:
    resp = await client.get("/v1/pins")
    assert resp.status_code in (401, 403)
    resp = await client.post(
        "/v1/pins",
        json={"message_id": "00000000-0000-0000-0000-000000000000", "title": "x"},
    )
    assert resp.status_code in (401, 403)


@pytest.mark.asyncio
async def test_pin_excerpt_is_truncated(client: AsyncClient, db: AsyncSession) -> None:
    token = await _register_and_login(client)
    session_id = await _create_session(client, token)
    long_body = "x" * 1_500
    message_id = await _seed_message(db, session_id, content=long_body)

    resp = await client.post(
        "/v1/pins",
        json={"message_id": str(message_id), "title": "huge"},
        headers=_auth(token),
    )
    assert resp.status_code == 201
    assert len(resp.json()["excerpt"]) == 500


@pytest.mark.asyncio
async def test_pin_disappears_when_message_deleted(client: AsyncClient, db: AsyncSession) -> None:
    """``ON DELETE CASCADE`` on the FK drops the pin when its message dies."""
    token = await _register_and_login(client)
    session_id = await _create_session(client, token)
    message_id = await _seed_message(db, session_id)

    resp = await client.post(
        "/v1/pins",
        json={"message_id": str(message_id), "title": "to be deleted"},
        headers=_auth(token),
    )
    assert resp.status_code == 201

    # Deleting the session cascades to messages, which cascades to pins.
    resp = await client.delete(f"/v1/sessions/{session_id}", headers=_auth(token))
    assert resp.status_code == 204

    resp = await client.get("/v1/pins", headers=_auth(token))
    assert resp.json() == []


@pytest.mark.asyncio
async def test_pin_unknown_id_returns_404(client: AsyncClient) -> None:
    token = await _register_and_login(client)
    resp = await client.patch(
        "/v1/pins/999999",
        json={"title": "ghost"},
        headers=_auth(token),
    )
    assert resp.status_code == 404
    resp = await client.delete("/v1/pins/999999", headers=_auth(token))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_pin_title_length_validation(client: AsyncClient, db: AsyncSession) -> None:
    token = await _register_and_login(client)
    session_id = await _create_session(client, token)
    message_id = await _seed_message(db, session_id)

    # Empty title rejected by Pydantic before hitting the DB.
    resp = await client.post(
        "/v1/pins",
        json={"message_id": str(message_id), "title": ""},
        headers=_auth(token),
    )
    assert resp.status_code == 422

    # 201-char title also rejected.
    resp = await client.post(
        "/v1/pins",
        json={"message_id": str(message_id), "title": "x" * 201},
        headers=_auth(token),
    )
    assert resp.status_code == 422
