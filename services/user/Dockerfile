FROM node:22-bookworm-slim AS base
RUN apt-get update -y && apt-get install -y openssl \
		postgresql-client
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
ENV DATABASE_URL="postgresql://dummy:dummy@localhost/dummy"
RUN --mount=type=cache,target=/root/.npm \
			npm ci

FROM base AS dev
COPY . .
CMD ["npm", "run", "dev"]

FROM base AS builder
COPY . .
RUN npm run build
RUN npm prune --production

FROM node:22-bookworm-slim AS prod
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma/
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/src/proto ./src/proto/
USER node
ENV PORT=8080
EXPOSE 8080
EXPOSE 50051
CMD ["sh", "-c", "npm run start"]
