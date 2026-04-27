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
  RUSTFLAGS="-C link-arg=-Wl,-z,relro -C link-arg=-Wl,-z,now" \
  cargo build --release && \
  cp target/release/api-gateway /app/gateway
# RUSTFLAGS="-C relro=full -C bind_now=yes" \

FROM rust:1.94-bookworm AS dev
WORKDIR /app
RUN apt-get update && apt-get install -y protobuf-compiler libprotobuf-dev
RUN cargo install cargo-watch
COPY . .
CMD ["cargo-watch", "-x", "run"]

FROM gcr.io/distroless/cc-debian12 AS prod
WORKDIR /app
RUN apt-get update && apt-get install -y protobuf-compiler libprotobuf-dev
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=builder /app/gateway /app/gateway
USER 65532:65532
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["./gateway"]
