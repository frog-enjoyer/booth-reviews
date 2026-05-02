import type { BoothPage } from '../booth/detect-page';
import { mountListingWidget } from './listing-widget';
import { mountSearchBadges } from './search-badge';

export function mountBoothTrustLayer(page: BoothPage, document: Document): void {
  if (page.kind === 'listing') {
    mountListingWidget(page, document);
    return;
  }

  if (page.kind === 'search' || page.kind === 'creator') {
    mountSearchBadges(page.itemIds, document);
  }
}
