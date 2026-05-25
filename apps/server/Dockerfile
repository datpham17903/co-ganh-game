FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@11.3.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json ./apps/server/
COPY packages/engine/package.json ./packages/engine/
RUN pnpm install --frozen-lockfile --filter @co-ganh/server... --prod=false

FROM deps AS build
COPY tsconfig.base.json ./
COPY packages/engine ./packages/engine
COPY apps/server ./apps/server
RUN pnpm --filter @co-ganh/server build

FROM base AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/engine/node_modules ./packages/engine/node_modules
COPY --from=deps /app/apps/server/node_modules ./apps/server/node_modules
COPY --from=build /app/packages/engine/src ./packages/engine/src
COPY --from=build /app/packages/engine/package.json ./packages/engine/
COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/apps/server/package.json ./apps/server/
EXPOSE 3001
CMD ["node", "apps/server/dist/index.js"]
