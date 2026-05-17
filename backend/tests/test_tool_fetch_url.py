"""Unit tests for the ``fetch_url`` tool — readability extraction + SSRF guards."""

from __future__ import annotations

from typing import Any

import httpx
import pytest

from axolotl.llm.tools.fetch_url import FetchUrlTool


def _mock_transport(handler: Any) -> httpx.MockTransport:
    return httpx.MockTransport(handler)


@pytest.mark.asyncio
async def test_fetch_url_schema() -> None:
    schema = FetchUrlTool().parameters_schema
    assert schema["required"] == ["url"]
    assert schema["properties"]["max_chars"]["maximum"] == 12_000


@pytest.mark.asyncio
async def test_fetch_url_rejects_non_http_scheme() -> None:
    out = await FetchUrlTool().run({"url": "file:///etc/passwd"})
    assert "Unsupported scheme" in out["error"]


@pytest.mark.asyncio
async def test_fetch_url_rejects_loopback() -> None:
    out = await FetchUrlTool().run({"url": "http://127.0.0.1/secret"})
    assert "non-public host" in out["error"]


@pytest.mark.asyncio
async def test_fetch_url_rejects_localhost_name() -> None:
    out = await FetchUrlTool().run({"url": "http://localhost/admin"})
    assert "non-public host" in out["error"]


@pytest.mark.asyncio
async def test_fetch_url_rejects_metadata_ip() -> None:
    # AWS / GCP cloud metadata service IP — must be blocked.
    out = await FetchUrlTool().run({"url": "http://169.254.169.254/latest/meta-data/"})
    assert "non-public host" in out["error"]


@pytest.mark.asyncio
async def test_fetch_url_happy_path(monkeypatch: pytest.MonkeyPatch) -> None:
    """A normal article URL → readability extracts title + body."""

    html_body = """
    <html><head><title>Test Article</title></head>
    <body>
      <nav>Home | About | Contact</nav>
      <article>
        <h1>The Real Headline</h1>
        <p>This is the first paragraph of the article. It has actual content.</p>
        <p>And here's a second paragraph with more meaningful text and ideas.</p>
      </article>
      <footer>Copyright 2026</footer>
    </body></html>
    """

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            text=html_body,
            headers={"content-type": "text/html; charset=utf-8"},
        )

    # Bypass the SSRF check — patch ``_is_safe_host`` so example.com (which
    # resolves to a public IP in CI) is treated as safe without depending
    # on DNS.
    monkeypatch.setattr("axolotl.llm.tools.fetch_url._is_safe_host", lambda _h: True)
    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda **kw: httpx.AsyncClient(transport=_mock_transport(handler), **kw),
    )

    out = await FetchUrlTool().run({"url": "https://example.com/article"})

    assert "Real Headline" in out["title"] or "Test Article" in out["title"]
    assert "first paragraph" in out["content"]
    assert "second paragraph" in out["content"]
    # Nav / footer text stripped by readability.
    assert "Copyright" not in out["content"]
    assert out["truncated"] is False


@pytest.mark.asyncio
async def test_fetch_url_max_chars_truncates(monkeypatch: pytest.MonkeyPatch) -> None:
    big_body = "<html><body><article>" + ("axolotl " * 2_000) + "</article></body></html>"

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            text=big_body,
            headers={"content-type": "text/html"},
        )

    monkeypatch.setattr("axolotl.llm.tools.fetch_url._is_safe_host", lambda _h: True)
    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda **kw: httpx.AsyncClient(transport=_mock_transport(handler), **kw),
    )

    out = await FetchUrlTool().run({"url": "https://example.com/big", "max_chars": 500})
    assert out["truncated"] is True
    assert len(out["content"]) == 500


@pytest.mark.asyncio
async def test_fetch_url_rejects_non_html_content_type(monkeypatch: pytest.MonkeyPatch) -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            content=b"\x00\x01\x02",
            headers={"content-type": "application/octet-stream"},
        )

    monkeypatch.setattr("axolotl.llm.tools.fetch_url._is_safe_host", lambda _h: True)
    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda **kw: httpx.AsyncClient(transport=_mock_transport(handler), **kw),
    )

    out = await FetchUrlTool().run({"url": "https://example.com/binary"})
    assert "Unsupported content-type" in out["error"]
