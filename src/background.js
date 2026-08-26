chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === "install") {
    chrome.storage.local.set({ icicleEnabled: true });
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "ICICLE_PING") {
    sendResponse({ ok: true, version: chrome.runtime.getManifest().version });
    return false;
  }
  return false;
});
