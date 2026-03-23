FROM node:22-bookworm-slim AS base
RUN apt-get update -y && apt-get install -y openssl \
		postgresql-client
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
RUN npm prune --production

FROM gcr.io/distroless/nodejs22-debian12 AS prod
WORKDIR /app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
USER 65532:65532
ENV PORT=8080
EXPOSE 8080
EXPOSE 50051
CMD ["dist/main.js"]
