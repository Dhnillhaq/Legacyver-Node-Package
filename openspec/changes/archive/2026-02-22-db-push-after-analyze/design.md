## Context

Legacyver is a CLI npm package — it runs locally on the developer's machine, generates
markdown documentation, and writes it to `./legacyver-docs/`. The cloud sync feature
pushes these generated docs to a PostgreSQL database so a web dashboard can serve team
documentation without requiring file distribution.

The hackathon infrastructure provides a shared PostgreSQL database (`weci_holic` on
`103.185.52.138:1185`). The DB schema uses the `app` PostgreSQL schema namespace.

**Constraints:**
- Must not break existing behavior for unauthenticated users (analyze still works with no login)
- `pg` is the only viable PostgreSQL driver for Node.js (no ORM — keep it lightweight)
- DB credentials are hardcoded for the hackathon environment
- Auth is GitHub OAuth via the web app — CLI does NOT handle GitHub credentials directly

---

## Goals / Non-Goals

**Goals:**
- `legacyver login` → spawn local HTTP server → open browser to GitHub OAuth → receive token via callback → save `{ token, username, email }` to `~/.legacyver/session.json`
- `legacyver logout` → revoke token in `app.user_sessions` → delete `~/.legacyver/session.json`
- After `analyze` completes (Stage 5), if `session.token` present → validate token → upsert repo record → upsert documentation record → upsert each file's doc into `app.documentation_pages`
- `legacyver push [target]` → manually re-push existing docs from `legacyver-docs/` to DB
- Silently skip DB push if not logged in or token is invalid (no error, no interruption)
- On re-analyze, update existing `app.documentation_pages` rows (check-then-insert/update)

**Non-Goals:**
- Building the web app or GitHub OAuth endpoint (consumed, not built here)
- DB schema migrations (assumed tables already exist in hackathon DB under `app.*` namespace)
- Doc retrieval / reading from DB via CLI
- Multi-user or team collaboration features
- Encrypting the stored session token (plaintext file — acceptable for hackathon)

---

## Decisions

### 1. Auth via GitHub OAuth browser flow (not email/password POST)

**Decision:** `legacyver login` opens the system browser to `{WEB_URL}/cli-auth?code=<hex>&port=<port>`. A temporary local HTTP server on `127.0.0.1:<random_port>` receives the callback with `?token=...&username=...&email=...` after GitHub OAuth completes.

**Rationale:** Avoids CLI handling credentials directly. GitHub OAuth UX is familiar. Browser-based flow is consistent with how tools like `gh auth login` work.

**Login flow:**
```
legacyver login
  ├─ generate crypto.randomBytes(16).toString('hex') as code
  ├─ spawn http.createServer() on 127.0.0.1:0 (random port)
  ├─ open browser to {WEB_URL}/cli-auth?code={code}&port={port}
  ├─ display auth URL in terminal as fallback
  ├─ wait for GET /callback?token=T&username=U&email=E
  │   ├─ success → saveSession({token, username, email}) → close server
  │   └─ missing params → HTTP 400
  └─ timeout after 5 minutes → error
```

**Alternatives considered:**
- POST email/password to web API — requires CLI to handle credential input, more complex, less secure
- OS keychain (`keytar`) — adds native binary dependency, overkill for hackathon scope

---

### 2. Session stored in ~/.legacyver/session.json (not in conf config)

**Decision:** Store `{ token, username, email }` in `~/.legacyver/session.json` — separate from cosmiconfig `.legacyverrc` project config.

**Rationale:** Session is user-scoped, not project-scoped. Keeping it out of cosmiconfig prevents it from leaking into project-level config files that might be committed to git.

**Alternatives considered:**
- `conf@10.2.0` (was original plan) — added unnecessary abstraction layer; plain JSON is sufficient

---

### 3. Token validated via DB hash lookup on every push

**Decision:** Raw token is never sent to the DB. `validateToken(token)` SHA-256 hashes it and queries `app.user_sessions WHERE token_hash = $1 AND expires_at > NOW() AND revoked_at IS NULL`.

**Rationale:** Tokens stored in `session.json` should not be reusable if the DB session is revoked or expired. This provides server-side session control without requiring the CLI to manage expiry locally.

---

### 4. Three-level DB hierarchy: repositories → documentations → documentation_pages

**Decision:** `app.repositories` (one per project path per user) → `app.documentations` (one per repository) → `app.documentation_pages` (one per source file).

**Rationale:** The `documentations` layer exists because the web app likely shows a "documentation set" as a first-class entity (with title, description) rather than a flat list of files. This matches the existing DB schema established by the web team.

**Assumed schema key fields:**
```
app.repositories:        id (UUID), user_id (BIGINT), name (VARCHAR), full_name (VARCHAR)
app.documentations:      id (UUID), repository_id (UUID), title, description
app.documentation_pages: id (UUID), documentation_id (UUID), slug, title, content, page_order, created_at
```

---

### 5. legacyver push — manual re-push command

**Decision:** Add `legacyver push [target]` command that reads `.md` files from the docs output directory and calls `pushToDatabase()` directly.

**Rationale:** DB is sometimes down at the time of analyze. Users need a way to retry without re-running the full LLM pipeline. The push command is a simple wrapper: collect `.md` files → call `pushToDatabase()`.

**Flow:**
```
legacyver push [target] [--out <dir>]
  ├─ check session.token → exit 1 if not logged in
  ├─ check outDir exists → exit 1 if not found
  ├─ collectMarkdownFiles(outDir) → fragments[]
  ├─ check fragments.length > 0 → warn if empty
  ├─ spinner "Pushing docs to cloud..."
  ├─ pushToDatabase(fragments, targetDir)
  │   ├─ success → "Pushed N files to cloud"
  │   └─ skipped → "token may be invalid" → exit 1
  └─ error → "Push failed: <message>" → exit 1
```

---

### 6. Push is fire-and-forget in analyze, fatal in manual push

**Decision:** In the `analyze` command, DB push errors are downgraded to warnings (exit 0). In the `legacyver push` command, errors are fatal (exit 1).

**Rationale:** During analyze, the primary value is local docs. DB failure should not break the analyze UX. In manual push, the user's explicit intent is to push — if it fails, they need to know with a non-zero exit code.

---

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| DB credentials hardcoded in source | Acceptable for hackathon scope; `temp_credentials/` excluded via `.npmignore` |
| Local server port conflicts | `server.listen(0, ...)` lets OS assign a free port |
| Login timeout (user walks away) | 5-minute timeout with clear error message |
| Token expiry mid-session | `validateToken()` catches expired tokens and returns `null`; push silently skipped |
| `pg` pool not closed on process kill | `pool.end()` in finally block; pool reset to null after each push |
| Duplicate docs if full_name path changes | Acceptable for hackathon; path is the unique key |

---

## Migration Plan

1. Ensure `app.users`, `app.user_sessions`, `app.repositories`, `app.documentations`, `app.documentation_pages` tables exist in `weci_holic` DB (web team's responsibility)
2. Deploy new CLI version via `npm publish`
3. Users run `legacyver login` once → browser opens → GitHub OAuth → token stored
4. Subsequent `analyze` runs auto-push; users can also run `legacyver push` manually

No rollback needed — DB push is additive and non-breaking.
