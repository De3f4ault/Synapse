# Synapse Frontend — React SPA served by Nginx
# Multi-stage: Node 22 Alpine builder + pinned Nginx 1.27-alpine runtime.

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --prefer-offline
COPY . .
RUN npm run build:prod

# ── Stage 2: Serve ────────────────────────────────────────────────────────────
# Pinned to 1.27-alpine — not :alpine which moves between builds.
FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
