import { describe, it, expect, vi } from 'vitest';
import crypto from 'crypto';
import { validateToken, revokeToken } from '../src/api/auth.js';

/**
 * Build a mock pool whose .query() calls resolve with the given sequence.
 */
function mockPool(...results) {
  const query = vi.fn();
  for (const r of results) {
    query.mockResolvedValueOnce(r);
  }
  return { query, end: vi.fn().mockResolvedValue(undefined) };
}

describe('validateToken', () => {
  it('returns null when token is falsy', async () => {
    const result = await validateToken(null);
    expect(result).toBeNull();
  });

  it('returns user info for a valid token', async () => {
    const pool = mockPool({
      rows: [{ user_id: 42, username: 'testuser', email: 'test@test.com' }],
    });

    const result = await validateToken('some-token', { pool });
    expect(result).toEqual({
      userId: '42',
      username: 'testuser',
      email: 'test@test.com',
    });

    // Verify it hashed the token and queried correctly
    const expectedHash = crypto.createHash('sha256').update('some-token').digest('hex');
    expect(pool.query).toHaveBeenCalledOnce();
    expect(pool.query.mock.calls[0][1]).toEqual([expectedHash]);
  });

  it('returns null for expired/revoked/unknown token', async () => {
    const pool = mockPool({ rows: [] });

    const result = await validateToken('bad-token', { pool });
    expect(result).toBeNull();
  });
});

describe('revokeToken', () => {
  it('does nothing when token is falsy', async () => {
    await revokeToken(null); // should not throw
  });

  it('updates revoked_at for the token hash', async () => {
    const pool = mockPool({ rows: [] });

    await revokeToken('some-token', { pool });

    const expectedHash = crypto.createHash('sha256').update('some-token').digest('hex');
    expect(pool.query).toHaveBeenCalledOnce();
    expect(pool.query.mock.calls[0][0]).toContain('UPDATE app.user_sessions SET revoked_at');
    expect(pool.query.mock.calls[0][1]).toEqual([expectedHash]);
  });
});
