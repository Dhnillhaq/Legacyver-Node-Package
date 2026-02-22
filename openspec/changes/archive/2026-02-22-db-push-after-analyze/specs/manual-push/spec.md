## ADDED Requirements

### Requirement: legacyver push — manual cloud sync command
The CLI SHALL provide a `legacyver push [target]` command that reads existing generated
markdown files from the output directory and pushes them to the cloud database. This is
useful when: (a) `analyze` ran but the DB was down at that time, (b) the user wants to
re-push after fixing DB issues, or (c) docs were generated on a machine without login.

#### Scenario: Successful push with existing docs
- **WHEN** user runs `legacyver push` (or `legacyver push <target>`)
- **AND** user is logged in (`session.token` present)
- **AND** `./legacyver-docs/` directory exists and contains `.md` files
- **THEN** CLI prints "Legacyver Push" header with source dir, docs dir, and file count
- **AND** CLI shows a spinner: "Pushing docs to cloud..."
- **AND** `pushToDatabase(fragments, targetDir)` is called
- **AND** on success, spinner shows "Pushed N files to cloud"
- **AND** CLI prints "Docs are now visible on the web dashboard."

#### Scenario: Not logged in — exits with error
- **WHEN** user runs `legacyver push`
- **AND** `loadSession().token` is falsy
- **THEN** CLI prints "Not logged in. Run `legacyver login` first." in red
- **AND** process exits with code 1

#### Scenario: Output directory does not exist
- **WHEN** user runs `legacyver push`
- **AND** the resolved `--out` directory does not exist
- **THEN** CLI prints "Output directory not found: <path>" in red
- **AND** CLI prints "Run `legacyver analyze` first to generate docs."
- **AND** process exits with code 1

#### Scenario: No markdown files in output directory
- **WHEN** user runs `legacyver push`
- **AND** the output directory exists but contains no `.md` files
- **THEN** CLI prints "No markdown files found in <dir>" in yellow
- **AND** CLI prints "Run `legacyver analyze` first to generate docs."
- **AND** process exits 0

#### Scenario: Token expired or invalid — push skipped with error
- **WHEN** `pushToDatabase()` returns `{ skipped: true }`
  (i.e. token failed `validateToken()` check)
- **THEN** spinner shows "Push skipped — token may be invalid or expired. Try logging in again."
- **AND** process exits with code 1

#### Scenario: Push fails (DB error)
- **WHEN** `pushToDatabase()` throws an error
- **THEN** spinner shows "Push failed: <error.message>" in red
- **AND** full error details are logged via `logger.error()`
- **AND** process exits with code 1

---

### Requirement: push command resolves paths from flags
The push command SHALL accept an optional positional `[target]` argument for the project
directory and a `--out <dir>` flag for the docs output directory.

#### Scenario: Default paths
- **WHEN** user runs `legacyver push` with no arguments
- **THEN** `targetDir` = `path.resolve('.')` (current working directory)
- **AND** `outDir` = `path.resolve('./legacyver-docs')`

#### Scenario: Custom target and out
- **WHEN** user runs `legacyver push ./my-project --out ./my-project/docs`
- **THEN** `targetDir` = `path.resolve('./my-project')`
- **AND** `outDir` = `path.resolve('./my-project/docs')`

---

### Requirement: Markdown file collection for push
The push command SHALL recursively collect all `.md` files from the output directory.
Each file becomes a fragment `{ relativePath: string, content: string }`.

#### Scenario: Files collected recursively
- **WHEN** the output directory contains nested subdirectories with `.md` files
- **THEN** all `.md` files are collected recursively
- **AND** `relativePath` is relative to the output directory root (using forward slashes)
- **AND** `content` is the full UTF-8 content of the file

#### Scenario: Non-markdown files ignored
- **WHEN** the output directory contains `.html`, `.json`, or other non-`.md` files
- **THEN** those files are ignored and not included in fragments
