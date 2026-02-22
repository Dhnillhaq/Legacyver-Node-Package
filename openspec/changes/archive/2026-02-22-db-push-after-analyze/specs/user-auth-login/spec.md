## ADDED Requirements

### Requirement: Login command authenticates user via GitHub OAuth browser flow
The CLI SHALL provide a `legacyver login` command that opens the user's default browser to
the Legacyver web app GitHub OAuth page, spawns a temporary local HTTP server to receive
the callback token, and on success stores the session token, username, and email in
`~/.legacyver/session.json`.

#### Scenario: Successful login — browser flow completes
- **WHEN** user runs `legacyver login`
- **AND** no existing session is active
- **THEN** CLI spawns a local HTTP server on a random available port (`127.0.0.1:<port>`)
- **AND** CLI opens the system default browser to `{WEB_URL}/cli-auth?code=<random_hex>&port=<port>`
- **AND** CLI prints the auth URL in case the browser does not open
- **AND** CLI displays "Waiting for authentication..." to the terminal
- **WHEN** the web app completes GitHub OAuth and redirects to `http://localhost:<port>/callback?token=<T>&username=<U>&email=<E>`
- **THEN** CLI saves `{ token, username, email }` to `~/.legacyver/session.json`
- **AND** CLI prints "Logged in as <username> (<email>)" in green
- **AND** CLI prints "Generated docs will now sync to the cloud after each analyze run."
- **AND** CLI serves an HTML success page to the browser tab
- **AND** local HTTP server is shut down after 500ms

#### Scenario: Login timed out
- **WHEN** user runs `legacyver login`
- **AND** no callback is received within 5 minutes
- **THEN** CLI prints "Login timed out. Please try again." in red
- **AND** the local HTTP server is shut down
- **AND** no session is saved

#### Scenario: Callback missing token or username
- **WHEN** the web app redirects to the callback URL but omits `token` or `username` params
- **THEN** CLI responds to the browser with HTTP 400 "Missing token or username in callback."
- **AND** no session is saved

#### Scenario: Already logged in
- **WHEN** user runs `legacyver login` while `~/.legacyver/session.json` already contains a `token`
- **THEN** CLI prints "Already logged in as <username> (<email>)." in yellow
- **AND** CLI prints "Run `legacyver logout` first to switch accounts."
- **AND** CLI exits without opening the browser

---

### Requirement: One-time random auth code prevents CSRF during OAuth callback
The CLI SHALL generate a cryptographically random 16-byte hex code for each login session
and include it in the browser URL as `?code=<hex>`. This prevents unauthorized callbacks
from hijacking the local server.

#### Scenario: Random code generated per login attempt
- **WHEN** `legacyver login` is invoked
- **THEN** a new `crypto.randomBytes(16).toString('hex')` code is generated
- **AND** the code is included in the auth URL sent to the browser

---

### Requirement: Logout command clears stored session and revokes token in DB
The CLI SHALL provide a `legacyver logout` command that revokes the session token in
`app.user_sessions` via `revokeToken()` and deletes `~/.legacyver/session.json`.

#### Scenario: Successful logout
- **WHEN** user runs `legacyver logout` while logged in
- **THEN** `revokeToken(token)` is called to mark the session as revoked in `app.user_sessions`
- **AND** `clearSession()` deletes `~/.legacyver/session.json`
- **AND** CLI prints "Logged out." in green

#### Scenario: DB revocation fails — local session still cleared
- **WHEN** `revokeToken()` throws (DB unreachable)
- **THEN** the error is silently swallowed
- **AND** `clearSession()` still runs and deletes the local session file
- **AND** CLI prints "Logged out." in green

#### Scenario: Logout when not logged in
- **WHEN** user runs `legacyver logout` with no active session (`session.token` is falsy)
- **THEN** CLI prints "You are not logged in." and exits 0

---

### Requirement: Login status visible in providers output
The CLI `legacyver providers` command SHALL show the current login status
at the top of its output.

#### Scenario: Shows logged-in state
- **WHEN** user runs `legacyver providers` with `session.token` present in `~/.legacyver/session.json`
- **THEN** output includes a "Legacyver Account" section
- **AND** shows "Logged in as <username> (<email>)" in green
- **AND** shows "Generated docs will sync to the cloud after each analyze run."

#### Scenario: Shows logged-out state
- **WHEN** user runs `legacyver providers` with no active session
- **THEN** "Legacyver Account" section shows "Not logged in" in yellow
- **AND** shows "run `legacyver login` to enable cloud sync"

---

### Requirement: Session stored in ~/.legacyver/session.json (not in project config)
Auth session is user-scoped, not project-scoped. It SHALL be stored outside the
cosmiconfig `.legacyverrc` file, in the user home directory.

#### Scenario: Session file location
- **WHEN** a user logs in successfully
- **THEN** the session is saved to `~/.legacyver/session.json`
- **AND** the directory `~/.legacyver/` is created recursively if it does not exist
- **AND** the file content is `{ "token": "...", "username": "...", "email": "..." }`

#### Scenario: Session not stored in project config
- **WHEN** a user logs in
- **THEN** `token`, `username`, and `email` are NOT written to `.legacyverrc` or `legacyver.config.js`
