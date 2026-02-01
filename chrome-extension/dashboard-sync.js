// Content script: asks background to sync Chrome bookmarks to match API
// (Background has chrome.bookmarks access; content scripts do not)

const API_URL = `${window.location.origin}/api/bookmarks`;

function requestSync() {
  chrome.runtime.sendMessage({ type: 'syncChromeToApi', apiUrl: API_URL });
}

// Sync when page loads
requestSync();

// Sync periodically while dashboard is visible
setInterval(() => {
  if (document.visibilityState === 'visible') {
    requestSync();
  }
}, 3000);
