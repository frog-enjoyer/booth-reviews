import { describe, expect, it } from 'vitest';

import { batchSummarySchema, meUpdateSchema, reviewBodySchema, reviewUpdateSchema, reviewVoteSchema } from './schemas';

describe('reviewBodySchema', () => {
  it('rejects short negative reviews', () => {
    const result = reviewBodySchema.safeParse({ itemId: '1', rating: 'down', body: 'bad', lang: 'en' });

    expect(result.success).toBe(false);
  });

  it('accepts empty positive reviews', () => {
    const result = reviewBodySchema.safeParse({ itemId: '1', rating: 'up', body: '', lang: 'en' });

    expect(result.success).toBe(true);
  });

  it('accepts soft purchase state', () => {
    const result = reviewBodySchema.safeParse({
      itemId: '1',
      rating: 'up',
      body: '',
      lang: 'en',
      purchaseState: 'appears_purchased',
    });

    expect(result.success).toBe(true);
  });
});

describe('reviewUpdateSchema', () => {
  it('does not accept itemId updates', () => {
    const result = reviewUpdateSchema.safeParse({ itemId: '1', rating: 'up', body: '', lang: 'en' });

    expect(result.success).toBe(true);
    if (result.success) expect('itemId' in result.data).toBe(false);
  });
});

describe('reviewVoteSchema', () => {
  it('accepts only helpfulness vote values', () => {
    expect(reviewVoteSchema.safeParse({ value: 1 }).success).toBe(true);
    expect(reviewVoteSchema.safeParse({ value: 0 }).success).toBe(false);
  });
});

describe('batchSummarySchema', () => {
  it('caps batch summary requests at 50 items', () => {
    const itemIds = Array.from({ length: 51 }, (_, index) => String(index));

    expect(batchSummarySchema.safeParse({ itemIds }).success).toBe(false);
  });
});

describe('meUpdateSchema', () => {
  it('rejects public names that are too short', () => {
    expect(meUpdateSchema.safeParse({ publicName: 'x' }).success).toBe(false);
  });

  it('trims valid public names', () => {
    const result = meUpdateSchema.safeParse({ publicName: '  Reviewer 4821  ' });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.publicName).toBe('Reviewer 4821');
  });
});
