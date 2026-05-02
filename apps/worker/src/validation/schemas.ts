import { MAX_BATCH_SUMMARY_ITEMS, MAX_REVIEW_BODY_LENGTH, MIN_NEGATIVE_REVIEW_BODY_LENGTH } from '@booth-addon/shared';
import { z } from 'zod';

export const itemSeenSchema = z.object({
  itemId: z.string().min(1).max(128),
  boothUrl: z.string().url(),
  canonicalUrl: z.string().url(),
  creator: z
    .object({
      creatorId: z.string().min(1).max(128),
      boothShopUrl: z.string().url(),
      displayName: z.string().max(200).optional(),
    })
    .optional(),
  unavailable: z.boolean().optional(),
});

export const batchSummarySchema = z.object({
  itemIds: z.array(z.string().min(1).max(128)).min(1).max(MAX_BATCH_SUMMARY_ITEMS),
});

const reviewFieldsSchema = z.object({
  rating: z.enum(['up', 'down']),
  body: z.string().max(MAX_REVIEW_BODY_LENGTH).default(''),
  lang: z.enum(['en', 'ja', 'other']),
  purchaseState: z.enum(['unknown', 'not_detected', 'appears_purchased']).default('unknown'),
});

function hasValidNegativeBody(value: { rating: 'up' | 'down'; body: string }): boolean {
  const trimmed = value.body.trim();
  return trimmed.length === 0 || value.rating !== 'down' || trimmed.length >= MIN_NEGATIVE_REVIEW_BODY_LENGTH;
}

export const reviewBodySchema = reviewFieldsSchema
  .extend({
    itemId: z.string().min(1).max(128),
  })
  .refine(hasValidNegativeBody, {
    message: 'Negative reviews need at least 20 characters',
    path: ['body'],
  });

export const reviewUpdateSchema = reviewFieldsSchema.refine(hasValidNegativeBody, {
  message: 'Negative reviews need at least 20 characters',
  path: ['body'],
});

export const reviewVoteSchema = z.object({
  value: z.union([z.literal(1), z.literal(-1)]),
});

export const reportSchema = z.object({
  reviewId: z.string().min(1).max(128),
  reason: z.enum(['harassment', 'spam', 'wrong_item', 'private_info', 'legal', 'other']),
  details: z.string().max(1_000).optional(),
});

export const meUpdateSchema = z.object({
  publicName: z.string().trim().min(2).max(40),
});
