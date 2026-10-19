# syntax=docker/dockerfile:1.7

# Build assets in Node. Dependency installation is cached separately from the
# frequently changing application source.
FROM node:24-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm ci \
      --workspace @attendance/frontend \
      --include-workspace-root \
      --no-audit \
      --no-fund

COPY frontend ./frontend

RUN npm run build --workspace frontend

# The runtime has no Node.js or source code: only Nginx and compiled assets.
FROM nginx:1.29-alpine AS runtime

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80
