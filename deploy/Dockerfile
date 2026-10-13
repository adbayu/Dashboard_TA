# syntax=docker/dockerfile:1
# Build dari root repo: docker build -f deploy/Dockerfile --target api|web .

FROM node:22-slim AS api-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-slim AS api
ENV NODE_ENV=production
WORKDIR /app
COPY --from=api-deps /app/node_modules ./node_modules
COPY package.json ./
COPY server ./server
USER node
EXPOSE 3001
CMD ["node", "--import", "tsx", "server/index.ts"]

FROM node:22-slim AS web-build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js postcss.config.js tailwind.config.js ./
COPY public ./public
COPY src ./src
RUN npm run build

FROM caddy:2-alpine AS web
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=web-build /app/dist /srv
