import type { SummaryLabel } from '@booth-addon/shared';

import { getItemSummaries } from '../api/client';

const LABEL_TEXT: Record<SummaryLabel, string> = {
  none: 'No reviews',
  early: 'Early signal',
  positive: 'Positive',
  mixed: 'Mixed',
  caution: 'Caution',
};

export function mountSearchBadges(itemIds: string[], document: Document): void {
  if (itemIds.length === 0) return;

  void getItemSummaries(itemIds.slice(0, 50))
    .then(({ summaries }) => {
      for (const summary of summaries) {
        const card = document.querySelector(`[data-product-id="${summary.itemId}"]`);
        if (!card || (card as HTMLElement).dataset.boothTrustMounted) continue;
        (card as HTMLElement).dataset.boothTrustMounted = 'true';

        const badgeRow = card.querySelector('.l-item-card-badge');
        if (!badgeRow) continue;

        const badge = document.createElement('span');
        badge.className = `booth-trust-badge booth-trust-badge--${summary.label}`;
        badge.textContent = LABEL_TEXT[summary.label];
        badgeRow.append(badge);
      }
    })
    .catch(() => undefined);
}
