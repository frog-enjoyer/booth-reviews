import type { PurchaseState } from '@booth-addon/shared';

const PURCHASED_PATTERNS = [
  /have bought/i,
  /購入済み/,
  /ダウンロード/,
];

const CART_PATTERNS = [/add to cart/i, /カートに入れる/];

function visibleText(document: Document): string {
  return document.body?.textContent ?? '';
}

export function detectPurchaseState(document: Document): PurchaseState {
  const text = visibleText(document);

  // Cart text is definitive proof the item is not yet purchased.
  if (CART_PATTERNS.some((pattern) => pattern.test(text))) return 'not_detected';
  if (PURCHASED_PATTERNS.some((pattern) => pattern.test(text))) return 'appears_purchased';

  return 'unknown';
}
