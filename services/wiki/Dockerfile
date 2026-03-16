FROM golang:1.26-alpine AS base
WORKDIR /app
RUN apk add --no-cache ca-certificates git
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
  go mod download

FROM base AS dev
RUN go install github.com/air-verse/air@latest && \
  go install github.com/go-delve/delve/cmd/dlv@latest
COPY . .
CMD ["air", "-c", ".air.toml"]

FROM base AS builder
COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
  --mount=type=cache,target=/root/.cache/go-build \
  CGO_ENABLED=0 GOOS=linux go build \
  -ldflags="-s -w" \
  -o /app/api-user .

FROM scratch AS prod
# RUN go build \
#   -ldflags="-linkmode external -extldflags -static" \
#   -tags netgo \
#   -o healthcheck \
#   ./healthcheck/healthcheck.go
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
WORKDIR /app
COPY --from=builder /app/api-user /api-user
USER 65532:65532
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["./api-user"]
