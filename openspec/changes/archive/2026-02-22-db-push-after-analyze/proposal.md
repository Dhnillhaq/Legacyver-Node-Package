## Why

Legacyver generates documentation locally with no persistence — every result lives only
on the user's machine and disappears when re-analyzed. By pushing generated docs to a
central PostgreSQL database (keyed by authenticated user + repository), teams can share,
browse, and version their documentation through a web dashboard without manual file
management.

## What Changes

- Add `legacyver login` command: opens the system browser to the Legacyver web app
  GitHub OAuth page, spawns a temporary local HTTP callback server, and on success stores
  `{ token, username, email }` in `~/.legacyver/session.json`
- Add `legacyver logout` command: revokes the session token in `app.user_sessions` and
  deletes `~/.legacyver/session.json`
- After `legacyver analyze` completes successfully (Stage 5 of the pipeline), auto-push
  the generated docs to the database if a valid session token exists
- If no valid session token is found, analyze still runs normally — push is silently
  skipped (no breaking change)
- Add `legacyver push [target]` command: manually re-push existing generated docs from
  `./legacyver-docs/` to the DB (useful when DB was down during analyze)
- New `src/db/` module handles all PostgreSQL interactions via `pg` driver
- New `src/api/auth.js` handles token validation (`validateToken()`) and revocation
  (`revokeToken()`) via direct DB queries (not HTTP API calls)
- DB schema: `app.users` → `app.user_sessions`, `app.repositories` → `app.documentations`
  → `app.documentation_pages`
- Each file's generated markdown is stored as a separate row in `app.documentation_pages`
  keyed by `(documentation_id, slug)`
- On re-analyze, existing pages are updated (check-then-insert/update), not duplicated

## Capabilities

### New Capabilities

- `user-auth-login`: GitHub OAuth browser flow — CLI opens browser, receives token via local HTTP callback; session stored in `~/.legacyver/session.json`; gates DB push
- `repo-management`: Auto-create or resolve `app.repositories` + `app.documentations` records for the current project path when pushing docs
- `generated-docs-storage`: After analyze (Stage 5), upsert each file's generated markdown into `app.documentation_pages`, linked to documentation and repository
- `manual-push`: `legacyver push [target]` — re-push existing generated docs from `legacyver-docs/` to DB without re-running the full pipeline

### Modified Capabilities

- `core`: `analyze` command extended to 5 stages — Stage 5 (Cloud Sync) runs after renderer; non-breaking when unauthenticated or when token is invalid

## Impact

- **New dependency**: `pg` (node-postgres) for PostgreSQL client — already added
- **New source files**: `src/db/index.js`, `src/db/config.js`, `src/api/auth.js`, `src/cli/commands/login.js`, `src/cli/commands/logout.js`, `src/cli/commands/push.js`
- **Modified**: `src/cli/commands/analyze.js` — Stage 5 Cloud Sync after renderer
- **Modified**: `src/utils/config.js` — `loadSession()`, `saveSession()`, `clearSession()` for `~/.legacyver/session.json`
- **Modified**: `src/cli/commands/providers.js` — "Legacyver Account" section at top
- **Modified**: `bin/legacyver.js` — registers `login`, `logout`, `push` commands
- **DB connection**: hardcoded to hackathon PostgreSQL (`103.185.52.138:1185`, db `weci_holic`, schema `app`) — credentials in `src/db/config.js`
- **No breaking changes**: all existing behavior preserved when user is not logged in
