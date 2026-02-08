FROM oven/bun:alpine

WORKDIR /app

COPY api/package.json api/bun.lock* ./api/
RUN cd api && bun install --frozen-lockfile --production --ignore-scripts \
    && rm -rf ~/.bun/install/cache

COPY api/ ./api/

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

WORKDIR /app/api
CMD ["bun", "."]
