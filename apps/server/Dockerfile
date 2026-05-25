FROM node:22-alpine

# Cài pnpm 11.3.0
RUN corepack enable && corepack prepare pnpm@11.3.0 --activate

WORKDIR /app

# Copy lockfile + workspace để cache layer
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json ./apps/server/
COPY packages/engine/package.json ./packages/engine/

# Install deps cho server + engine (cả runtime tsx)
RUN pnpm install --frozen-lockfile --filter @co-ganh/server...

# Copy source. Server + engine đều TS — chạy bằng tsx runtime để
# tránh build step phức tạp (engine main trỏ thẳng src/index.ts).
COPY tsconfig.base.json ./
COPY packages/engine ./packages/engine
COPY apps/server ./apps/server

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["pnpm", "--filter", "@co-ganh/server", "exec", "tsx", "src/index.ts"]
