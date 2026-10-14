# CrossBordersDeliveries API — production image for Coolify / Docker.
# PocketBase runs as its own container/service; this image only serves the
# Express API and talks to PocketBase over HTTP via POCKETBASE_URL.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

# dependencies
COPY --from=deps /app/node_modules ./node_modules

# application (src + assets/logo.png is embedded in emails and PDF invoices)
COPY package.json package-lock.json ./
COPY src ./src
COPY assets ./assets

ENV PORT=8787
EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" >/dev/null || exit 1

# --env-file-if-exists is a no-op when the environment comes from Coolify/Docker
CMD ["node", "--env-file-if-exists=.env", "src/index.js"]
