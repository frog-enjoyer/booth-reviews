import { describe, expect, it } from 'vitest';

import { createItemSummary, summarize } from './scoring';

describe('summarize', () => {
  it('uses none for zero reviews', () => {
    expect(summarize(0, 0)).toBe('none');
  });

  it('uses early below three reviews', () => {
    expect(summarize(1, 0)).toBe('early');
    expect(summarize(1, 1)).toBe('early');
  });

  it('uses positive when reviews are established and all positive', () => {
    expect(summarize(3, 0)).toBe('positive');
  });

  it('uses caution when negative reviews dominate', () => {
    expect(summarize(1, 3)).toBe('caution');
  });

  it('uses mixed when established reviews include both ratings without negative dominance', () => {
    expect(summarize(3, 1)).toBe('mixed');
  });
});

describe('createItemSummary', () => {
  it('returns raw counts and confidence label', () => {
    expect(createItemSummary({ itemId: '123', upCount: 3, downCount: 1 })).toEqual({
      itemId: '123',
      label: 'mixed',
      upCount: 3,
      downCount: 1,
      reviewCount: 4,
      viewerReviewId: undefined,
    });
  });
});
