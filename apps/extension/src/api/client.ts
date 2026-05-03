import type {
  ApiResult,
  AuthStartResponse,
  BatchSummaryResponse,
  ItemSummary,
  Me,
  ReportInput,
  ReviewInput,
  ReviewsResponse,
  ReviewVoteInput,
} from '@booth-addon/shared';

import { clearSessionToken, getSessionToken } from '../auth/session';

const API_BASE_URL =
  import.meta.env.PUBLIC_API_BASE_URL ?? 'http://localhost:8787';

async function request<T>(
  path: string,
  init?: RequestInit & { auth?: boolean },
): Promise<T> {
  const token = init?.auth ? await getSessionToken() : null;
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  const result = (await response.json()) as ApiResult<T>;
  if (!result.ok) {
    if (result.error.code === 'SESSION_EXPIRED') await clearSessionToken();
    throw new Error(result.error.message);
  }
  return result.data;
}

export function notifyItemSeen(input: {
  itemId: string;
  boothUrl: string;
  canonicalUrl: string;
  creatorId?: string;
  boothShopUrl?: string;
}): Promise<{ saved: true }> {
  return request<{ saved: true }>('/items/seen', {
    method: 'POST',
    body: JSON.stringify({
      itemId: input.itemId,
      boothUrl: input.boothUrl,
      canonicalUrl: input.canonicalUrl,
      ...(input.creatorId && input.boothShopUrl
        ? {
            creator: {
              creatorId: input.creatorId,
              boothShopUrl: input.boothShopUrl,
            },
          }
        : {}),
    }),
  });
}

export function getItemSummary(itemId: string): Promise<ItemSummary> {
  return request<ItemSummary>(`/items/${encodeURIComponent(itemId)}/summary`, {
    auth: true,
  });
}

export function getItemSummaries(
  itemIds: string[],
): Promise<BatchSummaryResponse> {
  return request<BatchSummaryResponse>('/items/summaries', {
    method: 'POST',
    body: JSON.stringify({ itemIds }),
  });
}

export function getItemReviews(itemId: string): Promise<ReviewsResponse> {
  return request<ReviewsResponse>(
    `/items/${encodeURIComponent(itemId)}/reviews`,
  );
}

export function createReview(input: ReviewInput): Promise<{ saved: true }> {
  return request<{ saved: true }>('/reviews', {
    auth: true,
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateReview(
  reviewId: string,
  input: Omit<ReviewInput, 'itemId'>,
): Promise<{ saved: true }> {
  return request<{ saved: true }>(`/reviews/${encodeURIComponent(reviewId)}`, {
    auth: true,
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function deleteReview(reviewId: string): Promise<{ deleted: true }> {
  return request<{ deleted: true }>(
    `/reviews/${encodeURIComponent(reviewId)}`,
    {
      auth: true,
      method: 'DELETE',
    },
  );
}

export function voteOnReview(
  reviewId: string,
  input: ReviewVoteInput,
): Promise<{ saved: true }> {
  return request<{ saved: true }>(
    `/reviews/${encodeURIComponent(reviewId)}/votes`,
    {
      auth: true,
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

export function reportReview(input: ReportInput): Promise<{ saved: true }> {
  return request<{ saved: true }>('/reports', {
    auth: true,
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function startDiscordAuth(): Promise<AuthStartResponse> {
  return request<AuthStartResponse>('/auth/discord/start', { method: 'POST' });
}

export function getMe(): Promise<Me> {
  return request<Me>('/me', { auth: true });
}

export function updateMe(input: { publicName: string }): Promise<Me> {
  return request<Me>('/me', {
    auth: true,
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function logout(): Promise<{ loggedOut: true }> {
  return request<{ loggedOut: true }>('/auth/logout', {
    auth: true,
    method: 'POST',
  });
}
