import type { Review } from '@booth-addon/shared';

import { createReview, deleteReview, getItemReviews, getItemSummary, updateReview, voteOnReview } from '../api/client';
import { getSessionToken } from '../auth/session';
import type { BoothPage } from '../booth/detect-page';
import { detectPurchaseState } from '../booth/purchase-state';
import { createReviewTextarea } from './review-form';

export function renderReview(review: Review, document: Document, isOwner: boolean, onRefresh: () => void): HTMLElement {
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

  const actions = document.createElement('p');
  actions.className = 'booth-trust-review-actions';

  const helpfulBtn = document.createElement('button');
  helpfulBtn.type = 'button';
  helpfulBtn.className = 'booth-trust-vote-btn';
  helpfulBtn.textContent = `Helpful (${review.helpfulUp})`;
  helpfulBtn.addEventListener('click', () => {
    void voteOnReview(review.id, { value: 1 })
      .then(onRefresh)
      .catch(() => undefined);
  });

  const unhelpfulBtn = document.createElement('button');
  unhelpfulBtn.type = 'button';
  unhelpfulBtn.className = 'booth-trust-vote-btn';
  unhelpfulBtn.textContent = `Unhelpful (${review.helpfulDown})`;
  unhelpfulBtn.addEventListener('click', () => {
    void voteOnReview(review.id, { value: -1 })
      .then(onRefresh)
      .catch(() => undefined);
  });

  actions.append(helpfulBtn, ' ', unhelpfulBtn);

  if (isOwner) {
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'booth-trust-edit-btn';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => {
      const textarea = createReviewTextarea(document);
      textarea.value = review.body;
      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.textContent = 'Save';
      const msg = document.createElement('p');
      msg.className = 'booth-trust-form-message';
      saveBtn.addEventListener('click', () => {
        void updateReview(review.id, {
          rating: review.rating,
          body: textarea.value,
          lang: review.lang,
          purchaseState: review.purchaseState,
        })
          .then(() => {
            msg.textContent = 'Updated.';
            setTimeout(onRefresh, 800);
          })
          .catch((error: unknown) => {
            msg.textContent = error instanceof Error ? error.message : 'Update failed.';
          });
      });
      article.replaceChildren(meta, body, textarea, saveBtn, msg);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'booth-trust-delete-btn';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => {
      void deleteReview(review.id)
        .then(onRefresh)
        .catch(() => undefined);
    });

    actions.append(' ', editBtn, ' ', deleteBtn);
  }

  article.append(meta, body, actions);
  return article;
}

function renderEmptyState(document: Document): HTMLElement {
  const empty = document.createElement('p');
  empty.className = 'booth-trust-empty';
  empty.textContent = 'No community reviews yet. Bought this? Leave the first review.';
  return empty;
}

function refreshReviews(
  page: Extract<BoothPage, { kind: 'listing' }>,
  document: Document,
  reviewsEl: HTMLElement,
  statusEl: HTMLElement,
): void {
  void Promise.all([getItemSummary(page.itemId), getItemReviews(page.itemId)])
    .then(([summary, response]) => {
      statusEl.textContent = `${summary.label}: ${summary.upCount} up / ${summary.downCount} down (${summary.reviewCount} reviews)`;
      const refresh = () => refreshReviews(page, document, reviewsEl, statusEl);
      reviewsEl.replaceChildren(
        ...(response.reviews.length > 0
          ? response.reviews.map((review) =>
              renderReview(review, document, review.id === summary.viewerReviewId, refresh),
            )
          : [renderEmptyState(document)]),
      );
    })
    .catch(() => {
      const unavailable = document.createElement('p');
      unavailable.textContent = 'Reviews could not be loaded.';
      reviewsEl.replaceChildren(unavailable);
    });
}

async function renderReviewForm(page: Extract<BoothPage, { kind: 'listing' }>, document: Document, onRefresh: () => void): Promise<HTMLElement> {
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
        message.textContent = 'Review saved.';
        setTimeout(onRefresh, 800);
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

  const refresh = () => refreshReviews(page, document, reviews, status);

  void Promise.all([getItemSummary(page.itemId), getItemReviews(page.itemId)])
    .then(([summary, response]) => {
      status.textContent = `${summary.label}: ${summary.upCount} up / ${summary.downCount} down (${summary.reviewCount} reviews)`;
      reviews.replaceChildren(
        ...(response.reviews.length > 0
          ? response.reviews.map((review) =>
              renderReview(review, document, review.id === summary.viewerReviewId, refresh),
            )
          : [renderEmptyState(document)]),
      );
    })
    .catch(() => {
      status.textContent = 'Community reviews unavailable right now.';
    });

  void renderReviewForm(page, document, refresh).then((form) => {
    container.append(form);
  });
}
