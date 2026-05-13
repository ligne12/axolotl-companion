"""Slowapi-based per-IP rate limiting backed by Redis.

The limiter lives in a single module so every endpoint reaches the same
``Limiter`` instance — slowapi keys its storage off the object identity,
so passing a fresh limiter per request defeats the point.

Backends:
  - Production / dev with the compose stack: ``settings.redis_url`` →
    durable, multi-worker safe.
  - Pytest / smoke runs without Redis reachable: in-memory fallback
    (slowapi default). The fallback resets per-process, so use the real
    backend for any test that actually exercises the limit.

Hook-up:
  - ``app.state.limiter = limiter`` (done in ``main.py``)
  - ``app.add_exception_handler(RateLimitExceeded, ...)``
  - decorate handlers with ``@limiter.limit("10/minute")``; slowapi
    expects ``request: Request`` to be the first dependency on the
    handler signature so it can read the client IP.
"""

from __future__ import annotations

from slowapi import Limiter
from slowapi.util import get_remote_address

from axolotl.config import get_settings


def _build_limiter() -> Limiter:
    settings = get_settings()
    # ``storage_uri=""`` makes slowapi pick the in-memory backend; passing
    # the Redis URL switches to the shared, durable store.
    return Limiter(
        key_func=get_remote_address,
        storage_uri=settings.redis_url,
        default_limits=[],  # opt-in: only endpoints we decorate are throttled.
    )


limiter = _build_limiter()
