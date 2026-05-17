"""Unit tests for the ``wikipedia_search`` tool."""

from __future__ import annotations

from typing import Any

import httpx
import pytest

from axolotl.llm.tools.wikipedia import WikipediaSearchTool, _clean_snippet


def _mock_transport(handler: Any) -> httpx.MockTransport:
    return httpx.MockTransport(handler)


def test_clean_snippet_strips_highlights() -> None:
    raw = 'The <span class="searchmatch">axolotl</span> is a salamander &amp; an amphibian.'
    assert _clean_snippet(raw) == "The axolotl is a salamander & an amphibian."


@pytest.mark.asyncio
async def test_wikipedia_schema() -> None:
    schema = WikipediaSearchTool().parameters_schema
    assert schema["required"] == ["query"]
    assert schema["properties"]["max_results"]["maximum"] == 10


@pytest.mark.asyncio
async def test_wikipedia_search_happy(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, Any] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["host"] = request.url.host
        captured["sr"] = request.url.params.get("srsearch")
        return httpx.Response(
            200,
            json={
                "query": {
                    "search": [
                        {
                            "title": "Axolotl",
                            "snippet": "<span class='searchmatch'>Axolotl</span> is a salamander.",
                            "wordcount": 4200,
                            "pageid": 12345,
                        },
                        {
                            "title": "Mexican axolotl",
                            "snippet": "A neotenic amphibian.",
                            "wordcount": 800,
                            "pageid": 67890,
                        },
                    ]
                }
            },
        )

    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda **kw: httpx.AsyncClient(transport=_mock_transport(handler), **kw),
    )

    out = await WikipediaSearchTool().run({"query": "axolotl"})

    assert captured["host"] == "en.wikipedia.org"
    assert captured["sr"] == "axolotl"
    assert len(out["results"]) == 2
    assert out["results"][0]["title"] == "Axolotl"
    assert out["results"][0]["snippet"] == "Axolotl is a salamander."
    assert out["results"][0]["url"] == "https://en.wikipedia.org/wiki/Axolotl"
    assert out["results"][1]["url"] == "https://en.wikipedia.org/wiki/Mexican_axolotl"


@pytest.mark.asyncio
async def test_wikipedia_language_routing(monkeypatch: pytest.MonkeyPatch) -> None:
    captured: dict[str, Any] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["host"] = request.url.host
        return httpx.Response(200, json={"query": {"search": []}})

    monkeypatch.setattr(
        httpx,
        "AsyncClient",
        lambda **kw: httpx.AsyncClient(transport=_mock_transport(handler), **kw),
    )

    await WikipediaSearchTool().run({"query": "salamandre", "language": "fr"})
    assert captured["host"] == "fr.wikipedia.org"


@pytest.mark.asyncio
async def test_wikipedia_empty_query() -> None:
    out = await WikipediaSearchTool().run({"query": "   "})
    assert out == {"error": "Empty query"}


@pytest.mark.asyncio
async def test_wikipedia_invalid_language() -> None:
    out = await WikipediaSearchTool().run({"query": "x", "language": "fr; DROP TABLE"})
    assert "Invalid language" in out["error"]
