const STORAGE_KEY = 'darkMode';

export async function getDarkMode(): Promise<boolean> {
  const result = await browser.storage.local.get(STORAGE_KEY);
  return result[STORAGE_KEY] === true;
}

export async function setDarkMode(enabled: boolean): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY]: enabled });
}
