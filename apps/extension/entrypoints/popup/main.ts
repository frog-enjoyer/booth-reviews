import { getMe, logout, startDiscordAuth } from '../../src/api/client';
import { clearSessionToken, getSessionToken, setSessionToken } from '../../src/auth/session';

const status = document.querySelector('#status');
const login = document.querySelector<HTMLButtonElement>('#login');
const loginError = document.querySelector('#login-error');
const logoutButton = document.querySelector<HTMLButtonElement>('#logout');

async function refreshStatus(): Promise<void> {
  const token = await getSessionToken();
  if (!status) return;

  if (!token) {
    status.textContent = 'Not signed in yet.';
    return;
  }

  try {
    const me = await getMe();
    status.textContent = `Signed in as ${me.publicName}.`;
    if (loginError) loginError.textContent = '';
  } catch {
    status.textContent = 'Session expired. Sign in again.';
    await clearSessionToken();
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
  if (event.origin === 'chrome-extension://' + browser.runtime.id || event.origin === 'moz-extension://' + browser.runtime.id) {
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
