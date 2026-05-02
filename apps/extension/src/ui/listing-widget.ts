import type { ItemSummary, Review } from '@booth-addon/shared';

import { createReview, deleteReview, getItemReviews, getItemSummary, notifyItemSeen, updateReview, voteOnReview } from '../api/client';
import { getSessionToken } from '../auth/session';
import type { BoothPage } from '../booth/detect-page';
import { detectPurchaseState } from '../booth/purchase-state';
import { createReviewTextarea } from './review-form';

function renderRatingBar(
  page: Extract<BoothPage, { kind: 'listing' }>,
  summary: ItemSummary,
  document: Document,
  onRefresh: () => void,
): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'booth-trust-rating-bar';

  const upBtn = document.createElement('button');
  upBtn.type = 'button';
  upBtn.className = 'booth-trust-rate-btn booth-trust-rate-up' + (summary.viewerRating === 'up' ? ' booth-trust-rate-active' : '');
  upBtn.textContent = `👍 ${summary.upCount}`;

  const downBtn = document.createElement('button');
  downBtn.type = 'button';
  downBtn.className = 'booth-trust-rate-btn booth-trust-rate-down' + (summary.viewerRating === 'down' ? ' booth-trust-rate-active' : '');
  downBtn.textContent = `👎 ${summary.downCount}`;

  upBtn.addEventListener('click', () => {
    void createReview({
      itemId: page.itemId,
      rating: 'up',
      body: '',
      lang: navigator.language.startsWith('ja') ? 'ja' : 'en',
      purchaseState: detectPurchaseState(document),
    })
      .then(onRefresh)
      .catch(() => undefined);
  });

  downBtn.addEventListener('click', () => {
    void createReview({
      itemId: page.itemId,
      rating: 'down',
      body: '',
      lang: navigator.language.startsWith('ja') ? 'ja' : 'en',
      purchaseState: detectPurchaseState(document),
    })
      .then(onRefresh)
      .catch(() => undefined);
  });

  bar.append(upBtn, downBtn);
  return bar;
}

export function renderReview(review: Review, document: Document, isOwner: boolean, onRefresh: () => void): HTMLElement {
  const article = document.createElement('article');
  article.className = 'booth-trust-review';

  const meta = document.createElement('p');
  meta.className = 'booth-trust-review-meta';
  meta.textContent = `${review.rating === 'up' ? '👍' : '👎'} ${review.authorName}`;

  if (review.purchaseState === 'appears_purchased') {
    const badge = document.createElement('span');
    badge.className = 'booth-trust-purchase-badge';
    badge.textContent = 'Purchase detected';
    meta.append(' ', badge);
  }

  const body = document.createElement('p');
  body.className = 'booth-trust-review-body';
  body.textContent = review.body;

  const actions = document.createElement('p');
  actions.className = 'booth-trust-review-actions';

  const helpfulBtn = document.createElement('button');
  helpfulBtn.type = 'button';
  helpfulBtn.className = 'booth-trust-vote-btn';
  helpfulBtn.textContent = `Helpful (${review.helpfulUp})`;
  helpfulBtn.addEventListener('click', () => {
    void voteOnReview(review.id, { value: 1 }).then(onRefresh).catch(() => undefined);
  });

  const unhelpfulBtn = document.createElement('button');
  unhelpfulBtn.type = 'button';
  unhelpfulBtn.className = 'booth-trust-vote-btn';
  unhelpfulBtn.textContent = `Unhelpful (${review.helpfulDown})`;
  unhelpfulBtn.addEventListener('click', () => {
    void voteOnReview(review.id, { value: -1 }).then(onRefresh).catch(() => undefined);
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
      void deleteReview(review.id).then(onRefresh).catch(() => undefined);
    });

    actions.append(' ', editBtn, ' ', deleteBtn);
  }

  article.append(meta, body, actions);
  return article;
}

async function renderWriteForm(
  page: Extract<BoothPage, { kind: 'listing' }>,
  summary: ItemSummary,
  document: Document,
  onRefresh: () => void,
): Promise<HTMLElement> {
  const token = await getSessionToken();
  const wrapper = document.createElement('div');
  wrapper.className = 'booth-trust-form';

  if (!token) {
    const prompt = document.createElement('p');
    prompt.textContent = 'Sign in with Discord to rate and review.';
    wrapper.append(prompt);
    return wrapper;
  }

  if (!summary.viewerRating) {
    const prompt = document.createElement('p');
    prompt.className = 'booth-trust-form-message';
    prompt.textContent = 'Rate the item above before writing a review.';
    wrapper.append(prompt);
    return wrapper;
  }

  const textarea = createReviewTextarea(document);
  const message = document.createElement('p');
  message.className = 'booth-trust-form-message';

  const submit = document.createElement('button');
  submit.type = 'button';
  submit.textContent = 'Submit written review';

  submit.addEventListener('click', () => {
    message.textContent = 'Saving...';
    void createReview({
      itemId: page.itemId,
      rating: summary.viewerRating!,
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

  wrapper.append(textarea, submit, message);
  return wrapper;
}

function buildWidget(
  page: Extract<BoothPage, { kind: 'listing' }>,
  summary: ItemSummary,
  writtenReviews: Review[],
  document: Document,
  _ratingBarEl: HTMLElement,
  reviewsEl: HTMLElement,
  onRefresh: () => void,
): void {
  if (writtenReviews.length > 0) {
    reviewsEl.replaceChildren(
      ...writtenReviews.map((review) =>
        renderReview(review, document, review.id === summary.viewerReviewId, onRefresh),
      ),
    );
  } else {
    const empty = document.createElement('p');
    empty.className = 'booth-trust-empty';
    empty.textContent = 'No written reviews yet.';
    reviewsEl.replaceChildren(empty);
  }
}

export function mountListingWidget(page: Extract<BoothPage, { kind: 'listing' }>, document: Document): void {
  void notifyItemSeen({
    itemId: page.itemId,
    boothUrl: page.canonicalUrl,
    canonicalUrl: page.canonicalUrl,
    ...(page.creatorUrl ? { creatorId: page.creatorUrl, boothShopUrl: page.creatorUrl } : {}),
  }).catch(() => undefined);

  // Rating bar — injected next to the wishlist (heart) button
  const ratingBar = document.createElement('div');
  ratingBar.className = 'booth-trust-rating-bar-wrapper';
  ratingBar.textContent = '…';
  const wishlistBtn = document.querySelector('#js-item-wishlist-button');
  if (wishlistBtn) {
    // Insert into the flex row that contains the wishlist button
    const flexRow = wishlistBtn.closest('.flex') ?? wishlistBtn.parentElement;
    if (flexRow) {
      flexRow.insertAdjacentElement('afterend', ratingBar);
    } else {
      wishlistBtn.insertAdjacentElement('afterend', ratingBar);
    }
  }

  // Reviews + form — injected after the image gallery
  const reviewsContainer = document.createElement('section');
  reviewsContainer.className = 'booth-trust-widget';

  const title = document.createElement('strong');
  title.textContent = 'Community reviews';

  const reviewsEl = document.createElement('div');
  reviewsEl.className = 'booth-trust-reviews';

  const formEl = document.createElement('div');

  reviewsContainer.append(title, reviewsEl, formEl);

  const imageSection =
    document.querySelector('.image-list.slick-slider') ??
    document.querySelector('.primary-image-thumbnails');
  if (imageSection) {
    imageSection.insertAdjacentElement('afterend', reviewsContainer);
  } else {
    (document.querySelector('main') ?? document.body).prepend(reviewsContainer);
  }

  function refresh(): void {
    void Promise.all([getItemSummary(page.itemId), getItemReviews(page.itemId)])
      .then(([summary, response]) => {
        ratingBar.replaceChildren(renderRatingBar(page, summary, document, refresh));
        const writtenReviews = response.reviews.filter((r) => r.body.trim().length > 0);
        buildWidget(page, summary, writtenReviews, document, ratingBar, reviewsEl, refresh);
        void renderWriteForm(page, summary, document, refresh).then((form) => {
          formEl.replaceChildren(form);
        });
      })
      .catch(() => {
        ratingBar.textContent = '';
      });
  }

  refresh();
}
