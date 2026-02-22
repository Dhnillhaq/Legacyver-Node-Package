'use strict';

const http = require('http');
const crypto = require('crypto');
const pc = require('picocolors');
const { saveSession, loadSession } = require('../../utils/config');

const WEB_URL = 'https://weci-holic.hackathon.sev-2.com';

/**
 * Open a URL in the default browser (cross-platform).
 */
function openBrowser(url) {
  const { exec } = require('child_process');
  const cmd = process.platform === 'win32' ? `start "" "${url}"`
    : process.platform === 'darwin' ? `open "${url}"`
    : `xdg-open "${url}"`;
  exec(cmd);
}

/**
 * Spawn a temporary local HTTP server, open the browser for GitHub OAuth,
 * and wait for the web app to redirect the token back.
 *
 * Flow:
 *  1. CLI starts local server on a random port
 *  2. CLI opens browser to {WEB_URL}/cli-auth?code={CODE}&port={PORT}
 *  3. User logs in with GitHub on the web app
 *  4. Web app creates a session token and redirects to http://localhost:{PORT}/callback?token=...&username=...&email=...
 *  5. CLI receives the token, saves session, and shuts down local server
 */
module.exports = async function loginCommand() {
  const session = loadSession();
  if (session.token) {
    console.log(pc.yellow(`Already logged in as ${session.username} (${session.email}).`));
    console.log(`Run ${pc.cyan('legacyver logout')} first to switch accounts.`);
    return;
  }

  console.log(pc.bold('\nLegacyver Login\n'));
  console.log(pc.dim('Opening your browser to log in with GitHub...\n'));

  const code = crypto.randomBytes(16).toString('hex');

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, `http://localhost`);

      if (url.pathname === '/callback') {
        const token = url.searchParams.get('token');
        const username = url.searchParams.get('username');
        const email = url.searchParams.get('email');

        if (token && username) {
          // Save session with the token
          saveSession({
            token,
            username,
            email: email || '',
          });

          // Send a nice HTML response to the browser
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <body style="background:#0a0a0a;color:#fff;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
                <div style="text-align:center">
                  <h1 style="color:#22c55e">Logged in!</h1>
                  <p>You can close this tab and return to the CLI.</p>
                </div>
              </body>
            </html>
          `);

          console.log(pc.green(`  Logged in as ${username} (${email})`));
          console.log(pc.dim('  Generated docs will now sync to the cloud after each analyze run.\n'));

          // Shut down server after a short delay
          setTimeout(() => {
            server.close();
            resolve();
          }, 500);
        } else {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Missing token or username in callback.');
        }
        return;
      }

      // Any other path
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    });

    // Listen on a random available port
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      const authUrl = `${WEB_URL}/cli-auth?code=${code}&port=${port}`;

      console.log(pc.dim(`  Listening on http://localhost:${port}`));
      console.log(pc.dim(`  If the browser doesn't open, visit:\n`));
      console.log(`  ${pc.cyan(authUrl)}\n`);
      console.log(pc.dim('  Waiting for authentication...\n'));

      openBrowser(authUrl);
    });

    // Timeout after 5 minutes
    const timeout = setTimeout(() => {
      console.error(pc.red('\n  Login timed out. Please try again.'));
      server.close();
      reject(new Error('Login timed out'));
    }, 5 * 60 * 1000);

    server.on('close', () => clearTimeout(timeout));
  });
};
