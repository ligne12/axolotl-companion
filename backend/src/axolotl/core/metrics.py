"""Prometheus counters / histograms exposed alongside the request
metrics from ``prometheus-fastapi-instrumentator``.

The instrumentator already emits ``http_requests_total``,
``http_request_duration_seconds``, etc. — what we add here is the
chat-specific signal that doesn't fall out of HTTP middleware:

* ``axolotl_chat_streams_total{outcome}`` — number of SSE chat streams
  started / completed / failed.
* ``axolotl_chat_stream_duration_seconds`` — wall-clock from request
  start to final ``message.done`` (a more useful latency than the
  middleware's first-byte time on a long-running SSE response).
* ``axolotl_tool_calls_total{tool, outcome}`` — every dispatched tool
  call, built-in or MCP, labeled by name (sanitised to the OpenAI
  ``mcp__<server_id>__<name>`` form for MCP tools).
* ``axolotl_mcp_syncs_total{outcome}`` — manual ``POST /v1/mcp/.../sync``.

All four are module-level singletons so importing this module twice
doesn't try to re-register the metric (the default registry rejects
that).
"""

from __future__ import annotations

from prometheus_client import Counter, Histogram

CHAT_STREAMS_TOTAL = Counter(
    "axolotl_chat_streams_total",
    "Number of chat SSE streams by outcome.",
    labelnames=("outcome",),  # started | completed | failed
)

CHAT_STREAM_DURATION = Histogram(
    "axolotl_chat_stream_duration_seconds",
    "Wall-clock duration of a chat stream from request to message.done.",
    buckets=(0.5, 1, 2, 5, 10, 20, 30, 60, 120, 300),
)

TOOL_CALLS_TOTAL = Counter(
    "axolotl_tool_calls_total",
    "Number of tool calls dispatched by the orchestrator.",
    labelnames=("tool", "outcome"),  # outcome: ok | error
)

MCP_SYNCS_TOTAL = Counter(
    "axolotl_mcp_syncs_total",
    "Number of MCP /sync calls by outcome.",
    labelnames=("outcome",),  # ok | error
)
