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
# -----------------------------------------------------------------------------
FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

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
