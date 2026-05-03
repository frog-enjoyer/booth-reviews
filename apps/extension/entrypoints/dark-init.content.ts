import { applyDarkModeStyle, removeDarkModeStyle } from '../src/ui/dark-mode-style';

export default defineContentScript({
  matches: ['https://booth.pm/*', 'https://*.booth.pm/*'],
  runAt: 'document_start',
  main() {
    // Apply immediately to hide any white flash, then remove if dark mode is off.
    applyDarkModeStyle();
    void browser.storage.local.get('darkMode').then((result) => {
      if (result.darkMode !== true) removeDarkModeStyle();
    });
  },
});
