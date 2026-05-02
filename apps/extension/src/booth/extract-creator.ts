import { isBoothHost } from './extract-item';

export function extractCreatorUrl(document: Document): string | undefined {
  const link = [...document.querySelectorAll<HTMLAnchorElement>('a[href]')].find((anchor) => {
    try {
      const url = new URL(anchor.href);
      return isBoothHost(url.hostname) && url.hostname !== 'booth.pm' && url.pathname === '/' && anchor.textContent?.trim();
    } catch {
      return false;
    }
  });

  return link?.href;
}

export function creatorIdFromUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    if (!isBoothHost(url.hostname)) return null;

    if (url.hostname !== 'booth.pm') {
      return url.hostname.replace(/\.booth\.pm$/, '');
    }

    const firstSegment = url.pathname.split('/').filter(Boolean)[0];
    return firstSegment && firstSegment !== 'items' ? firstSegment : null;
  } catch {
    return null;
  }
}
