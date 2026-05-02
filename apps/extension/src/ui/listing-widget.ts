import type { Review } from '@booth-addon/shared';

import { createReview, getItemReviews, getItemSummary } from '../api/client';
import { getSessionToken } from '../auth/session';
import type { BoothPage } from '../booth/detect-page';
import { detectPurchaseState } from '../booth/purchase-state';
import { createReviewTextarea } from './review-form';

export function renderReview(review: Review, document: Document): HTMLElement {
  const article = document.createElement('article');
  article.className = 'booth-trust-review';

  const meta = document.createElement('p');
  meta.className = 'booth-trust-review-meta';
  meta.textContent = `${review.rating === 'up' ? 'Up' : 'Down'} by ${review.authorName}`;

  if (review.purchaseState === 'appears_purchased') {
    const badge = document.createElement('span');
    badge.className = 'booth-trust-purchase-badge';
    badge.textContent = 'Purchase detected';
    meta.append(' ', badge);
  }

  const body = document.createElement('p');
  body.className = 'booth-trust-review-body';
  body.textContent = review.body || '(No written review.)';

  const helpful = document.createElement('p');
  helpful.className = 'booth-trust-review-helpful';
  helpful.textContent = `Helpful: ${review.helpfulUp} / ${review.helpfulDown}`;

  article.append(meta, body, helpful);
  return article;
}

function renderEmptyState(document: Document): HTMLElement {
  const empty = document.createElement('p');
  empty.className = 'booth-trust-empty';
  empty.textContent = 'No community reviews yet. Bought this? Leave the first review.';
  return empty;
}

async function renderReviewForm(page: Extract<BoothPage, { kind: 'listing' }>, document: Document): Promise<HTMLElement> {
  const token = await getSessionToken();
  const wrapper = document.createElement('div');
  wrapper.className = 'booth-trust-form';

  if (!token) {
    const prompt = document.createElement('p');
    prompt.textContent = 'Sign in with Discord to review.';
    wrapper.append(prompt);
    return wrapper;
  }

  const rating = document.createElement('select');
  rating.className = 'booth-trust-rating';

  const up = document.createElement('option');
  up.value = 'up';
  up.textContent = 'Up';

  const down = document.createElement('option');
  down.value = 'down';
  down.textContent = 'Down';

  rating.append(up, down);

  const textarea = createReviewTextarea(document);
  const message = document.createElement('p');
  message.className = 'booth-trust-form-message';

  const submit = document.createElement('button');
  submit.type = 'button';
  submit.textContent = 'Submit review';

  submit.addEventListener('click', () => {
    message.textContent = 'Saving...';
    void createReview({
      itemId: page.itemId,
      rating: rating.value === 'down' ? 'down' : 'up',
      body: textarea.value,
      lang: navigator.language.startsWith('ja') ? 'ja' : 'en',
      purchaseState: detectPurchaseState(document),
    })
      .then(() => {
        message.textContent = 'Review saved. Refresh to see it in the list.';
      })
      .catch((error: unknown) => {
        message.textContent = error instanceof Error ? error.message : 'Review failed to save.';
      });
  });

  wrapper.append(rating, textarea, submit, message);
  return wrapper;
}

export function mountListingWidget(page: Extract<BoothPage, { kind: 'listing' }>, document: Document): void {
  const container = document.createElement('section');
  container.className = 'booth-trust-widget';

  const title = document.createElement('strong');
  title.textContent = 'Community reviews';

  const status = document.createElement('p');
  status.textContent = 'Loading review signal...';

  const reviews = document.createElement('div');
  reviews.className = 'booth-trust-reviews';

  container.append(title, status, reviews);

  const target = document.querySelector('main') ?? document.body;
  target.prepend(container);

  void getItemSummary(page.itemId)
    .then((summary) => {
      status.textContent = `${summary.label}: ${summary.upCount} up / ${summary.downCount} down (${summary.reviewCount} reviews)`;
    })
    .catch(() => {
      status.textContent = 'Community reviews unavailable right now.';
    });

  void getItemReviews(page.itemId)
    .then((response) => {
      reviews.replaceChildren(
        ...(response.reviews.length > 0
          ? response.reviews.map((review) => renderReview(review, document))
          : [renderEmptyState(document)]),
      );
    })
    .catch(() => {
      const unavailable = document.createElement('p');
      unavailable.textContent = 'Reviews could not be loaded.';
      reviews.replaceChildren(unavailable);
    });

  void renderReviewForm(page, document).then((form) => {
    container.append(form);
  });
}
