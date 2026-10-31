const analyticsEndpoint = "https://gateway.umami.is/api/send";
const analyticsWebsite = "6a71fb6b-75b0-4136-85cb-6be6f17dae25";
const analyticsEvents = new Set(["extension_active"]);
const analyticsLastActiveKey = "icicleAnalyticsLastActive";
const analyticsThrottleMs = 24 * 60 * 60 * 1000;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "icicle-analytics" || !analyticsEvents.has(message.event)) return false;
  (async () => {
    try {
      const stored = await chrome.storage.local.get(["icicleSettings", analyticsLastActiveKey]);
      if (stored.icicleSettings?.analyticsEnabled === false) {
        sendResponse({ ok: true, skipped: true });
        return;
      }
      const now = Date.now();
      if (now - Number(stored[analyticsLastActiveKey] ?? 0) < analyticsThrottleMs) {
        sendResponse({ ok: true, skipped: true });
        return;
      }
      await chrome.storage.local.set({ [analyticsLastActiveKey]: now });
      const response = await fetch(analyticsEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "event",
          payload: {
            hostname: "icicle-extension",
            url: "/extension",
            website: analyticsWebsite,
            name: message.event
          }
        }),
        credentials: "omit",
        cache: "no-store",
        referrerPolicy: "no-referrer",
        keepalive: true
      });
      sendResponse({ ok: response.ok });
    } catch {
      sendResponse({ ok: false });
    }
  })();
  return true;
});
