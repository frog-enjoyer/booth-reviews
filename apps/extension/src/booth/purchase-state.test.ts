// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest';

import { detectPurchaseState } from './purchase-state';

function doc(text: string): Document {
  return new DOMParser().parseFromString(`<main>${text}</main>`, 'text/html');
}

describe('detectPurchaseState', () => {
  it('detects visible purchased copy', () => {
    expect(detectPurchaseState(doc('Have bought Download'))).toBe('appears_purchased');
    expect(detectPurchaseState(doc('購入済み ダウンロード'))).toBe('appears_purchased');
  });

  it('detects visible cart copy as not purchased', () => {
    expect(detectPurchaseState(doc('Add to cart'))).toBe('not_detected');
    expect(detectPurchaseState(doc('カートに入れる'))).toBe('not_detected');
  });

  it('returns unknown when Booth copy is not recognizable', () => {
    expect(detectPurchaseState(doc('Age Verification'))).toBe('unknown');
  });
});
