export default defineBackground(() => {
  browser.runtime.onInstalled.addListener(() => {
    if (import.meta.env.DEV) console.info('Booth Trust Layer installed');
  });
});
