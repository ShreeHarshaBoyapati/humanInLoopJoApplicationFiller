import { ExtensionMessage } from '@repo/shared-types';

export function handleContentMessages(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
) {
  if (message.action === 'OPEN_SIDE_PANEL') {
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
