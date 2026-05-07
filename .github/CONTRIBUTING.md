Create an issue of what you want to work on, then it would be approved to you, if it is not already being worked on.

# Contributing to Grabby

This project uses a fork-and-PR workflow against the `dev` branch. Keep changes small, intentional, and aligned with the repository architecture.

## Contribution Flow

1. Open an issue describing the bug, feature, or improvement you want to work on.
2. Wait until the issue is approved and confirmed as unassigned.
3. Fork the repository.
4. Create your branch from `dev`.
5. Make your changes with focused commits.
6. Run the required checks locally.
7. Open a pull request from your fork into `dev` and complete the repository PR template.

Do not open direct pull requests to `main` unless a maintainer explicitly asks for that.

Use the repository PR template for every contribution. It covers what changed, why it changed, testing status, access instructions, and proof of work where relevant.

## Local Setup

This repository is a Bun-based Turborepo monorepo.

### Requirements

- Bun
- Docker, for local API parity mode

### Install dependencies

```bash
bun install
```

### Configure environment files

```bash
cp .env.local.example .env.local
cp apps/web/.env.local.example apps/web/.env.local
```

### Recommended local run mode

Run the frontend on the host and the API in Docker:

```bash
bun run dev:api:docker:build
bun run dev:api:docker:up
bun run dev:web
```

API health check:

```bash
curl http://localhost:3001/health
```

### Host-only fallback

For quick debugging only:

```bash
bun run dev
```

## Package Manager Policy

This repository uses `bun` strictly.

- Use `bun install` to install dependencies.
- Use `bun run <script>` to run scripts.
- Do not use `npm`, `pnpm`, or `yarn` in this repository.
- Do not commit `package-lock.json`, `pnpm-lock.yaml`, or `yarn.lock`.

If you accidentally use another package manager:

1. Remove any lockfile it generated.
2. Remove any package-manager-specific metadata it added.
3. Reinstall with `bun install`.
4. Make sure only `bun.lock` remains as the lockfile.

## Project Structure

The repository is intentionally split by responsibility:

- `apps/web`: static frontend built with Vite, TypeScript, and SCSS
- `apps/api`: Fastify + Playwright scraping service
- `packages/core`: shared extraction and markdown logic

Keep that separation intact:

- Do not move business logic into `apps/web`.
- Keep extraction and markdown logic inside `packages/core`.
- Treat `apps/api` as orchestration around scraping, validation, and response handling.

## File Naming Rules

- Use `kebab-case` for files and folders.
- Exception: hooks may use `useSomething.ts`.
- Use descriptive names. Avoid vague names like `helper.ts`, `stuff.ts`, or `temp.ts`.
- Keep related files colocated.
- Avoid nesting deeper than necessary.

## Page and UI Structure

When working in `apps/web`:

- Keep pages static-first and accessible.
- Use semantic HTML structure.
- Keep behavior in `src/`.
- Keep styling in `styles/`.
- Use SCSS partials and shared structure instead of one-off styles.
- Prefer shared tokens, mixins, base styles, components, and utilities over duplication.
- Do not add inline styles unless a maintainer explicitly approves it.

Current SCSS structure:

- `styles/base`
- `styles/components`
- `styles/utilities`
- `styles/mixins`

If you add a new page or major UI section, structure it so that:

- markup remains semantic and easy to scan
- styling is added to the appropriate SCSS partials
- reusable patterns are extracted instead of duplicated
- icons remain consistent with the project's existing Iconify usage

## Coding Guidelines

- Follow the existing TypeScript strictness.
- Prefer small, pure functions.
- Keep changes consistent with the existing architecture.
- Avoid one-off patterns that bypass shared workspace conventions.
- Update all affected places when a shared behavior changes.

## Before Opening a Pull Request

Run the relevant checks from the repository root:

```bash
bun run typecheck
bun run lint
bun run test
bun run build
bun run format:check
```

If your change is narrow, you may run package-level checks while iterating, but the full root checks should pass before you open a PR.

## Commit Guidelines

- Commit only work related to your issue.
- Use clear, imperative commit messages.
- Keep commits focused instead of mixing unrelated concerns.
- Squash noisy fixup commits before review if needed.

Examples:

- `fix api scrape timeout handling`
- `add markdown preview empty state`
- `refactor core extraction normalization`

## Files You Must Not Commit

Before pushing, remove any accidental staged files that can compromise repository integrity or create noisy diffs:

- `.env.local`
- `apps/web/.env.local`
- `node_modules/`
- `dist/`
- `coverage/`
- `.turbo/`
- temporary logs
- machine-specific editor files
- lockfiles from package managers other than Bun

If a generated or local-only file is staged by mistake, unstage it before committing.

## Pull Request Expectations

- Reference the approved issue.
- Explain what changed and why.
- Keep the PR scoped to one concern.
- Call out any environment, deployment, or workflow changes explicitly.
- Include screenshots or short recordings for UI changes when relevant.

## Maintainer Review Notes

Pull requests may be closed or asked to change if they:

- skip the issue approval flow
- target the wrong base branch
- introduce unrelated refactors
- use a package manager other than Bun
- break the repo's workspace separation
- include generated, local, or sensitive files
