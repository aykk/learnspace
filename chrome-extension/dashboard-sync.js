// Content script: syncs Chrome learnspace folder to match API when dashboard is open
// (Removes from Chrome any bookmarks that were deleted on the dashboard)

// Match dev server port — update if running on different port
const API_BASE = window.location.origin;
const API_URL = `${API_BASE}/api/bookmarks`;

async function getLearnspaceFolderId() {
  const [root] = await chrome.bookmarks.getTree();
  const bar = root.children?.find(c => c.id === '1' || c.title === 'Bookmarks bar');
  const folder = bar?.children?.find(c => !c.url && c.title === 'learnspace');
  return folder?.id ?? null;
}

async function syncChromeToApi() {
  const folderId = await getLearnspaceFolderId();
  if (!folderId) return;

  let apiUrls;
  try {
    const res = await fetch(API_URL);
    const data = await res.json();
    if (!Array.isArray(data)) return;
    apiUrls = new Set(data.map(b => b.URL));
  } catch {
    return;
  }

  const children = await chrome.bookmarks.getChildren(folderId);
  for (const node of children) {
    if (node.url && !apiUrls.has(node.url)) {
      await chrome.bookmarks.remove(node.id);
    }
  }
}

// Sync when page loads
syncChromeToApi();

// Sync periodically while dashboard is visible
setInterval(() => {
  if (document.visibilityState === 'visible') {
    syncChromeToApi();
  }
}, 3000);
