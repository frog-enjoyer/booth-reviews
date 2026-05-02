import { getItemSummaries } from '../api/client';

export function mountSearchBadges(itemIds: string[], document: Document): void {
  if (itemIds.length === 0) return;

  void getItemSummaries(itemIds.slice(0, 50))
    .then(({ summaries }) => {
      for (const summary of summaries) {
        const link = document.querySelector<HTMLAnchorElement>(`a[href*="/items/${summary.itemId}"]`);
        if (!link || link.dataset.boothTrustMounted) continue;

        const badge = document.createElement('span');
        badge.className = 'booth-trust-badge';
        badge.textContent = summary.label === 'none' ? 'No reviews' : summary.label;

        link.dataset.boothTrustMounted = 'true';
        link.append(badge);
      }
    })
    .catch(() => {
      // Search/creator pages should stay quiet when the API is unavailable.
    });
}
