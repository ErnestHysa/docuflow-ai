# Multi-stage Dockerfile for DocuFlow AI

FROM node:20-alpine AS base
WORKDIR /app

# Dependencies stage
FROM base AS deps
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
RUN corepack enable pnpm && pnpm i --frozen-lockfile

# Build stage
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN corepack enable pnpm
RUN pnpm build

# Production stage for CLI
FROM base AS cli-production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/packages/cli ./packages/cli
COPY --from=build /app/packages/core ./packages/core
COPY --from=build /app/packages/parser-express ./packages/parser-express
COPY --from=build /app/packages/parser-fastify ./packages/parser-fastify
COPY --from=build /app/packages/parser-nest ./packages/parser-nest
COPY --from=build /app/packages/storage ./packages/storage
ENV PATH="/app/packages/cli/dist:${PATH}"
ENTRYPOINT ["node", "/app/packages/cli/dist/index.js"]

# Production stage for Web UI
FROM base AS ui-production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/packages/ui ./packages/ui
COPY --from=build /app/packages/core ./packages/core
WORKDIR /app/packages/ui
RUN npx next export
FROM nginx:alpine
COPY --from=ui-production /app/packages/ui/out /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# Full production image with both CLI and UI
FROM base AS full-production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
ENV PATH="/app/packages/cli/dist:${PATH}"
EXPOSE 3000
WORKDIR /app/packages/ui
CMD ["node", "node_modules/.bin/next", "start"]
