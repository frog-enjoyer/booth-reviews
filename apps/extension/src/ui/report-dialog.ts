import { REPORT_REASONS, type ReportReason } from '@booth-addon/shared';

import { reportReview } from '../api/client';

const reasonLabels: Record<ReportReason, string> = {
  harassment: 'Harassment or hate',
  spam: 'Spam or manipulation',
  wrong_item: 'Wrong item',
  private_info: 'Private information',
  legal: 'Legal or safety issue',
  other: 'Other',
};

function createReportForm(document: Document, reviewId: string): HTMLElement {
  const form = document.createElement('div');
  form.className = 'booth-trust-report-dialog';

  const label = document.createElement('label');
  label.textContent = 'Reason';

  const select = document.createElement('select');
  select.className = 'booth-trust-report-reason';
  for (const reason of REPORT_REASONS) {
    const option = document.createElement('option');
    option.value = reason;
    option.textContent = reasonLabels[reason];
    select.append(option);
  }
  label.append(select);

  const details = document.createElement('textarea');
  details.className = 'booth-trust-report-details';
  details.maxLength = 1000;
  details.placeholder = 'Optional details for moderators';

  const submit = document.createElement('button');
  submit.type = 'button';
  submit.textContent = 'Submit report';

  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.textContent = 'Cancel';
  cancel.addEventListener('click', () => form.remove());

  const message = document.createElement('p');
  message.className = 'booth-trust-form-message';

  submit.addEventListener('click', () => {
    submit.disabled = true;
    message.textContent = 'Sending report...';

    void reportReview({
      reviewId,
      reason: select.value as ReportReason,
      ...(details.value.trim() ? { details: details.value.trim() } : {}),
    })
      .then(() => {
        message.textContent = 'Report sent. Thank you.';
      })
      .catch((error: unknown) => {
        submit.disabled = false;
        message.textContent =
          error instanceof Error ? error.message : 'Report failed.';
      });
  });

  form.append(label, details, submit, cancel, message);
  return form;
}

export function createReportButton(
  document: Document,
  reviewId: string,
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'booth-trust-report-btn';
  button.textContent = 'Report';
  button.addEventListener('click', () => {
    const existing = button.parentElement?.querySelector(
      '.booth-trust-report-dialog',
    );
    if (existing) {
      existing.remove();
      return;
    }

    button.insertAdjacentElement(
      'afterend',
      createReportForm(document, reviewId),
    );
  });
  return button;
}
