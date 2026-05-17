"""Fetch a web URL and return its main article text (readability-lxml).

A real upgrade over ``web_search``: search returns SERP snippets,
this tool actually opens one page and hands the model the cleaned
body. Uses ``readability-lxml`` (the Python port of the Readability
algorithm) to lift the article out of nav/ads/footer chrome.

Guards:
- Only ``http`` / ``https`` schemes accepted.
- Resolved host must not be loopback / link-local / private — blocks
  the classic SSRF "fetch http://169.254.169.254" attack vector that
  cloud metadata services live behind.
- 8 s timeout, 1 MB response cap.
"""

from __future__ import annotations

import ipaddress
import socket
from typing import Any
from urllib.parse import urlparse

import httpx
import structlog
from lxml import etree
from lxml import html as lxml_html
from readability import Document  # type: ignore[import-untyped]

from axolotl.llm.tools.base import Tool

logger = structlog.get_logger(__name__)

_HTTP_TIMEOUT = 8.0
_MAX_BYTES = 1_000_000  # 1 MB
_DEFAULT_MAX_CHARS = 4_000
_USER_AGENT = "axolotl-companion/0.1 (+https://github.com/ligne12/axolotl-companion)"


def _is_safe_host(host: str) -> bool:
    """Reject loopback / link-local / private / multicast / reserved IPs.

    Resolves the host once and walks every returned address; if any of
    them is non-public, the entire request is refused — handles
    ``localhost``, ``127.0.0.1``, ``169.254.169.254`` (cloud metadata),
    ``10.0.0.0/8``, ``192.168.0.0/16``, ``::1``, IPv6 link-local.
    """
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror:
        return False
    for info in infos:
        ip_str = info[4][0]
        try:
            ip = ipaddress.ip_address(ip_str)
        except ValueError:
            return False
        if (
            ip.is_private
            or ip.is_loopback
            or ip.is_link_local
            or ip.is_multicast
            or ip.is_reserved
            or ip.is_unspecified
        ):
            return False
    return True


def _extract_text(html: str) -> tuple[str, str]:
    """Return (title, plain-text body) via readability-lxml."""
    doc = Document(html)
    title = (doc.short_title() or "").strip()
    summary_html = doc.summary(html_partial=True)

    # readability returns sanitized HTML; strip the remaining tags
    # without pulling in BeautifulSoup just for this.
    try:
        tree = lxml_html.fromstring(summary_html)
    except (etree.ParserError, etree.XMLSyntaxError):
        return title, ""
    text = "\n".join(line.strip() for line in tree.text_content().splitlines() if line.strip())
    return title, text


class FetchUrlTool(Tool):
    """Download a page and return its readable body text."""

    name = "fetch_url"
    title = "Fetch URL"
    description = (
        "Open a single web page and return its readable article text. Use "
        "this AFTER ``web_search`` or ``wikipedia_search`` to dig into one "
        "specific result. Returns the page title and the cleaned body "
        "(navigation / footer / ads stripped). Pass ``max_chars`` to cap the "
        "response size."
    )
    category = "search"
    icon = "link"
    enabled_by_default = True

    @property
    def parameters_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "url": {
                    "type": "string",
                    "format": "uri",
                    "description": "HTTP(S) URL to fetch.",
                },
                "max_chars": {
                    "type": "integer",
                    "minimum": 200,
                    "maximum": 12_000,
                    "default": _DEFAULT_MAX_CHARS,
                    "description": (
                        f"Maximum body length (default {_DEFAULT_MAX_CHARS}, capped at 12 000)."
                    ),
                },
            },
            "required": ["url"],
        }

    async def run(self, arguments: dict[str, Any]) -> dict[str, Any]:
        url = str(arguments.get("url", "")).strip()
        if not url:
            return {"error": "Empty url"}

        parsed = urlparse(url)
        if parsed.scheme not in {"http", "https"}:
            return {"error": f"Unsupported scheme: {parsed.scheme!r}"}
        if not parsed.hostname:
            return {"error": "URL has no host"}
        if not _is_safe_host(parsed.hostname):
            return {"error": "Refusing to fetch a non-public host"}

        max_chars = int(arguments.get("max_chars", _DEFAULT_MAX_CHARS) or _DEFAULT_MAX_CHARS)
        max_chars = max(200, min(12_000, max_chars))

        try:
            async with httpx.AsyncClient(
                timeout=_HTTP_TIMEOUT,
                headers={"User-Agent": _USER_AGENT, "Accept": "text/html,*/*;q=0.5"},
                follow_redirects=True,
                max_redirects=5,
            ) as client:
                resp = await client.get(url)
                resp.raise_for_status()
        except httpx.HTTPError as exc:
            logger.warning("fetch_url.http_error", error=str(exc), url=url)
            return {"error": f"Fetch failed: {exc}"}

        if len(resp.content) > _MAX_BYTES:
            return {"error": f"Response too large ({len(resp.content)} bytes)"}

        content_type = resp.headers.get("content-type", "").split(";")[0].strip().lower()
        if content_type and not content_type.startswith(("text/", "application/xhtml")):
            return {"error": f"Unsupported content-type: {content_type}"}

        title, body = _extract_text(resp.text)
        truncated = len(body) > max_chars
        if truncated:
            body = body[:max_chars]

        return {
            "url": str(resp.url),
            "title": title,
            "content": body,
            "truncated": truncated,
            "byte_length": len(resp.content),
        }
