FROM oven/bun:1 AS base
WORKDIR /app

RUN apt-get update && apt-get install -y \
  ca-certificates \
  fonts-liberation \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libdrm2 \
  libgbm1 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  xdg-utils \
  wget && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock turbo.json tsconfig.base.json tsconfig.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/core/package.json packages/core/package.json

RUN bun install

COPY apps/api apps/api
COPY packages/core packages/core

WORKDIR /app/apps/api
RUN bunx playwright install chromium

EXPOSE 3001
CMD ["bun", "src/server.ts"]
