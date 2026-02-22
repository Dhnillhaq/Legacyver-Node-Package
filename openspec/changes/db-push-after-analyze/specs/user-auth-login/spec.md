## ADDED Requirements

### Requirement: Login command authenticates user via web API
The CLI SHALL provide a `legacyver login` command that prompts for email and password,
POSTs them to the Legacyver web API login endpoint, and on success stores the returned
JWT token and userId in the local config file.

#### Scenario: Successful login
- **WHEN** user runs `legacyver login` and enters valid email and password
- **THEN** CLI POSTs `{ email, password }` to the login endpoint
- **THEN** on HTTP 200, stores `sessionToken` and `userId` in the conf config file
- **THEN** prints "Logged in as <email>" and exits 0

#### Scenario: Invalid credentials
- **WHEN** user runs `legacyver login` and enters wrong email or password
- **THEN** CLI POSTs to the login endpoint
- **THEN** on HTTP 401/403, prints "Invalid email or password" and exits 1
- **THEN** no token is stored in config

#### Scenario: Web API unreachable
- **WHEN** user runs `legacyver login` and the web API is unreachable (network error)
- **THEN** CLI prints "Could not reach the Legacyver API. Check your internet connection." and exits 1
- **THEN** no token is stored in config

### Requirement: Password input is hidden during login
The CLI SHALL hide the password input (no terminal echo) when prompting for password
during `legacyver login`.

#### Scenario: Password not echoed
- **WHEN** user types their password at the password prompt
- **THEN** characters are not displayed in the terminal

### Requirement: Logout command clears stored session
The CLI SHALL provide a `legacyver logout` command that removes the stored `sessionToken`
and `userId` from the local config file.

#### Scenario: Successful logout
- **WHEN** user runs `legacyver logout` while logged in
- **THEN** `sessionToken` and `userId` are deleted from the config file
- **THEN** CLI prints "Logged out." and exits 0

#### Scenario: Logout when not logged in
- **WHEN** user runs `legacyver logout` with no active session
- **THEN** CLI prints "You are not logged in." and exits 0 (no error)

### Requirement: Login status visible in providers output
The CLI `legacyver providers` command SHALL show the current login status
(logged in as <email>, or "Not logged in").

#### Scenario: Shows logged-in state
- **WHEN** user runs `legacyver providers` with a valid session token in config
- **THEN** output includes a "Legacyver Account" section showing "Logged in"

#### Scenario: Shows logged-out state
- **WHEN** user runs `legacyver providers` with no session token
- **THEN** output includes "Not logged in — run `legacyver login` to enable cloud sync"
