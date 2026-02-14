console.log('Background service worker started');

// Listen for installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Extension installed');
});
