# Grabby

Grabby is a URL-to-Markdown extractor. It renders pages with Playwright, extracts visible text and links, and returns a downloadable `.md` file.

## Architecture

- `apps/web`: static TypeScript + SCSS frontend
- `apps/api`: Fastify + Playwright scrape service
- `packages/core`: shared extraction and markdown conversion logic

## Local Setup

```bash
bun install
bun run dev
```

Web runs with Vite in `apps/web`, API runs on `http://localhost:3001`.

## Local Parity Mode (Recommended)

Use this mode to match production behavior: run frontend on host and API in Docker.

1. Copy env defaults:

```bash
cp .env.local.example .env.local
cp apps/web/.env.local.example apps/web/.env.local
```

2. Build and start API container:

```bash
bun run dev:api:docker:build
bun run dev:api:docker:up
```

3. Start frontend on host:

```bash
bun run dev:web
```

4. Validate:

```bash
curl http://localhost:3001/health
```

Then scrape from the web UI at `http://localhost:5173`.

### If port 3001 is busy

Set an alternate API port for Docker before startup:

```bash
API_PORT=3002 bun run dev:api:docker:up
```

And set `VITE_API_BASE_URL` to the same port in `apps/web/.env.local`.

## Host-Only Mode (Fallback)

```bash
bun run dev
```

Use this only for quick debugging. On some Windows hosts, Playwright can fail to launch bundled Chromium reliably due to local GPU/virtualization runtime behavior.

## Troubleshooting Parity Mode

- API unhealthy: rebuild and restart container.
  - `bun run dev:api:docker:down`
  - `bun run dev:api:docker:build`
  - `bun run dev:api:docker:up`
- Scrape failure: inspect container logs first.
  - `bun run dev:api:docker:logs`
- Keep acceptance validation in parity mode (Docker API), not host-only mode.

## Usage

1. Start the monorepo with `bun run dev`
2. Open the web app
3. Enter a URL and submit
4. Download the generated markdown

## Quality Commands

```bash
bun run typecheck
bun run lint
bun run test
bun run build
```

## Deployment

- Frontend: Netlify via `netlify.toml`
- API: Render via `render.yaml` and `apps/api/Dockerfile`

## Constraints

- Deterministic linear markdown output
- JS-heavy pages supported through headless rendering
- Business logic isolated to `packages/core`
