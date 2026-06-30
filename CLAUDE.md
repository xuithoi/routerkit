# RouterKit Agent Guide

This file is the first stop for Claude, Codex, and other coding agents working in this repository.

## Project Shape

RouterKit is an ESM Node.js AI proxy/gateway SDK. It can run as a local proxy with a dashboard, or be embedded by another app as an app-owned gateway.

Important entry points:

- `src/index.js`: public package exports.
- `bin/cli.js`: CLI entry point for `routerkit`, `npm start`, and `npm run dev`.
- `src/services/proxy.js`: OpenAI-compatible proxy, dashboard API, OAuth start/status routes, provider routing, request logging.
- `src/services/gateway.js`: embedded gateway factory and status helpers.
- `src/services/capabilities.js`: provider readiness/status reporting.
- `src/services/gemini-code-assist.js`: Gemini Code Assist request/response adapter.
- `src/services/translator.js`: OpenAI, Anthropic, and Gemini format translation.
- `src/services/db.js`: local JSON persistence in `~/.routerkit/db.json`.
- `src/dashboard/*`: bundled dashboard served by the proxy.
- `web/*`: separate web frontend prototype/assets.

## Commands

Use these commands from the repository root:

```bash
npm install
npm run dev
npm start
npm test
```

Notes:

- `npm run dev` starts the proxy on port `20128` and opens the dashboard.
- `npm start` runs `node bin/cli.js`.
- `npm test` currently runs `test.js`, an interactive OAuth smoke runner. It is not a non-interactive unit test suite.
- For doc-only changes, verify with `git diff --check` and inspect the rendered Markdown.
- For source changes, run at least `node --check` on modified `.js` files when a full automated test is not available.

## Coding Rules

- Keep the package ESM-native. Use `import`/`export`, include `.js` extensions in relative imports, and avoid CommonJS.
- Prefer small provider adapters over adding provider-specific branches everywhere.
- Keep public exports in `src/index.js` in sync with any new reusable service or helper.
- Do not introduce a build step unless a task explicitly requires it.
- Do not add framework-heavy dependencies for small HTTP, OAuth, or formatting changes.
- Keep dashboard routes and API response shapes backward compatible unless the task is explicitly a breaking change.
- Preserve CLI flags:
  - `--port`
  - `--host`
  - `--public-base-url`
  - `--no-rtk`

## Gateway Design Rules

- Do not hardcode localhost-only assumptions in reusable gateway logic. Defaults may use `127.0.0.1`, but config must support `host`, `port`, and `publicBaseUrl`.
- Keep embedded gateway APIs reusable by desktop apps. Do not require users to run a separate CLI when a library call can provide the same behavior.
- Provider readiness must separate account connection from inference capability.
- Gemini SSO must use the Code Assist route, not the public Generative Language API with a browser OAuth token.
- Custom or third-party API providers must be labeled as custom/unverified. Do not present reseller/proxy routes as official providers.

## Security Rules

- Never commit real tokens, API keys, OAuth codes, refresh tokens, cookies, or local database files.
- Treat `~/.routerkit/db.json` as local private state. Do not read it unless the task explicitly requires local debugging, and never paste secrets into commits or logs.
- Strip or redact tokens in dashboard/API responses. `src/services/proxy.js` already removes `tokens` from `/api/connections`; preserve that behavior.
- Do not add bundled third-party API proxy keys.
- Be careful with OAuth client IDs/secrets already present in provider implementations. Do not rotate, replace, or expand them without a focused task.

## Documentation Rules

- Keep README examples copy-pasteable.
- When adding a new public export, update README or this file if an agent/developer needs to know how to use it.
- If a feature is experimental, say so directly instead of implying production readiness.
- Avoid documenting behavior that is not implemented.

## Review Checklist Before Commit

1. `git status --short` shows only intended files.
2. `git diff --check` has no whitespace errors.
3. Modified JavaScript files pass `node --check <file>`.
4. New exports are present in `src/index.js` when they are meant to be public.
5. README or `CLAUDE.md` is updated for developer-facing behavior.
6. No secrets or local data paths are committed.

## Pull Request Notes

Use small PRs with one purpose:

- Feature PRs should explain the user-facing behavior and the provider/gateway route affected.
- Fix PRs should include the broken state, root cause, and verification performed.
- Docs PRs should mention whether source behavior changed. If source did not change, say so.
