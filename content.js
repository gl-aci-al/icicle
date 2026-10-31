const settingsKey = "icicleSettings";
const hiddenToastEasterEgg = "|If you're reading this; you read code instead of just using stuff. Good! Work with us on Icicle if you'd like ;)";
const toastStrings = ["Intensely Calibrated Inhumanely Created Labrat Experiment", "Agreeable", "The Lie", "But I did kidnap his wife!", "This is the fuck, my soggy friend!", "Oh, and a quarter. Don't forget the quarter..", "Want some jellybeans?", "I AM NOT A MORON!", "//TODO: write toasts", "If the extension doesn't work, it's not my fault.", "I DON'T WANT YOUR LEMONS", "OK I MIGHT WANT YOUR LEMONS, LIFE.", "Do you know why you're here?", "Can you name even one thing? I thought not.", "XCCR", "Bad luck, I guess.", "Take a gamble love exists and do a loving act"];
const logoClass = "r-4qtqp9 r-yyyyoo r-dnmrzs r-bnwqim r-lrvibr r-m6rgpd r-lrsllp r-1nao33i r-16y2uox r-8kz0gk";
const iconUrl = chrome.runtime.getURL("assets/icicle.svg");
const fontUrls = {
  regular: chrome.runtime.getURL("assets/Chirp-Regular.woff2"),
  medium: chrome.runtime.getURL("assets/Chirp-Medium.woff2"),
  bold: chrome.runtime.getURL("assets/Chirp-Bold.woff2"),
  heavy: chrome.runtime.getURL("assets/Chirp-Heavy.woff2")
};
const builtInCopyLinkDomains = new Set(["fixupx.com", "fxtwitter.com", "vxtwitter.com"]);
const copyLinkDomainLabels = { "fixupx.com": "FixupX", "fxtwitter.com": "FxTwitter", "vxtwitter.com": "VxTwitter" };

function normalizeEmbedDomain(value) {
  if (typeof value !== "string") return "";
  const input = value.trim().toLowerCase();
  if (!input) return "";
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:\/\//.test(input) ? input : `https://${input}`);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    const host = url.hostname.replace(/\.$/, "");
    const labels = host.split(".");
    if (!host.includes(".") || host.length > 253 || !/^[a-z0-9.-]+$/.test(host) || labels.some((label) => !label || label.length > 63 || label.startsWith("-") || label.endsWith("-"))) return "";
    return host;
  } catch {
    return "";
  }
}

function normalizeCustomEmbedServices(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const services = [];
  for (const item of value) {
    const domain = normalizeEmbedDomain(typeof item === "string" ? item : item?.domain);
    if (!domain || builtInCopyLinkDomains.has(domain) || seen.has(domain)) continue;
    const label = typeof item?.label === "string" ? item.label.trim().replace(/\s+/g, " ").slice(0, 60) : "";
    seen.add(domain);
    services.push({ domain, label: label || domain });
  }
  return services;
}

function copyLinkServices() {
  const services = Object.entries(copyLinkDomainLabels).map(([domain, label]) => ({ domain, label }));
  for (const service of settings.customEmbedServices) {
    if (!builtInCopyLinkDomains.has(service.domain)) services.push(service);
  }
  return services;
}

const defaults = {
  accentColor: "#1d9bf0",
  customAccentEnabled: true,
  showToasts: true,
  analyticsEnabled: true,
  twitterLogo: false,
  copyLinkEmbedEnabled: false,
  copyLinkDomain: "fixupx.com",
  customEmbedServices: [],
  hidePremium: false,
  hideTrends: false,
  hideWhoToFollow: false,
  hideFooter: false,
  hideChat: false,
  hideGrok: false,
  hideLiveOnX: false,
  hidePaidPartnerships: false,
  hideAiPosts: false,
  streamerMode: false,
  streamerHideAvatar: true,
  streamerMaskUsername: true,
  hideSidebarCalls: false,
  hideSidebarGrok: false,
  hideSidebarExplore: false,
  hideSidebarHistory: false,
  hideSidebarLogo: false,
  hideSidebarHome: false,
  hideSidebarNotifications: false,
  hideSidebarChat: false,
  hideSidebarCreatorStudio: false,
  hideSidebarPremium: false,
  hideSidebarProfile: false,
  hideSidebarMore: false,
  hideSidebarPost: false,
  words: [],
  filterAuthorFields: false,
  filterRegex: false,
  filterLeetspeak: true,
  filterSpacing: true,
  filterLookalikes: true,
  filterUnicodeNormalization: true,
  filterRepeatedCharacters: true,
  filterUnusualUnicode: true,
  blurMedia: false,
  whitelist: [],
  whitelistBypassAll: true,
  reaction: "warn",
  includeMetadata: false,
  author: "",
  listName: ""
};

const host = document.createElement("div");
host.id = "icicle-settings-ui";
host.style.cssText = "position:fixed;z-index:2147483647;inset:0 auto auto 0;width:0;height:0;pointer-events:none";
document.documentElement.append(host);
const shadow = host.attachShadow({ mode: "open" });

shadow.innerHTML = `
  <style>
    @font-face{font-family:TwitterChirp;src:url("${fontUrls.regular}") format("woff2");font-style:normal;font-weight:400;font-display:swap}
    @font-face{font-family:TwitterChirp;src:url("${fontUrls.medium}") format("woff2");font-style:normal;font-weight:500;font-display:swap}
    @font-face{font-family:TwitterChirp;src:url("${fontUrls.bold}") format("woff2");font-style:normal;font-weight:700;font-display:swap}
    @font-face{font-family:TwitterChirp;src:url("${fontUrls.heavy}") format("woff2");font-style:normal;font-weight:800;font-display:swap}
    :host{all:initial;--text:#0f1419;--muted:#536471;--border:#cfd9de;--divider:#eff3f4;--surface:#fff;--surface-hover:#f7f9f9;--switch-off:#8b98a5;--scroll-thumb:#aab8c2;--scroll-track:transparent;color:var(--text);font-family:TwitterChirp,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:14px;line-height:1.35;pointer-events:none;color-scheme:light;scrollbar-color:var(--scroll-thumb) var(--scroll-track)}
    :host([data-theme="dark"]){--text:#e7e9ea;--muted:#71767b;--border:#2f3336;--divider:#2f3336;--surface:#16181c;--surface-hover:#1d1f23;--switch-off:#536471;--scroll-thumb:#536471;--scroll-track:transparent;color-scheme:dark}
    *,*::before,*::after{box-sizing:border-box}
    .visually-hidden{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    button,input,textarea,select{font:inherit}
    button{cursor:pointer}
    .launcher{position:fixed;left:20px;bottom:20px;display:grid;place-items:center;inline-size:56px;block-size:56px;padding:0;border:0;border-radius:50%;background:var(--accent);color:#fff;box-shadow:0 2px 12px #0003;pointer-events:auto;transition:transform .15s ease,background-color .15s ease}
    .launcher:hover{transform:scale(1.05)}
    .launcher:focus-visible,.panel button:focus-visible,.panel input:focus-visible,.panel textarea:focus-visible,.panel select:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
    .launcher img{display:block;width:30px;height:30px;filter:none}
    .panel{position:fixed;left:20px;bottom:88px;width:min(390px,calc(100vw - 32px));max-height:min(720px,calc(100vh - 120px));display:flex;flex-direction:column;overflow:hidden;border:1px solid var(--border);border-radius:16px;background:var(--surface);color:var(--text);box-shadow:0 8px 32px #0003;pointer-events:auto}
    .panel[hidden]{display:none}
    .top{display:flex;align-items:center;justify-content:space-between;padding:16px 18px;border-bottom:1px solid var(--divider)}
    .heading-copy{min-width:0}
    .splash{display:block;margin:4px 0 0;color:var(--muted);font-size:13px;font-style:normal;font-weight:400;line-height:1.4}
    h2{margin:0;font-size:20px;line-height:1.2;font-weight:800;letter-spacing:-.02em}
    .close{display:grid;place-items:center;width:34px;height:34px;border:0;border-radius:50%;background:transparent;color:var(--muted);font-size:24px;line-height:1}
    .close:hover{background:var(--surface-hover);color:var(--text)}
    .body{overflow-y:auto;padding:4px 18px 18px;overscroll-behavior:contain;scrollbar-width:none}
    .body::-webkit-scrollbar{display:none}
    .section{padding:15px 0;border-bottom:1px solid var(--divider)}
    .section:last-child{border-bottom:0;padding-bottom:2px}
    .section-title{margin:0 0 10px;font-size:16px;font-weight:700}
    .description{display:block;margin-top:4px;color:var(--muted);font-size:13px;line-height:1.4}
    .setting-row{display:flex;align-items:center;justify-content:space-between;gap:16px}
    .setting-row+.setting-row{margin-top:14px}
    .toast-toggle{margin-bottom:14px}
    .setting-copy{min-width:0}
    .setting-name{font-weight:700}
    .switch{position:relative;flex:none;width:42px;height:24px}
    .switch input{position:absolute;width:1px;height:1px;opacity:0}
    .track{position:absolute;inset:0;border:1px solid var(--switch-off);border-radius:99px;background:var(--surface);transition:background .15s ease,border-color .15s ease}
    .track::after{position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:var(--muted);content:"";transition:transform .15s ease,background .15s ease}
    .switch input:checked+.track{border-color:var(--accent);background:var(--accent)}
    .switch input:checked+.track::after{transform:translateX(18px);background:#fff}
    .switch input:focus-visible+.track{outline:2px solid var(--accent);outline-offset:3px}
    .switch input:disabled+.track{opacity:.45;cursor:not-allowed}
    .color-row{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
    .accent-toggle{margin-bottom:14px}
    .color-trigger:focus-visible,.dropdown-trigger:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
    .accent-picker{position:relative;display:flex;align-items:center;gap:7px;min-width:0}
    .color-trigger,.dropdown-trigger{display:flex;align-items:center;justify-content:space-between;gap:9px;min-height:36px;padding:5px 9px;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--text);cursor:pointer}
    .color-trigger{width:24px;height:24px;min-height:24px;justify-content:center;padding:0;border:0;border-radius:50%;background:transparent}
    .color-trigger:hover{background:var(--surface-hover)}
    .color-trigger:hover,.dropdown-trigger:hover{background:var(--surface-hover)}
    .color-trigger:disabled{cursor:not-allowed;opacity:.45}
    .color-trigger .color-swatch,.preset-swatch{display:block;width:24px;height:24px;flex:none;border:1px solid #0002;border-radius:50%;background:var(--accent-color)}
    .preset-swatch{padding:0;cursor:pointer}
    .preset-swatch[aria-pressed="true"]{outline:3px solid #fff;outline-offset:2px;box-shadow:0 0 0 1px #536471}
    .preset-swatch:focus-visible:not([aria-pressed="true"]){outline:3px solid var(--accent);outline-offset:2px}
    .color-trigger .color-swatch.custom-selection{outline:3px solid #fff;outline-offset:2px;box-shadow:0 0 0 1px #536471}
    .preset-swatch:disabled{cursor:not-allowed;opacity:.4}
    .chevron{width:7px;height:7px;flex:none;border-right:1.5px solid var(--muted);border-bottom:1.5px solid var(--muted);transform:rotate(45deg);transition:transform .15s}
    .accent-picker.open .color-trigger .chevron{transform:rotate(225deg)}
    .reaction-dropdown.open .dropdown-trigger .chevron,.copy-link-dropdown.open .dropdown-trigger .chevron{transform:translateY(-1px) rotate(225deg)}
    .color-popup,.dropdown-menu{position:absolute;z-index:20;top:calc(100% + 7px);right:0;width:280px;max-width:min(280px,calc(100vw - 48px));padding:11px;border:1px solid var(--border);border-radius:12px;background:var(--surface);color:var(--text);box-shadow:0 4px 16px #0002,0 1px 3px #0001}
    .color-popup[hidden],.dropdown-menu[hidden]{display:none}
    .saturation{position:relative;width:100%;height:140px;overflow:hidden;border-radius:8px;background:hsl(var(--hue),100%,50%);cursor:crosshair;touch-action:none}
    .saturation-white,.saturation-black{position:absolute;inset:0;pointer-events:none}
    .saturation-white{background:linear-gradient(to right,#fff,transparent)}
    .saturation-black{background:linear-gradient(to top,#000,transparent)}
    .saturation-cursor{position:absolute;left:0;top:0;width:14px;height:14px;border:2px solid #fff;border-radius:50%;box-shadow:0 0 0 1px #0008;pointer-events:none;transform:translate(-50%,-50%)}
    .picker-tools{display:grid;grid-template-columns:32px 30px minmax(0,1fr);align-items:center;gap:9px;margin:10px 0}
    .eyedropper{display:grid;place-items:center;width:32px;height:32px;padding:0;border:0;border-radius:50%;background:transparent;color:var(--text);cursor:pointer}
    .eyedropper:hover{background:var(--surface-hover)}
    .eyedropper svg{width:19px;height:19px}
    .color-preview{width:30px;height:30px;border:1px solid #0002;border-radius:50%;background:var(--accent-color)}
    .hue-slider{width:100%;height:12px;margin:0;padding:0;border:0;border-radius:99px;appearance:none;background:linear-gradient(to right,red,#ff0,#0f0,#0ff,#00f,#f0f,red);cursor:pointer}
    .hue-slider::-webkit-slider-thumb{width:17px;height:17px;border:3px solid #fff;border-radius:50%;appearance:none;background:var(--accent);box-shadow:0 1px 4px #0005}
    .hue-slider::-moz-range-thumb{width:11px;height:11px;border:3px solid #fff;border-radius:50%;background:var(--accent);box-shadow:0 1px 4px #0005}
    .picker-input{display:block;width:100%;height:36px;padding:0 9px;border:1px solid var(--border);border-radius:7px;background:var(--surface);color:var(--text);font-family:TwitterChirp, sans-serif;font-size:13px}
    .picker-input:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
    .panel .picker-input:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
    .rgb-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin-top:8px}
    .rgb-input{min-width:0;padding:0 3px;text-align:center;appearance:textfield;-moz-appearance:textfield}
    .rgb-input::-webkit-inner-spin-button,.rgb-input::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
    .rgb-label{display:block;margin-top:4px;text-align:center;color:var(--muted);font-size:11px}
    .picker-actions{display:flex;align-items:center;justify-content:space-between;margin-top:8px}
    .picker-action{padding:6px 0;border:0;background:transparent;color:var(--muted);font-size:12px}
    .picker-action.primary{padding:7px 14px;border-radius:999px;background:var(--text);color:var(--surface);font-weight:700}
    .dropdown-wrap{position:relative;margin-top:7px}
    .reaction-dropdown,.copy-link-dropdown{position:relative}
    .dropdown-trigger{width:100%;min-height:44px;padding:10px 12px;border-radius:999px;text-align:left}
    .dropdown-trigger:disabled{cursor:not-allowed;opacity:.45}
    .dropdown-trigger:disabled:hover{background:var(--surface)}
    .dropdown-trigger .chevron{margin-right:3px;transform:translateY(-1px) rotate(45deg)}
    .dropdown-value{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .dropdown-menu{top:calc(100% + 6px);bottom:auto;width:100%;max-width:none;padding:5px;border-radius:12px}
    .dropdown-option{display:flex;align-items:center;width:100%;min-height:38px;margin:2px 0;padding:8px 10px;gap:10px;border:0;border-radius:8px;background:var(--surface-hover);color:var(--text);text-align:left;white-space:normal;cursor:pointer}
    .dropdown-option:hover,.dropdown-option[aria-selected="true"]{background:var(--divider)}
    .option-check{margin-left:auto;color:var(--accent);font-weight:700}
    .option-check svg{display:block;width:16px;height:16px}
    .dropdown-option[aria-selected="false"] .option-check{visibility:hidden}
    .color-value{display:block;margin-top:7px;color:var(--muted);font-size:12px;font-variant-numeric:tabular-nums}
    .field{display:block;margin-top:12px}
    .field+.setting-row{margin-top:18px}
    .field-label{display:block;margin-bottom:5px;font-weight:700}
    .field .description{margin-bottom:7px}
    .text-input,.word-input{display:block;width:100%;border:1px solid var(--border);border-radius:10px;background:var(--surface);color:var(--text)}
    .text-input{min-height:40px;padding:8px 10px}
    .word-input{min-height:90px;padding:10px;resize:vertical;line-height:1.45}
    .text-input:focus,.word-input:focus{border-color:var(--accent)}
    .panel textarea#words:focus-visible{outline:2px solid var(--accent);outline-offset:1px;box-shadow:none;border-color:transparent}
    .text-input::placeholder,.word-input::placeholder{color:var(--muted);opacity:.8}
    .custom-embed-form{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr) auto;gap:8px}
    .custom-embed-form .text-input{min-width:0}
    .custom-embed-form .secondary{white-space:nowrap}
    .custom-embed-list{display:grid;gap:6px;margin-top:10px}
    .custom-embed-list:empty{display:none}
    .custom-embed-item{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;border:1px solid var(--border);border-radius:10px;background:var(--surface)}
    .custom-embed-item__copy{min-width:0}
    .custom-embed-item__name{font-weight:700;overflow-wrap:anywhere}
    .custom-embed-item__domain{color:var(--muted);font-size:12px;overflow-wrap:anywhere}
    .custom-embed-remove{flex:none;min-height:32px;padding:6px 10px;border:1px solid var(--border);border-radius:999px;background:transparent;color:var(--text);font-weight:700}
    .custom-embed-remove:hover{background:var(--surface-hover)}
    .custom-embed-status{display:block;min-height:16px;margin-top:6px;font-size:12px}
    .metadata-fields[hidden]{display:none}
    .button-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px}
    .secondary{min-height:38px;padding:8px 10px;border:1px solid var(--border);border-radius:999px;background:var(--surface);color:var(--text);font-weight:700}
    .secondary:hover{background:var(--surface-hover)}
    .status{min-height:18px;margin:8px 0 0;color:var(--muted);font-size:12px}
    @media(prefers-reduced-motion:reduce){*,*::before,*::after{transition:none!important}}
    @media(forced-colors:active){.panel textarea#words:focus-visible{outline:2px solid Highlight;outline-offset:2px}}
  </style>
  <button class="launcher" type="button" aria-label="Open Icicle settings" aria-haspopup="dialog" aria-expanded="false">
    <img src="${iconUrl}" alt="">
  </button>
  <section class="panel" role="dialog" aria-modal="false" aria-labelledby="icicle-title" hidden>
    <header class="top"><div class="heading-copy"><h2 id="icicle-title">Icicle settings</h2><p class="splash" id="icicle-splash" aria-live="polite"></p></div><button class="close" type="button" aria-label="Close settings">×</button></header>
    <div class="body">
      <section class="section" aria-labelledby="appearance-title">
        <h3 class="section-title" id="appearance-title">Appearance</h3>
        <div class="setting-row accent-toggle"><div class="setting-copy"><label class="setting-name" for="custom-accent-enabled">Use custom accent color</label><span class="description" id="custom-accent-help">Changes the default X blue to any color you pick.</span></div><label class="switch"><input id="custom-accent-enabled" type="checkbox" aria-describedby="custom-accent-help"><span class="track"></span></label></div>
        <div class="setting-row toast-toggle"><div class="setting-copy"><label class="setting-name" for="show-toasts">Toasts</label><span class="description" id="show-toasts-help">Shows a random toast message at the top</span></div><label class="switch"><input id="show-toasts" type="checkbox" aria-describedby="show-toasts-help"><span class="track"></span></label></div>
        <div class="color-row">
          <div class="setting-copy"><span class="setting-name">Accent color</span><span class="description">Choose any color.</span></div>
          <div class="accent-picker" id="accent-picker">
            <button class="color-trigger" id="accent-picker-trigger" type="button" aria-label="Choose custom accent color" aria-haspopup="dialog" aria-expanded="false"><span class="color-swatch"></span></button>
            <button class="preset-swatch" type="button" data-preset="#1d9bf1" aria-label="Use blue accent" title="Blue"></button>
            <button class="preset-swatch" type="button" data-preset="#7856ff" aria-label="Use purple accent" title="Purple"></button>
            <button class="preset-swatch" type="button" data-preset="#f91880" aria-label="Use pink accent" title="Pink"></button>
            <div class="color-popup" id="accent-popup" role="dialog" aria-label="Choose accent color" hidden>
              <div class="saturation" id="accent-saturation" tabindex="0" role="slider" aria-label="Color saturation and brightness" aria-valuemin="0" aria-valuemax="100" aria-valuenow="94" aria-valuetext="#1D9BF0"><div class="saturation-white"></div><div class="saturation-black"></div><span class="saturation-cursor"></span></div>
              <div class="picker-tools"><button class="eyedropper" id="accent-eyedropper" type="button" title="Pick a screen color" aria-label="Pick a screen color"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m14 6 4 4M3 21l6-2 11-11a2.8 2.8 0 0 0-4-4L5 15z"/><path d="m5 15 4 4"/></svg></button><span class="color-preview" id="accent-preview"></span><input class="hue-slider" id="accent-hue" type="range" min="0" max="359" value="204" aria-label="Color hue"></div>
              <label class="visually-hidden" for="accent-hex">HEX color</label><input class="picker-input" id="accent-hex" type="text" value="#1D9BF0" maxlength="7" spellcheck="false" autocomplete="off">
              <div class="rgb-grid"><label><input class="picker-input rgb-input" data-channel="0" type="number" min="0" max="255" value="29" aria-label="Red"><span class="rgb-label">R</span></label><label><input class="picker-input rgb-input" data-channel="1" type="number" min="0" max="255" value="155" aria-label="Green"><span class="rgb-label">G</span></label><label><input class="picker-input rgb-input" data-channel="2" type="number" min="0" max="255" value="240" aria-label="Blue"><span class="rgb-label">B</span></label></div>
              <div class="picker-actions"><button class="picker-action" id="accent-reset" type="button">Reset</button><button class="picker-action primary" id="accent-done" type="button">Done</button></div>
            </div>
          </div>
        </div>
      </section>
      <section class="section" aria-labelledby="streamer-title">
        <h3 class="section-title" id="streamer-title">Streamer mode</h3>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="streamer-mode">Enable streamer mode</label><span class="description" id="streamer-mode-help">Mask your account details.</span></div><label class="switch"><input id="streamer-mode" type="checkbox" aria-describedby="streamer-mode-help"><span class="track"></span></label></div>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="streamer-hide-avatar">Hide profile picture</label><span class="description" id="streamer-hide-avatar-help">Hides your profile picture.</span></div><label class="switch"><input id="streamer-hide-avatar" type="checkbox" aria-describedby="streamer-hide-avatar-help"><span class="track"></span></label></div>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="streamer-mask-username">Mask username</label><span class="description" id="streamer-mask-username-help">Truncates your username and only shows the initial.</span></div><label class="switch"><input id="streamer-mask-username" type="checkbox" aria-describedby="streamer-mask-username-help"><span class="track"></span></label></div>
      </section>
      <section class="section" aria-labelledby="page-title">
        <h3 class="section-title" id="page-title">X page</h3>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="twitter-logo">Twitter logo</label><span class="description" id="twitter-logo-help">Replaces the X logo back to Larry the Bird.</span></div><label class="switch"><input id="twitter-logo" type="checkbox" aria-describedby="twitter-logo-help"><span class="track"></span></label></div>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="copy-link-embed-enabled">Copy links through an embed service</label><span class="description" id="copy-link-embed-enabled-help">Changes X’s Copy link result to the selected service.</span></div><label class="switch"><input id="copy-link-embed-enabled" type="checkbox" aria-describedby="copy-link-embed-enabled-help"><span class="track"></span></label></div>
        <div class="field"><span class="field-label" id="copy-link-domain-label">Embed service</span><span class="description" id="copy-link-domain-help">Choose the domain used for copied post links.</span><div class="dropdown-wrap"><div class="copy-link-dropdown" id="copy-link-domain-dropdown"><button class="dropdown-trigger" id="copy-link-domain-trigger" type="button" aria-labelledby="copy-link-domain-label copy-link-domain-value" aria-describedby="copy-link-domain-help" aria-haspopup="listbox" aria-expanded="false"><span class="dropdown-value" id="copy-link-domain-value">FixupX</span><span class="chevron" aria-hidden="true"></span></button><div class="dropdown-menu" id="copy-link-domain-menu" role="listbox" aria-labelledby="copy-link-domain-label" hidden></div></div></div></div>
        <div class="field">
          <span class="field-label" id="custom-embed-label">Custom embed services</span>
          <span class="description" id="custom-embed-help">Add another embed service domain. Its display name is optional.</span>
          <div class="custom-embed-form">
            <input id="custom-embed-name" class="text-input" type="text" maxlength="60" placeholder="Name (optional)" aria-label="Custom embed service name">
            <input id="custom-embed-domain" class="text-input" type="text" maxlength="253" placeholder="embed.example.com" aria-label="Custom embed service domain" aria-describedby="custom-embed-help">
            <button id="add-custom-embed" class="secondary" type="button">Add</button>
          </div>
          <div id="custom-embed-list" class="custom-embed-list" role="list"></div>
          <span class="description custom-embed-status" id="custom-embed-status" role="status"></span>
        </div>
      </section>
      <section class="section" aria-labelledby="hiders-title">
        <h3 class="section-title" id="hiders-title">Hide on X</h3>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="hide-premium">Premium promotions</label><span class="description" id="hide-premium-help">Hide the Subscribe to Premium card.</span></div><label class="switch"><input id="hide-premium" type="checkbox" aria-describedby="hide-premium-help"><span class="track"></span></label></div>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="hide-trends">Trending now</label><span class="description" id="hide-trends-help">Hide the Trending now card from the sidebar.</span></div><label class="switch"><input id="hide-trends" type="checkbox" aria-describedby="hide-trends-help"><span class="track"></span></label></div>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="hide-who-to-follow">Who to follow</label><span class="description" id="hide-who-to-follow-help">Hide suggested accounts in the sidebar.</span></div><label class="switch"><input id="hide-who-to-follow" type="checkbox" aria-describedby="hide-who-to-follow-help"><span class="track"></span></label></div>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="hide-footer">Footer links</label><span class="description" id="hide-footer-help">Hide the footer navigation and its links.</span></div><label class="switch"><input id="hide-footer" type="checkbox" aria-describedby="hide-footer-help"><span class="track"></span></label></div>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="hide-chat">Chat drawer button</label><span class="description" id="hide-chat-help">Hide the floating chat drawer button, separate from the Chat sidebar link.</span></div><label class="switch"><input id="hide-chat" type="checkbox" aria-describedby="hide-chat-help"><span class="track"></span></label></div>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="hide-grok">Grok buttons</label><span class="description" id="hide-grok-help">Hide the Grok corner button and Grok actions on posts.</span></div><label class="switch"><input id="hide-grok" type="checkbox" aria-describedby="hide-grok-help"><span class="track"></span></label></div>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="hide-live-on-x">Live on X</label><span class="description" id="hide-live-on-x-help">Hide the Live on X Spaces card.</span></div><label class="switch"><input id="hide-live-on-x" type="checkbox" aria-describedby="hide-live-on-x-help"><span class="track"></span></label></div>
      </section>
      <section class="section" aria-labelledby="post-blockers-title">
        <h3 class="section-title" id="post-blockers-title">Post blockers</h3>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="hide-paid-partnerships">Paid partnerships</label><span class="description" id="hide-paid-partnerships-help">Hide posts labeled by X or the author as paid partnerships.</span></div><label class="switch"><input id="hide-paid-partnerships" type="checkbox" aria-describedby="hide-paid-partnerships-help"><span class="track"></span></label></div>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="hide-ai-posts">AI-generated posts</label><span class="description" id="hide-ai-posts-help">Hide posts labeled as made with AI by X or the author. This can produce false flags.</span></div><label class="switch"><input id="hide-ai-posts" type="checkbox" aria-describedby="hide-ai-posts-help"><span class="track"></span></label></div>
      </section>
      <section class="section" aria-labelledby="sidebar-hiders-title">
        <h3 class="section-title" id="sidebar-hiders-title">Sidebar items</h3>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="hide-sidebar-logo">X logo</label><span class="description" id="hide-sidebar-logo-help">Hide the X logo at the top of the primary sidebar.</span></div><label class="switch"><input id="hide-sidebar-logo" type="checkbox" aria-describedby="hide-sidebar-logo-help"><span class="track"></span></label></div>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="hide-sidebar-home">Home</label><span class="description" id="hide-sidebar-home-help">Hide Home from the primary sidebar.</span></div><label class="switch"><input id="hide-sidebar-home" type="checkbox" aria-describedby="hide-sidebar-home-help"><span class="track"></span></label></div>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="hide-sidebar-explore">Explore</label><span class="description" id="hide-sidebar-explore-help">Hide Explore from the primary sidebar.</span></div><label class="switch"><input id="hide-sidebar-explore" type="checkbox" aria-describedby="hide-sidebar-explore-help"><span class="track"></span></label></div>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="hide-sidebar-notifications">Notifications</label><span class="description" id="hide-sidebar-notifications-help">Hide Notifications from the primary sidebar.</span></div><label class="switch"><input id="hide-sidebar-notifications" type="checkbox" aria-describedby="hide-sidebar-notifications-help"><span class="track"></span></label></div>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="hide-sidebar-chat">Chat</label><span class="description" id="hide-sidebar-chat-help">Hide Chat from the primary sidebar.</span></div><label class="switch"><input id="hide-sidebar-chat" type="checkbox" aria-describedby="hide-sidebar-chat-help"><span class="track"></span></label></div>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="hide-sidebar-calls">Calls</label><span class="description" id="hide-sidebar-calls-help">Hide Calls from the primary sidebar.</span></div><label class="switch"><input id="hide-sidebar-calls" type="checkbox" aria-describedby="hide-sidebar-calls-help"><span class="track"></span></label></div>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="hide-sidebar-grok">Grok</label><span class="description" id="hide-sidebar-grok-help">Hide Grok from the primary sidebar.</span></div><label class="switch"><input id="hide-sidebar-grok" type="checkbox" aria-describedby="hide-sidebar-grok-help"><span class="track"></span></label></div>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="hide-sidebar-history">History</label><span class="description" id="hide-sidebar-history-help">Hide History from the primary sidebar.</span></div><label class="switch"><input id="hide-sidebar-history" type="checkbox" aria-describedby="hide-sidebar-history-help"><span class="track"></span></label></div>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="hide-sidebar-creator-studio">Creator Studio</label><span class="description" id="hide-sidebar-creator-studio-help">Hide Creator Studio from the primary sidebar.</span></div><label class="switch"><input id="hide-sidebar-creator-studio" type="checkbox" aria-describedby="hide-sidebar-creator-studio-help"><span class="track"></span></label></div>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="hide-sidebar-premium">Premium</label><span class="description" id="hide-sidebar-premium-help">Hide Premium from the primary sidebar.</span></div><label class="switch"><input id="hide-sidebar-premium" type="checkbox" aria-describedby="hide-sidebar-premium-help"><span class="track"></span></label></div>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="hide-sidebar-profile">Profile</label><span class="description" id="hide-sidebar-profile-help">Hide Profile from the primary sidebar.</span></div><label class="switch"><input id="hide-sidebar-profile" type="checkbox" aria-describedby="hide-sidebar-profile-help"><span class="track"></span></label></div>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="hide-sidebar-more">More</label><span class="description" id="hide-sidebar-more-help">Hide the More menu from the primary sidebar.</span></div><label class="switch"><input id="hide-sidebar-more" type="checkbox" aria-describedby="hide-sidebar-more-help"><span class="track"></span></label></div>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="hide-sidebar-post">Post</label><span class="description" id="hide-sidebar-post-help">Hide the Post button below the primary sidebar.</span></div><label class="switch"><input id="hide-sidebar-post" type="checkbox" aria-describedby="hide-sidebar-post-help"><span class="track"></span></label></div>
      </section>
      <section class="section" aria-labelledby="blocklist-title">
        <h3 class="section-title" id="blocklist-title">Word blocklist</h3>
        <label class="field" for="words"><span class="field-label">Words and phrases</span><span class="description" id="words-help">One word, phrase, or regex per line. Matching is case-insensitive.</span><textarea class="word-input" id="words" aria-describedby="words-help" placeholder="One word or phrase per line"></textarea></label>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="filter-author-fields">Check usernames and display names</label><span class="description" id="filter-author-fields-help">Match blocklist entries against tweet authors too.</span></div><label class="switch"><input id="filter-author-fields" type="checkbox" aria-describedby="filter-author-fields-help"><span class="track"></span></label></div>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="filter-regex">Treat entries as regular expressions</label><span class="description" id="filter-regex-help">Use one JavaScript regex pattern per line.</span></div><label class="switch"><input id="filter-regex" type="checkbox" aria-describedby="filter-regex-help"><span class="track"></span></label></div>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="filter-leetspeak">Detect leetspeak</label><span class="description" id="filter-leetspeak-help">Match common number and symbol substitutions.</span></div><label class="switch"><input id="filter-leetspeak" type="checkbox" aria-describedby="filter-leetspeak-help"><span class="track"></span></label></div>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="filter-spacing">Detect inserted spacing and punctuation</label><span class="description" id="filter-spacing-help">Match characters split by spaces or punctuation.</span></div><label class="switch"><input id="filter-spacing" type="checkbox" aria-describedby="filter-spacing-help"><span class="track"></span></label></div>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="filter-lookalikes">Detect lookalike characters</label><span class="description" id="filter-lookalikes-help">Map common Greek and Cyrillic lookalikes to Latin letters.</span></div><label class="switch"><input id="filter-lookalikes" type="checkbox" aria-describedby="filter-lookalikes-help"><span class="track"></span></label></div>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="filter-unicode-normalization">Normalize Unicode</label><span class="description" id="filter-unicode-normalization-help">Match compatibility and fancy-font forms of characters.</span></div><label class="switch"><input id="filter-unicode-normalization" type="checkbox" aria-describedby="filter-unicode-normalization-help"><span class="track"></span></label></div>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="filter-repeated-characters">Collapse repeated characters</label><span class="description" id="filter-repeated-characters-help">Match words with stretched letters.</span></div><label class="switch"><input id="filter-repeated-characters" type="checkbox" aria-describedby="filter-repeated-characters-help"><span class="track"></span></label></div>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="filter-unusual-unicode">Flag unusual Unicode</label><span class="description" id="filter-unusual-unicode-help">Flag invisible, directional, and combining characters.</span></div><label class="switch"><input id="filter-unusual-unicode" type="checkbox" aria-describedby="filter-unusual-unicode-help"><span class="track"></span></label></div>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="blur-media">Blur images and videos</label><span class="description" id="blur-media-help">Click a blurred image or video to reveal it.</span></div><label class="switch"><input id="blur-media" type="checkbox" aria-describedby="blur-media-help"><span class="track"></span></label></div>
        <label class="field" for="whitelist"><span class="field-label">Whitelist usernames</span><span class="description" id="whitelist-help">One username per line, with or without @.</span><textarea class="word-input" id="whitelist" aria-describedby="whitelist-help" placeholder="username"></textarea></label>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="whitelist-bypass-all">Whitelist bypasses media blur too</label><span class="description" id="whitelist-bypass-all-help">When off, whitelisted users still follow the media blur setting.</span></div><label class="switch"><input id="whitelist-bypass-all" type="checkbox" aria-describedby="whitelist-bypass-all-help"><span class="track"></span></label></div>
        <div class="field"><span class="field-label" id="reaction-label">Blocklist reaction</span><span class="description" id="reaction-help">Warn blurs the post, shows the matching reason, and adds a Show post button. Remove hides the post completely.</span><div class="dropdown-wrap"><div class="reaction-dropdown" id="reaction-dropdown"><button class="dropdown-trigger" id="reaction-trigger" type="button" aria-labelledby="reaction-label reaction-value" aria-describedby="reaction-help" aria-haspopup="listbox" aria-expanded="false"><span class="dropdown-value" id="reaction-value">Warn</span><span class="chevron" aria-hidden="true"></span></button><div class="dropdown-menu" id="reaction-menu" role="listbox" aria-labelledby="reaction-label" hidden><button class="dropdown-option" type="button" role="option" data-value="warn" aria-selected="true" tabindex="-1">Blur and warn<span class="option-check" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 13 4 4L19 7"/></svg></span></button><button class="dropdown-option" type="button" role="option" data-value="remove" aria-selected="false" tabindex="-1">Hide tweet completely<span class="option-check" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 13 4 4L19 7"/></svg></span></button></div></div></div></div>
      </section>
      <section class="section" aria-labelledby="privacy-title">
        <h3 class="section-title" id="privacy-title">Privacy</h3>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="analytics-enabled">Anonymous analytics</label><span class="description" id="analytics-enabled-help">Sends one basic active-use event per day to Umami. No post content, usernames, browsing URLs, or persistent identifiers are sent. Turn this off to opt out.</span></div><label class="switch"><input id="analytics-enabled" type="checkbox" aria-describedby="analytics-enabled-help"><span class="track"></span></label></div>
      </section>
      <section class="section" aria-labelledby="transfer-title">
        <h3 class="section-title" id="transfer-title">Import and export</h3>
        <div class="setting-row"><div class="setting-copy"><label class="setting-name" for="include-metadata">Add author and list name</label><span class="description" id="metadata-help">Include optional attribution in exported JSON files.</span></div><label class="switch"><input id="include-metadata" type="checkbox" aria-describedby="metadata-help"><span class="track"></span></label></div>
        <div class="metadata-fields" hidden>
          <label class="field" for="author"><span class="field-label">Author</span><input class="text-input" id="author" type="text" autocomplete="off" placeholder="username"></label>
          <label class="field" for="list-name"><span class="field-label">List name</span><input class="text-input" id="list-name" type="text" autocomplete="off" placeholder="Gambling sponsored accounts"></label>
        </div>
        <div class="button-grid"><button class="secondary" id="export-settings" type="button">Export settings</button><button class="secondary" id="import-settings" type="button">Import settings</button><button class="secondary" id="export-blocklist" type="button">Export word blocklist</button><button class="secondary" id="import-blocklist" type="button">Import word blocklist</button></div>
        <input id="settings-file" type="file" accept=".json,application/json" hidden>
        <input id="blocklist-file" type="file" accept=".json,.txt,application/json,text/plain" hidden>
        <p class="status" role="status" aria-live="polite"></p>
      </section>
    </div>
  </section>
`;

const launcher = shadow.querySelector(".launcher");
const panel = shadow.querySelector(".panel");
const icon = shadow.querySelector(".launcher img");
const status = shadow.querySelector(".status");
const splash = shadow.querySelector("#icicle-splash");
let settings = { ...defaults };
const replacedTwitterLogos = new WeakMap();
const streamerMaskedTexts = new Map();

function contrastingInk(hex) {
  const channels = hex.slice(1).match(/.{2}/g).map((value) => parseInt(value, 16) / 255);
  const linear = channels.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  const blackContrast = (luminance + 0.05) / 0.05;
  const whiteContrast = 1.05 / (luminance + 0.05);
  return blackContrast >= whiteContrast ? "#000000" : "#ffffff";
}

function hexToRgb(hex) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return match ? match.slice(1).map((channel) => parseInt(channel, 16)) : null;
}

function rgbToHex(rgb) {
  return `#${rgb.map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
}

function rgbToHsv(red, green, blue) {
  red /= 255;
  green /= 255;
  blue /= 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  let hue = 0;
  if (delta) {
    if (max === red) hue = 60 * (((green - blue) / delta) % 6);
    else if (max === green) hue = 60 * ((blue - red) / delta + 2);
    else hue = 60 * ((red - green) / delta + 4);
  }
  return [hue < 0 ? hue + 360 : hue, max === 0 ? 0 : delta / max, max];
}

function hsvToRgb(hue, saturation, value) {
  const channel = (n, k = (n + hue / 60) % 6) => value - value * saturation * Math.max(0, Math.min(k, 4 - k, 1));
  return [channel(5), channel(3), channel(1)].map((part) => Math.round(part * 255));
}

function updatePickerFromAccent() {
  pickerHsv = rgbToHsv(...hexToRgb(settings.accentColor));
  const [hue, saturation, value] = pickerHsv;
  const hex = rgbToHex(hsvToRgb(hue, saturation, value));
  const rgb = hexToRgb(hex);
  const area = shadow.querySelector("#accent-saturation");
  const cursor = shadow.querySelector(".saturation-cursor");
  area.style.setProperty("--hue", hue);
  area.style.backgroundColor = `hsl(${hue},100%,50%)`;
  area.setAttribute("aria-valuetext", hex.toUpperCase());
  area.setAttribute("aria-valuenow", String(Math.round(value * 100)));
  cursor.style.left = `${saturation * 100}%`;
  cursor.style.top = `${(1 - value) * 100}%`;
  shadow.querySelector("#accent-hue").value = String(Math.round(hue));
  shadow.querySelector("#accent-hex").value = hex.toUpperCase();
  shadow.querySelectorAll(".rgb-input").forEach((input, index) => { input.value = String(rgb[index]); });
  shadow.querySelector("#accent-preview").style.setProperty("--accent-color", hex);
  shadow.querySelector("#accent-picker-trigger .color-swatch").style.setProperty("--accent-color", hex);
  updateAccentSelectionIndicators();
}

function updateReactionDropdown() {
  const trigger = shadow.querySelector("#reaction-trigger");
  const menu = shadow.querySelector("#reaction-menu");
  for (const option of menu.querySelectorAll("[role=option]")) {
    const selected = option.dataset.value === settings.reaction;
    option.setAttribute("aria-selected", String(selected));
  }
  shadow.querySelector("#reaction-value").textContent = settings.reaction === "remove" ? "Hide tweet completely" : "Blur and warn";
  trigger.setAttribute("aria-expanded", String(!menu.hidden));
}

function createCopyLinkOption(service) {
  const option = document.createElement("button");
  option.type = "button";
  option.className = "dropdown-option";
  option.setAttribute("role", "option");
  option.dataset.value = service.domain;
  option.tabIndex = -1;
  option.textContent = service.label;
  const check = document.createElement("span");
  check.className = "option-check";
  check.setAttribute("aria-hidden", "true");
  check.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 13 4 4L19 7"/></svg>`;
  option.append(check);
  return option;
}

function updateCopyLinkDropdown() {
  const trigger = shadow.querySelector("#copy-link-domain-trigger");
  const menu = shadow.querySelector("#copy-link-domain-menu");
  const dropdown = shadow.querySelector("#copy-link-domain-dropdown");
  const services = copyLinkServices();
  menu.replaceChildren(...services.map(createCopyLinkOption));
  for (const option of menu.querySelectorAll("[role=option]")) {
    option.setAttribute("aria-selected", String(option.dataset.value === settings.copyLinkDomain));
  }
  const selected = services.find((service) => service.domain === settings.copyLinkDomain);
  shadow.querySelector("#copy-link-domain-value").textContent = selected?.label ?? copyLinkDomainLabels[defaults.copyLinkDomain];
  trigger.disabled = !settings.copyLinkEmbedEnabled;
  if (!settings.copyLinkEmbedEnabled) {
    dropdown.classList.remove("open");
    menu.hidden = true;
  }
  trigger.setAttribute("aria-expanded", String(!menu.hidden && settings.copyLinkEmbedEnabled));
}

function renderCustomEmbedServices() {
  shadow.querySelector("#custom-embed-status").textContent = "";
  const list = shadow.querySelector("#custom-embed-list");
  list.replaceChildren(...settings.customEmbedServices.map((service) => {
    const item = document.createElement("div");
    item.className = "custom-embed-item";
    item.setAttribute("role", "listitem");
    const copy = document.createElement("div");
    copy.className = "custom-embed-item__copy";
    const name = document.createElement("div");
    name.className = "custom-embed-item__name";
    name.textContent = service.label;
    const domain = document.createElement("div");
    domain.className = "custom-embed-item__domain";
    domain.textContent = service.domain;
    copy.append(name, domain);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "custom-embed-remove";
    remove.dataset.domain = service.domain;
    remove.textContent = "Remove";
    remove.setAttribute("aria-label", `Remove ${service.label}`);
    item.append(copy, remove);
    return item;
  }));
}

let pickerHsv = [204, 0.879, 0.941];
let accentSaveTimer;

function slightlyDarkenAccent(hex) {
  return rgbToHex(hexToRgb(hex).map((channel) => Math.round(channel * 0.88)));
}

function updateAccentSelectionIndicators() {
  const color = settings.accentColor.toLowerCase();
  const presets = [...shadow.querySelectorAll(".preset-swatch")];
  const isPreset = presets.some((preset) => preset.dataset.preset.toLowerCase() === color);
  const isDefault = color === defaults.accentColor.toLowerCase();
  shadow.querySelector("#accent-picker-trigger .color-swatch").classList.toggle(
    "custom-selection",
    settings.customAccentEnabled && !isPreset && !isDefault
  );
  for (const preset of presets) {
    preset.setAttribute("aria-pressed", String(settings.customAccentEnabled && preset.dataset.preset.toLowerCase() === color));
  }
}

function setAccentPreview(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return;
  settings.accentColor = rgbToHex(rgb);
  const activeAccent = settings.customAccentEnabled ? settings.accentColor : defaults.accentColor;
  host.style.setProperty("--accent", activeAccent);
  document.documentElement.style.setProperty("--icicle-accent-replacement", activeAccent);
  document.documentElement.style.setProperty("--icicle-accent-replacement-dark", slightlyDarkenAccent(activeAccent));
  document.documentElement.style.setProperty("--icicle-streamer-accent", activeAccent);
  launcher.style.backgroundColor = activeAccent;
  icon.style.filter = contrastingInk(activeAccent) === "#000000" ? "brightness(0)" : "none";
  shadow.querySelector("#accent-picker-trigger .color-swatch").style.setProperty("--accent-color", settings.accentColor);
  for (const preset of shadow.querySelectorAll(".preset-swatch")) {
    preset.style.setProperty("--accent-color", preset.dataset.preset);
    preset.disabled = !settings.customAccentEnabled;
  }
  updateAccentSelectionIndicators();
  shadow.querySelector("#accent-preview").style.setProperty("--accent-color", settings.accentColor);
}

function commitAccentSoon() {
  clearTimeout(accentSaveTimer);
  accentSaveTimer = setTimeout(async () => {
    await persistSettings();
  }, 180);
}

function setPickerColorFromHsv() {
  const [hue, saturation, value] = pickerHsv;
  const hex = rgbToHex(hsvToRgb(hue, saturation, value));
  const rgb = hexToRgb(hex);
  const area = shadow.querySelector("#accent-saturation");
  area.style.setProperty("--hue", hue);
  area.style.backgroundColor = `hsl(${hue},100%,50%)`;
  area.setAttribute("aria-valuetext", hex.toUpperCase());
  area.setAttribute("aria-valuenow", String(Math.round(value * 100)));
  shadow.querySelector(".saturation-cursor").style.left = `${saturation * 100}%`;
  shadow.querySelector(".saturation-cursor").style.top = `${(1 - value) * 100}%`;
  shadow.querySelector("#accent-hue").value = String(Math.round(hue));
  shadow.querySelector("#accent-hex").value = hex.toUpperCase();
  shadow.querySelectorAll(".rgb-input").forEach((input, index) => { input.value = String(rgb[index]); });
  setAccentPreview(hex);
  commitAccentSoon();
}

function setPickerColorFromHex(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return false;
  pickerHsv = rgbToHsv(...rgb);
  setPickerColorFromHsv();
  return true;
}

function renderSettings() {
  const activeAccent = settings.customAccentEnabled ? settings.accentColor : defaults.accentColor;
  host.style.setProperty("--accent", activeAccent);
  document.documentElement.style.setProperty("--icicle-accent-replacement", activeAccent);
  document.documentElement.style.setProperty("--icicle-accent-replacement-dark", slightlyDarkenAccent(activeAccent));
  document.documentElement.style.setProperty("--icicle-streamer-accent", activeAccent);
  shadow.querySelector("#custom-accent-enabled").checked = settings.customAccentEnabled;
  shadow.querySelector("#accent-picker-trigger").disabled = !settings.customAccentEnabled;
  shadow.querySelector("#accent-picker-trigger .color-swatch").style.setProperty("--accent-color", settings.accentColor);
  for (const preset of shadow.querySelectorAll(".preset-swatch")) {
    preset.style.setProperty("--accent-color", preset.dataset.preset);
    preset.disabled = !settings.customAccentEnabled;
  }
  updateAccentSelectionIndicators();
  shadow.querySelector("#show-toasts").checked = settings.showToasts;
  shadow.querySelector("#analytics-enabled").checked = settings.analyticsEnabled;
  shadow.querySelector("#accent-preview").style.setProperty("--accent-color", settings.accentColor);
  launcher.style.backgroundColor = activeAccent;
  icon.style.filter = contrastingInk(activeAccent) === "#000000" ? "brightness(0)" : "none";
  shadow.querySelector("#twitter-logo").checked = settings.twitterLogo;
  shadow.querySelector("#copy-link-embed-enabled").checked = settings.copyLinkEmbedEnabled;
  updateCopyLinkDropdown();
  renderCustomEmbedServices();
  shadow.querySelector("#hide-premium").checked = settings.hidePremium;
  shadow.querySelector("#hide-trends").checked = settings.hideTrends;
  shadow.querySelector("#hide-who-to-follow").checked = settings.hideWhoToFollow;
  shadow.querySelector("#hide-footer").checked = settings.hideFooter;
  shadow.querySelector("#hide-chat").checked = settings.hideChat;
  shadow.querySelector("#hide-grok").checked = settings.hideGrok;
  shadow.querySelector("#hide-live-on-x").checked = settings.hideLiveOnX;
  shadow.querySelector("#hide-paid-partnerships").checked = settings.hidePaidPartnerships;
  shadow.querySelector("#hide-ai-posts").checked = settings.hideAiPosts;
  shadow.querySelector("#streamer-mode").checked = settings.streamerMode;
  shadow.querySelector("#streamer-hide-avatar").checked = settings.streamerHideAvatar;
  shadow.querySelector("#streamer-mask-username").checked = settings.streamerMaskUsername;
  shadow.querySelector("#streamer-hide-avatar").disabled = !settings.streamerMode;
  shadow.querySelector("#streamer-mask-username").disabled = !settings.streamerMode;
  shadow.querySelector("#hide-sidebar-calls").checked = settings.hideSidebarCalls;
  shadow.querySelector("#hide-sidebar-grok").checked = settings.hideSidebarGrok;
  shadow.querySelector("#hide-sidebar-explore").checked = settings.hideSidebarExplore;
  shadow.querySelector("#hide-sidebar-history").checked = settings.hideSidebarHistory;
  shadow.querySelector("#hide-sidebar-logo").checked = settings.hideSidebarLogo;
  shadow.querySelector("#hide-sidebar-home").checked = settings.hideSidebarHome;
  shadow.querySelector("#hide-sidebar-notifications").checked = settings.hideSidebarNotifications;
  shadow.querySelector("#hide-sidebar-chat").checked = settings.hideSidebarChat;
  shadow.querySelector("#hide-sidebar-creator-studio").checked = settings.hideSidebarCreatorStudio;
  shadow.querySelector("#hide-sidebar-premium").checked = settings.hideSidebarPremium;
  shadow.querySelector("#hide-sidebar-profile").checked = settings.hideSidebarProfile;
  shadow.querySelector("#hide-sidebar-more").checked = settings.hideSidebarMore;
  shadow.querySelector("#hide-sidebar-post").checked = settings.hideSidebarPost;
  shadow.querySelector("#words").value = settings.words.join("\n");
  for (const [id, key] of [["filter-author-fields", "filterAuthorFields"], ["filter-regex", "filterRegex"], ["filter-leetspeak", "filterLeetspeak"], ["filter-spacing", "filterSpacing"], ["filter-lookalikes", "filterLookalikes"], ["filter-unicode-normalization", "filterUnicodeNormalization"], ["filter-repeated-characters", "filterRepeatedCharacters"], ["filter-unusual-unicode", "filterUnusualUnicode"], ["blur-media", "blurMedia"], ["whitelist-bypass-all", "whitelistBypassAll"]]) {
    shadow.querySelector(`#${id}`).checked = settings[key];
  }
  shadow.querySelector("#whitelist").value = settings.whitelist.join("\n");
  updatePickerFromAccent();
  updateReactionDropdown();
  shadow.querySelector("#include-metadata").checked = settings.includeMetadata;
  shadow.querySelector(".metadata-fields").hidden = !settings.includeMetadata;
  shadow.querySelector("#author").value = settings.author;
  shadow.querySelector("#list-name").value = settings.listName;
}

async function persistSettings() {
  try {
    await chrome.storage.local.set({ [settingsKey]: settings });
    return true;
  } catch (error) {
    if (!/extension context invalidated/i.test(String(error?.message ?? error))) console.error(error);
    return false;
  }
}

async function saveSettings() {
  await persistSettings();
  renderSettings();
}

async function trackAnalytics(eventName) {
  if (!settings.analyticsEnabled) return;
  try {
    await chrome.runtime.sendMessage({ type: "icicle-analytics", event: eventName });
  } catch {}
}

function normalizeSettings(value) {
  const incoming = value && typeof value === "object" ? value : {};
  const candidate = incoming.settings && typeof incoming.settings === "object" ? incoming.settings : incoming;
  const color = /^#[0-9a-f]{6}$/i.test(candidate.accentColor) ? candidate.accentColor : defaults.accentColor;
  const words = Array.isArray(candidate.words) ? candidate.words.filter((word) => typeof word === "string").map((word) => word.trim()).filter(Boolean) : defaults.words;
  const whitelist = Array.isArray(candidate.whitelist) ? candidate.whitelist.filter((name) => typeof name === "string").map((name) => name.trim().replace(/^@/, "").toLowerCase()).filter(Boolean) : defaults.whitelist;
  const customEmbedServices = normalizeCustomEmbedServices(candidate.customEmbedServices);
  const copyLinkDomain = builtInCopyLinkDomains.has(candidate.copyLinkDomain) || customEmbedServices.some((service) => service.domain === candidate.copyLinkDomain) ? candidate.copyLinkDomain : defaults.copyLinkDomain;
  return {
    accentColor: color,
    customAccentEnabled: candidate.customAccentEnabled === undefined ? defaults.customAccentEnabled : Boolean(candidate.customAccentEnabled),
    showToasts: candidate.showToasts === undefined ? defaults.showToasts : Boolean(candidate.showToasts),
    analyticsEnabled: candidate.analyticsEnabled === undefined ? defaults.analyticsEnabled : Boolean(candidate.analyticsEnabled),
    twitterLogo: Boolean(candidate.twitterLogo),
    copyLinkEmbedEnabled: Boolean(candidate.copyLinkEmbedEnabled),
    copyLinkDomain,
    customEmbedServices,
    hidePremium: Boolean(candidate.hidePremium),
    hideTrends: Boolean(candidate.hideTrends),
    hideWhoToFollow: Boolean(candidate.hideWhoToFollow),
    hideFooter: Boolean(candidate.hideFooter),
    hideChat: Boolean(candidate.hideChat),
    hideGrok: Boolean(candidate.hideGrok),
    hideLiveOnX: Boolean(candidate.hideLiveOnX),
    hidePaidPartnerships: Boolean(candidate.hidePaidPartnerships),
    hideAiPosts: Boolean(candidate.hideAiPosts),
    streamerMode: Boolean(candidate.streamerMode),
    streamerHideAvatar: candidate.streamerHideAvatar === undefined ? defaults.streamerHideAvatar : Boolean(candidate.streamerHideAvatar),
    streamerMaskUsername: candidate.streamerMaskUsername === undefined ? defaults.streamerMaskUsername : Boolean(candidate.streamerMaskUsername),
    hideSidebarCalls: Boolean(candidate.hideSidebarCalls),
    hideSidebarGrok: Boolean(candidate.hideSidebarGrok),
    hideSidebarExplore: Boolean(candidate.hideSidebarExplore),
    hideSidebarHistory: Boolean(candidate.hideSidebarHistory),
    hideSidebarLogo: Boolean(candidate.hideSidebarLogo),
    hideSidebarHome: Boolean(candidate.hideSidebarHome),
    hideSidebarNotifications: Boolean(candidate.hideSidebarNotifications),
    hideSidebarChat: Boolean(candidate.hideSidebarChat),
    hideSidebarCreatorStudio: Boolean(candidate.hideSidebarCreatorStudio),
    hideSidebarPremium: Boolean(candidate.hideSidebarPremium),
    hideSidebarProfile: Boolean(candidate.hideSidebarProfile),
    hideSidebarMore: Boolean(candidate.hideSidebarMore),
    hideSidebarPost: Boolean(candidate.hideSidebarPost),
    words,
    filterAuthorFields: Boolean(candidate.filterAuthorFields),
    filterRegex: Boolean(candidate.filterRegex),
    filterLeetspeak: candidate.filterLeetspeak === undefined ? defaults.filterLeetspeak : Boolean(candidate.filterLeetspeak),
    filterSpacing: candidate.filterSpacing === undefined ? defaults.filterSpacing : Boolean(candidate.filterSpacing),
    filterLookalikes: candidate.filterLookalikes === undefined ? defaults.filterLookalikes : Boolean(candidate.filterLookalikes),
    filterUnicodeNormalization: candidate.filterUnicodeNormalization === undefined ? defaults.filterUnicodeNormalization : Boolean(candidate.filterUnicodeNormalization),
    filterRepeatedCharacters: candidate.filterRepeatedCharacters === undefined ? defaults.filterRepeatedCharacters : Boolean(candidate.filterRepeatedCharacters),
    filterUnusualUnicode: candidate.filterUnusualUnicode === undefined ? defaults.filterUnusualUnicode : Boolean(candidate.filterUnusualUnicode),
    blurMedia: Boolean(candidate.blurMedia),
    whitelist,
    whitelistBypassAll: candidate.whitelistBypassAll === undefined ? defaults.whitelistBypassAll : Boolean(candidate.whitelistBypassAll),
    reaction: candidate.reaction === "remove" ? "remove" : "warn",
    includeMetadata: Boolean(candidate.includeMetadata),
    author: typeof candidate.author === "string" ? candidate.author : "",
    listName: typeof candidate.listName === "string" ? candidate.listName : ""
  };
}

function exactClassMatches(root, className) {
  const matches = [];
  if (root instanceof Element && root.getAttribute("class") === className) matches.push(root);
  if (root.querySelectorAll) {
    for (const element of root.querySelectorAll("[class]")) {
      if (element.getAttribute("class") === className) matches.push(element);
    }
  }
  return matches;
}

function replaceTwitterLogos(root = document) {
  if (!settings.twitterLogo) return;
  for (const target of exactClassMatches(root, logoClass)) {
    const mark = document.createElement("h1");
    mark.dataset.icicleTwitterLogo = "true";
    mark.textContent = "";
    replacedTwitterLogos.set(mark, target);
    target.replaceWith(mark);
  }
}

function restoreTwitterLogos(root = document) {
  const markers = root.querySelectorAll?.('[data-icicle-twitter-logo="true"]') ?? [];
  for (const marker of markers) {
    const original = replacedTwitterLogos.get(marker);
    if (original) marker.replaceWith(original);
  }
}

function readNightMode() {
  const cookie = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith("night_mode="));
  if (!cookie) return null;
  try {
    return decodeURIComponent(cookie.slice("night_mode=".length));
  } catch {
    return cookie.slice("night_mode=".length);
  }
}

function applyTheme() {
  const mode = readNightMode();
  const pageTheme = document.documentElement.dataset.theme;
  host.dataset.theme = pageTheme === "dark" || mode === "2" ? "dark" : "light";
}

const hiddenElementDisplays = new WeakMap();

function setElementHidden(element, key, hidden) {
  if (!element) return;
  const marker = `data-icicle-hidden-${key}`;
  let states = hiddenElementDisplays.get(element);
  if (hidden) {
    if (!states) {
      states = new Map();
      hiddenElementDisplays.set(element, states);
    }
    if (!states.has(key)) states.set(key, { value: element.style.getPropertyValue("display"), priority: element.style.getPropertyPriority("display") });
    element.setAttribute(marker, "true");
    element.style.setProperty("display", "none", "important");
    return;
  }
  if (!element.hasAttribute(marker)) return;
  element.removeAttribute(marker);
  const previous = states?.get(key);
  if (previous?.value) element.style.setProperty("display", previous.value, previous.priority);
  else element.style.removeProperty("display");
  states?.delete(key);
  if (states?.size === 0) hiddenElementDisplays.delete(element);
}

function sidebarCard(element, fallback = element) {
  return element?.closest('[class~="r-kemksi"]') ?? fallback;
}

function premiumPromoCard(link) {
  let element = link.parentElement;
  for (let depth = 0; element && depth < 12; depth += 1, element = element.parentElement) {
    if (element.matches('nav, header[role="banner"], main, [role="main"], [data-testid="primaryColumn"]')) return null;
    const text = element.textContent.normalize("NFKC").replace(/[’‘]/g, "'").toLowerCase();
    if (text.includes("you aren't verified yet")) return element;
  }
  return null;
}

function queryMutationScope(root, selector) {
  if (root instanceof Document || root instanceof DocumentFragment) return [...root.querySelectorAll(selector)];
  if (!(root instanceof Element)) return [];
  const elements = new Set(root.querySelectorAll(selector));
  if (root.matches(selector)) elements.add(root);
  const ancestor = root.closest(selector);
  if (ancestor) elements.add(ancestor);
  return [...elements];
}

const confusableCharacters = new Map(Object.entries({
  "а": "a", "А": "a", "в": "b", "В": "b", "с": "c", "С": "c", "ԁ": "d", "е": "e", "Е": "e", "ԑ": "e", "һ": "h", "Н": "h", "і": "i", "І": "i", "ј": "j", "Ј": "j", "к": "k", "К": "k", "м": "m", "М": "m", "ո": "n", "о": "o", "О": "o", "р": "p", "Р": "p", "ѕ": "s", "Ѕ": "s", "т": "t", "Т": "t", "υ": "u", "х": "x", "Х": "x", "у": "y", "Ү": "y",
  "α": "a", "Α": "a", "β": "b", "Β": "b", "ϲ": "c", "Ε": "e", "ε": "e", "Η": "h", "η": "h", "Ι": "i", "ι": "i", "Κ": "k", "κ": "k", "Μ": "m", "μ": "m", "Ν": "n", "ν": "n", "Ο": "o", "ο": "o", "Ρ": "p", "ρ": "p", "Τ": "t", "τ": "t", "Χ": "x", "χ": "x", "Υ": "y", "υ": "y"
}));
const leetspeakCharacters = new Map(Object.entries({ "0": "o", "1": "i", "!": "i", "|": "i", "3": "e", "4": "a", "@": "a", "5": "s", "$": "s", "7": "t", "+": "t" }));
const unusualUnicodePattern = /[\p{M}\p{Cf}\u202A-\u202E\u2066-\u2069]/u;
let blocklistMatcherSignature = "";
let blocklistMatchers = [];

function normalizeFilterText(value) {
  let normalized = String(value ?? "");
  if (settings.filterUnicodeNormalization) normalized = normalized.normalize("NFKD").replace(/\p{M}/gu, "");
  normalized = normalized.replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/gu, "").toLowerCase();
  if (settings.filterLookalikes) normalized = [...normalized].map((character) => confusableCharacters.get(character) ?? character).join("");
  if (settings.filterLeetspeak) normalized = [...normalized].map((character) => leetspeakCharacters.get(character) ?? character).join("");
  if (settings.filterRepeatedCharacters) normalized = normalized.replace(/(.)\1+/gu, "$1");
  return normalized;
}

function compactFilterText(value) {
  let compact = "";
  const starts = [];
  const ends = [];
  for (let index = 0; index < value.length;) {
    const character = String.fromCodePoint(value.codePointAt(index));
    const end = index + character.length;
    if (/[\p{L}\p{N}_]/u.test(character)) {
      compact += character;
      for (let offset = 0; offset < character.length; offset += 1) {
        starts.push(index);
        ends.push(end);
      }
    }
    index = end;
  }
  return { compact, starts, ends };
}

function isFilterWordCharacter(character) {
  return Boolean(character && /[\p{L}\p{N}_]/u.test(character));
}

function hasBoundaryMatch(text, term) {
  if (!term) return false;
  let index = text.indexOf(term);
  while (index !== -1) {
    const end = index + term.length;
    if (!isFilterWordCharacter(text[index - 1]) && !isFilterWordCharacter(text[end])) return true;
    index = text.indexOf(term, index + 1);
  }
  return false;
}

function hasSeparatorMatch(text, term) {
  const needle = compactFilterText(term).compact;
  if (!needle) return false;
  const { compact, starts, ends } = compactFilterText(text);
  let index = compact.indexOf(needle);
  while (index !== -1) {
    const sourceStart = starts[index];
    const sourceEnd = ends[index + needle.length - 1];
    if (!isFilterWordCharacter(text[sourceStart - 1]) && !isFilterWordCharacter(text[sourceEnd])) return true;
    index = compact.indexOf(needle, index + 1);
  }
  return false;
}

function getBlocklistMatchers() {
  const signature = JSON.stringify([settings.words, settings.filterRegex, settings.filterLeetspeak, settings.filterSpacing, settings.filterLookalikes, settings.filterUnicodeNormalization, settings.filterRepeatedCharacters]);
  if (signature === blocklistMatcherSignature) return blocklistMatchers;
  blocklistMatcherSignature = signature;
  blocklistMatchers = settings.words.flatMap((entry) => {
    if (!entry || entry.length > 256) return [];
    if (settings.filterRegex) {
      try {
        return [{ entry, regex: new RegExp(entry, "iu") }];
      } catch {
        return [];
      }
    }
    const term = normalizeFilterText(entry);
    return term ? [{ entry, term }] : [];
  });
  return blocklistMatchers;
}

function tweetIdentity(tweet) {
  const identity = tweet.querySelector('[data-testid="User-Name"]');
  const lines = [...(identity?.querySelectorAll("span") ?? [])].map((span) => span.textContent.trim()).filter(Boolean);
  const username = lines.find((line) => /^@[a-z0-9_]{1,15}$/i.test(line))?.slice(1).toLowerCase() ?? "";
  const displayName = lines.find((line) => !line.startsWith("@")) ?? "";
  return { username, displayName };
}

function tweetBlockReason(tweet) {
  const identity = tweetIdentity(tweet);
  const isWhitelisted = identity.username && settings.whitelist.includes(identity.username);
  if (isWhitelisted) return null;

  const tweetText = [...tweet.querySelectorAll('[data-testid="tweetText"]')].map((element) => element.textContent.trim()).filter(Boolean).join(" ");
  const sources = [{ field: "tweet text", text: tweetText }];
  if (settings.filterAuthorFields) {
    if (identity.username) sources.push({ field: "username", text: identity.username });
    if (identity.displayName) sources.push({ field: "display name", text: identity.displayName });
  }

  if (settings.filterUnusualUnicode) {
    for (const source of sources) {
      if (unusualUnicodePattern.test(source.text.replace(/[\u200C\u200D\uFE0E\uFE0F]/gu, ""))) return { kind: "unicode", field: source.field };
    }
  }

  if (!settings.words.length) return null;
  const matchers = getBlocklistMatchers();
  for (const matcher of matchers) {
    for (const source of sources) {
      const rawText = source.text.toLowerCase();
      const normalizedText = normalizeFilterText(source.text);
      const compactText = settings.filterSpacing ? compactFilterText(normalizedText).compact : "";
      if (matcher.regex) {
        if (matcher.regex.test(source.text)) return { kind: "entry", entry: matcher.entry, field: source.field, method: "regular expression" };
        if (matcher.regex.test(normalizedText)) return { kind: "entry", entry: matcher.entry, field: source.field, method: "regular expression after character normalization" };
        if (compactText && matcher.regex.test(compactText)) return { kind: "entry", entry: matcher.entry, field: source.field, method: "regular expression after spacing and punctuation were removed" };
        continue;
      }
      if (hasBoundaryMatch(rawText, matcher.entry.toLowerCase())) return { kind: "entry", entry: matcher.entry, field: source.field, method: "case-insensitive match" };
      if (hasBoundaryMatch(normalizedText, matcher.term)) return { kind: "entry", entry: matcher.entry, field: source.field, method: "normalized character match" };
      if (settings.filterSpacing && hasSeparatorMatch(normalizedText, matcher.term)) return { kind: "entry", entry: matcher.entry, field: source.field, method: "match across inserted spacing or punctuation" };
    }
  }
  return null;
}

function describeBlockReason(reason) {
  if (!reason) return "";
  if (reason.kind === "unicode") return `Unusual invisible, directional, or combining Unicode characters were found in the ${reason.field}.`;
  return `Blocklist entry “${reason.entry}” matched the ${reason.field} (${reason.method}).`;
}

function syncTweetFilterWarning(tweet, reason) {
  let warning = tweet.querySelector(":scope > [data-icicle-filter-warning]");
  if (!reason || settings.reaction !== "warn") {
    warning?.remove();
    return;
  }
  if (!warning) {
    warning = document.createElement("div");
    warning.setAttribute("data-icicle-filter-warning", "");
    warning.setAttribute("role", "group");
    warning.setAttribute("aria-label", "Icicle post filter warning");
    const title = document.createElement("strong");
    title.className = "icicle-filter-warning__title";
    title.textContent = "Post hidden by Icicle";
    const explanation = document.createElement("span");
    explanation.className = "icicle-filter-warning__reason";
    const reveal = document.createElement("button");
    reveal.className = "icicle-filter-warning__show";
    reveal.type = "button";
    reveal.dataset.icicleFilterReveal = "";
    reveal.textContent = "Show post";
    warning.append(title, explanation, reveal);
    tweet.append(warning);
  }
  const explanation = warning.querySelector(".icicle-filter-warning__reason");
  const message = describeBlockReason(reason);
  if (explanation && explanation.textContent !== message) explanation.textContent = message;
  warning.hidden = tweet.hasAttribute("data-icicle-revealed");
}

function updateMediaWarningControls(mediaHost, visible, reason) {
  const warning = mediaHost.querySelector(":scope > [data-icicle-media-warning]");
  if (!warning) return;
  const showButton = warning.querySelector("[data-icicle-warning-show]");
  const hideButton = warning.querySelector("[data-icicle-warning-hide]");
  const copy = warning.querySelector(".icicle-media-warning__copy");
  warning.dataset.state = visible ? "visible" : "hidden";
  if (showButton) showButton.hidden = visible;
  if (hideButton) hideButton.hidden = !visible;
  const message = `Icicle hid this media due to ${reason}.`;
  if (copy && !visible && copy.textContent !== message) copy.textContent = message;
}

function setMediaHostVisibility(mediaHost, visible) {
  const media = mediaHost.querySelectorAll("[data-icicle-media-blurred], [data-icicle-media-revealed]");
  for (const element of media) {
    if (visible) {
      element.setAttribute("data-icicle-media-revealed", "true");
      element.removeAttribute("data-icicle-media-blurred");
    } else {
      element.removeAttribute("data-icicle-media-revealed");
      element.toggleAttribute("data-icicle-media-blurred", settings.blurMedia);
    }
  }
  updateMediaWarningControls(mediaHost, visible, mediaHost.querySelector(":scope > [data-icicle-media-warning]")?.dataset.reason ?? "");
}

function setTweetMediaBlur(tweet, blurred, resetReveals = false, textReason = null) {
  const media = [...tweet.querySelectorAll('[data-testid="tweetPhoto"] img, [data-testid="tweetPhoto"] [style*="background-image"], [data-testid="videoPlayer"] video, video')]
    .filter((element) => element.tagName === "VIDEO" || !element.closest('[data-testid="videoPlayer"]'));
  const mediaByHost = new Map();
  for (const element of media) {
    if (resetReveals || !blurred) element.removeAttribute("data-icicle-media-revealed");
    element.toggleAttribute("data-icicle-media-blurred", blurred && !element.hasAttribute("data-icicle-media-revealed"));
    const mediaHost = element.closest('[data-testid="tweetPhoto"], [data-testid="videoPlayer"]') ?? element.parentElement;
    if (!mediaHost) continue;
    if (!mediaByHost.has(mediaHost)) mediaByHost.set(mediaHost, []);
    mediaByHost.get(mediaHost).push(element);
  }
  const hosts = new Set([...mediaByHost.keys(), ...tweet.querySelectorAll("[data-icicle-media-host]")]);
  for (const mediaHost of hosts) {
    const hostMedia = mediaByHost.get(mediaHost) ?? [];
    const shouldWarn = blurred && hostMedia.length > 0;
    let warning = mediaHost.querySelector(":scope > [data-icicle-media-warning]");
    if (!shouldWarn) {
      warning?.remove();
      mediaHost.removeAttribute("data-icicle-media-host");
      mediaHost.removeAttribute("data-icicle-media-position");
      continue;
    }
    if (!warning) {
      const needsRelative = getComputedStyle(mediaHost).position === "static";
      mediaHost.setAttribute("data-icicle-media-host", "");
      if (needsRelative) mediaHost.setAttribute("data-icicle-media-position", "relative");
      else mediaHost.removeAttribute("data-icicle-media-position");
      warning = document.createElement("div");
      warning.className = "icicle-media-warning";
      warning.setAttribute("data-icicle-media-warning", "");
      warning.innerHTML = '<div class="icicle-media-warning__panel" role="group" aria-label="Hidden media controls"><div class="icicle-media-warning__text"><svg class="icicle-media-warning__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3.693 21.707l-1.414-1.414 2.429-2.429c-2.479-2.421-3.606-5.376-3.658-5.513l-.131-.352.131-.352c.133-.353 3.331-8.648 10.937-8.648 2.062 0 3.989.621 5.737 1.85l2.556-2.557 1.414 1.414L3.693 21.707zm-.622-9.706c.356.797 1.354 2.794 3.051 4.449l2.417-2.418c-.361-.609-.553-1.306-.553-2.032 0-2.206 1.794-4 4-4 .727 0 1.424.192 2.033.554l2.263-2.264C14.953 5.434 13.512 5 11.986 5c-5.416 0-8.258 5.535-8.915 7.001zM11.986 10c-1.103 0-2 .897-2 2 0 .178.023.352.067.519l2.451-2.451c-.167-.044-.341-.067-.519-.067zm10.951 1.647l.131.352-.131.352c-.133.353-3.331 8.648-10.937 8.648-.709 0-1.367-.092-2-.223v-2.047c.624.169 1.288.27 2 .27 5.415 0 8.257-5.533 8.915-7-.252-.562-.829-1.724-1.746-2.941l1.438-1.438c1.53 1.971 2.268 3.862 2.33 4.027z"></path></svg><strong class="icicle-media-warning__title">Media hidden by Icicle</strong><span class="icicle-media-warning__copy"></span></div><div class="icicle-media-warning__actions"><button type="button" class="icicle-media-button icicle-media-button--show" data-icicle-warning-show>Show</button><button type="button" class="icicle-media-button icicle-media-button--hide" data-icicle-warning-hide hidden>Hide</button></div></div>';
      mediaHost.append(warning);
    }
    const reasonParts = ["the media blur setting being enabled"];
    if (textReason) reasonParts.push(describeBlockReason(textReason).replace(/\.$/, ""));
    warning.dataset.reason = reasonParts.join("; ");
    updateMediaWarningControls(mediaHost, !hostMedia.some((element) => element.hasAttribute("data-icicle-media-blurred")), warning.dataset.reason);
  }
}
function tweetPostLabels(tweet) {
  const labels = [...tweet.querySelectorAll("span, a")].filter((element) => element.closest('article[data-testid="tweet"]') === tweet && !element.closest('[data-testid="tweetText"]'));
  return {
    paid: labels.some((element) => element.tagName === "A" && (element.getAttribute("href") ?? "").includes("paid-partnerships-policy")) || labels.some((element) => element.textContent.trim() === "Paid partnership"),
    ai: labels.some((element) => element.textContent.trim() === "Made with AI")
  };
}

function applyBlocklist(root = document, resetReveals = false, resetMediaReveals = false) {
  for (const tweet of queryMutationScope(root, 'article[data-testid="tweet"]')) {
    if (tweet.parentElement?.closest('article[data-testid="tweet"]')) continue;
    const identity = tweetIdentity(tweet);
    const isWhitelisted = identity.username && settings.whitelist.includes(identity.username);
    const matchReason = tweetBlockReason(tweet);
    const matched = Boolean(matchReason);
    const labels = tweetPostLabels(tweet);
    const labelBlocked = (settings.hidePaidPartnerships && labels.paid) || (settings.hideAiPosts && labels.ai);
    if (labelBlocked) {
      setElementHidden(tweet, "blocked-tweet", false);
      setElementHidden(tweet, "post-label", true);
      tweet.removeAttribute("data-icicle-filtered");
      tweet.removeAttribute("data-icicle-revealed");
      syncTweetFilterWarning(tweet, null);
    } else if (matched && settings.reaction === "remove") {
      setElementHidden(tweet, "post-label", false);
      tweet.removeAttribute("data-icicle-filtered");
      tweet.removeAttribute("data-icicle-revealed");
      setElementHidden(tweet, "blocked-tweet", true);
    } else {
      setElementHidden(tweet, "post-label", false);
      setElementHidden(tweet, "blocked-tweet", false);
      if (matched) {
        tweet.setAttribute("data-icicle-filtered", "warn");
        if (resetReveals) tweet.removeAttribute("data-icicle-revealed");
        syncTweetFilterWarning(tweet, matchReason);
      } else {
        tweet.removeAttribute("data-icicle-filtered");
        tweet.removeAttribute("data-icicle-revealed");
        syncTweetFilterWarning(tweet, null);
      }
      if (settings.reaction === "remove") syncTweetFilterWarning(tweet, null);
    }
    const mediaBlurred = !labelBlocked && settings.blurMedia && !(isWhitelisted && settings.whitelistBypassAll);
    setTweetMediaBlur(tweet, mediaBlurred, resetMediaReveals, labelBlocked ? null : matchReason);
  }
}

const accountDialog = document.createElement("dialog");
accountDialog.id = "icicle-account-dialog";
accountDialog.setAttribute("aria-labelledby", "icicle-account-dialog-title");
accountDialog.innerHTML = '<div class="icicle-account-dialog__header"><h2 class="icicle-account-dialog__title" id="icicle-account-dialog-title">About account</h2><button class="icicle-account-dialog__close" type="button" aria-label="Close">×</button></div><div class="icicle-account-dialog__items"></div>';
document.documentElement.append(accountDialog);
let accountDialogOpener = null;
let lastAccountMenuContext = null;

const aboutAccountQueryId = "TzOG2twZEfhr9KmClvVVqA";
const aboutAccountBearer = "AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";
const aboutAccountMenuIcon = "M13.5 8.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5S11.17 7 12 7s1.5.67 1.5 1.5zM13 17v-5h-2v5h2zm-1 5.25c5.66 0 10.25-4.59 10.25-10.25S17.66 1.75 12 1.75 1.75 6.34 1.75 12 6.34 22.25 12 22.25zM20.25 12c0 4.56-3.69 8.25-8.25 8.25S3.75 16.56 3.75 12 7.44 3.75 12 3.75s8.25 3.69 8.25 8.25z";
const aboutWarningIcon = "M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm-1-13h2v7h-2V7zm0 9h2v2h-2v-2z";
const aboutAccountIcons = {
  joined: "M7 4V3h2v1h6V3h2v1h1.5C19.89 4 21 5.12 21 6.5v12c0 1.38-1.11 2.5-2.5 2.5h-13C4.12 21 3 19.88 3 18.5v-12C3 5.12 4.12 4 5.5 4H7zm0 2H5.5c-.27 0-.5.22-.5.5v12c0 .28.23.5.5.5h13c.28 0 .5-.22.5-.5v-12c0-.28-.22-.5-.5-.5H17v1h-2V6H9v1H7V6zm0 6h2v-2H7v2zm0 4h2v-2H7v2zm4-4h2v-2h-2v2zm0 4h2v-2h-2v2zm4-4h2v-2h-2v2z",
  basedIn: "M12 7c-1.93 0-3.5 1.57-3.5 3.5S10.07 14 12 14s3.5-1.57 3.5-3.5S13.93 7 12 7zm0 5c-.827 0-1.5-.673-1.5-1.5S11.173 9 12 9s1.5.673 1.5 1.5S12.827 12 12 12zm0-10c-4.687 0-8.5 3.813-8.5 8.5 0 5.967 7.621 11.116 7.945 11.332l.555.37.555-.37c.324-.216 7.945-5.365 7.945-11.332C20.5 5.813 16.687 2 12 2zm0 17.77c-1.665-1.241-6.5-5.196-6.5-9.27C5.5 6.916 8.416 4 12 4s6.5 2.916 6.5 6.5c0 4.073-4.835 8.028-6.5 9.27z",
  changes: "M12 3.786c-4.556 0-8.25 3.694-8.25 8.25s3.694 8.25 8.25 8.25c1.595 0 3.081-.451 4.341-1.233l1.054 1.7c-1.568.972-3.418 1.534-5.395 1.534-5.661 0-10.25-4.589-10.25-10.25S6.339 1.786 12 1.786s10.25 4.589 10.25 10.25c0 .901-.21 1.77-.452 2.477-.592 1.731-2.343 2.477-3.917 2.334-1.242-.113-2.307-.74-3.013-1.647-.961 1.253-2.45 2.011-4.092 1.78-2.581-.363-4.127-2.971-3.76-5.578.366-2.606 2.571-4.688 5.152-4.325 1.019.143 1.877.637 2.519 1.342l1.803.258-.507 3.549c-.187 1.31.761 2.509 2.079 2.629.915.083 1.627-.356 1.843-.99.2-.585.345-1.224.345-1.83 0-4.556-3.694-8.25-8.25-8.25zm-.111 5.274c-1.247-.175-2.645.854-2.893 2.623-.249 1.769.811 3.143 2.058 3.319 1.247.175 2.645-.854 2.893-2.623.249-1.769-.811-3.144-2.058-3.319z",
  connectedVia: "M12.25 2C6.59 2 2 6.59 2 12.25S6.59 22.5 12.25 22.5 22.5 17.91 22.5 12.25 17.91 2 12.25 2zM9.13 4.61c-.1.21-.2.44-.29.66-.62 1.6-1.01 3.69-1.08 5.98h-3.7c.36-3.01 2.35-5.53 5.07-6.64zm-5.07 8.64h3.72c.11 2.09.49 4 1.06 5.48.18.46.39.89.62 1.29-2.88-1.04-5.02-3.63-5.4-6.77zM13.79 18c-.29.75-.61 1.28-.91 1.62-.31.33-.52.38-.63.38-.11 0-.32-.05-.63-.38-.3-.34-.62-.87-.91-1.62-.48-1.22-.82-2.87-.92-4.75h4.92c-.1 1.88-.44 3.53-.92 4.75zm-4.03-6.75c.07-2.09.43-3.92.95-5.25.29-.75.61-1.28.91-1.62.31-.33.52-.38.63-.38.11 0 .32.05.63.38.3.34.62.87.91 1.62.52 1.33.88 3.16.95 5.25H9.76zm5.28 8.77c.23-.4.44-.83.62-1.29.57-1.48.95-3.39 1.06-5.48h3.72c-.38 3.14-2.52 5.73-5.4 6.77zm1.7-8.77c-.07-2.29-.46-4.38-1.08-5.98-.09-.22-.19-.45-.29-.66 2.72 1.11 4.71 3.63 5.07 6.64h-3.7z"
};
let aboutAccountRequestId = 0;

function getCsrfToken() {
  return document.cookie.match(/(?:^|;\s*)ct0=([^;]+)/)?.[1] ?? "";
}

function formatAboutDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", { month: "long", year: "numeric" });
}

function createAboutRow(iconPath, label, value, warningText = "") {
  const row = document.createElement("div");
  row.className = "icicle-about-row css-g5y9jx r-1wtj0ep r-16x9es5 r-1mmae3n r-1ny4l3l";
  row.innerHTML = `<div class="icicle-about-row__main css-g5y9jx r-1awozwy r-18u37iz r-16y2uox"><div class="icicle-about-row__icon css-g5y9jx r-1awozwy r-1777fci r-1prj4y5 r-1472mwg r-lrsllp"><svg viewBox="0 0 24 24" aria-hidden="true" class="r-4qtqp9 r-yyyyoo r-bnwqim r-lrvibr r-m6rgpd r-1nao33i r-1472mwg r-1me0s30 r-7v430y r-lrsllp"><g><path d="${iconPath}"></path></g></svg></div><div class="icicle-about-row__body css-g5y9jx r-16y2uox r-1wbh5a2"><div dir="ltr" class="icicle-about-row__label css-146c3p1 r-bcqeeo r-1ttztb7 r-qvutc0 r-37j5jr r-a023e6 r-rjixqe r-16dba41"><span class="css-1jxf684 r-bcqeeo r-1ttztb7 r-qvutc0 r-poiln3"></span></div><div dir="ltr" class="icicle-about-row__value css-146c3p1 r-bcqeeo r-1ttztb7 r-qvutc0 r-37j5jr r-a023e6 r-rjixqe r-16dba41"><span class="css-1jxf684 r-bcqeeo r-1ttztb7 r-qvutc0 r-poiln3"></span></div></div></div>`;
  const spans = row.querySelectorAll("span");
  spans[0].textContent = label;
  spans[1].textContent = value;
  if (warningText) {
    const warning = document.createElement("span");
    warning.className = "icicle-about-warning";
    warning.setAttribute("role", "img");
    warning.setAttribute("aria-label", warningText);
    warning.title = warningText;
    warning.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${aboutWarningIcon}"></path></svg>`;
    row.querySelector(".icicle-about-row__label").append(warning);
  }
  return row;
}

function createAboutMessage(text) {
  const row = document.createElement("div");
  row.className = "icicle-about-message";
  row.textContent = text;
  return row;
}

function renderAboutAccount(result) {
  const items = accountDialog.querySelector(".icicle-account-dialog__items");
  const profile = result?.about_profile ?? {};
  const rows = [];
  const joined = formatAboutDate(result?.core?.created_at);
  if (joined) rows.push(createAboutRow(aboutAccountIcons.joined, "Date joined", joined));
  const locationWarning = profile.location_accurate === false || profile.created_country_accurate === false ? "This location may be inaccurate." : "";
  if (profile.account_based_in) rows.push(createAboutRow(aboutAccountIcons.basedIn, "Account based in", profile.account_based_in, locationWarning));
  const changes = profile.username_changes;
  if (changes && Number(changes.count) > 0) {
    const count = Number(changes.count);
    const lastChanged = formatAboutDate(Number(changes.last_changed_at_msec));
    rows.push(createAboutRow(aboutAccountIcons.changes, `${count} username change${count === 1 ? "" : "s"}`, lastChanged ? `Last on ${lastChanged}` : ""));
  }
  if (profile.source) rows.push(createAboutRow(aboutAccountIcons.connectedVia, "Connected via", profile.source));
  if (!rows.length) rows.push(createAboutMessage("No account information available."));
  items.replaceChildren(...rows);
}

async function loadAboutAccount(username) {
  const requestId = ++aboutAccountRequestId;
  const items = accountDialog.querySelector(".icicle-account-dialog__items");
  items.replaceChildren(createAboutMessage("Loading…"));
  if (!username) {
    items.replaceChildren(createAboutMessage("Account information unavailable."));
    return;
  }
  try {
    const csrf = getCsrfToken();
    if (!csrf) throw new Error("Missing CSRF token");
    const variables = encodeURIComponent(JSON.stringify({ screenName: username }));
    const response = await fetch(`https://x.com/i/api/graphql/${aboutAccountQueryId}/AboutAccountQuery?variables=${variables}`, {
      headers: {
        accept: "*/*",
        "content-type": "application/json",
        authorization: `Bearer ${aboutAccountBearer}`,
        "x-csrf-token": csrf,
        "x-twitter-active-user": "yes",
        "x-twitter-auth-type": "OAuth2Session",
        "x-twitter-client-language": "en"
      },
      credentials: "include"
    });
    if (!response.ok) throw new Error(`About account request failed (${response.status})`);
    const payload = await response.json();
    if (requestId !== aboutAccountRequestId) return;
    const result = payload?.data?.user_result_by_screen_name?.result;
    if (!result) throw new Error("No account result");
    renderAboutAccount(result);
  } catch (error) {
    if (requestId !== aboutAccountRequestId) return;
    items.replaceChildren(createAboutMessage("Unable to load account information."));
  }
}

function closeAccountDialog() {
  if (accountDialog.open) accountDialog.close();
}

accountDialog.querySelector(".icicle-account-dialog__close").addEventListener("click", closeAccountDialog);
accountDialog.addEventListener("close", () => {
  if (accountDialogOpener?.isConnected) accountDialogOpener.focus();
  accountDialogOpener = null;
});

function openAccountDialog(opener, returnFocusTarget = opener) {
  accountDialogOpener = returnFocusTarget;
  if (!accountDialog.open) accountDialog.showModal();
  accountDialog.querySelector(".icicle-account-dialog__close").focus();
}

function makeAccountMenuItem(sampleItem, label, action, pathData) {
  const item = sampleItem.cloneNode(true);
  for (const attribute of ["href", "id", "aria-describedby", "aria-expanded", "aria-haspopup", "aria-label", "aria-selected", "data-testid"]) item.removeAttribute(attribute);
  item.querySelectorAll("[id]").forEach((node) => node.removeAttribute("id"));
  item.setAttribute("role", "menuitem");
  item.setAttribute("tabindex", "0");
  item.setAttribute("data-icicle-menu-item", "");
  item.dataset.icicleMenuAction = action;
  const svg = item.querySelector("svg");
  if (svg) svg.innerHTML = `<g><path d="${pathData}"></path></g>`;
  const labelNode = item.querySelector("span");
  if (labelNode) labelNode.textContent = label;
  return item;
}

function enhanceAccountMenu(menu) {
  if (!(menu instanceof HTMLElement) || menu.getAttribute("role") !== "menu") return;
  if (menu.querySelector("[data-icicle-menu-item]")) return;
  const menuText = menu.innerText || menu.textContent || "";
  if (!menu.querySelector('[data-testid="block"]') && !/\b(?:block|unfollow|mute)\s+@[a-z0-9_]{1,15}\b/i.test(menuText)) return;
  const list = menu.querySelector('[data-testid="Dropdown"]');
  if (!list) return;
  const menuItems = [...list.querySelectorAll('div[role="menuitem"]')];
  const sampleItem = menuItems.find((item) => item.querySelectorAll("svg").length === 1 && item.querySelector("span")) ?? menuItems[0];
  if (!sampleItem) return;
  const matchedHandle = menuText.match(/\b(?:block|unfollow|mute|follow)\s+@([a-z0-9_]{1,15})\b/i)?.[1];
  const contextUsername = lastAccountMenuContext && Date.now() - lastAccountMenuContext.at < 5000 ? lastAccountMenuContext.username : "";
  const username = (matchedHandle || contextUsername || "").toLowerCase();
  const isWhitelisted = settings.whitelist.includes(username);
  const whitelistLabel = isWhitelisted ? "Remove from whitelist" : "Add to whitelist";
  const whitelistIcon = isWhitelisted ? "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm5-9H7v2h10v-2z" : "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1 14.2-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4-7 7z";
  const whitelistItem = makeAccountMenuItem(sampleItem, whitelistLabel, "whitelist", whitelistIcon);
  const aboutAccount = makeAccountMenuItem(sampleItem, "About account", "about", aboutAccountMenuIcon);
  whitelistItem.dataset.username = username;
  aboutAccount.dataset.username = username;
  list.append(whitelistItem, aboutAccount);
}

document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : event.target?.parentElement;
  const accountMenuItem = target?.closest("[data-icicle-menu-item]");
  if (accountMenuItem) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const menu = accountMenuItem.closest('[role="menu"]');
    if (accountMenuItem.dataset.icicleMenuAction === "whitelist") {
      const username = accountMenuItem.dataset.username;
      if (username) {
        settings.whitelist = settings.whitelist.includes(username)
          ? settings.whitelist.filter((name) => name !== username)
          : [...settings.whitelist, username];
        void saveSettings().then(() => {
          const input = shadow.querySelector("#whitelist");
          input.value = settings.whitelist.join("\n");
          applyPageHiders(document, true, true);
        });
      }
      menu?.remove();
    } else {
      openAccountDialog(accountMenuItem, lastAccountMenuContext?.trigger);
      void loadAboutAccount(accountMenuItem.dataset.username);
      menu?.remove();
    }
    return;
  }
  const warningButton = target?.closest("[data-icicle-warning-show], [data-icicle-warning-hide]");
  if (warningButton) {
    const mediaHost = warningButton.closest("[data-icicle-media-host]");
    if (!mediaHost) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    setMediaHostVisibility(mediaHost, warningButton.hasAttribute("data-icicle-warning-show"));
    return;
  }
  const filterReveal = target?.closest("[data-icicle-filter-reveal]");
  if (filterReveal) {
    const tweet = filterReveal.closest('article[data-icicle-filtered="warn"]');
    if (!tweet) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    tweet.setAttribute("data-icicle-revealed", "true");
    const warning = tweet.querySelector(":scope > [data-icicle-filter-warning]");
    if (warning) warning.hidden = true;
    return;
  }
  const tweet = target?.closest('article[data-icicle-filtered="warn"]');
  if (tweet && !tweet.hasAttribute("data-icicle-revealed") && !target?.closest("[data-icicle-media-warning]")) {
    event.preventDefault();
    event.stopImmediatePropagation();
    tweet.setAttribute("data-icicle-revealed", "true");
    const warning = tweet.querySelector(":scope > [data-icicle-filter-warning]");
    if (warning) warning.hidden = true;
    return;
  }
  const mediaHost = target?.closest("[data-icicle-media-host]");
  if (mediaHost && target?.closest("[data-icicle-media-blurred]")) {
    event.preventDefault();
    event.stopImmediatePropagation();
    setMediaHostVisibility(mediaHost, true);
    return;
  }
  const media = target?.closest("[data-icicle-media-blurred]");
  if (!media) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  media.setAttribute("data-icicle-media-revealed", "true");
  media.removeAttribute("data-icicle-media-blurred");
}, true);

document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : event.target?.parentElement;
  const trigger = target?.closest('article[data-testid="tweet"] [data-testid="caret"], article[data-testid="tweet"] button[aria-label*="More"], article[data-testid="tweet"] [aria-haspopup="menu"]');
  if (!trigger) return;
  const tweet = trigger.closest('article[data-testid="tweet"]');
  if (tweet) lastAccountMenuContext = { trigger, username: tweetIdentity(tweet).username, at: Date.now() };
}, true);

let lastCopyLinkSource = null;

function statusLinkForTweet(tweet) {
  const link = [...tweet.querySelectorAll('a[href*="/status/"]')].find((element) => /\/status\/\d+/.test(element.getAttribute("href") ?? ""));
  return link ? new URL(link.href, location.origin) : null;
}

function copyLinkSource() {
  if (lastCopyLinkSource && Date.now() - lastCopyLinkSource.at < 15000) return lastCopyLinkSource.url;
  return /\/status\/\d+/.test(location.pathname) ? new URL(location.href) : null;
}

async function writeClipboardText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.cssText = "position:fixed;top:-9999px;opacity:0";
    document.documentElement.append(field);
    field.select();
    let copied = false;
    try {
      copied = document.execCommand("copy");
    } catch {
      copied = false;
    }
    field.remove();
    return copied;
  }
}

document.addEventListener("click", (event) => {
  const target = event.target instanceof Element ? event.target : event.target?.parentElement;
  const shareButton = target?.closest('article[data-testid="tweet"] button[aria-label="Share post"]');
  if (!shareButton) return;
  const tweet = shareButton.closest('article[data-testid="tweet"]');
  const url = tweet && statusLinkForTweet(tweet);
  if (url) lastCopyLinkSource = { url, at: Date.now() };
}, true);

let copyLinkWriteTimer;

document.addEventListener("click", (event) => {
  if (!settings.copyLinkEmbedEnabled) return;
  const target = event.target instanceof Element ? event.target : event.target?.parentElement;
  const item = target?.closest('[role="menuitem"]');
  if (!item || item.textContent.trim() !== "Copy link") return;
  const source = copyLinkSource();
  if (!source) return;
  source.hostname = settings.copyLinkDomain;
  source.search = "";
  source.hash = "";
  const href = source.href;
  event.preventDefault();
  writeClipboardText(href);
  clearTimeout(copyLinkWriteTimer);
  copyLinkWriteTimer = setTimeout(() => writeClipboardText(href), 120);
}, true);

document.addEventListener("keydown", (event) => {
  const target = event.target instanceof Element ? event.target : event.target?.parentElement;
  const item = target?.closest("[data-icicle-menu-item]");
  if (!item || (event.key !== "Enter" && event.key !== " ")) return;
  event.preventDefault();
  item.click();
}, true);

function restoreStreamerText() {
  for (const [element, state] of streamerMaskedTexts) {
    if (element.isConnected && element.textContent === state.masked) element.textContent = state.original;
  }
  streamerMaskedTexts.clear();
}

function tweetComposerAvatar(avatar) {
  let ancestor = avatar.parentElement;
  for (let depth = 0; ancestor && depth < 6; depth += 1, ancestor = ancestor.parentElement) {
    if (ancestor.querySelector('[data-testid="tweetTextarea_0_label"], [data-testid="tweetTextarea_0"]')) {
      return ancestor.querySelector('[data-testid^="UserAvatar-Container-"]');
    }
  }
  return null;
}

function avatarForTweetComposerEditor(editor) {
  let ancestor = editor.parentElement;
  for (let depth = 0; ancestor && depth < 16; depth += 1, ancestor = ancestor.parentElement) {
    const avatar = ancestor.querySelector('[data-testid^="UserAvatar-Container-"]');
    if (avatar) return avatar;
  }
  return null;
}

function applyStreamerMode(root = document) {
  const shouldHideAvatar = settings.streamerMode && settings.streamerHideAvatar;
  const avatars = new Set();
  for (const button of queryMutationScope(root, 'button[data-testid="SideNav_AccountSwitcher_Button"]')) {
    const avatar = button.querySelector('[data-testid^="UserAvatar-Container-"]');
    if (avatar) avatars.add(avatar);
  }
  for (const avatar of queryMutationScope(root, '[data-testid^="UserAvatar-Container-"]')) {
    const composerAvatar = tweetComposerAvatar(avatar);
    if (composerAvatar) avatars.add(composerAvatar);
  }
  for (const editor of queryMutationScope(root, '[data-testid="tweetTextarea_0_label"], [data-testid="tweetTextarea_0"]')) {
    const composerAvatar = avatarForTweetComposerEditor(editor);
    if (composerAvatar) avatars.add(composerAvatar);
  }
  for (const avatar of avatars) {
    avatar.querySelector("div[aria-label]")?.toggleAttribute("data-icicle-streamer-avatar-image", shouldHideAvatar);
  }
  if (!settings.streamerMode || !settings.streamerMaskUsername) {
    restoreStreamerText();
    return;
  }
  for (const button of queryMutationScope(root, 'button[data-testid="SideNav_AccountSwitcher_Button"]')) {
    const labels = [...button.querySelectorAll("span")].filter((element) => !element.querySelector("span"));
    for (const element of labels) {
      const original = element.textContent.trim();
      if (!original) continue;
      const prior = streamerMaskedTexts.get(element);
      if (prior && original === prior.masked) continue;
      const masked = original.startsWith("@") ? `@${original.slice(1, 2)}...` : `${original.slice(0, 1)}...`;
      streamerMaskedTexts.set(element, { original, masked });
      element.textContent = masked;
    }
  }
}

function applyPageHiders(root = document, resetBlocklistReveals = false, resetMediaReveals = false) {
  const premium = new Set(queryMutationScope(root, 'aside[aria-label="Subscribe to Premium"]').map((element) => sidebarCard(element, element)));
  for (const link of queryMutationScope(root, 'a[href="/i/premium_sign_up"]')) {
    const card = premiumPromoCard(link);
    if (card) premium.add(card);
  }
  for (const element of premium) setElementHidden(element, "premium", settings.hidePremium);

  const trends = queryMutationScope(root, "h1, h2")
    .filter((heading) => heading.textContent.trim().toLowerCase() === "trending now")
    .map((heading) => sidebarCard(heading, heading.closest("section") ?? heading));
  for (const element of trends) setElementHidden(element, "trends", settings.hideTrends);

  const suggestions = queryMutationScope(root, 'aside[aria-label="Who to follow"]').map((element) => sidebarCard(element, element));
  for (const element of suggestions) setElementHidden(element, "who-to-follow", settings.hideWhoToFollow);

  const footers = queryMutationScope(root, 'nav[aria-label="Footer"]').map((element) => sidebarCard(element, element));
  for (const element of footers) setElementHidden(element, "footer", settings.hideFooter);

  for (const element of queryMutationScope(root, '[data-testid="chat-drawer-main"]')) setElementHidden(element, "chat", settings.hideChat);
  for (const element of queryMutationScope(root, '[data-testid="GrokDrawerHeader"], button[aria-label="Grok actions"]')) setElementHidden(element, "grok", settings.hideGrok);
  for (const button of queryMutationScope(root, "button")) {
    if ([...button.querySelectorAll("span")].some((span) => span.textContent.trim() === "Profile Summary")) setElementHidden(button, "grok", settings.hideGrok);
  }

  const liveOnX = queryMutationScope(root, "h1, h2")
    .filter((heading) => heading.textContent.trim().toLowerCase() === "live on x")
    .map((heading) => sidebarCard(heading, heading.closest("section") ?? heading));
  for (const element of liveOnX) setElementHidden(element, "live-on-x", settings.hideLiveOnX);

  const sidebarLinks = new Set(queryMutationScope(root, 'nav[aria-label="Primary"]').flatMap((nav) => [...nav.querySelectorAll("a[href]")]));
  const sidebarTargets = new Map([
    ["/home", ["sidebar-home", settings.hideSidebarHome]],
    ["/notifications", ["sidebar-notifications", settings.hideSidebarNotifications]],
    ["/i/chat", ["sidebar-chat", settings.hideSidebarChat]],
    ["/i/calls", ["sidebar-calls", settings.hideSidebarCalls]],
    ["/i/grok", ["sidebar-grok", settings.hideSidebarGrok]],
    ["/explore", ["sidebar-explore", settings.hideSidebarExplore]],
    ["/i/history", ["sidebar-history", settings.hideSidebarHistory]],
    ["/i/jf/creators/studio", ["sidebar-creator-studio", settings.hideSidebarCreatorStudio]],
    ["/i/premium_sign_up", ["sidebar-premium", settings.hideSidebarPremium]]
  ]);
  for (const link of sidebarLinks) {
    try {
      const path = new URL(link.getAttribute("href"), location.origin).pathname.replace(/\/$/, "");
      const target = link.getAttribute("data-testid") === "AppTabBar_Profile_Link" || link.getAttribute("aria-label") === "Profile"
        ? ["sidebar-profile", settings.hideSidebarProfile]
        : sidebarTargets.get(path);
      if (target) setElementHidden(link, target[0], target[1]);
    } catch { }
  }

  const banners = queryMutationScope(root, 'header[role="banner"]');
  for (const banner of banners) {
    for (const logo of banner.querySelectorAll('a[aria-label="X"]')) setElementHidden(logo, "sidebar-logo", settings.hideSidebarLogo);
    for (const post of banner.querySelectorAll('[data-testid="SideNav_NewTweet_Button"], a[aria-label="Post"]')) setElementHidden(post, "sidebar-post", settings.hideSidebarPost);
  }
  const primaryNavs = queryMutationScope(root, 'nav[aria-label="Primary"]');
  for (const nav of primaryNavs) {
    for (const more of nav.querySelectorAll('[data-testid="AppTabBar_More_Menu"], button[aria-label="More menu items"]')) setElementHidden(more, "sidebar-more", settings.hideSidebarMore);
  }

  if (root instanceof Document) {
    for (const [key, enabled] of [["premium", settings.hidePremium], ["trends", settings.hideTrends], ["who-to-follow", settings.hideWhoToFollow], ["footer", settings.hideFooter], ["chat", settings.hideChat], ["grok", settings.hideGrok], ["live-on-x", settings.hideLiveOnX], ["sidebar-logo", settings.hideSidebarLogo], ["sidebar-home", settings.hideSidebarHome], ["sidebar-explore", settings.hideSidebarExplore], ["sidebar-notifications", settings.hideSidebarNotifications], ["sidebar-chat", settings.hideSidebarChat], ["sidebar-calls", settings.hideSidebarCalls], ["sidebar-grok", settings.hideSidebarGrok], ["sidebar-history", settings.hideSidebarHistory], ["sidebar-creator-studio", settings.hideSidebarCreatorStudio], ["sidebar-premium", settings.hideSidebarPremium], ["sidebar-profile", settings.hideSidebarProfile], ["sidebar-more", settings.hideSidebarMore], ["sidebar-post", settings.hideSidebarPost]]) {
      if (!enabled) for (const element of document.querySelectorAll(`[data-icicle-hidden-${key}]`)) setElementHidden(element, key, false);
    }
  }
  applyStreamerMode(root);
  applyBlocklist(root, resetBlocklistReveals, resetMediaReveals);
}

const hiderRoots = new Set();
let hiderUpdateQueued = false;

function schedulePageHiders(root) {
  if (root instanceof Element) hiderRoots.add(root);
  else if (root instanceof Node) hiderRoots.add(root.parentElement);
  if (hiderUpdateQueued) return;
  hiderUpdateQueued = true;
  requestAnimationFrame(() => {
    hiderUpdateQueued = false;
    const roots = [...hiderRoots];
    hiderRoots.clear();
    for (const element of roots) if (element?.isConnected) applyPageHiders(element);
  });
}

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportMetadata() {
  if (!settings.includeMetadata) return undefined;
  const metadata = {};
  if (settings.author.trim()) metadata.Author = settings.author.trim();
  if (settings.listName.trim()) metadata["List name"] = settings.listName.trim();
  return Object.keys(metadata).length ? metadata : undefined;
}

function readStatus(message) {
  status.textContent = message;
}

launcher.addEventListener("click", () => {
  applyTheme();
  panel.hidden = !panel.hidden;
  launcher.setAttribute("aria-expanded", String(!panel.hidden));
  if (!panel.hidden) {
    splash.hidden = !settings.showToasts;
    splash.textContent = settings.showToasts ? toastStrings[Math.floor(Math.random() * toastStrings.length)] ?? "" : "";
    shadow.querySelector(".close").focus();
  }
});
shadow.querySelector(".close").addEventListener("click", () => {
  panel.hidden = true;
  launcher.setAttribute("aria-expanded", "false");
  launcher.focus();
});
shadow.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !panel.hidden) {
    if (accentPopup && !accentPopup.hidden) {
      setAccentPickerOpen(false);
      accentPickerTrigger.focus();
      return;
    }
    if (copyLinkMenu && !copyLinkMenu.hidden) {
      setCopyLinkDropdownOpen(false);
      copyLinkTrigger.focus();
      return;
    }
    if (reactionMenu && !reactionMenu.hidden) {
      setReactionDropdownOpen(false);
      reactionTrigger.focus();
      return;
    }
    panel.hidden = true;
    launcher.setAttribute("aria-expanded", "false");
    launcher.focus();
  }
});

const accentPicker = shadow.querySelector("#accent-picker");
const accentPopup = shadow.querySelector("#accent-popup");
const accentPickerTrigger = shadow.querySelector("#accent-picker-trigger");
const saturationArea = shadow.querySelector("#accent-saturation");
const hueSlider = shadow.querySelector("#accent-hue");
let saturationDragging = false;

function setAccentPickerOpen(open) {
  accentPicker.classList.toggle("open", open);
  accentPopup.hidden = !open;
  accentPickerTrigger.setAttribute("aria-expanded", String(open));
  if (open) updatePickerFromAccent();
}

function updateSaturationFromPointer(event) {
  const bounds = saturationArea.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  pickerHsv[1] = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
  pickerHsv[2] = 1 - Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
  setPickerColorFromHsv();
}

accentPickerTrigger.addEventListener("click", () => setAccentPickerOpen(accentPopup.hidden));
saturationArea.addEventListener("pointerdown", (event) => {
  saturationDragging = true;
  saturationArea.setPointerCapture(event.pointerId);
  updateSaturationFromPointer(event);
});
saturationArea.addEventListener("pointermove", (event) => {
  if (saturationDragging) updateSaturationFromPointer(event);
});
saturationArea.addEventListener("pointerup", () => { saturationDragging = false; });
saturationArea.addEventListener("pointercancel", () => { saturationDragging = false; });
saturationArea.addEventListener("keydown", (event) => {
  const step = event.shiftKey ? 0.1 : 0.02;
  if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
  event.preventDefault();
  if (event.key === "ArrowLeft") pickerHsv[1] -= step;
  if (event.key === "ArrowRight") pickerHsv[1] += step;
  if (event.key === "ArrowUp") pickerHsv[2] += step;
  if (event.key === "ArrowDown") pickerHsv[2] -= step;
  pickerHsv[1] = Math.max(0, Math.min(1, pickerHsv[1]));
  pickerHsv[2] = Math.max(0, Math.min(1, pickerHsv[2]));
  setPickerColorFromHsv();
});
hueSlider.addEventListener("input", () => {
  pickerHsv[0] = Number(hueSlider.value);
  setPickerColorFromHsv();
});
shadow.querySelector("#accent-eyedropper").addEventListener("click", async () => {
  if (!window.EyeDropper) {
    shadow.querySelector("#accent-hex").focus();
    shadow.querySelector("#accent-hex").select();
    return;
  }
  try {
    const result = await new EyeDropper().open();
    setPickerColorFromHex(result.sRGBHex);
  } catch { }
});
shadow.querySelector("#accent-hex").addEventListener("input", (event) => {
  const value = event.currentTarget.value.trim();
  setPickerColorFromHex(value.startsWith("#") ? value : `#${value}`);
});
shadow.querySelector("#accent-hex").addEventListener("blur", () => updatePickerFromAccent());
shadow.querySelector("#accent-hex").addEventListener("keydown", (event) => {
  if (event.key === "Enter") event.currentTarget.blur();
});
shadow.querySelectorAll(".rgb-input").forEach((input) => {
  input.addEventListener("change", () => {
    const channels = [...shadow.querySelectorAll(".rgb-input")].map((field) => Math.max(0, Math.min(255, Number(field.value) || 0)));
    setPickerColorFromHex(rgbToHex(channels));
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") event.currentTarget.blur();
  });
});
shadow.querySelector("#accent-reset").addEventListener("click", () => setPickerColorFromHex(defaults.accentColor));
shadow.querySelector("#accent-done").addEventListener("click", async () => {
  clearTimeout(accentSaveTimer);
  await chrome.storage.local.set({ [settingsKey]: settings });
  setAccentPickerOpen(false);
  accentPickerTrigger.focus();
});
document.addEventListener("pointerdown", (event) => {
  const path = event.composedPath();
  if (!path.includes(accentPicker)) setAccentPickerOpen(false);
});
shadow.querySelector("#custom-accent-enabled").addEventListener("change", async (event) => {
  settings.customAccentEnabled = event.currentTarget.checked;
  await saveSettings();
});
shadow.querySelector("#show-toasts").addEventListener("change", async (event) => {
  settings.showToasts = event.currentTarget.checked;
  await saveSettings();
  splash.hidden = !settings.showToasts;
  if (!settings.showToasts) splash.textContent = "";
});
shadow.querySelector("#analytics-enabled").addEventListener("change", async (event) => {
  settings.analyticsEnabled = event.currentTarget.checked;
  await saveSettings();
});
for (const preset of shadow.querySelectorAll(".preset-swatch")) {
  preset.addEventListener("click", async () => {
    if (!settings.customAccentEnabled) return;
    settings.accentColor = preset.dataset.preset;
    await saveSettings();
  });
}
shadow.querySelector("#twitter-logo").addEventListener("change", async (event) => {
  settings.twitterLogo = event.currentTarget.checked;
  await saveSettings();
  if (settings.twitterLogo) replaceTwitterLogos();
  else restoreTwitterLogos();
});
shadow.querySelector("#copy-link-embed-enabled").addEventListener("change", async (event) => {
  settings.copyLinkEmbedEnabled = event.currentTarget.checked;
  updateCopyLinkDropdown();
  await saveSettings();
});
for (const [id, key] of [["hide-premium", "hidePremium"], ["hide-trends", "hideTrends"], ["hide-who-to-follow", "hideWhoToFollow"], ["hide-footer", "hideFooter"], ["hide-chat", "hideChat"], ["hide-grok", "hideGrok"], ["hide-live-on-x", "hideLiveOnX"], ["hide-paid-partnerships", "hidePaidPartnerships"], ["hide-ai-posts", "hideAiPosts"], ["hide-sidebar-logo", "hideSidebarLogo"], ["hide-sidebar-home", "hideSidebarHome"], ["hide-sidebar-explore", "hideSidebarExplore"], ["hide-sidebar-notifications", "hideSidebarNotifications"], ["hide-sidebar-chat", "hideSidebarChat"], ["hide-sidebar-calls", "hideSidebarCalls"], ["hide-sidebar-grok", "hideSidebarGrok"], ["hide-sidebar-history", "hideSidebarHistory"], ["hide-sidebar-creator-studio", "hideSidebarCreatorStudio"], ["hide-sidebar-premium", "hideSidebarPremium"], ["hide-sidebar-profile", "hideSidebarProfile"], ["hide-sidebar-more", "hideSidebarMore"], ["hide-sidebar-post", "hideSidebarPost"]]) {
  shadow.querySelector(`#${id}`).addEventListener("change", async (event) => {
    settings[key] = event.currentTarget.checked;
    await saveSettings();
    applyPageHiders();
  });
}
for (const [id, key] of [["streamer-mode", "streamerMode"], ["streamer-hide-avatar", "streamerHideAvatar"], ["streamer-mask-username", "streamerMaskUsername"]]) {
  shadow.querySelector(`#${id}`).addEventListener("change", async (event) => {
    settings[key] = event.currentTarget.checked;
    await saveSettings();
    applyStreamerMode();
  });
}
shadow.querySelector("#words").addEventListener("change", async (event) => {
  settings.words = event.currentTarget.value.split(/\r?\n/).map((word) => word.trim()).filter(Boolean);
  await saveSettings();
  applyPageHiders(document, true);
});
for (const [id, key] of [["filter-author-fields", "filterAuthorFields"], ["filter-regex", "filterRegex"], ["filter-leetspeak", "filterLeetspeak"], ["filter-spacing", "filterSpacing"], ["filter-lookalikes", "filterLookalikes"], ["filter-unicode-normalization", "filterUnicodeNormalization"], ["filter-repeated-characters", "filterRepeatedCharacters"], ["filter-unusual-unicode", "filterUnusualUnicode"], ["blur-media", "blurMedia"], ["whitelist-bypass-all", "whitelistBypassAll"]]) {
  shadow.querySelector(`#${id}`).addEventListener("change", async (event) => {
    settings[key] = event.currentTarget.checked;
    await saveSettings();
    applyPageHiders(document, true, key === "blurMedia");
  });
}
shadow.querySelector("#whitelist").addEventListener("change", async (event) => {
  settings.whitelist = event.currentTarget.value.split(/\r?\n/).map((name) => name.trim().replace(/^@/, "").toLowerCase()).filter(Boolean);
  await saveSettings();
  applyPageHiders(document, true);
});
const reactionDropdown = shadow.querySelector("#reaction-dropdown");
const reactionTrigger = shadow.querySelector("#reaction-trigger");
const reactionMenu = shadow.querySelector("#reaction-menu");

function setReactionDropdownOpen(open) {
  reactionDropdown.classList.toggle("open", open);
  reactionMenu.hidden = !open;
  reactionTrigger.setAttribute("aria-expanded", String(open));
}

reactionTrigger.addEventListener("click", () => setReactionDropdownOpen(reactionMenu.hidden));
reactionTrigger.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    setReactionDropdownOpen(true);
    reactionMenu.querySelector(`[data-value="${settings.reaction}"]`)?.focus();
  }
  if (event.key === "Escape") {
    event.stopPropagation();
    setReactionDropdownOpen(false);
  }
});
const reactionOptions = [...reactionMenu.querySelectorAll("[role=option]")];
reactionOptions.forEach((option, index) => {
  option.addEventListener("click", async () => {
    settings.reaction = option.dataset.value;
    updateReactionDropdown();
    setReactionDropdownOpen(false);
    await saveSettings();
    applyPageHiders(document, true);
    reactionTrigger.focus();
  });
  option.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      reactionOptions[(index + (event.key === "ArrowDown" ? 1 : -1) + reactionOptions.length) % reactionOptions.length].focus();
    } else if (event.key === "Escape") {
      event.stopPropagation();
      setReactionDropdownOpen(false);
      reactionTrigger.focus();
    } else if (event.key === "Tab") setReactionDropdownOpen(false);
  });
});
document.addEventListener("pointerdown", (event) => {
  if (!event.composedPath().includes(reactionDropdown)) setReactionDropdownOpen(false);
});
const copyLinkDropdown = shadow.querySelector("#copy-link-domain-dropdown");
const copyLinkTrigger = shadow.querySelector("#copy-link-domain-trigger");
const copyLinkMenu = shadow.querySelector("#copy-link-domain-menu");

function setCustomEmbedStatus(message) {
  shadow.querySelector("#custom-embed-status").textContent = message;
}

async function addCustomEmbedService() {
  const nameInput = shadow.querySelector("#custom-embed-name");
  const domainInput = shadow.querySelector("#custom-embed-domain");
  const domain = normalizeEmbedDomain(domainInput.value);
  if (!domain) {
    setCustomEmbedStatus("Enter a valid domain, such as embed.example.com.");
    domainInput.focus();
    return;
  }
  if (builtInCopyLinkDomains.has(domain)) {
    setCustomEmbedStatus("That service is already built in.");
    domainInput.focus();
    return;
  }
  const label = nameInput.value.trim().replace(/\s+/g, " ").slice(0, 60) || domain;
  settings.customEmbedServices = [...settings.customEmbedServices.filter((service) => service.domain !== domain), { domain, label }];
  settings.copyLinkDomain = domain;
  nameInput.value = "";
  domainInput.value = "";
  await saveSettings();
  updateCopyLinkDropdown();
  renderCustomEmbedServices();
  setCustomEmbedStatus(`Added ${label}.`);
}

shadow.querySelector("#add-custom-embed").addEventListener("click", addCustomEmbedService);
for (const id of ["custom-embed-name", "custom-embed-domain"]) {
  shadow.querySelector(`#${id}`).addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addCustomEmbedService();
  });
}
shadow.querySelector("#custom-embed-list").addEventListener("click", async (event) => {
  const button = event.target instanceof Element ? event.target.closest(".custom-embed-remove") : null;
  if (!button) return;
  const service = settings.customEmbedServices.find((item) => item.domain === button.dataset.domain);
  settings.customEmbedServices = settings.customEmbedServices.filter((item) => item.domain !== button.dataset.domain);
  if (settings.copyLinkDomain === button.dataset.domain) settings.copyLinkDomain = defaults.copyLinkDomain;
  await saveSettings();
  updateCopyLinkDropdown();
  renderCustomEmbedServices();
  setCustomEmbedStatus(service ? `Removed ${service.label}.` : "Custom embed service removed.");
});

function setCopyLinkDropdownOpen(open) {
  open = open && settings.copyLinkEmbedEnabled;
  copyLinkDropdown.classList.toggle("open", open);
  copyLinkMenu.hidden = !open;
  copyLinkTrigger.setAttribute("aria-expanded", String(open));
}

copyLinkTrigger.addEventListener("click", () => setCopyLinkDropdownOpen(copyLinkMenu.hidden));
copyLinkTrigger.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    setCopyLinkDropdownOpen(true);
    copyLinkMenu.querySelector(`[data-value="${settings.copyLinkDomain}"]`)?.focus();
  }
  if (event.key === "Escape") {
    event.stopPropagation();
    setCopyLinkDropdownOpen(false);
  }
});
copyLinkMenu.addEventListener("click", async (event) => {
  const option = event.target instanceof Element ? event.target.closest("[role=option]") : null;
  if (!option) return;
  settings.copyLinkDomain = option.dataset.value;
  updateCopyLinkDropdown();
  setCopyLinkDropdownOpen(false);
  await saveSettings();
  copyLinkTrigger.focus();
});
copyLinkMenu.addEventListener("keydown", (event) => {
  const option = event.target instanceof Element ? event.target.closest("[role=option]") : null;
  if (!option) return;
  const options = [...copyLinkMenu.querySelectorAll("[role=option]")];
  const index = options.indexOf(option);
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    options[(index + (event.key === "ArrowDown" ? 1 : -1) + options.length) % options.length].focus();
  } else if (event.key === "Escape") {
    event.stopPropagation();
    setCopyLinkDropdownOpen(false);
    copyLinkTrigger.focus();
  } else if (event.key === "Tab") setCopyLinkDropdownOpen(false);
});
document.addEventListener("pointerdown", (event) => {
  if (!event.composedPath().includes(copyLinkDropdown)) setCopyLinkDropdownOpen(false);
});
shadow.querySelector("#include-metadata").addEventListener("change", async (event) => {
  settings.includeMetadata = event.currentTarget.checked;
  await saveSettings();
});
shadow.querySelector("#author").addEventListener("change", async (event) => {
  settings.author = event.currentTarget.value;
  await saveSettings();
});
shadow.querySelector("#list-name").addEventListener("change", async (event) => {
  settings.listName = event.currentTarget.value;
  await saveSettings();
});

shadow.querySelector("#export-settings").addEventListener("click", () => {
  const payload = { format: "icicle-settings", version: 1, settings: { ...settings }, metadata: exportMetadata() };
  downloadJson("icicle-settings.json", payload);
  readStatus("Settings exported.");
});
shadow.querySelector("#export-blocklist").addEventListener("click", () => {
  const payload = { format: "icicle-word-blocklist", version: 1, words: settings.words, reaction: settings.reaction, whitelist: settings.whitelist, filterOptions: { filterAuthorFields: settings.filterAuthorFields, filterRegex: settings.filterRegex, filterLeetspeak: settings.filterLeetspeak, filterSpacing: settings.filterSpacing, filterLookalikes: settings.filterLookalikes, filterUnicodeNormalization: settings.filterUnicodeNormalization, filterRepeatedCharacters: settings.filterRepeatedCharacters, filterUnusualUnicode: settings.filterUnusualUnicode, blurMedia: settings.blurMedia, hidePaidPartnerships: settings.hidePaidPartnerships, hideAiPosts: settings.hideAiPosts, copyLinkEmbedEnabled: settings.copyLinkEmbedEnabled, copyLinkDomain: settings.copyLinkDomain, customEmbedServices: settings.customEmbedServices, whitelistBypassAll: settings.whitelistBypassAll }, metadata: exportMetadata() };
  downloadJson("icicle-word-blocklist.json", payload);
  readStatus("Word blocklist exported.");
});
shadow.querySelector("#import-settings").addEventListener("click", () => shadow.querySelector("#settings-file").click());
shadow.querySelector("#import-blocklist").addEventListener("click", () => shadow.querySelector("#blocklist-file").click());
shadow.querySelector("#settings-file").addEventListener("change", async (event) => {
  const [file] = event.currentTarget.files;
  if (!file) return;
  try {
    const parsed = JSON.parse(await file.text());
    settings = normalizeSettings(parsed);
    await saveSettings();
    renderSettings();
    applyPageHiders(document, true, true);
    if (settings.twitterLogo) replaceTwitterLogos();
    else restoreTwitterLogos();
    readStatus("Settings imported.");
  } catch {
    readStatus("Could not import settings. Choose a valid Icicle JSON file.");
  }
  event.currentTarget.value = "";
});
shadow.querySelector("#blocklist-file").addEventListener("change", async (event) => {
  const [file] = event.currentTarget.files;
  if (!file) return;
  try {
    const text = await file.text();
    let words;
    let reaction = settings.reaction;
    if (file.name.toLowerCase().endsWith(".json")) {
      const parsed = JSON.parse(text);
      words = Array.isArray(parsed) ? parsed : parsed.words;
      if (parsed.reaction === "remove" || parsed.reaction === "warn") reaction = parsed.reaction;
      if (Array.isArray(parsed.whitelist)) settings.whitelist = parsed.whitelist.filter((name) => typeof name === "string").map((name) => name.trim().replace(/^@/, "").toLowerCase()).filter(Boolean);
      if (parsed.filterOptions && typeof parsed.filterOptions === "object") settings = normalizeSettings({ ...settings, ...parsed.filterOptions, whitelist: settings.whitelist });
    } else {
      words = text.split(/\r?\n/);
    }
    if (!Array.isArray(words) || words.some((word) => typeof word !== "string")) throw new Error("Invalid word list");
    settings.words = words.map((word) => word.trim()).filter(Boolean);
    settings.reaction = reaction;
    await saveSettings();
    renderSettings();
    applyPageHiders(document, true, true);
    readStatus("Word blocklist imported.");
  } catch {
    readStatus("Could not import the word blocklist. Choose a valid JSON or text file.");
  }
  event.currentTarget.value = "";
});

const xBluePattern = /#1d9bf0\b|rgb\(\s*29\s*,\s*155\s*,\s*240\s*\)/gi;
const xDarkBluePattern = /rgb\(\s*(?:26\s*,\s*140\s*,\s*216|23\s*,\s*124\s*,\s*192)\s*\)/gi;

function replaceXBlue(value) {
  return value.replace(xBluePattern, "var(--icicle-accent-replacement)").replace(xDarkBluePattern, "var(--icicle-accent-replacement-dark)");
}

function replaceXBlueInStylesheetRules(rules) {
  for (const rule of rules) {
    if (rule.style) {
      for (const property of [...rule.style]) {
        const value = rule.style.getPropertyValue(property);
        if (xBluePattern.test(value) || xDarkBluePattern.test(value)) rule.style.setProperty(property, replaceXBlue(value), rule.style.getPropertyPriority(property));
        xBluePattern.lastIndex = 0;
        xDarkBluePattern.lastIndex = 0;
      }
    }
    if (rule.cssRules) replaceXBlueInStylesheetRules(rule.cssRules);
  }
}

function replaceXBlueInNode(node) {
  if (!(node instanceof Element)) return;
  const elements = [node, ...node.querySelectorAll("[style], style, [fill], [stroke], [color], [stop-color]")];
  for (const element of elements) {
    if (element.hasAttribute("style")) {
      const style = element.getAttribute("style");
      const replaced = replaceXBlue(style);
      if (replaced !== style) element.setAttribute("style", replaced);
    }
    for (const attribute of ["fill", "stroke", "color", "stop-color"]) {
      const value = element.getAttribute(attribute);
      if (value && (xBluePattern.test(value) || xDarkBluePattern.test(value))) element.setAttribute(attribute, replaceXBlue(value));
      xBluePattern.lastIndex = 0;
      xDarkBluePattern.lastIndex = 0;
    }
    if (element.tagName === "STYLE" && (xBluePattern.test(element.textContent) || xDarkBluePattern.test(element.textContent))) element.textContent = replaceXBlue(element.textContent);
    xBluePattern.lastIndex = 0;
    xDarkBluePattern.lastIndex = 0;
  }
}

function replaceXBlueInStylesheets() {
  for (const stylesheet of document.styleSheets) {
    try {
      replaceXBlueInStylesheetRules(stylesheet.cssRules);
    } catch { }
  }
}

const observer = new MutationObserver((records) => {
  for (const record of records) {
    if (record.type === "childList") {
      for (const node of record.addedNodes) schedulePageHiders(node);
      if (record.removedNodes.length) schedulePageHiders(record.target);
      const parent = record.target instanceof Element ? record.target : record.target.parentElement;
      const menu = parent?.closest('[role="menu"]');
      if (menu) enhanceAccountMenu(menu);
    }
    if (record.type === "characterData") schedulePageHiders(record.target);
    if (record.type === "attributes" && ["href", "data-testid"].includes(record.attributeName)) schedulePageHiders(record.target);
    if (record.type === "attributes") replaceXBlueInNode(record.target);
    if (record.type === "characterData" && record.target.parentElement?.tagName === "STYLE") replaceXBlueInNode(record.target.parentElement);
    for (const node of record.addedNodes) {
      const element = node instanceof Element ? node : node.parentElement;
      if (element?.matches('[role="menu"]')) enhanceAccountMenu(element);
      element?.querySelectorAll('[role="menu"]').forEach(enhanceAccountMenu);
      if (settings.twitterLogo && element) replaceTwitterLogos(element);
      replaceXBlueInNode(element);
    }
  }
});
observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "fill", "stroke", "color", "stop-color", "href", "data-testid"], characterData: true });
replaceXBlueInNode(document.documentElement);
replaceXBlueInStylesheets();
document.addEventListener("load", (event) => {
  if (event.target instanceof HTMLLinkElement && event.target.rel === "stylesheet") replaceXBlueInStylesheets();
}, true);

async function initialize() {
  applyTheme();
  const saved = await chrome.storage.local.get(settingsKey);
  settings = normalizeSettings(saved[settingsKey] ?? defaults);
  renderSettings();
  void trackAnalytics("extension_active");
  applyPageHiders(document, true, true);
  replaceTwitterLogos();
}

initialize();

new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

if (globalThis.cookieStore) {
  globalThis.cookieStore.addEventListener("change", (event) => {
    if ([...event.changed, ...event.deleted].some((cookie) => cookie.name === "night_mode")) applyTheme();
  });
}

window.addEventListener("focus", applyTheme);
