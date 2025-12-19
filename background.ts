browser.runtime.onInstalled.addListener(() => {
  processAllFolders();
});

// Also run on new mail
browser.messages.onNewMailReceived.addListener(async (folder, messages) => {
  for (let msg of messages.messages) {
    await tagMessageByDomain(msg);
  }
});

async function processAllFolders() {
  const accounts = await browser.accounts.list();

  for (let account of accounts) {
    for (let folder of account.folders) {
      await scanFolderRecursive(folder);
    }
  }
}

async function scanFolderRecursive(folder) {
  await scanFolder(folder);

  if (folder.subFolders && folder.subFolders.length > 0) {
    for (let sub of folder.subFolders) {
      await scanFolderRecursive(sub);
    }
  }
}

async function scanFolder(folder) {
  const list = await browser.messages.list(folder);

  for (let msg of list.messages) {
    await tagMessageByDomain(msg);
  }
}

function extractDomain(fromHeader) {
  const match = fromHeader.match(/@([A-Za-z0-9.-]+)/);
  return match ? match[1].toLowerCase() : null;
}

async function tagMessageByDomain(msg) {
  const full = await browser.messages.getFull(msg.id);
  const from = full.headers.from ? full.headers.from[0] : null;

  if (!from) return;

  const domain = extractDomain(from);
  if (!domain) return;

  const tagId = await ensureTag(domain);

  await browser.messages.update(msg.id, {
    tags: [tagId]
  });
}

async function ensureTag(domain) {
  const allTags = await browser.messages.listTags();
  
  let existing = allTags.find(t => t.tag === domain);
  if (existing) return existing.key;

  const newTag = await browser.messages.createTag(domain, domain);
  return newTag.key;
}
