## ADDED Requirements

### Requirement: Repository record auto-resolved on push
When pushing generated docs to the database, the system SHALL automatically look up
or create a `repositories` row for the current project, matched by `(user_id, path)`.
No user input is required.

#### Scenario: Repository already exists
- **WHEN** a `repositories` row with matching `user_id` and `path` already exists in the DB
- **THEN** system reuses its `id` without inserting a new row
- **THEN** no error is thrown

#### Scenario: Repository does not exist yet
- **WHEN** no `repositories` row matches the current `user_id` and project `path`
- **THEN** system inserts a new row with `name` = basename of the project directory and the full `path`
- **THEN** uses the newly created row's `id` for subsequent doc inserts

#### Scenario: Database error during repo resolution
- **WHEN** the DB is unreachable or returns an error during repo lookup/insert
- **THEN** system logs a warning "DB push failed: <error message>"
- **THEN** analyze command exits 0 (DB failure does not abort the run)

### Requirement: Repository name derived from project directory
The `repositories.name` field SHALL be set to the basename of the analyzed project directory
(e.g., `/home/user/my-app` → name = `my-app`).

#### Scenario: Name derived correctly
- **WHEN** analyzed directory is `/home/user/projects/awesome-api`
- **THEN** `repositories.name` is set to `awesome-api`
