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
    console.log('Learnspace: Sending bookmark to API:', bookmark.url);
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
      const errorText = await response.text();
      console.error('Learnspace: Failed to send bookmark', response.status, errorText);
      return false;
    }
    console.log('Learnspace: Successfully sent bookmark:', bookmark.url);
    return true;
  } catch (err) {
    console.error('Learnspace: Error sending to webapp', err);
    return false;
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
  if (!learnspaceId) {
    console.log('Learnspace: No learnspace folder found when bookmark created');
    return;
  }
  
  if (node.parentId !== learnspaceId) {
    console.log('Learnspace: Bookmark created but not in learnspace folder', node.parentId, learnspaceId);
    return;
  }

  console.log('Learnspace: New bookmark detected in learnspace folder:', node.url);
  await sendToWebapp(node);
}

// Handle bookmark moved (drag into or out of learnspace)
async function onBookmarkMoved(id, moveInfo) {
  const learnspaceId = await getLearnspaceFolderId();
  if (!learnspaceId) return;
  
  const movedInto = moveInfo.parentId === learnspaceId;
  const movedOutOf = moveInfo.oldParentId === learnspaceId;

  if (movedInto) {
    console.log('Learnspace: Bookmark moved into learnspace folder');
    const nodes = await chrome.bookmarks.get(id);
    const node = nodes[0];
    if (node?.url) await sendToWebapp(node);
  } else if (movedOutOf) {
    console.log('Learnspace: Bookmark moved out of learnspace folder');
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

// Install: create folder and sync existing bookmarks
chrome.runtime.onInstalled.addListener(() => {
  ensureLearnspaceFolder().then(() => {
    // Sync existing bookmarks on install
    setTimeout(() => syncAllBookmarksToApi(), 1000);
  });
});

// Startup: ensure folder exists and sync existing bookmarks
chrome.runtime.onStartup.addListener(() => {
  ensureLearnspaceFolder().then(() => {
    // Sync existing bookmarks on startup
    setTimeout(() => syncAllBookmarksToApi(), 1000);
  });
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

// Sync all bookmarks from learnspace folder to API (for existing bookmarks)
async function syncAllBookmarksToApi() {
  const folderId = await getLearnspaceFolderId();
  if (!folderId) {
    console.log('Learnspace: No learnspace folder found');
    return { success: 0, failed: 0 };
  }

  try {
    console.log('Learnspace: Starting sync of all bookmarks from folder...');
    const children = await chrome.bookmarks.getChildren(folderId);
    const bookmarks = children.filter(node => node.url); // Only get actual bookmarks, not subfolders
    
    console.log(`Learnspace: Found ${bookmarks.length} bookmarks in folder`);
    
    let success = 0;
    let failed = 0;
    
    for (const bookmark of bookmarks) {
      const result = await sendToWebapp(bookmark);
      if (result) {
        success++;
      } else {
        failed++;
      }
    }
    
    console.log(`Learnspace: Sync complete - ${success} succeeded, ${failed} failed`);
    return { success, failed };
  } catch (err) {
    console.error('Learnspace: Error syncing bookmarks', err);
    return { success: 0, failed: 0, error: err.message };
  }
}

// Listen for sync request from dashboard content script
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'syncChromeToApi') {
    syncChromeToApi(msg.apiUrl).then(() => sendResponse({ ok: true })).catch(err => sendResponse({ ok: false, error: err.message }));
    return true; // async response
  }
  if (msg.type === 'syncAllBookmarksToApi') {
    syncAllBookmarksToApi().then(result => sendResponse({ ok: true, ...result })).catch(err => sendResponse({ ok: false, error: err.message }));
    return true; // async response
  }
});

// Listen for bookmark events
chrome.bookmarks.onCreated.addListener(onBookmarkCreated);
chrome.bookmarks.onMoved.addListener(onBookmarkMoved);
chrome.bookmarks.onRemoved.addListener(onBookmarkRemoved);
