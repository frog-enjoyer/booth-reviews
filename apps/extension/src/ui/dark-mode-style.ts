const STYLE_ID = 'booth-trust-dark-mode';

const CSS = `
html { filter: invert(1) hue-rotate(180deg) contrast(0.75) !important; }
html img, html video, html picture, html canvas, html embed, html object, html iframe {
  filter: invert(1) hue-rotate(180deg) contrast(1.333);
}
`;

export function applyDarkModeStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.documentElement.appendChild(style);
}

export function removeDarkModeStyle(): void {
  document.getElementById(STYLE_ID)?.remove();
}
