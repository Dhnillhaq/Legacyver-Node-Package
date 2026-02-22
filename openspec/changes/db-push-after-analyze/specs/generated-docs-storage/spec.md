## ADDED Requirements

### Requirement: Generated docs upserted to database after analyze
After `legacyver analyze` completes successfully and a valid session token is present in
config, the system SHALL push each generated documentation fragment to the `generated_docs`
table in PostgreSQL using an upsert (INSERT ... ON CONFLICT DO UPDATE).

#### Scenario: First-time push for a project
- **WHEN** `legacyver analyze` completes and user is logged in
- **AND** no existing `generated_docs` rows exist for this repository
- **THEN** system inserts one row per file into `generated_docs` with `repository_id`, `file_path`, `content`, and `generated_at = NOW()`
- **THEN** prints "Docs synced to cloud (N files)" where N = number of files pushed

#### Scenario: Re-analyze updates existing docs
- **WHEN** `legacyver analyze` completes and user is logged in
- **AND** `generated_docs` rows already exist for this repository and file paths
- **THEN** system updates the `content` and `generated_at` for each matching row (upsert)
- **THEN** no duplicate rows are created

#### Scenario: Partial re-analyze (only changed files)
- **WHEN** `legacyver analyze` runs incrementally (some files served from cache)
- **THEN** only re-generated files are upserted to the DB
- **THEN** cached files are not touched in the DB

#### Scenario: User not logged in
- **WHEN** `legacyver analyze` completes and no `sessionToken` exists in config
- **THEN** DB push is silently skipped
- **THEN** no error or warning is shown to the user
- **THEN** the upgrade tip shown in the summary includes a mention of `legacyver login` for cloud sync

#### Scenario: DB push fails
- **WHEN** the PostgreSQL connection fails during push (network, auth, DB down)
- **THEN** system logs a single yellow warning: "Cloud sync failed: <error>"
- **THEN** command exits 0 (local docs were already written successfully)

### Requirement: Push is non-blocking and runs after local output is complete
The DB push step SHALL run only after all local output files have been written to disk
and `printSummary()` has been called. It SHALL NOT block or affect the rendering step.

#### Scenario: Local output not affected by push
- **WHEN** DB push throws an uncaught exception
- **THEN** the `legacyver-docs/` directory still contains all generated files
- **THEN** the summary is still printed correctly

### Requirement: Push progress shown to user
While pushing to the database, the system SHALL display a spinner or progress indicator.
On completion, it SHALL show the number of files synced.

#### Scenario: Spinner shown during push
- **WHEN** DB push is in progress
- **THEN** a spinner with text "Syncing docs to cloud..." is visible in the terminal

#### Scenario: Completion message shown
- **WHEN** DB push completes successfully
- **THEN** terminal shows "[done] Docs synced to cloud (N files)"
