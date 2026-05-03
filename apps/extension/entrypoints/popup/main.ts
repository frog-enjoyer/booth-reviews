import { getMe, logout, startDiscordAuth } from '../../src/api/client';
import { clearSessionToken, getSessionToken, setSessionToken } from '../../src/auth/session';
import { getDarkMode, setDarkMode } from '../../src/ui/dark-mode';

const stateLoading = document.querySelector<HTMLElement>('#state-loading');
const stateSignedIn = document.querySelector<HTMLElement>('#state-signed-in');
const stateSignedOut = document.querySelector<HTMLElement>('#state-signed-out');
const userName = document.querySelector<HTMLElement>('#user-name');
const login = document.querySelector<HTMLButtonElement>('#login');
const loginError = document.querySelector<HTMLElement>('#login-error');
const logoutButton = document.querySelector<HTMLButtonElement>('#logout');

function showState(state: 'loading' | 'signed-in' | 'signed-out'): void {
  stateLoading?.classList.toggle('hidden', state !== 'loading');
  stateSignedIn?.classList.toggle('hidden', state !== 'signed-in');
  stateSignedOut?.classList.toggle('hidden', state !== 'signed-out');
}

async function refreshStatus(): Promise<void> {
  showState('loading');
  if (loginError) loginError.textContent = '';

  const token = await getSessionToken();
  if (!token) {
    showState('signed-out');
    return;
  }

  try {
    const me = await getMe();
    if (userName) userName.textContent = me.publicName;
    showState('signed-in');
  } catch {
    await clearSessionToken();
    showState('signed-out');
  }
}

login?.addEventListener('click', () => {
  if (loginError) loginError.textContent = '';

  void startDiscordAuth()
    .then(({ url }) => {
      // window.open sets window.opener on the callback page so postMessage works.
      // browser.windows.create does not set window.opener.
      window.open(url, '_blank', 'width=500,height=600,popup=1');
    })
    .catch((error: unknown) => {
      if (loginError) loginError.textContent = error instanceof Error ? error.message : 'Could not start Discord login.';
    });
});

function handleAuthMessage(event: MessageEvent): void {
  if (
    event.origin === 'chrome-extension://' + browser.runtime.id ||
    event.origin === 'moz-extension://' + browser.runtime.id
  ) {
    return;
  }
  const data = event.data;
  if (data?.type === 'AUTH_SUCCESS' && typeof data.token === 'string') {
    void setSessionToken(data.token).then(refreshStatus);
    window.removeEventListener('message', handleAuthMessage);
  }
  if (data?.type === 'AUTH_ERROR') {
    if (loginError) loginError.textContent = data.message ?? 'Login failed.';
    window.removeEventListener('message', handleAuthMessage);
  }
}

window.addEventListener('message', handleAuthMessage);

logoutButton?.addEventListener('click', () => {
  void logout()
    .catch(() => undefined)
    .then(clearSessionToken)
    .then(refreshStatus);
});

void refreshStatus();

const darkModeToggle = document.querySelector<HTMLInputElement>('#dark-mode-toggle');

void getDarkMode().then((enabled) => {
  if (darkModeToggle) darkModeToggle.checked = enabled;
});

darkModeToggle?.addEventListener('change', () => {
  void setDarkMode(darkModeToggle.checked);
});
