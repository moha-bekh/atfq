FROM node:20-bookworm-slim AS base
RUN apt-get update && \
  apt-get install -y --no-install-recommends curl && \
  rm -rf /var/lib/apt/lists/*
WORKDIR /app

FROM base AS deps
COPY package*.json ./
RUN --mount=type=cache,target=/app.npm \
  npm set cache /app.npm && \
  npm ci

FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 8083
ENV PORT=8083
CMD ["npm", "run", "dev"]

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS prod
ENV NODE_ENV=production
WORKDIR /app
RUN groupadd --system --gid 1001 atfq && \
  useradd --system --uid 1001 --gid atfq moha
# TODO:
# copy from static files
USER moha
ENV PORT=8080
EXPOSE 8080
CMD ["npm", "run", "start"]
