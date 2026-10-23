FROM node:22-alpine AS frontend-deps
WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci

FROM frontend-deps AS frontend-build
COPY . .
RUN npm run build

FROM node:22-alpine AS api-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:22-alpine AS api
WORKDIR /app
ENV NODE_ENV=production
COPY --from=api-deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json ./package.json
COPY --chown=node:node server ./server
USER node
EXPOSE 3001
HEALTHCHECK --interval=20s --timeout=3s --start-period=30s --retries=5 CMD ["node", "-e", "fetch('http://127.0.0.1:3001/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "--env-file-if-exists=.env", "--import", "tsx", "server/index.ts"]

FROM nginxinc/nginx-unprivileged:1.31.6-alpine3.24 AS web
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=frontend-build --chown=nginx:nginx /workspace/dist/ /usr/share/nginx/html/
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD ["wget", "-qO-", "http://127.0.0.1:8080/"]