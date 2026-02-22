'use strict';

const pc = require('picocolors');
const { loadSession, clearSession } = require('../../utils/config');
const { revokeToken } = require('../../api/auth');

module.exports = async function logoutCommand() {
  const session = loadSession();
  if (!session.token) {
    console.log('You are not logged in.');
    return;
  }

  try {
    await revokeToken(session.token);
  } catch {
    // DB update failed — still clear local session
  }

  clearSession();
  console.log(pc.green('Logged out.'));
};
