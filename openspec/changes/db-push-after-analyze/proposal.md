## Why

Legacyver currently generates documentation locally with no persistence — every result lives only on the user's machine and disappears when re-analyzed. By pushing generated docs to a central PostgreSQL database (keyed by authenticated user + repository), teams can share, browse, and version their documentation through a web dashboard without manual file management.

## What Changes

- Add `legacyver login` command: authenticates user against the Legacyver web API and stores a JWT session token locally in the config
- Add `legacyver logout` command: clears the stored session token
- After `legacyver analyze` completes successfully, auto-push the generated docs to the database if a valid session token exists
- If no session token is found, analyze still runs normally — push is silently skipped (no breaking change)
- New `src/db/` module handles all PostgreSQL interactions (pg driver, connection pooling)
- New `src/api/auth.js` handles login/logout HTTP calls to the Legacyver web API
- DB schema: `users` → `repositories` (FK user) → `generated_docs` (FK repository)
- Each file's generated markdown is stored as a separate row in `generated_docs`
- On re-analyze, existing docs for the same repo+file path are upserted (not duplicated)

## Capabilities

### New Capabilities

- `user-auth-login`: CLI login/logout flow — user authenticates via web API, JWT stored in local config; gates DB push
- `repo-management`: Auto-create or resolve a `repositories` record for the current project path when pushing docs
- `generated-docs-storage`: After analyze, upsert each file's generated markdown into `generated_docs` table, linked to repo and user

### Modified Capabilities

- `core`: `analyze` command extended — after successful doc generation, triggers DB push if authenticated (non-breaking; no change to existing behavior when unauthenticated)

## Impact

- **New dependency**: `pg` (node-postgres) for PostgreSQL client
- **New source files**: `src/db/index.js`, `src/db/schema.js`, `src/api/auth.js`, `src/cli/commands/login.js`, `src/cli/commands/logout.js`
- **Modified**: `src/cli/commands/analyze.js` — calls `db/push` after successful render step
- **Modified**: `src/utils/config.js` — stores `sessionToken`, `userId` in config
- **Modified**: `bin/legacyver.js` — registers `login` and `logout` commands
- **DB connection**: hardcoded to hackathon PostgreSQL (`103.185.52.138:1185`, db `weci_holic`) — credentials in `src/db/config.js`
- **No breaking changes**: all existing behavior preserved when user is not logged in
