## ADDED Requirements

### Requirement: Generated docs upserted to app.documentation_pages after analyze
After `legacyver analyze` completes successfully and a valid session token is present,
the system SHALL push each generated documentation fragment to `app.documentation_pages`
using a check-then-insert-or-update strategy keyed on `(documentation_id, slug)`.

#### Scenario: First-time push for a project
- **WHEN** `legacyver analyze` completes and user is logged in
- **AND** no existing `app.documentation_pages` rows exist for this `documentation_id`
- **THEN** system inserts one row per fragment:
  ```
  INSERT INTO app.documentation_pages
    (documentation_id, slug, title, content, page_order)
    VALUES ($1, $2, $3, $4, $5)
  ```
  where `slug` = `relativePath` with backslashes converted to forward slashes,
  `title` = `path.basename(relativePath)`, `page_order` = 1-based index
- **THEN** prints "[done] Docs synced to cloud (N files)" where N = total pages processed

#### Scenario: Re-analyze updates existing docs
- **WHEN** `legacyver analyze` completes and user is logged in
- **AND** `app.documentation_pages` rows already exist for this `documentation_id` and `slug`
- **THEN** system finds the existing row by `SELECT id FROM app.documentation_pages WHERE documentation_id = $1 AND slug = $2`
- **AND** updates it:
  `UPDATE app.documentation_pages SET content = $1, title = $2, page_order = $3, created_at = NOW() WHERE id = $4`
- **AND** no duplicate rows are created
- **AND** count is still incremented for each updated row

#### Scenario: Partial re-analyze (incremental mode)
- **WHEN** `legacyver analyze --incremental` runs and only some files were re-generated
- **THEN** only the re-generated file fragments are passed to `upsertPages()`
- **AND** cached files that were not re-analyzed are NOT touched in `app.documentation_pages`

#### Scenario: User not logged in
- **WHEN** `legacyver analyze` completes and `loadSession()` returns no `token`
- **THEN** DB push is silently skipped
- **AND** no error or warning is shown
- **AND** `printSummary()` includes a cloud sync upgrade tip mentioning `legacyver login`

#### Scenario: Token invalid — push skipped silently
- **WHEN** `validateToken(session.token)` returns `null` (expired/revoked/not found)
- **THEN** `pushToDatabase()` returns `{ skipped: true }`
- **AND** no error is shown

#### Scenario: DB push fails
- **WHEN** the PostgreSQL connection fails during `upsertPages()` (network, DB down, constraint error)
- **THEN** the error propagates from `pushToDatabase()`
- **AND** the caller catches it and logs: "Cloud sync failed: <error.message>"
- **AND** command exits 0 (local docs were already written successfully)

---

### Requirement: pushToDatabase() returns structured result
`pushToDatabase(fragments, projectPath, opts?)` SHALL return a `Promise<{skipped: boolean, pushed?: number}>`.

#### Scenario: Not logged in
- **WHEN** `session.token` is falsy
- **THEN** returns `{ skipped: true }`

#### Scenario: Token invalid
- **WHEN** `validateToken()` returns null
- **THEN** returns `{ skipped: true }`

#### Scenario: Push successful
- **WHEN** all upserts complete without error
- **THEN** returns `{ skipped: false, pushed: N }` where N = number of pages processed by `upsertPages()`

---

### Requirement: Push is non-blocking and runs after local output is complete
The DB push step SHALL run only after all local output files have been written to disk.
It SHALL NOT block or affect the rendering step. The pool is created lazily and destroyed
after each push.

#### Scenario: Local output not affected by push failure
- **WHEN** `pushToDatabase()` throws an uncaught exception
- **THEN** the `legacyver-docs/` directory still contains all generated files
- **AND** the summary has already been printed

#### Scenario: Pool lifecycle
- **WHEN** `pushToDatabase()` is called
- **THEN** a `pg.Pool` is created (or reused from singleton)
- **AND** after push completes (success or error), `pool.end()` is called
- **AND** the singleton `_pool` reference is set to `null` after each call

---

### Requirement: Push progress shown to user
While pushing to the database, the system SHALL display a spinner. On completion, it SHALL
show the number of files synced.

#### Scenario: Spinner shown only when logged in
- **WHEN** `session.token` exists before push
- **THEN** spinner with text "Syncing docs to cloud..." starts
- **WHEN** push completes successfully
- **THEN** spinner shows "[done] Docs synced to cloud (N files)"

#### Scenario: No spinner when not logged in
- **WHEN** `session.token` is absent
- **THEN** no spinner is shown (push is skipped silently)
