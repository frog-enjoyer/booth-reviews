// @vitest-environment happy-dom

import { REPORT_REASONS } from '@booth-addon/shared';
import { describe, expect, it } from 'vitest';

import { createReportButton } from './report-dialog';

describe('createReportButton', () => {
  it('opens a report dialog with v1 report reasons', () => {
    const button = createReportButton(document, 'review-1');
    document.body.append(button);

    button.click();

    const options = [...document.querySelectorAll('option')].map(
      (option) => option.value,
    );
    expect(options).toEqual([...REPORT_REASONS]);
    expect(document.querySelector('textarea')?.getAttribute('maxlength')).toBe(
      '1000',
    );
    expect(document.body.textContent).toContain('Submit report');
  });
});
