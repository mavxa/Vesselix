FROM oven/bun:1 AS frontend
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY index.html tsconfig*.json vite.config.ts tailwind.config.ts ./
COPY public ./public
COPY src ./src
RUN bun run build

FROM rust:1-bookworm AS backend
WORKDIR /app

COPY backend ./backend
COPY --from=frontend /app/dist ./dist
RUN cargo build --release --manifest-path backend/Cargo.toml

FROM debian:bookworm-slim AS runtime
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=backend /app/backend/target/release/vesselix /usr/local/bin/vesselix

EXPOSE 4747
ENTRYPOINT ["/usr/local/bin/vesselix", "--host", "0.0.0.0"]
