## Context

Legacyver is a CLI npm package — it runs locally on the developer's machine, generates markdown documentation, and writes it to `./legacyver-docs/`. Currently there is no persistence layer: results live only on disk and are not shareable through any central system.

The hackathon infrastructure provides a shared PostgreSQL database (`weci_holic` on `103.185.52.138:1185`). The goal is to push generated docs into this DB so a web dashboard can serve team documentation without requiring file distribution.

The DB schema is user-centric: `users` → `repositories` (FK user) → `generated_docs` (FK repository). The CLI must know *which user* is running it before it can push — hence a login step that stores a JWT/session token locally.

**Constraints:**
- Must not break existing behavior for unauthenticated users (analyze must still work with no login)
- `pg` is the only viable PostgreSQL driver for Node.js (no ORM — keep it lightweight)
- DB credentials are hardcoded for the hackathon environment
- The "Legacyver web API" for login is assumed to be a REST endpoint (to be built by the web team) — CLI must tolerate its absence gracefully

---

## Goals / Non-Goals

**Goals:**
- `legacyver login` → POST credentials to web API → store JWT + userId in local config
- `legacyver logout` → clear stored JWT + userId from local config
- After `analyze` completes, if JWT present → upsert repo record → upsert each file's doc into `generated_docs`
- Silently skip DB push if not logged in (no error, no interruption)
- On re-analyze, update existing `generated_docs` rows (no duplicates per repo+file path)

**Non-Goals:**
- Building the web API server (consumed, not built here)
- DB schema migrations (assumed tables already exist in hackathon DB)
- Doc retrieval / reading from DB via CLI
- Multi-user or team collaboration features
- Encrypting the stored JWT (stored in plain config file — acceptable for hackathon)

---

## Decisions

### 1. JWT stored in `conf` config file (not keychain/env)

**Decision:** Store `sessionToken` and `userId` as fields in the existing `conf`-managed config file (`~/.config/legacyver/config.json`).

**Rationale:** Legacyver already uses `conf@10.2.0` for storing API keys. Consistent approach, no new dependency. Acceptable security for a hackathon CLI tool.

**Alternatives considered:**
- OS keychain (`keytar`) — adds native binary dependency, overkill for hackathon scope
- Env var only — poor UX, user must re-set on every shell session

---

### 2. Push is fire-and-forget, non-blocking on error

**Decision:** DB push runs after `printSummary()`. If push fails (network, auth error, DB down), log a single warning and exit 0. Never fail the analyze run because of DB issues.

**Rationale:** The primary value of `legacyver analyze` is the local docs. DB push is a bonus. Breaking the analyze UX for a DB error would be unacceptable.

**Flow:**
```
analyze pipeline
  └─ Crawler
  └─ Parser
  └─ LLM Engine
  └─ Renderer → writes legacyver-docs/ to disk
  └─ printSummary()
  └─ pushToDatabase()   ← new, runs last, errors are caught and logged as warn
```

---

### 3. Upsert strategy: match on (repository_id, file_path)

**Decision:** Use PostgreSQL `INSERT ... ON CONFLICT (repository_id, file_path) DO UPDATE` to handle re-analyze runs.

**Rationale:** Avoids duplicate rows. The unique constraint on `(repository_id, file_path)` is the natural key for a "one doc per file per repo" model.

**Assumed `generated_docs` schema:**
```sql
generated_docs (
  id            SERIAL PRIMARY KEY,
  repository_id INTEGER NOT NULL REFERENCES repositories(id),
  file_path     VARCHAR NOT NULL,
  content       TEXT NOT NULL,
  generated_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE (repository_id, file_path)
)
```

---

### 4. Repository resolved by absolute project path

**Decision:** When pushing, use the absolute path of the analyzed directory (`process.cwd()` or the `--dir` arg) as the `path` field to look up or create a `repositories` row.

**Rationale:** Simple, deterministic, requires no user input. On re-analyze from the same directory, the same repo row is reused.

**Assumed `repositories` schema:**
```sql
repositories (
  id      SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name    VARCHAR NOT NULL,   -- basename of the project directory
  path    VARCHAR NOT NULL,
  UNIQUE (user_id, path)
)
```

---

### 5. Login talks to web API via native `fetch`

**Decision:** `src/api/auth.js` uses native `fetch` (Node 18+), consistent with all existing LLM provider code. No axios or got.

**Login flow:**
```
legacyver login
  ├─ prompt: email + password (hidden input via readline)
  ├─ POST /api/auth/login { email, password }
  ├─ 200 → { token, userId } → saved to config
  └─ non-200 → print error, exit 1
```

---

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| Web API not yet built | `pushToDatabase()` checks for token but also wraps entire push in try/catch; if API is down or token invalid, warn and continue |
| DB credentials hardcoded in source | Acceptable for hackathon scope; note in README that production would use env vars |
| `pg` adds ~700 kB to npm package | Acceptable; add to `.npmignore` exclusions review |
| Duplicate repos if path changes (rename/move) | Acceptable for hackathon; path is the repo key |
| Token expiry mid-session | DB push will get a 401 from DB or API; caught, user warned to `legacyver login` again |

---

## Migration Plan

1. Ensure `users`, `repositories`, `generated_docs` tables exist in `weci_holic` DB (web team's responsibility)
2. `npm install pg` → add to `package.json` dependencies
3. Deploy new CLI version via `npm publish`
4. Users run `legacyver login` once → subsequent `analyze` runs auto-push

No rollback needed — DB push is additive and non-breaking.

---

## Open Questions

- What is the exact URL of the web login API endpoint? (placeholder: `https://legacyver.hackathon.sev-2.com/api/auth/login`)
- Does the `repositories` table have a `name` column or just `path`? (design assumes both)
- Should `generated_docs` store the full markdown or a structured JSON blob? (design assumes full markdown `TEXT`)
