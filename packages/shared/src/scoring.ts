import type { ItemSummary, SummaryLabel } from './types';

export function summarize(upCount: number, downCount: number): SummaryLabel {
  const total = upCount + downCount;

  if (total === 0) return 'none';
  if (total < 3) return 'early';
  if (downCount === 0) return 'positive';
  if (upCount === 0) return 'caution';
  if (downCount > upCount) return 'caution';

  return 'mixed';
}

export function createItemSummary(input: {
  itemId: string;
  upCount: number;
  downCount: number;
  viewerReviewId?: string;
}): ItemSummary {
  return {
    itemId: input.itemId,
    label: summarize(input.upCount, input.downCount),
    upCount: input.upCount,
    downCount: input.downCount,
    reviewCount: input.upCount + input.downCount,
    viewerReviewId: input.viewerReviewId,
  };
}
