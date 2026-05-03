import { defineConfig } from 'wxt';

export default defineConfig({
  vite: () => ({
    envPrefix: ['VITE_', 'PUBLIC_'],
  }),
  manifest: {
    name: 'Booth Reviews',
    description: 'Community reviews and ratings for Booth.pm listings.',
    permissions: ['storage'],
    host_permissions: ['https://booth.pm/*', 'https://*.booth.pm/*'],
    default_locale: 'en',
  },
});
