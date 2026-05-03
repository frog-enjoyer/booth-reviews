// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest';

import { renderReview } from './listing-widget';

describe('renderReview', () => {
  it('renders review body as literal text', () => {
    const element = renderReview(
      {
        id: 'review-1',
        itemId: 'item-1',
        rating: 'down',
        body: '<script>alert("xss")</script>',
        lang: 'en',
        authorName: 'Reviewer 4821',
        purchaseState: 'unknown',
        helpfulUp: 0,
        helpfulDown: 0,
        createdAt: '2026-05-02T00:00:00.000Z',
        updatedAt: '2026-05-02T00:00:00.000Z',
      },
      document,
      false,
      () => undefined,
    );

    expect(element.querySelector('script')).toBeNull();
    expect(element.textContent).toContain('<script>alert("xss")</script>');
  });

  it('renders a soft purchase badge when purchase was detected', () => {
    const element = renderReview(
      {
        id: 'review-1',
        itemId: 'item-1',
        rating: 'up',
        body: 'Worked well.',
        lang: 'en',
        authorName: 'Reviewer 4821',
        purchaseState: 'appears_purchased',
        helpfulUp: 0,
        helpfulDown: 0,
        createdAt: '2026-05-02T00:00:00.000Z',
        updatedAt: '2026-05-02T00:00:00.000Z',
      },
      document,
      false,
      () => undefined,
    );

    expect(element.textContent).toContain('Purchase detected');
  });

  it('renders helpful and unhelpful vote buttons', () => {
    const element = renderReview(
      {
        id: 'review-1',
        itemId: 'item-1',
        rating: 'up',
        body: 'Good.',
        lang: 'en',
        authorName: 'Reviewer 4821',
        purchaseState: 'unknown',
        helpfulUp: 2,
        helpfulDown: 1,
        createdAt: '2026-05-02T00:00:00.000Z',
        updatedAt: '2026-05-02T00:00:00.000Z',
      },
      document,
      false,
      () => undefined,
    );

    expect(element.textContent).toContain('Helpful (2)');
    expect(element.textContent).toContain('Unhelpful (1)');
    expect(element.textContent).toContain('Report');
  });

  it('renders edit and delete buttons for owner', () => {
    const element = renderReview(
      {
        id: 'review-1',
        itemId: 'item-1',
        rating: 'up',
        body: 'Good.',
        lang: 'en',
        authorName: 'Reviewer 4821',
        purchaseState: 'unknown',
        helpfulUp: 0,
        helpfulDown: 0,
        createdAt: '2026-05-02T00:00:00.000Z',
        updatedAt: '2026-05-02T00:00:00.000Z',
      },
      document,
      true,
      () => undefined,
    );

    expect(element.textContent).toContain('Edit');
    expect(element.textContent).toContain('Delete');
    expect(element.textContent).not.toContain('Report');
  });
});
