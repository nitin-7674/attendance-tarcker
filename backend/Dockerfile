# syntax=docker/dockerfile:1.7

# Install only the packages required by the running API. Keeping this in a
# dedicated stage lets Docker reuse the dependency layer until a manifest or
# the lockfile changes.
FROM node:24-alpine AS production-dependencies

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci \
      --workspace @attendance/backend \
      --include-workspace-root \
      --omit=dev \
      --no-audit \
      --no-fund

# The final image contains Node, production dependencies, and API source only.
FROM node:24-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node backend/package.json ./backend/package.json
COPY --chown=node:node backend/src ./backend/src

WORKDIR /app/backend
USER node

EXPOSE 4000

CMD ["node", "src/server.js"]
