import type { PurchaseState } from '@booth-addon/shared';

const PURCHASED_PATTERNS = [
  /have bought/i,
  /purchased/i,
  /download/i,
  /購入済み/,
  /購入履歴/,
  /ダウンロード/,
];

const CART_PATTERNS = [/add to cart/i, /カートに入れる/];

function visibleText(document: Document): string {
  return document.body?.textContent ?? '';
}

export function detectPurchaseState(document: Document): PurchaseState {
  const text = visibleText(document);

  if (PURCHASED_PATTERNS.some((pattern) => pattern.test(text))) return 'appears_purchased';
  if (CART_PATTERNS.some((pattern) => pattern.test(text))) return 'not_detected';

  return 'unknown';
}
