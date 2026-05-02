export function createReportButton(document: Document): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = 'Report';
  return button;
}
