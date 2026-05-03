import '../src/styles/injected.css';

import { detectBoothPage } from '../src/booth/detect-page';
import { mountBoothTrustLayer } from '../src/ui/mount';
import { getDarkMode } from '../src/ui/dark-mode';
import { applyDarkModeStyle, removeDarkModeStyle } from '../src/ui/dark-mode-style';

export default defineContentScript({
  matches: ['https://booth.pm/*', 'https://*.booth.pm/*'],
  async main() {
    try {
      const page = detectBoothPage(document, location.href);
      mountBoothTrustLayer(page, document);
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Booth Trust Layer failed to mount', error);
    }

    const enabled = await getDarkMode();
    if (enabled) applyDarkModeStyle(); else removeDarkModeStyle();

    browser.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && 'darkMode' in changes) {
        if (changes.darkMode.newValue === true) applyDarkModeStyle();
        else removeDarkModeStyle();
      }
    });
  },
});
