# Multi-stage build for a lean, non-root Next.js production image.
# Relies on `output: "standalone"` in next.config.ts (see that file's
# comment) to keep the runtime stage down to just what's needed to run
# `node server.js` — no full node_modules, no dev dependencies.

# --- deps: install once, cached separately from source changes ---
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- builder: compile the app ---
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# No Supabase config needed here on purpose: SUPABASE_URL/SUPABASE_ANON_KEY
# are plain server env vars (see src/lib/env.ts), read live at container
# start, not baked into the build. That's what makes this one image
# deployable against any environment — dev, Hetzner stage, AWS prod — by
# just setting different env vars on the running container, no rebuild.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# --- runner: minimal runtime image ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# SUPABASE_URL and SUPABASE_ANON_KEY are required at runtime and deliberately
# not set here — supply them via `docker run -e` / a K8s Secret per
# environment. The app fails closed (see src/lib/env.ts) rather than
# silently serving with no Supabase config.

# Run as a non-root user rather than the image default (root).
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
