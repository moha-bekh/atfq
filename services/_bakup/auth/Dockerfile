FROM rust:1.94-bookworm AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
  libssl-dev \
  pkg-config \
  xz-utils \
  curl \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY Cargo.toml Cargo.lock ./
RUN mkdir src && echo "fn main() {}" > src/main.rs && \
  cargo build --release && \
  rm -rf src
FROM base AS dev
RUN ARCH=$(uname -m) && \
  if [ "$ARCH" = "x86_64" ]; then REL_ARCH="x86_64-unknown-linux-gnu"; else REL_ARCH="aarch64-unknown-linux-gnu"; fi && \
  curl -L "https://github.com/watchexec/cargo-watch/releases/download/v8.4.1/cargo-watch-v8.4.1-${REL_ARCH}.tar.xz" | tar -xJ --strip-components=1 -C /usr/local/bin
COPY . .
CMD ["cargo-watch", "-x", "run", "--ignore", "/vault/secrets/config"]

FROM base AS build
COPY --from=deps /app/target ./target
COPY --from=deps /app/Cargo.lock ./Cargo.lock
COPY . .
RUN cargo build --release

FROM debian:bookworm-slim AS prod
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  libssl3 \
  && rm -rf /var/lib/apt/lists/*
RUN groupadd --system --gid 1001 atfq && \
  useradd --system --uid 1001 --gid atfq moha
COPY --from=build /app/target/release/auth ./auth
USER moha
ENV PORT=8080
EXPOSE 8080
CMD ["./auth"]
