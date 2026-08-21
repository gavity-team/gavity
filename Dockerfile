# syntax=docker/dockerfile:1

FROM oven/bun:1.4.0 AS build
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
RUN bun ci
COPY . .
RUN bun run build

FROM oven/bun:1.4.0
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.output ./.output
COPY --from=build /app/migrations ./migrations
EXPOSE 3000
CMD ["bun", "run", ".output/server/index.mjs"]
