'use strict';

const { createClient } = require('@supabase/supabase-js');

/**
 * Supabase client for Legacyver CLI.
 *
 * Uses the public anon key — safe to bundle in an npm package.
 * Row Level Security (RLS) on Supabase enforces access control.
 */
const SUPABASE_URL = 'https://kbsxwyoylwhieoljepxr.supabase.co';

// anon/public key — safe to commit, RLS is the gatekeeper
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtic3h3eW95bHdoaWVvbGplcHhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxMjU4ODksImV4cCI6MjA4OTcwMTg4OX0.GHX8Id1qunhypkN6WurM4UZUgVwrkD_z3bOIJhW2Y7A';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionFromUrl: false,
  },
});

/**
 * Create a Supabase client configured with the CLI token for RLS bypass.
 */
function createDbClient(token) {
  const headers = {};
  if (token) {
    headers['x-cli-token'] = token;
  }
  
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionFromUrl: false,
    },
    global: { headers }
  });
}

module.exports = { supabase, createDbClient };
