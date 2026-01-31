FROM oven/bun:1 AS builder

WORKDIR /app

COPY web/package.json web/bun.lock* ./web/
RUN cd web && bun install --frozen-lockfile

COPY web/ ./web/
RUN cd web && bun run build

FROM oven/bun:alpine

WORKDIR /app

COPY api/package.json api/bun.lock* ./api/
RUN cd api && bun install --frozen-lockfile --production --ignore-scripts \
    && rm -rf ~/.bun/install/cache

COPY api/ ./api/
COPY --from=builder /app/web/build ./web/build

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

WORKDIR /app/api
CMD ["bun", "."]
