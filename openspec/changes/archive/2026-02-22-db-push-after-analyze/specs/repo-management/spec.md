## ADDED Requirements

### Requirement: Repository record auto-resolved on push
When pushing generated docs to the database, the system SHALL automatically look up
or create an `app.repositories` row for the current project, matched by `(user_id, full_name)`
where `full_name` = absolute path of the analyzed directory. No user input is required.

#### Scenario: Repository already exists
- **WHEN** an `app.repositories` row with matching `user_id` and `full_name` already exists
- **THEN** system queries `SELECT id FROM app.repositories WHERE user_id = $1 AND full_name = $2`
- **AND** reuses its `id` without inserting a new row
- **AND** no error is thrown

#### Scenario: Repository does not exist yet
- **WHEN** no `app.repositories` row matches the current `user_id` and `full_name`
- **THEN** system inserts:
  `INSERT INTO app.repositories (user_id, name, full_name) VALUES ($1, $2, $3) RETURNING id`
  where `name` = `path.basename(projectPath)` and `full_name` = absolute project path
- **AND** uses the newly created row's `id` for subsequent documentation operations

#### Scenario: Database error during repo resolution
- **WHEN** the DB is unreachable or returns an error during repo lookup/insert
- **THEN** `pushToDatabase()` propagates the error upward
- **AND** the caller (analyze or push command) logs: "Cloud sync failed: <error message>"
- **AND** analyze command exits 0 (DB failure does not abort the run)

---

### Requirement: Repository name derived from project directory basename
The `app.repositories.name` field SHALL be set to `path.basename(projectPath)` and
`full_name` SHALL be the full absolute path.

#### Scenario: Name derived correctly
- **WHEN** analyzed directory is `/home/user/projects/awesome-api`
- **THEN** `app.repositories.name` is set to `awesome-api`
- **AND** `app.repositories.full_name` is set to `/home/user/projects/awesome-api`

---

### Requirement: Documentation record auto-resolved per repository
For each repository, the system SHALL ensure exactly one `app.documentations` record exists.
This is an intermediate layer between `app.repositories` and `app.documentation_pages`.

#### Scenario: Documentation record already exists
- **WHEN** `getOrCreateDocumentation(pool, repositoryId, repoName)` is called
- **AND** `SELECT id FROM app.documentations WHERE repository_id = $1` returns a row
- **THEN** system reuses the existing `id`

#### Scenario: Documentation record created for new repository
- **WHEN** no `app.documentations` row exists for the given `repository_id`
- **THEN** system inserts:
  `INSERT INTO app.documentations (repository_id, title, description) VALUES ($1, $2, $3) RETURNING id`
  where `title` = `"<repoName> Documentation"` and `description` = `"Auto-generated documentation for <repoName>"`
- **AND** uses the new `id` to associate documentation pages

---

### Requirement: Full DB schema for cloud sync
The cloud sync module uses the following PostgreSQL schema under the `app` namespace:

```sql
-- Users (managed by web app)
app.users (
  id        BIGSERIAL PRIMARY KEY,
  username  VARCHAR NOT NULL,
  email     VARCHAR NOT NULL
)

-- CLI session tokens
app.user_sessions (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES app.users(id),
  token_hash  VARCHAR NOT NULL UNIQUE,  -- SHA-256 of raw token
  expires_at  TIMESTAMP NOT NULL,
  revoked_at  TIMESTAMP
)

-- One per analyzed project per user
app.repositories (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id   BIGINT NOT NULL REFERENCES app.users(id),
  name      VARCHAR NOT NULL,     -- basename of project dir
  full_name VARCHAR NOT NULL,     -- absolute path
  UNIQUE (user_id, full_name)
)

-- One per repository
app.documentations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES app.repositories(id),
  title         VARCHAR NOT NULL,
  description   TEXT
)

-- One row per source file per documentation
app.documentation_pages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  documentation_id UUID NOT NULL REFERENCES app.documentations(id),
  slug             VARCHAR NOT NULL,   -- relative file path, forward-slashes
  title            VARCHAR NOT NULL,   -- basename of file
  content          TEXT NOT NULL,      -- full markdown content
  page_order       INTEGER,
  created_at       TIMESTAMP DEFAULT NOW()
)
```

#### Scenario: Schema constraint compliance
- **WHEN** `upsertPages()` is called
- **THEN** each page's `slug` SHALL use forward-slash separators (Windows backslashes converted)
- **AND** `title` SHALL be `path.basename(relativePath)`
- **AND** `page_order` SHALL be the 1-based index of the fragment in the array
