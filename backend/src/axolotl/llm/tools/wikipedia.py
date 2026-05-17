"""Wikipedia search via the official MediaWiki API.

The official ``action=query&list=search`` endpoint returns ranked
results with title + snippet + revision metadata, no API key needed.
Cleaner than DuckDuckGo for encyclopaedic lookups because the model
gets stable canonical URLs and curated summaries instead of arbitrary
SERP snippets.
"""

from __future__ import annotations

import html
import re
from typing import Any

import httpx
import structlog

from axolotl.llm.tools.base import Tool

logger = structlog.get_logger(__name__)

_USER_AGENT = "axolotl-companion/0.1 (https://github.com/ligne12/axolotl-companion)"
_HTTP_TIMEOUT = 8.0
_TAG_RE = re.compile(r"<[^>]+>")


def _clean_snippet(raw: str) -> str:
    """Strip MediaWiki search-result HTML highlights and decode entities."""
    return html.unescape(_TAG_RE.sub("", raw)).strip()


class WikipediaSearchTool(Tool):
    """Search Wikipedia and return ranked title / snippet / URL triples."""

    name = "wikipedia_search"
    title = "Wikipedia search"
    description = (
        "Search Wikipedia for encyclopaedic information. Returns up to "
        "``max_results`` hits with a clean snippet and the canonical URL. "
        "Prefer this over ``web_search`` when the question is factual, "
        "biographical, geographical, or otherwise covered by a stable "
        "encyclopaedia entry."
    )
    category = "search"
    icon = "book-open"
    enabled_by_default = True

    @property
    def parameters_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Topic or article title.",
                },
                "language": {
                    "type": "string",
                    "description": (
                        "Wikipedia language edition code. Default 'en'. Examples: "
                        "'fr', 'de', 'es', 'ja'."
                    ),
                    "default": "en",
                },
                "max_results": {
                    "type": "integer",
                    "minimum": 1,
                    "maximum": 10,
                    "default": 5,
                    "description": "Maximum number of hits to return (1-10).",
                },
            },
            "required": ["query"],
        }

    async def run(self, arguments: dict[str, Any]) -> dict[str, Any]:
        query = str(arguments.get("query", "")).strip()
        if not query:
            return {"error": "Empty query"}

        language = str(arguments.get("language", "en") or "en").strip().lower()
        # Guard against language injection — Wikipedia codes are 2-12 chars
        # of lowercase ASCII / digits / hyphen.
        if not re.fullmatch(r"[a-z0-9-]{2,12}", language):
            return {"error": f"Invalid language code: {language}"}

        max_results = int(arguments.get("max_results", 5) or 5)
        max_results = max(1, min(10, max_results))

        url = f"https://{language}.wikipedia.org/w/api.php"
        params = {
            "action": "query",
            "list": "search",
            "srsearch": query,
            "srlimit": str(max_results),
            "format": "json",
            "formatversion": "2",
            "utf8": "1",
        }

        async with httpx.AsyncClient(
            timeout=_HTTP_TIMEOUT,
            headers={"User-Agent": _USER_AGENT},
        ) as client:
            try:
                resp = await client.get(url, params=params)
                resp.raise_for_status()
                data = resp.json()
            except httpx.HTTPError as exc:
                logger.warning("wikipedia.http_error", error=str(exc), query=query)
                return {"error": f"Search failed: {exc}"}

        hits = (data.get("query") or {}).get("search") or []
        results = [
            {
                "title": hit.get("title"),
                "snippet": _clean_snippet(hit.get("snippet", "")),
                "url": (
                    f"https://{language}.wikipedia.org/wiki/"
                    + (hit.get("title", "").replace(" ", "_"))
                ),
                "wordcount": hit.get("wordcount"),
                "page_id": hit.get("pageid"),
            }
            for hit in hits
        ]

        return {"query": query, "language": language, "results": results}
