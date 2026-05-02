import '../src/styles/injected.css';

import { detectBoothPage } from '../src/booth/detect-page';
import { mountBoothTrustLayer } from '../src/ui/mount';

export default defineContentScript({
  matches: ['https://booth.pm/*', 'https://*.booth.pm/*'],
  main() {
    try {
      const page = detectBoothPage(document, location.href);
      mountBoothTrustLayer(page, document);
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Booth Trust Layer failed to mount', error);
    }
  },
});
