import { defineConfig } from 'wxt';

const firefoxDataCollectionPermissions = {
  required: [
    'personallyIdentifyingInfo',
    'authenticationInfo',
    'personalCommunications',
    'browsingActivity',
    'websiteContent',
    'websiteActivity',
  ],
};

export default defineConfig({
  vite: () => ({
    envPrefix: ['VITE_', 'PUBLIC_'],
  }),
  manifest: ({ browser }) => ({
    name: 'Booth Reviews',
    description: 'Community reviews and ratings for Booth.pm listings.',
    homepage_url: 'https://github.com/frog-enjoyer/booth-reviews',
    permissions: ['storage'],
    host_permissions: ['https://booth.pm/*', 'https://*.booth.pm/*'],
    default_locale: 'en',
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              data_collection_permissions: firefoxDataCollectionPermissions,
            },
          },
        }
      : {}),
  }),
});
