# =============================================================================
# Axolotl frontend — Next.js, multi-stage with pnpm
# =============================================================================

FROM node:22-alpine AS base

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

WORKDIR /app

# -----------------------------------------------------------------------------
# Dependencies layer
# -----------------------------------------------------------------------------
FROM base AS deps

COPY package.json pnpm-lock.yaml* ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --no-frozen-lockfile

# -----------------------------------------------------------------------------
# Development stage — HMR via ``pnpm dev``
#
# Selected only when ``FRONTEND_TARGET=development`` is set (and the
# matching ``compose.hmr.yaml`` overlay is applied, which mounts the
# host's ``src/`` + ``public/`` so changes hot-reload). The default
# ``make dev`` keeps the ``production`` stage below so the stack boots
# straight into the real bundle.
# -----------------------------------------------------------------------------
FROM base AS development

COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3000

ENV NEXT_TELEMETRY_DISABLED=1

CMD ["pnpm", "dev"]

# -----------------------------------------------------------------------------
# Build stage
#
# ``NEXT_PUBLIC_*`` vars are inlined into the client bundle at *build*
# time (``pnpm build``) — they're literal strings in the emitted JS,
# not env lookups at runtime. So whatever value compose passes to the
# runtime container is ignored unless we also surface it here as a
# build arg. Without that wiring, the bundle would freeze whatever
# ``utils.ts`` falls back to (``/api``) regardless of ``.env``.
# -----------------------------------------------------------------------------
FROM base AS builder

ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_APP_NAME="Axolotl Companion"

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_PUBLIC_APP_NAME=${NEXT_PUBLIC_APP_NAME} \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm build

# -----------------------------------------------------------------------------
# Production stage (minimal runtime with standalone output)
# -----------------------------------------------------------------------------
FROM base AS production

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
