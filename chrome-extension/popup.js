async function getLearnspaceFolderId() {
  const [root] = await chrome.bookmarks.getTree();
  const bar = root.children?.find(c => c.id === '1' || c.title === 'Bookmarks bar');
  const learnspace = bar?.children?.find(c => !c.url && c.title === 'learnspace');
  return learnspace?.id ?? null;
}

// Add link manually
document.getElementById('add-btn').addEventListener('click', async () => {
  const input = document.getElementById('url-input');
  const msgEl = document.getElementById('add-msg');
  const btn = document.getElementById('add-btn');

  let url = input.value.trim();
  if (!url) {
    msgEl.textContent = 'Enter a URL';
    msgEl.className = 'msg error';
    return;
  }
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  try {
    btn.disabled = true;
    msgEl.textContent = '';
    msgEl.className = 'msg';

    const folderId = await getLearnspaceFolderId();
    if (!folderId) {
      msgEl.textContent = 'Learnspace folder not found';
      msgEl.className = 'msg error';
      return;
    }

    // Add to Chrome bookmarks — background listener sends to API
    await chrome.bookmarks.create({
      parentId: folderId,
      title: url,
      url
    });

    input.value = '';
    msgEl.textContent = 'Added!';
    msgEl.className = 'msg success';
  } catch (err) {
    msgEl.textContent = err.message || 'Failed to add';
    msgEl.className = 'msg error';
  } finally {
    btn.disabled = false;
  }
});

document.getElementById('url-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('add-btn').click();
});

// Open the bookmarks manager focused on the learnspace folder
document.getElementById('open-learnspace').addEventListener('click', (e) => {
  e.preventDefault();
  getLearnspaceFolderId().then(folderId => {
    if (folderId) {
      chrome.tabs.create({ url: `chrome://bookmarks/?id=${folderId}` });
    } else {
      chrome.tabs.create({ url: 'chrome://bookmarks/' });
    }
  });
});
