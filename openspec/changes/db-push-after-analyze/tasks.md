## 1. Dependencies & Config

- [x] 1.1 Add `pg` (node-postgres) to `package.json` dependencies — run `npm install pg`
- [x] 1.2 Create `src/db/config.js` — exports hardcoded PostgreSQL connection config (`host`, `port`, `user`, `password`, `database`) from hackathon credentials
- [x] 1.3 Extend `src/utils/config.js` — add `sessionToken` and `userId` as supported config fields (default `null`)

## 2. Database Client

- [x] 2.1 Create `src/db/index.js` — exports a singleton `pg.Pool` using config from `src/db/config.js`
- [x] 2.2 Add `getOrCreateRepo(pool, userId, projectPath)` to `src/db/index.js` — finds or creates repo by (user_id, full_name)
- [x] 2.3 Add `upsertPages(pool, documentationId, fragments)` to `src/db/index.js` — upserts each file into `documentation_pages`
- [x] 2.4 Add `pushToDatabase(fragments, projectPath)` to `src/db/index.js` — top-level function: reads userId from session, short-circuits if not logged in, calls getOrCreateRepo → getOrCreateDocumentation → upsertPages

## 3. Auth (Direct DB)

- [x] 3.1 Create `src/api/auth.js` — exports `loginOrRegister(email, username)` that finds or creates user directly in PostgreSQL
- [x] 3.2 `loginOrRegister()` throws descriptive error if username is taken; `logoutUser()` sets login_status=false

## 4. CLI Commands — Login / Logout

- [x] 4.1 Create `src/cli/commands/login.js` — prompts for email and username, calls `loginOrRegister()`, saves userId/username/email to session
- [x] 4.2 Create `src/cli/commands/logout.js` — clears session, updates DB login_status
- [x] 4.3 Register `login` and `logout` commands in `bin/legacyver.js`

## 5. Analyze Command Integration

- [x] 5.1 Modify `src/cli/commands/analyze.js` — after renderer, call `pushToDatabase(allFragments, targetDir)` wrapped in try/catch
- [x] 5.2 On successful push: show spinner "Syncing docs to cloud..." then "[done] Docs synced to cloud (N files)"
- [x] 5.3 On skipped push (not logged in): no output, continue silently
- [x] 5.4 On push error: `logger.warn('Cloud sync failed: ' + err.message)` and continue — exit 0

## 6. UI / Upgrade Tip

- [x] 6.1 Modify `src/cli/ui.js` `printSummary()` — when user is not logged in, show cloud sync tip with `legacyver login`

## 7. Providers Command Update

- [x] 7.1 Modify `src/cli/commands/providers.js` — add a "Legacyver Account" section at the top: shows "Logged in" with username or "Not logged in"

## 8. Tests

- [ ] 8.1 Add `test/db.test.js` — unit tests for `pushToDatabase()`: skips when not logged in, calls upsert when logged in, catches and returns error without throwing
- [ ] 8.2 Add `test/auth.test.js` — unit tests for `loginOrRegister()`: mocks pg.Pool, tests find existing, create new, username taken
- [ ] 8.3 Run full test suite `npx vitest run` — all existing 110 tests must still pass

## 9. Publish

- [ ] 9.1 Run `npm login` if session has expired
- [ ] 9.2 Bump version: `npm version patch --no-git-tag-version` (→ `2.1.6`)
- [ ] 9.3 Run `npm publish` to release updated package
- [ ] 9.4 Verify: `npm install -g legacyver` in a clean shell, run `legacyver login` + `legacyver analyze` → confirm "Docs synced to cloud"
