FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM caddy:2-alpine
COPY docker/prod/Caddyfile /etc/caddy/Caddyfile
COPY --from=frontend-build /app/dist /srv
