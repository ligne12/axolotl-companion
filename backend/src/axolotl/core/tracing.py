"""Langfuse tracer — single entry point for the orchestrator.

The Langfuse SDK is optional: a portfolio clone running offline has no
reason to ship traces anywhere. Everything in this module collapses to a
cheap no-op when ``LANGFUSE_PUBLIC_KEY`` / ``LANGFUSE_SECRET_KEY`` are
blank, so callers never have to branch on "is Langfuse enabled".

Public surface — three context-managers, one trace builder:

* ``start_chat_trace(session_id, user_id)`` → ``ChatTrace``
* ``trace.generation(name, model, input)`` → ``ChatSpan``
* ``trace.tool_span(name, input)``         → ``ChatSpan``
* every ``ChatSpan`` exposes ``end(output, ...)`` plus the
  ``ChatTrace.update(output=...)`` finalizer.

The real Langfuse SDK objects carry a much larger API; we wrap only the
three calls the orchestrator actually needs so swapping out the backend
later (OpenTelemetry, plain structlog) is a single-file change.
"""

from __future__ import annotations

from typing import Any

import structlog

from axolotl.config import get_settings

logger = structlog.get_logger(__name__)

try:  # langfuse is an optional install at runtime; pyproject has it as a hard
    # dep but we guard the import so the no-op path survives even when the
    # wheel is missing (e.g. on a minimal CI image).
    from langfuse import Langfuse
except Exception:  # pragma: no cover — protective fallback
    Langfuse = None  # type: ignore[assignment,misc]


# -----------------------------------------------------------------------------
# No-op shims used when Langfuse is disabled or the SDK is unavailable
# -----------------------------------------------------------------------------
class _NoopSpan:
    def end(self, **_: Any) -> None:
        return None


class _NoopTrace:
    def generation(self, **_: Any) -> _NoopSpan:
        return _NoopSpan()

    def tool_span(self, **_: Any) -> _NoopSpan:
        return _NoopSpan()

    def update(self, **_: Any) -> None:
        return None


# -----------------------------------------------------------------------------
# Live wrappers
# -----------------------------------------------------------------------------
class _LangfuseSpan:
    def __init__(self, span: Any) -> None:
        self._span = span

    def end(self, **kwargs: Any) -> None:
        # The langfuse 2.x SDK takes ``output`` + optional ``usage`` /
        # ``level`` / ``status_message`` kwargs; we forward whatever the
        # caller passes.
        try:
            self._span.end(**kwargs)
        except Exception:  # pragma: no cover — never let tracing break the chat
            logger.debug("langfuse.span.end_failed", exc_info=True)


class _LangfuseTrace:
    def __init__(self, trace: Any) -> None:
        self._trace = trace

    def generation(self, *, name: str, model: str, payload: Any) -> _LangfuseSpan:
        try:
            return _LangfuseSpan(self._trace.generation(name=name, model=model, input=payload))
        except Exception:  # pragma: no cover
            logger.debug("langfuse.generation_failed", exc_info=True)
            return _LangfuseSpan(_NoopSpan())  # still answers .end()

    def tool_span(self, *, name: str, payload: Any) -> _LangfuseSpan:
        try:
            return _LangfuseSpan(self._trace.span(name=name, input=payload))
        except Exception:  # pragma: no cover
            logger.debug("langfuse.span_failed", exc_info=True)
            return _LangfuseSpan(_NoopSpan())

    def update(self, **kwargs: Any) -> None:
        try:
            self._trace.update(**kwargs)
        except Exception:  # pragma: no cover
            logger.debug("langfuse.trace.update_failed", exc_info=True)


# -----------------------------------------------------------------------------
# Singleton client
# -----------------------------------------------------------------------------
_client: Any | None = None
_initialised = False


def _get_client() -> Any | None:
    """Build (and cache) the Langfuse client when credentials are present."""
    global _client, _initialised
    if _initialised:
        return _client
    _initialised = True
    if Langfuse is None:
        return None
    settings = get_settings()
    if not settings.langfuse_public_key or not settings.langfuse_secret_key:
        return None
    try:
        _client = Langfuse(
            public_key=settings.langfuse_public_key,
            secret_key=settings.langfuse_secret_key,
            host=settings.langfuse_host,
        )
        logger.info("langfuse.enabled", host=settings.langfuse_host)
    except Exception:  # pragma: no cover
        logger.warning("langfuse.init_failed", exc_info=True)
        _client = None
    return _client


def start_chat_trace(*, session_id: str, user_id: int) -> _LangfuseTrace | _NoopTrace:
    """Open a Langfuse trace for one chat round-trip. Returns a no-op
    trace if Langfuse isn't configured — callers never branch.
    """
    client = _get_client()
    if client is None:
        return _NoopTrace()
    try:
        trace = client.trace(
            name="chat",
            session_id=session_id,
            user_id=str(user_id),
        )
        return _LangfuseTrace(trace)
    except Exception:  # pragma: no cover
        logger.debug("langfuse.start_trace_failed", exc_info=True)
        return _NoopTrace()
