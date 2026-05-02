export function normalizeBoothUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (!isBoothHost(url.hostname)) return null;

    url.search = '';
    url.hash = '';

    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

export function isBoothHost(hostname: string): boolean {
  return hostname === 'booth.pm' || hostname.endsWith('.booth.pm');
}

export function extractItemId(rawUrl: string): string | null {
  const normalized = normalizeBoothUrl(rawUrl);
  if (!normalized) return null;

  const url = new URL(normalized);
  const match = url.pathname.match(/\/items\/(\d+)/);
  return match?.[1] ?? null;
}
