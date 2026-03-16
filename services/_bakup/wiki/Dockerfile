FROM golang:1.19-bullseye AS base
WORKDIR /app 
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
  --mount=type=cache,target=/root/.cache/go-build \
  go mod download

FROM base AS dev
RUN go install github.com/cosmtrek/air@latest && \
  go install github.com/go-delve/delve/cmd/dlv@latest
COPY . .
CMD ["air", "-c", ".air.toml"]
FROM base AS prod
RUN useradd -u 1001 nonroot
COPY . .
RUN go build \
  -ldflags="-linkmode external -extldflags -static" \
  -tags netgo \
  -o api-user

FROM scratch
WORKDIR /
COPY --from=build-production /etc/passwd /etc/passwd
COPY --from=build-production /app/api-user api-user
USER nonroot
ENV PORT=8080
EXPOSE 8080
CMD ["/api-user"]

