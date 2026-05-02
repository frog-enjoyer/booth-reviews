const SESSION_KEY = 'boothTrustSessionToken';

export async function getSessionToken(): Promise<string | null> {
  const result = await browser.storage.local.get(SESSION_KEY);
  return typeof result[SESSION_KEY] === 'string' ? result[SESSION_KEY] : null;
}

export async function setSessionToken(token: string): Promise<void> {
  await browser.storage.local.set({ [SESSION_KEY]: token });
}

export async function clearSessionToken(): Promise<void> {
  await browser.storage.local.remove(SESSION_KEY);
}
