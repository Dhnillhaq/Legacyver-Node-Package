## 1. Dependencies & Config

- [x] 1.1 Add `pg` (node-postgres) to `package.json` dependencies — run `npm install pg`
- [x] 1.2 Create `src/db/config.js` — exports hardcoded PostgreSQL connection config (`host`, `port`, `user`, `password`, `database`) from hackathon credentials
- [x] 1.3 Extend `src/utils/config.js` — add `loadSession()`, `saveSession()`, `clearSession()` functions that manage `~/.legacyver/session.json`

## 2. Database Client

- [x] 2.1 Create `src/db/index.js` — lazy singleton `pg.Pool` via `getPool()`; pool destroyed after each push call
- [x] 2.2 Add `getOrCreateRepo(pool, userId, projectPath)` — finds or creates `app.repositories` row by `(user_id, full_name)`; `name` = `path.basename(projectPath)`
- [x] 2.3 Add `getOrCreateDocumentation(pool, repositoryId, repoName)` — finds or creates `app.documentations` row by `repository_id`; intermediate layer between repo and pages
- [x] 2.4 Add `upsertPages(pool, documentationId, fragments)` — check-then-insert/update for each fragment in `app.documentation_pages` keyed by `(documentation_id, slug)`; returns count of processed pages
- [x] 2.5 Add `pushToDatabase(fragments, projectPath, opts?)` — top-level function: reads session from `~/.legacyver/session.json`, short-circuits if not logged in, validates token via `validateToken()`, calls `getOrCreateRepo → getOrCreateDocumentation → upsertPages`; returns `{ skipped: boolean, pushed?: number }`

## 3. Auth (Token Validation via DB)

- [x] 3.1 Create `src/api/auth.js` — exports `validateToken(token, opts?)`: SHA-256 hashes the raw token, queries `app.user_sessions JOIN app.users WHERE token_hash = $1 AND expires_at > NOW() AND revoked_at IS NULL`, returns `{ userId, username, email }` or `null`
- [x] 3.2 Add `revokeToken(token, opts?)` to `src/api/auth.js` — `UPDATE app.user_sessions SET revoked_at = NOW() WHERE token_hash = $1`

## 4. CLI Commands — Login / Logout

- [x] 4.1 Create `src/cli/commands/login.js` — GitHub OAuth browser flow: generate random hex code, spawn local HTTP server on random port, open browser to `{WEB_URL}/cli-auth?code=<hex>&port=<port>`, wait for `/callback?token=T&username=U&email=E`, save session, show success; timeout after 5 minutes
- [x] 4.2 Create `src/cli/commands/logout.js` — calls `revokeToken(session.token)` (swallows errors), then `clearSession()`; handles "not logged in" case
- [x] 4.3 Register `login` and `logout` commands in `bin/legacyver.js`

## 5. Analyze Command Integration (Stage 5)

- [x] 5.1 Modify `src/cli/commands/analyze.js` — after renderer, run Stage 5: check `session.token`, start spinner if logged in, call `pushToDatabase(allFragments, targetDir)` wrapped in try/catch
- [x] 5.2 On successful push: spinner shows "Docs synced to cloud (N files)"
- [x] 5.3 On skipped push (`result.skipped === true`): no output, continue silently; `printSummary()` shows cloud sync upgrade tip
- [x] 5.4 On push error: `logger.warn('Cloud sync failed: ' + syncErr.message)` and exit 0

## 6. Manual Push Command

- [x] 6.1 Create `src/cli/commands/push.js` — `legacyver push [target] --out <dir>`: check login, check output dir exists, collect `.md` files recursively, spinner "Pushing docs to cloud...", call `pushToDatabase()`, show result; exits 1 on not-logged-in / push failed / skipped; exits 0 on success
- [x] 6.2 Register `push` command in `bin/legacyver.js` with `[target]` positional arg and `--out` option

## 7. UI Updates

- [x] 7.1 Modify `src/cli/ui.js` `printSummary()` — when user is not logged in, show cloud sync tip: `legacyver login` to enable cloud sync
- [x] 7.2 Modify `src/cli/commands/providers.js` — add "Legacyver Account" section at the top showing login status (username/email if logged in, or "Not logged in" prompt)

## 8. Tests

- [x] 8.1 Add `test/db.test.js` — unit tests for `pushToDatabase()`: skips when no token, skips when `validateToken()` returns null, calls upsert when user valid, catches and returns error without throwing; mock `pg.Pool`
- [x] 8.2 Add `test/auth.test.js` — unit tests for `validateToken()`: mock `pg.Pool`, test valid token returns user, expired token returns null, revoked token returns null; test `revokeToken()` calls UPDATE
- [x] 8.3 Run full test suite `npx vitest run` — all existing tests must still pass (11/11 files, 121/121 tests)

## 9. Publish

- [x] 9.1 Run `npm login` if session has expired
- [x] 9.2 Bump version: `npm version patch --no-git-tag-version` (→ `2.1.9`)
- [x] 9.3 Run `npm publish` to release updated package
- [x] 9.4 Verify: `npm install -g legacyver` in a clean shell, run `legacyver login` (browser opens) + `legacyver analyze` → confirm "Docs synced to cloud", run `legacyver push` → confirm manual push works
