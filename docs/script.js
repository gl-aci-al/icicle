const analyticsStorageKey = "icicle-analytics-optout";
const analyticsWebsiteId = "6a71fb6b-75b0-4136-85cb-6be6f17dae25";
const assetBaseUrl = new URL("./", document.currentScript.src);
const assetUrl = (path) => new URL(path, assetBaseUrl).href;

const isAnalyticsOptedOut = () => {
  try {
    return window.localStorage.getItem(analyticsStorageKey) === "true";
  } catch {
    return true;
  }
};

window.umamiBeforeSend = (type, payload) => {
  if (isAnalyticsOptedOut() || type !== "pageview") return false;
  if (payload) {
    delete payload.referrer;
    delete payload.screen;
    delete payload.language;
  }
  return payload;
};

const loadAnalytics = () => {
  if (isAnalyticsOptedOut() || document.querySelector("script[data-website-id]")) return;

  const script = document.createElement("script");
  script.defer = true;
  script.src = "https://cloud.umami.is/script.js";
  script.dataset.websiteId = analyticsWebsiteId;
  script.dataset.excludeSearch = "true";
  script.dataset.excludeHash = "true";
  script.dataset.doNotTrack = "true";
  script.dataset.beforeSend = "umamiBeforeSend";
  document.head.appendChild(script);
};

const createAnalyticsControl = () => {
  if (document.querySelector(".analytics-toggle")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "analytics-toggle";

  const sync = () => {
    const enabled = !isAnalyticsOptedOut();
    button.textContent = enabled ? "Analytics on" : "Analytics off";
    button.setAttribute("aria-pressed", String(enabled));
    button.title = enabled
      ? "Anonymous page views only. Click to opt out."
      : "Analytics are off. Click to opt in.";
  };

  button.addEventListener("click", () => {
    if (isAnalyticsOptedOut()) {
      try {
        window.localStorage.setItem(analyticsStorageKey, "false");
      } catch {}
      loadAnalytics();
      if (window.umami && typeof window.umami.track === "function") {
        window.umami.track();
      }
    } else {
      try {
        window.localStorage.setItem(analyticsStorageKey, "true");
      } catch {}
    }
    sync();
  });

  sync();
  document.body.appendChild(button);
};

loadAnalytics();
createAnalyticsControl();

const backgroundVideo = document.querySelector(".background-video");

if (backgroundVideo) {
  const backgrounds = [
    "assets/bg/glacier-calving-front-1920x1080.mp4",
    "assets/bg/glacier-lagoon-ice-1920x1080.mp4",
  ];
  backgroundVideo.src = assetUrl(backgrounds[Math.floor(Math.random() * backgrounds.length)]);
}

const brandSwap = document.querySelector(".brand-swap");
const brandIcons = Array.from(document.querySelectorAll(".brand-icon"));

if (brandSwap && brandIcons.length) {
  let activeBrand = 0;
  brandIcons[activeBrand].classList.add("is-active");

  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.setInterval(() => {
      brandIcons[activeBrand].classList.remove("is-active");
      activeBrand = (activeBrand + 1) % brandIcons.length;
      brandIcons[activeBrand].classList.add("is-active");
    }, 3500);
  }
}

const browserPicker = document.querySelector(".browser-picker");
const browserTrigger = document.querySelector(".browser-trigger");
const browserSelected = document.querySelector(".browser-selected");
const browserCurrentIcon = document.querySelector(".browser-current-icon img");

if (browserPicker && browserTrigger && browserSelected) {
  const detectedBrowser = /firefox|fxios/i.test(navigator.userAgent) ? "Firefox" : "Chrome";
  browserSelected.textContent = detectedBrowser;
  browserCurrentIcon.src = assetUrl(detectedBrowser === "Firefox" ? "assets/firefox.svg" : "assets/chrome.svg");
  browserTrigger.setAttribute("aria-label", `Download for ${detectedBrowser}`);

  const setPickerState = (isOpen) => {
    browserPicker.classList.toggle("is-open", isOpen);
    browserTrigger.setAttribute("aria-expanded", String(isOpen));
  };

  browserTrigger.addEventListener("click", () => {
    const isOpen = browserPicker.classList.contains("is-open");
    browserPicker.classList.toggle("is-dismissed", isOpen);
    setPickerState(!isOpen);
  });

  browserPicker.addEventListener("pointerenter", () => {
    browserPicker.classList.remove("is-dismissed");
    setPickerState(true);
  });
  browserPicker.addEventListener("pointerleave", () => {
    if (!browserPicker.contains(document.activeElement)) setPickerState(false);
  });
  browserPicker.addEventListener("focusin", () => {
    if (!browserPicker.classList.contains("is-dismissed")) setPickerState(true);
  });
  browserPicker.addEventListener("focusout", () => {
    window.setTimeout(() => {
      if (!browserPicker.contains(document.activeElement) && !browserPicker.matches(":hover")) {
        setPickerState(false);
      }
    });
  });

  document.addEventListener("click", (event) => {
    if (!browserPicker.contains(event.target)) setPickerState(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      browserPicker.classList.add("is-dismissed");
      setPickerState(false);
      browserTrigger.focus();
    }
  });
}
