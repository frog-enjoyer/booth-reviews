import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'Booth Trust Layer',
    description: 'Community reviews inline on Booth.pm listings.',
    permissions: ['storage'],
    host_permissions: ['https://booth.pm/*', 'https://*.booth.pm/*'],
    default_locale: 'en',
  },
});
