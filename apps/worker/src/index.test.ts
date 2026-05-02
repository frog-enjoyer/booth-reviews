import { describe, expect, it } from 'vitest';

import { createApp } from './index';
import type { Env } from './types';

const env = {
  CORS_ALLOWED_BOOTH_ORIGINS: 'https://booth.pm',
  CORS_ALLOWED_EXTENSION_ORIGINS: 'chrome-extension://abc',
} as Env;

describe('worker app', () => {
  it('serves health', async () => {
    const response = await createApp().request('/health', {}, env);
    await expect(response.json()).resolves.toEqual({ ok: true, data: { status: 'ok' } });
  });

  it('allows configured CORS preflight origins', async () => {
    const response = await createApp().request('/health', { method: 'OPTIONS', headers: { Origin: 'https://booth.pm' } }, env);

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://booth.pm');
  });

  it('rejects unknown CORS preflight origins', async () => {
    const response = await createApp().request('/health', { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } }, env);

    expect(response.status).toBe(403);
  });
});
