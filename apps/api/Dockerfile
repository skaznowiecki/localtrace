FROM rust:1.85-bookworm AS builder

WORKDIR /app
COPY Cargo.toml Cargo.lock* ./
COPY apps ./apps
COPY packages ./packages

RUN cargo build --release -p api

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /app/target/release/api /app/api

ENV LT_DATABASE_PATH=/app/data/local-tracer.db
ENV LT_API_PORT=4318

EXPOSE 4318
CMD ["/app/api"]
