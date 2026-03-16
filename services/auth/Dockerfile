FROM rust:1.94-bookworm AS planner
WORKDIR /app
RUN cargo install cargo-chef
COPY . .
RUN cargo chef prepare --recipe-path recipe.json

FROM rust:1.94-bookworm AS builder
WORKDIR /app
RUN cargo install cargo-chef
COPY --from=planner /app/recipe.json recipe.json
RUN --mount=type=cache,target=/usr/local/cargo/registry \
  --mount=type=cache,target=/app/target \
  cargo chef cook --release --recipe-path recipe.json
COPY . .
RUN --mount=type=cache,target=/usr/local/cargo/registry \
  --mount=type=cache,target=/app/target \
  RUSTFLAGS="-C relro=full -C bind_now=yes" \
  cargo build --release && \
  cp target/release/api-auth /app/auth

FROM rust:1.94-bookworm AS dev
WORKDIR /app
RUN cargo install cargo-watch
COPY . .
CMD ["cargo-watch", "-x", "run"]

FROM gcr.io/distroless/cc-debian12 AS prod
WORKDIR /app
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /app/api-auth /app/auth
USER 65532:65532
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["./api-auth"]
