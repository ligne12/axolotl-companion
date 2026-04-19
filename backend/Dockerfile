# =============================================================================
# Axolotl backend — FastAPI, multi-stage with uv
# =============================================================================

# -----------------------------------------------------------------------------
# Base image with uv preinstalled
# -----------------------------------------------------------------------------
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/opt/venv

WORKDIR /app

# System deps (curl for healthcheck, libpq for asyncpg runtime)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# -----------------------------------------------------------------------------
# Dependencies layer (cached across code changes)
# -----------------------------------------------------------------------------
FROM base AS deps

COPY pyproject.toml uv.lock* ./

# Install only production deps
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-project || \
    uv sync --no-dev --no-install-project

# -----------------------------------------------------------------------------
# Development stage (HMR)
# -----------------------------------------------------------------------------
FROM base AS development

COPY --from=deps /opt/venv /opt/venv

# Install all deps including dev tools
COPY pyproject.toml uv.lock* ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --no-install-project || true

ENV PATH="/opt/venv/bin:$PATH"

COPY src ./src
COPY alembic.ini ./

EXPOSE 8001

CMD ["uvicorn", "axolotl.main:app", "--host", "0.0.0.0", "--port", "8001", "--reload", "--reload-dir", "src"]

# -----------------------------------------------------------------------------
# Production stage (slim runtime)
# -----------------------------------------------------------------------------
FROM base AS production

COPY --from=deps /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY src ./src
COPY alembic.ini ./

# Non-root user
RUN useradd -m -u 1000 axolotl && chown -R axolotl:axolotl /app
USER axolotl

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

CMD ["uvicorn", "axolotl.main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2"]
