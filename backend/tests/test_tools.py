"""Tools registry + per-user enable/disable tests."""

from __future__ import annotations

import pytest
from httpx import AsyncClient


async def _login(client: AsyncClient) -> str:
    await client.post(
        "/auth/register",
        json={"username": "alice", "email": "alice@example.com", "password": "s3cret!!"},
    )
    resp = await client.post("/auth/login", json={"username": "alice", "password": "s3cret!!"})
    return str(resp.json()["access_token"])


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_list_tools_defaults(client: AsyncClient) -> None:
    token = await _login(client)
    resp = await client.get("/v1/tools", headers=_auth(token))
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) >= 1
    # web_search is built-in, enabled by default
    web = next(t for t in body if t["name"] == "web_search")
    assert web["enabled"] is True
    assert web["title"] == "Web search"


@pytest.mark.asyncio
async def test_toggle_tool(client: AsyncClient) -> None:
    token = await _login(client)

    resp = await client.put("/v1/tools/web_search", json={"enabled": False}, headers=_auth(token))
    assert resp.status_code == 200
    assert resp.json()["enabled"] is False

    resp = await client.get("/v1/tools", headers=_auth(token))
    web = next(t for t in resp.json() if t["name"] == "web_search")
    assert web["enabled"] is False

    resp = await client.put("/v1/tools/web_search", json={"enabled": True}, headers=_auth(token))
    assert resp.status_code == 200
    assert resp.json()["enabled"] is True


@pytest.mark.asyncio
async def test_toggle_unknown_tool(client: AsyncClient) -> None:
    token = await _login(client)
    resp = await client.put(
        "/v1/tools/does_not_exist", json={"enabled": True}, headers=_auth(token)
    )
    assert resp.status_code == 404
