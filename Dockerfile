# syntax=docker/dockerfile:1

FROM node:24-alpine AS build
WORKDIR /app

# Cache dependencies separately from application source changes.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY angular.json tsconfig*.json .postcssrc.json ./
COPY src ./src
COPY public ./public

ARG BUILD_CONFIGURATION=prod
RUN npm run build -- --configuration="${BUILD_CONFIGURATION}"

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NO_UPDATE_CHECK=1
RUN npm install --global serve@14.2.6 --no-audit --no-fund
COPY serve.json ./serve.json
COPY --from=build /app/dist/corp-portal-ui/browser ./public

USER node
EXPOSE 8080
STOPSIGNAL SIGTERM
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8080/index.html').then(response => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

# The external reverse proxy owns HTTPS and backend routing.
CMD ["serve", "public", "--single", "--listen", "tcp://0.0.0.0:8080", "--config", "/app/serve.json", "--no-clipboard", "--no-port-switching"]
