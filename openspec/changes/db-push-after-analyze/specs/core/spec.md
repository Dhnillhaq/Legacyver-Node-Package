## MODIFIED Requirements

### Requirement: Analyze command triggers DB push after rendering
The `analyze` command pipeline SHALL include a DB push step that runs after the renderer
writes all output files to disk. This step is conditional on the user being logged in
and SHALL NOT affect the success/failure of the analyze run itself.

#### Scenario: Authenticated user — push runs after render
- **WHEN** `legacyver analyze` completes the render step
- **AND** a valid `sessionToken` exists in the user config
- **THEN** the DB push step is invoked automatically
- **THEN** docs are upserted to the `generated_docs` table
- **THEN** summary is printed after push completes

#### Scenario: Unauthenticated user — push silently skipped
- **WHEN** `legacyver analyze` completes the render step
- **AND** no `sessionToken` exists in the user config
- **THEN** DB push step is skipped with no error output
- **THEN** summary is printed as normal

#### Scenario: Push error does not fail analyze
- **WHEN** the DB push step throws any error
- **THEN** the analyze command exits with code 0
- **THEN** a yellow warning is shown: "Cloud sync failed: <reason>"
- **THEN** all local output files remain intact
