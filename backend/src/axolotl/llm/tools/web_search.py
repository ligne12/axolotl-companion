"""DuckDuckGo HTML web search tool (no API key required)."""

from __future__ import annotations

import urllib.parse
from html.parser import HTMLParser
from typing import Any

import httpx
import structlog

from axolotl.config import get_settings
from axolotl.llm.tools.base import Tool

logger = structlog.get_logger(__name__)


class _DDGParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.results: list[dict[str, str]] = []
        self._current: dict[str, str] = {}
        self._in_link = False
        self._in_snippet = False
        self._buf: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_d = dict(attrs)
        cls = attrs_d.get("class", "") or ""
        if tag == "a" and "result__a" in cls:
            self._in_link = True
            self._buf = []
            href = attrs_d.get("href", "") or ""
            self._current = {"url": self._clean_url(href), "title": "", "snippet": ""}
        elif tag == "a" and "result__snippet" in cls:
            self._in_snippet = True
            self._buf = []

    def handle_endtag(self, tag: str) -> None:
        if tag == "a" and self._in_link:
            self._current["title"] = "".join(self._buf).strip()
            self._in_link = False
        elif tag == "a" and self._in_snippet:
            self._current["snippet"] = "".join(self._buf).strip()
            self._in_snippet = False
            if self._current.get("url"):
                self.results.append(self._current)
            self._current = {}

    def handle_data(self, data: str) -> None:
        if self._in_link or self._in_snippet:
            self._buf.append(data)

    @staticmethod
    def _clean_url(href: str) -> str:
        if href.startswith("//duckduckgo.com/l/"):
            parsed = urllib.parse.urlparse("https:" + href)
            qs = urllib.parse.parse_qs(parsed.query)
            return qs.get("uddg", [""])[0]
        return href


class WebSearchTool(Tool):
    """Search the web via DuckDuckGo HTML endpoint."""

    name = "web_search"
    title = "Web search"
    description = (
        "Search the web via DuckDuckGo. Use ONLY when the information needed is "
        "recent, specific, or clearly outside your training data. Returns up to "
        "N results with URL, title and snippet."
    )
    category = "search"
    icon = "search"
    enabled_by_default = True

    @property
    def parameters_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "A clear, specific search query.",
                },
            },
            "required": ["query"],
        }

    async def run(self, arguments: dict[str, Any]) -> dict[str, Any]:
        settings = get_settings()
        query = str(arguments.get("query", "")).strip()
        if not query:
            return {"error": "Empty query"}

        url = "https://html.duckduckgo.com/html/?q=" + urllib.parse.quote(query)
        async with httpx.AsyncClient(
            timeout=settings.web_search_timeout_seconds,
            headers={"User-Agent": "Mozilla/5.0 axolotl-companion/0.1"},
        ) as client:
            try:
                resp = await client.get(url)
                resp.raise_for_status()
            except httpx.HTTPError as exc:
                logger.warning("web_search.http_error", error=str(exc))
                return {"error": f"Search failed: {exc}"}

        parser = _DDGParser()
        parser.feed(resp.text)
        results = parser.results[: settings.web_search_max_results]
        for r in results:
            try:
                domain = urllib.parse.urlparse(r["url"]).netloc
                r["domain"] = domain
                r["icon"] = f"https://www.google.com/s2/favicons?domain={domain}&sz=32"
            except ValueError:
                r["domain"] = ""
                r["icon"] = ""

        return {"query": query, "results": results}
