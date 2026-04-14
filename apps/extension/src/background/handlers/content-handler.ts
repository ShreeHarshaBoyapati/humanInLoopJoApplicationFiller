import { AUTH_STORAGE_KEY, type StoredAuth } from '@repo/shared-types';
import type { ExtensionMessage } from '@repo/shared-types';

export function handleContentMessages(
  message: ExtensionMessage & Record<string, unknown>,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
) {
  const action = message.action as string;

  // Handle auth storage operations from content scripts
  if (action === 'AUTH_STORAGE_SET') {
    const authData = message.payload as StoredAuth;
    chrome.storage.session.set({ [AUTH_STORAGE_KEY]: authData }, () => {
      if (chrome.runtime.lastError) {
        console.error('[Auth Storage] Error setting auth data:', chrome.runtime.lastError.message);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('[Auth Storage] Auth data saved to session storage');
        sendResponse({ success: true });
      }
    });
    return true;
  }

  if (action === 'AUTH_STORAGE_GET') {
    chrome.storage.session.get([AUTH_STORAGE_KEY], (result) => {
      if (chrome.runtime.lastError) {
        console.error('[Auth Storage] Error getting auth data:', chrome.runtime.lastError.message);
        sendResponse({ success: false, error: chrome.runtime.lastError.message, data: null });
      } else {
        const authData = result[AUTH_STORAGE_KEY] as StoredAuth | undefined;
        sendResponse({ success: true, data: authData || null });
      }
    });
    return true;
  }

  if (action === 'AUTH_STORAGE_REMOVE') {
    chrome.storage.session.remove(AUTH_STORAGE_KEY, () => {
      if (chrome.runtime.lastError) {
        console.error('[Auth Storage] Error removing auth data:', chrome.runtime.lastError.message);
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('[Auth Storage] Auth data removed from session storage');
        sendResponse({ success: true });
      }
    });
    return true;
  }

  if (action === 'OPEN_SIDE_PANEL') {
    const tabId = sender.tab?.id;
    if (tabId) {
      chrome.sidePanel
        .open({ tabId })
        .then(() => sendResponse({ success: true }))
        .catch((err) => {
          console.error('Failed to open side panel:', err);
          sendResponse({ success: false, error: String(err) });
        });
    } else {
      sendResponse({ success: false, error: 'No tab id' });
    }
    return true;
  }
}
