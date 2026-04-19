"""End-to-end auth flow tests."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_and_login_flow(client: AsyncClient) -> None:
    # Register
    resp = await client.post(
        "/auth/register",
        json={"username": "alice", "email": "alice@example.com", "password": "s3cret!!"},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["username"] == "alice"
    assert body["email"] == "alice@example.com"
    assert "password_hash" not in body

    # Login
    resp = await client.post("/auth/login", json={"username": "alice", "password": "s3cret!!"})
    assert resp.status_code == 200, resp.text
    tokens = resp.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens

    # Me
    resp = await client.get(
        "/auth/me", headers={"Authorization": f"Bearer {tokens['access_token']}"}
    )
    assert resp.status_code == 200
    assert resp.json()["username"] == "alice"


@pytest.mark.asyncio
async def test_register_duplicate(client: AsyncClient) -> None:
    payload = {"username": "bob", "email": "bob@example.com", "password": "s3cret!!"}
    r1 = await client.post("/auth/register", json=payload)
    assert r1.status_code == 201
    r2 = await client.post("/auth/register", json=payload)
    assert r2.status_code == 409


@pytest.mark.asyncio
async def test_login_invalid_credentials(client: AsyncClient) -> None:
    await client.post(
        "/auth/register",
        json={"username": "carol", "email": "carol@example.com", "password": "s3cret!!"},
    )
    resp = await client.post("/auth/login", json={"username": "carol", "password": "wrong"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_refresh_rotates_token(client: AsyncClient) -> None:
    await client.post(
        "/auth/register",
        json={"username": "dave", "email": "dave@example.com", "password": "s3cret!!"},
    )
    login = await client.post("/auth/login", json={"username": "dave", "password": "s3cret!!"})
    old_refresh = login.json()["refresh_token"]

    refresh = await client.post("/auth/refresh", json={"refresh_token": old_refresh})
    assert refresh.status_code == 200
    new_tokens = refresh.json()
    assert new_tokens["refresh_token"] != old_refresh

    # Old refresh must be revoked
    reused = await client.post("/auth/refresh", json={"refresh_token": old_refresh})
    assert reused.status_code == 401


@pytest.mark.asyncio
async def test_me_without_token(client: AsyncClient) -> None:
    resp = await client.get("/auth/me")
    assert resp.status_code == 401
