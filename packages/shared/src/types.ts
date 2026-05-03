import type { REPORT_REASONS } from './constants';

export type Rating = 'up' | 'down';
export type ReviewStatus = 'visible' | 'pending' | 'deleted';
export type ReviewLang = 'en' | 'ja' | 'other';
export type PurchaseState = 'unknown' | 'not_detected' | 'appears_purchased';
export type SummaryLabel = 'none' | 'early' | 'positive' | 'mixed' | 'caution';

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

export type ItemSummary = {
  itemId: string;
  label: SummaryLabel;
  upCount: number;
  downCount: number;
  reviewCount: number;
  viewerReviewId?: string;
  viewerRating?: 'up' | 'down';
};

export type Review = {
  id: string;
  itemId: string;
  rating: Rating;
  body: string;
  lang: ReviewLang;
  authorName: string;
  purchaseState: PurchaseState;
  helpfulUp: number;
  helpfulDown: number;
  viewerVote?: 1 | -1;
  createdAt: string;
  updatedAt: string;
};

export type ReviewsResponse = {
  reviews: Review[];
};

export type ReviewInput = {
  itemId: string;
  rating: Rating;
  body: string;
  lang: ReviewLang;
  purchaseState?: PurchaseState;
};

export type ReviewUpdateInput = Omit<ReviewInput, 'itemId'>;

export type ReviewVoteInput = {
  value: 1 | -1;
};

export type ReportReason = (typeof REPORT_REASONS)[number];

export type ReportInput = {
  reviewId: string;
  reason: ReportReason;
  details?: string;
};

export type Me = {
  userId: string;
  publicName: string;
  banned: boolean;
};

export type AuthStartResponse = {
  url: string;
};

export type BatchSummaryRequest = {
  itemIds: string[];
};

export type BatchSummaryResponse = {
  summaries: ItemSummary[];
};
