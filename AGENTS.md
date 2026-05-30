# Repository Guidelines

## Project Structure & Module Organization

The Cloudflare Worker backend lives in `src/`, with the request entry point in `src/index.ts`, session logic in `src/sessionManager.ts`, and shared schemas under `src/schemas/`. Backend unit tests reside in `test/`, mirroring the source module names. The Vite-powered React client sits in `client/`; component modules are organized by feature in `client/src/components/`, while integration-style tests live in `client/src/test/`. SQL schemas (`schema.sql`, `sessions_schema.sql`) and helper scripts (`scripts/`, `setup-*.sh`) support local data setup.

## Build, Test, and Development Commands

- `npm run dev` — spins up the worker (`wrangler dev`) and client dev server concurrently; requires `OPENROUTER_API_KEY` in your shell.
- `npm run build` — produces the client bundle and worker artifacts for deployment.
- `npm test` — runs backend Vitest suites then the client Vitest suites; run this before every commit.
- `npm run test:coverage` — gathers coverage for both tiers; expect Istanbul reports under `coverage/` and `client/coverage/`.
- `npm run lint` / `npm run format:check` — verify ESLint and Prettier compliance without mutating files.

## Coding Style & Naming Conventions

Indent with 4 spaces. Prettier (`.prettierrc` defaults) enforces formatting; run `npm run format` when fixing drift. TypeScript is the default language, and modules should export typed interfaces from `src/types.ts` or colocated `types/`. Use PascalCase for React component files (`client/src/components/TTSControls.tsx`) and camelCase for utility modules (`src/utils/*`).

## Testing Guidelines

Vitest drives both backend (`test/*.test.ts`) and frontend (`client/src/test/*.test.tsx`) suites. Mirror the source file path when naming new tests to ease discovery. Target coverage of session flows, queueing logic, and any Cloudflare Worker bindings; add regression tests whenever introducing SQL migrations.

## Commit & Pull Request Guidelines

Adopt imperative, present-tense subject lines (`Add clear button to Input component`) and keep them under 72 characters, matching the existing history. Every PR should include a concise summary, links to the tracked issue, screenshots for visible UI updates, and a checklist of commands run (at minimum `npm test`). Request review whenever modifying auth, session management, or deployment scripts.

## Environment & Secrets

Export `OPENROUTER_API_KEY` before running `npm run dev` or backend tests that touch the OpenRouter gateway, e.g. `export OPENROUTER_API_KEY=...`. Use `.env.local` (ignored by git) to persist secrets for the client dev server, and avoid committing changes to `wrangler.toml` variables without confirming staging values.
