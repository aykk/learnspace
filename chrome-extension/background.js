// Configure your endpoint here — Next.js app (npm run dev)
const WEBAPP_URL = 'http://localhost:3000/api/bookmarks';

const LEARNSPACE_FOLDER_NAME = 'learnspace';

// Get the Bookmarks bar ID (usually "1")
async function getBookmarksBarId() {
  const tree = await chrome.bookmarks.getTree();
  const root = tree[0];
  const bar = root.children?.find(c => c.id === '1' || c.title === 'Bookmarks bar');
  return bar?.id ?? '1';
}

// Find the learnspace folder ID, or null if not found
async function getLearnspaceFolderId() {
  const barId = await getBookmarksBarId();
  const children = await chrome.bookmarks.getChildren(barId);
  const folder = children.find(c => !c.url && c.title === LEARNSPACE_FOLDER_NAME);
  return folder?.id ?? null;
}

// Create the learnspace folder if it doesn't exist
async function ensureLearnspaceFolder() {
  const existing = await getLearnspaceFolderId();
  if (existing) return existing;

  const barId = await getBookmarksBarId();
  const folder = await chrome.bookmarks.create({
    parentId: barId,
    title: LEARNSPACE_FOLDER_NAME
  });
  return folder.id;
}

// Send bookmark to Snowflake / webapp
async function sendToWebapp(bookmark) {
  if (!bookmark.url) return;

  try {
    const response = await fetch(WEBAPP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: bookmark.url,
        title: bookmark.title || bookmark.url,
        dateAdded: bookmark.dateAdded ? new Date(bookmark.dateAdded).toISOString() : new Date().toISOString()
      })
    });

    if (!response.ok) {
      console.error('Learnspace: Failed to send bookmark', response.status, await response.text());
    }
  } catch (err) {
    console.error('Learnspace: Error sending to webapp', err);
  }
}

// Remove bookmark from Snowflake / webapp when removed from learnspace
async function removeFromWebapp(url) {
  if (!url) return;

  try {
    const response = await fetch(WEBAPP_URL, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      console.error('Learnspace: Failed to remove bookmark', response.status, await response.text());
    }
  } catch (err) {
    console.error('Learnspace: Error removing from webapp', err);
  }
}

// Handle new bookmark created (works for both popup add and drag-drop)
async function onBookmarkCreated(id, bookmark) {
  // Fetch full bookmark - the passed object can be incomplete when created via drag-drop
  const nodes = await chrome.bookmarks.get(id);
  const node = nodes[0];
  if (!node || !node.url) return; // Skip folders

  const learnspaceId = await getLearnspaceFolderId();
  if (!learnspaceId || node.parentId !== learnspaceId) return;

  await sendToWebapp(node);
}

// Handle bookmark moved (drag into or out of learnspace)
async function onBookmarkMoved(id, moveInfo) {
  const learnspaceId = await getLearnspaceFolderId();
  const movedInto = moveInfo.parentId === learnspaceId;
  const movedOutOf = moveInfo.oldParentId === learnspaceId;

  if (movedInto) {
    const nodes = await chrome.bookmarks.get(id);
    const node = nodes[0];
    if (node?.url) await sendToWebapp(node);
  } else if (movedOutOf) {
    const nodes = await chrome.bookmarks.get(id);
    const node = nodes[0];
    if (node?.url) await removeFromWebapp(node.url);
  }
}

// Handle bookmark removed (deleted from learnspace)
function onBookmarkRemoved(id, removeInfo) {
  if (removeInfo.parentId !== undefined) {
    getLearnspaceFolderId().then(learnspaceId => {
      if (learnspaceId && removeInfo.parentId === learnspaceId && removeInfo.node?.url) {
        removeFromWebapp(removeInfo.node.url);
      }
    });
  }
}

// Install: create folder
chrome.runtime.onInstalled.addListener(() => {
  ensureLearnspaceFolder();
});

// Startup: ensure folder exists
chrome.runtime.onStartup.addListener(() => {
  ensureLearnspaceFolder();
});

// Sync Chrome bookmarks to match API (remove from Chrome any deleted on dashboard)
async function syncChromeToApi(apiUrl) {
  const folderId = await getLearnspaceFolderId();
  if (!folderId) return;

  try {
    const res = await fetch(apiUrl || WEBAPP_URL);
    const data = await res.json();
    if (!Array.isArray(data)) return;
    const apiUrls = new Set(data.map(b => b.URL));

    const children = await chrome.bookmarks.getChildren(folderId);
    for (const node of children) {
      if (node.url && !apiUrls.has(node.url)) {
        await chrome.bookmarks.remove(node.id);
      }
    }
  } catch (err) {
    console.error('Learnspace: Sync error', err);
  }
}

// Listen for sync request from dashboard content script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'syncChromeToApi') {
    syncChromeToApi(msg.apiUrl).then(() => sendResponse({ ok: true })).catch(err => sendResponse({ ok: false, error: err.message }));
    return true; // async response
  }
});

// Listen for bookmark events
chrome.bookmarks.onCreated.addListener(onBookmarkCreated);
chrome.bookmarks.onMoved.addListener(onBookmarkMoved);
chrome.bookmarks.onRemoved.addListener(onBookmarkRemoved);
