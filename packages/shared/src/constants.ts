export const MAX_REVIEW_BODY_LENGTH = 2_000;
export const MIN_NEGATIVE_REVIEW_BODY_LENGTH = 20;
export const SESSION_TOKEN_BYTES = 32;
export const SESSION_TTL_DAYS = 30;
export const MAX_BATCH_SUMMARY_ITEMS = 50;
export const REVIEWS_PER_DAY_LIMIT = 5;
export const REPORTS_PER_DAY_LIMIT = 10;
export const REPORT_REASONS = [
  'harassment',
  'spam',
  'wrong_item',
  'private_info',
  'legal',
  'other',
] as const;
