import { extractCreatorUrl } from './extract-creator';
import { extractItemId, isBoothHost, normalizeBoothUrl } from './extract-item';

export type BoothPage =
  | { kind: 'listing'; itemId: string; canonicalUrl: string; creatorUrl?: string }
  | { kind: 'search'; itemIds: string[] }
  | { kind: 'creator'; creatorUrl: string; itemIds: string[] }
  | { kind: 'unsupported' };

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function extractItemIdsFromLinks(document: Document): string[] {
  const ids = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')]
    .map((anchor) => extractItemId(anchor.href))
    .filter((itemId): itemId is string => Boolean(itemId));

  return unique(ids);
}

export function detectBoothPage(document: Document, rawUrl: string): BoothPage {
  const itemId = extractItemId(rawUrl);
  const canonicalUrl = normalizeBoothUrl(rawUrl);

  if (itemId && canonicalUrl) {
    const creatorUrl = extractCreatorUrl(document);
    return creatorUrl
      ? { kind: 'listing', itemId, canonicalUrl, creatorUrl }
      : { kind: 'listing', itemId, canonicalUrl };
  }

  const url = new URL(rawUrl);
  const itemIds = extractItemIdsFromLinks(document);

  if (url.hostname === 'booth.pm' && (url.searchParams.has('q') || url.pathname.includes('/search'))) {
    return { kind: 'search', itemIds };
  }

  const normalized = normalizeBoothUrl(rawUrl);
  if (normalized && isBoothHost(url.hostname) && url.hostname !== 'booth.pm' && itemIds.length > 0) {
    return { kind: 'creator', creatorUrl: normalized, itemIds };
  }

  return { kind: 'unsupported' };
}
