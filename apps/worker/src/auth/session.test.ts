import { describe, expect, it } from 'vitest';

import { createSessionToken, getBearerToken, hashSessionToken, sessionExpiry } from './session';

describe('session helpers', () => {
  it('creates 32-byte hex session tokens', () => {
    expect(createSessionToken()).toMatch(/^[a-f0-9]{64}$/);
  });

  it('hashes tokens deterministically without returning the raw token', async () => {
    const token = 'test-token';
    const first = await hashSessionToken(token);
    const second = await hashSessionToken(token);

    expect(first).toBe(second);
    expect(first).not.toBe(token);
  });

  it('parses bearer tokens', () => {
    expect(getBearerToken('Bearer abc')).toBe('abc');
    expect(getBearerToken('Basic abc')).toBeNull();
  });

  it('sets expiry in the future', () => {
    expect(new Date(sessionExpiry()).getTime()).toBeGreaterThan(Date.now());
  });
});
