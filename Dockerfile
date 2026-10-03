# syntax=docker/dockerfile:1.7
# News On Africa (Next 15) for Coolify on eljay-ops-01 (arm64), OPS-101.
# NEXT_PUBLIC_* values are inlined into the client bundle, so they are build arguments.
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile

FROM deps AS builder
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_WP_NG_REST_BASE
ARG NEXT_PUBLIC_WP_NG_GRAPHQL
ARG NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY . .
# Build args are visible to RUN; drop empty ones so optional NEXT_PUBLIC_* vars validate as "unset", not "".
RUN for v in $(env | sed -n "s/^\(NEXT_PUBLIC_[A-Z0-9_]*\)=$/\1/p"); do unset "$v"; done \
    && pnpm build && pnpm prune --prod --ignore-scripts

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/package.json /app/next.config.ts ./
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"
STOPSIGNAL SIGTERM
CMD ["node_modules/.bin/next", "start", "-H", "0.0.0.0", "-p", "3000"]
