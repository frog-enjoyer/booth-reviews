export function createReviewTextarea(document: Document): HTMLTextAreaElement {
  const textarea = document.createElement('textarea');
  textarea.className = 'booth-trust-review-textarea';
  textarea.maxLength = 2000;
  textarea.placeholder = 'What should other buyers know?';
  return textarea;
}
