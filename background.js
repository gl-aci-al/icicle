const analyticsEndpoint = "https://gateway.umami.is/api/send";
const analyticsWebsite = "6a71fb6b-75b0-4136-85cb-6be6f17dae25";
const analyticsEvents = new Set(["extension_active"]);
const analyticsLastActiveKey = "icicleAnalyticsLastActive";
const analyticsThrottleMs = 24 * 60 * 60 * 1000;

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "icicle-video-resolve") {
    (async () => {
      try {
        const id = String(message.id ?? "");
        if (!/^\d{2,20}$/.test(id)) throw new Error("Invalid post id");
        const response = await fetch(`https://api.fxtwitter.com/2/status/${id}`, { cache: "no-store" });
        if (!response.ok) throw new Error(`Video request failed (${response.status})`);
        const payload = await response.json();
        const status = payload?.status;
        const videos = status?.media?.videos ?? [];
        const video = videos.find((entry) => entry && (entry.url || entry.formats?.length));
        if (!video) throw new Error("No video found");
        const formats = (video.formats ?? []).filter((format) => format.container === "mp4" && format.url);
        const best = formats.sort((a, b) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0];
        sendResponse({ ok: true, author: String(status?.author?.screen_name ?? ""), cdn: best?.url ?? video.url });
      } catch {
        sendResponse({ ok: false });
      }
    })();
    return true;
  }
  if (message?.type === "icicle-download") {
    (async () => {
      try {
        const url = new URL(message.url);
        if (url.protocol !== "https:" || !/(^|\.)video\.twimg\.com$/.test(url.hostname)) throw new Error("Invalid video URL");
        const filename = String(message.filename ?? "video.mp4").replace(/[\\/:*?"<>|]+/g, "_").slice(0, 180);
        const id = await chrome.downloads.download({ url: url.href, filename, saveAs: false });
        sendResponse({ ok: typeof id === "number", id });
      } catch {
        sendResponse({ ok: false });
      }
    })();
    return true;
  }
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
