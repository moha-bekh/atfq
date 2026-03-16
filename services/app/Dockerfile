FROM node:22-bookworm-slim AS base
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
  npm ci

FROM base AS dev
COPY . .
CMD ["npm", "run", "dev"]

FROM base AS builder
COPY . .
RUN npm run build

FROM nginxinc/nginx-unprivileged:alpine3.21-slim AS prod
WORKDIR /usr/share/nginx/html
COPY --from=builder /app/dist .
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
USER 101
ENV PORT=8080
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
