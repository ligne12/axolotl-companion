"""Sessions CRUD integration tests."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


async def _register_and_login(client: AsyncClient, username: str = "alice") -> str:
    await client.post(
        "/auth/register",
        json={"username": username, "email": f"{username}@example.com", "password": "s3cret!!"},
    )
    resp = await client.post("/auth/login", json={"username": username, "password": "s3cret!!"})
    return str(resp.json()["access_token"])


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_sessions_crud(client: AsyncClient) -> None:
    token = await _register_and_login(client)

    # Create
    resp = await client.post("/v1/sessions", json={"title": "First chat"}, headers=_auth(token))
    assert resp.status_code == 201
    session = resp.json()
    assert session["title"] == "First chat"
    assert session["archived"] is False
    session_id = session["id"]

    # List
    resp = await client.get("/v1/sessions", headers=_auth(token))
    assert resp.status_code == 200
    assert len(resp.json()) == 1

    # Get detail
    resp = await client.get(f"/v1/sessions/{session_id}", headers=_auth(token))
    assert resp.status_code == 200
    assert resp.json()["messages"] == []

    # Patch (rename + archive)
    resp = await client.patch(
        f"/v1/sessions/{session_id}",
        json={"title": "Renamed", "archived": True},
        headers=_auth(token),
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Renamed"
    assert resp.json()["archived"] is True

    # Archived by default are filtered out
    resp = await client.get("/v1/sessions", headers=_auth(token))
    assert len(resp.json()) == 0
    resp = await client.get("/v1/sessions?archived=true", headers=_auth(token))
    assert len(resp.json()) == 1

    # Delete
    resp = await client.delete(f"/v1/sessions/{session_id}", headers=_auth(token))
    assert resp.status_code == 204

    resp = await client.get(f"/v1/sessions/{session_id}", headers=_auth(token))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_session_authz(client: AsyncClient) -> None:
    token_a = await _register_and_login(client, "alice")
    token_b = await _register_and_login(client, "bob")

    # Alice creates a session
    resp = await client.post("/v1/sessions", json={"title": "Alice"}, headers=_auth(token_a))
    sid = resp.json()["id"]

    # Bob cannot see it
    resp = await client.get(f"/v1/sessions/{sid}", headers=_auth(token_b))
    assert resp.status_code == 404
    resp = await client.delete(f"/v1/sessions/{sid}", headers=_auth(token_b))
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_sessions_requires_auth(client: AsyncClient) -> None:
    resp = await client.get("/v1/sessions")
    assert resp.status_code == 401
