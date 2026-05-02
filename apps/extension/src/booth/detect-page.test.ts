// @vitest-environment happy-dom

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { detectBoothPage, extractItemIdsFromLinks } from './detect-page';
import { extractItemId, normalizeBoothUrl } from './extract-item';

function doc(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html');
}

function fixture(name: string): Document {
  return doc(readFileSync(join(import.meta.dirname, 'fixtures', name), 'utf8'));
}

describe('Booth URL parsing', () => {
  it('normalizes booth item URLs', () => {
    expect(normalizeBoothUrl('https://booth.pm/en/items/123?utm_source=x#reviews')).toBe('https://booth.pm/en/items/123');
  });

  it('normalizes shop subdomain item URLs', () => {
    expect(normalizeBoothUrl('https://chapter-2.booth.pm/items/8084946?utm_source=x#detail')).toBe(
      'https://chapter-2.booth.pm/items/8084946',
    );
  });

  it('extracts item IDs', () => {
    expect(extractItemId('https://booth.pm/ja/items/456')).toBe('456');
    expect(extractItemId('https://mk22.booth.pm/items/5007531')).toBe('5007531');
  });

  it('rejects non-Booth URLs', () => {
    expect(extractItemId('https://example.com/items/456')).toBeNull();
  });
});

describe('page detection', () => {
  it('detects listing pages', () => {
    const page = detectBoothPage(fixture('listing-booth-pm.html'), 'https://booth.pm/en/items/5007531');

    expect(page).toEqual({
      kind: 'listing',
      itemId: '5007531',
      canonicalUrl: 'https://booth.pm/en/items/5007531',
      creatorUrl: 'https://mk22.booth.pm/',
    });
  });

  it('detects shop subdomain listing pages', () => {
    const page = detectBoothPage(fixture('listing-shop-subdomain.html'), 'https://chapter-2.booth.pm/items/8084946');

    expect(page).toEqual({
      kind: 'listing',
      itemId: '8084946',
      canonicalUrl: 'https://chapter-2.booth.pm/items/8084946',
      creatorUrl: 'https://chapter-2.booth.pm/',
    });
  });

  it('detects adult-gated listing pages from URL before product DOM is visible', () => {
    const page = detectBoothPage(fixture('adult-gated.html'), 'https://claive.booth.pm/items/7536972');

    expect(page).toEqual({ kind: 'listing', itemId: '7536972', canonicalUrl: 'https://claive.booth.pm/items/7536972' });
  });

  it('detects English adult-gated listing pages on booth.pm locale URLs', () => {
    const page = detectBoothPage(fixture('adult-gated-en.html'), 'https://booth.pm/en/items/7536972');

    expect(page).toEqual({ kind: 'listing', itemId: '7536972', canonicalUrl: 'https://booth.pm/en/items/7536972' });
  });

  it('extracts linked item IDs once', () => {
    const ids = extractItemIdsFromLinks(
      doc('<a href="https://booth.pm/en/items/1">A</a><a href="https://booth.pm/ja/items/1">A</a><a href="https://booth.pm/items/2">B</a>'),
    );

    expect(ids).toEqual(['1', '2']);
  });

  it('detects search pages', () => {
    const page = detectBoothPage(fixture('search.html'), 'https://booth.pm/en/search/kikyo%20outift');

    expect(page).toEqual({ kind: 'search', itemIds: ['3681787', '5213334', '6447797'] });
  });

  it('detects creator shop pages on subdomains', () => {
    const page = detectBoothPage(fixture('creator-shop.html'), 'https://mk22.booth.pm/');

    expect(page).toEqual({ kind: 'creator', creatorUrl: 'https://mk22.booth.pm', itemIds: ['6571299', '5007531', '4023598'] });
  });
});
