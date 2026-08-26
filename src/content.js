(() => {
  const markerId = "icicle-extension-marker";
  const floatingButtonAttribute = "data-icicle-floating-button";
  const DEFAULT_SETTINGS = {
    accentColor: "#dbc9a4",
    useDefaultAccent: false,
    matchAuthorNames: false,
    removeGrok: false,
    compactAccount: false,
    hideAccountAvatar: false,
    accountAvatarColor: "#dbc9a4",
    removeUpsells: false,
    blockedWords: [],
    blockMode: "blur",
    regexEnabled: false,
    bypassDetection: true,
    unicodeWarning: true,
    blurImages: false,
    scanSidebarContent: false,
    sidebarBlockMode: "blur",
    whitelistAccounts: [],
    whitelistMode: "show"
  };

  if (document.getElementById(markerId)) return;

  let settings = { ...DEFAULT_SETTINGS };
  let accentScanTimer = null;
  let syncTimer = null;
  let appliedTheme = "";
  let logoSourcePromise = null;
  let logoMarkup = "";
  let logoMarkupTheme = "";
  const fallbackLogoSource = '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><g><path d="M16 4L18.5 20L21 4H16ZM16 4L12 4M16 4L14 11L12 4M12 4L10 14L8 4M8 4L3 4L5.5 11L8 4Z" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></g></svg>';

  function getTheme() {
    const declaredTheme = document.documentElement.getAttribute("data-theme");
    if (declaredTheme === "light" || declaredTheme === "dark") return declaredTheme;
    const background = getComputedStyle(document.body).backgroundColor;
    return background === "rgb(0, 0, 0)" || background === "rgb(21, 24, 28)" ? "dark" : "light";
  }

  function isBlackLogoBackground() {
    if (!document.body) return false;
    return getComputedStyle(document.body).backgroundColor === "rgb(0, 0, 0)";
  }

  function getExtensionUrl(fileName) {
    try {
      return chrome.runtime?.getURL?.(fileName) || "";
    } catch {
      return "";
    }
  }

  function getStoredSettings() {
    try {
      return Promise.resolve(chrome.storage.local.get(null)).catch(() => ({}));
    } catch {
      return Promise.resolve({});
    }
  }

  function storeSettings(value) {
    try {
      return Promise.resolve(chrome.storage.local.set(value)).catch(() => undefined);
    } catch {
      return Promise.resolve();
    }
  }

  function applyFontAsset() {
    const fontStyleId = "icicle-font-assets";
    let fontStyle = document.getElementById(fontStyleId);
    if (!fontStyle) {
      fontStyle = document.createElement("style");
      fontStyle.id = fontStyleId;
      document.head?.append(fontStyle);
    }
    const fontUrl = (fileName) => getExtensionUrl(fileName);
    const regularFont = fontUrl("Chirp-Regular.woff2");
    const mediumFont = fontUrl("Chirp-Medium.woff2");
    const boldFont = fontUrl("Chirp-Bold.woff2");
    const heavyFont = fontUrl("Chirp-Heavy.woff2");
    if (![regularFont, mediumFont, boldFont, heavyFont].every(Boolean)) return;
    const fontCss = `
      @font-face { font-family: "Chirp"; src: url("${regularFont}") format("woff2"); font-weight: 400; }
      @font-face { font-family: "Chirp"; src: url("${mediumFont}") format("woff2"); font-weight: 500; }
      @font-face { font-family: "Chirp"; src: url("${boldFont}") format("woff2"); font-weight: 700; }
      @font-face { font-family: "Chirp"; src: url("${heavyFont}") format("woff2"); font-weight: 800; }
    `;
    if (fontStyle.textContent !== fontCss) fontStyle.textContent = fontCss;
  }

  function applyLogoAsset() {
    if (!logoSourcePromise) {
      const logoUrl = getExtensionUrl("assets/icicle.svg");
      logoSourcePromise = logoUrl
        ? fetch(logoUrl).then((response) => response.ok ? response.text() : fallbackLogoSource).catch(() => fallbackLogoSource)
        : Promise.resolve(fallbackLogoSource);
    }

    const logoTheme = isBlackLogoBackground() ? "dark" : "light";
    logoSourcePromise.then((source) => {
      if (!source) return;
      if (logoMarkupTheme !== logoTheme) {
        const svg = new DOMParser().parseFromString(source, "image/svg+xml").documentElement;
        const bodyFill = logoTheme === "dark" ? "#ffffff" : "#000000";
        const innerFill = logoTheme === "dark" ? "#000000" : "#ffffff";
        svg.removeAttribute("width");
        svg.removeAttribute("height");
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("fill", bodyFill);
        svg.querySelectorAll("path").forEach((path) => {
          const sourceFill = (path.getAttribute("fill") || "").toLowerCase();
          const sourceStroke = path.getAttribute("stroke");
          if (sourceStroke) {
            path.setAttribute("stroke", bodyFill);
            path.style.setProperty("stroke", bodyFill, "important");
            path.style.setProperty("fill", "none", "important");
            return;
          }
          const pathFill = sourceFill === "#ffffff" || sourceFill === "#fff" ? innerFill : bodyFill;
          path.setAttribute("fill", pathFill);
          path.style.setProperty("fill", pathFill, "important");
        });
        logoMarkup = svg.outerHTML;
        logoMarkupTheme = logoTheme;
      }
      document.querySelectorAll("[data-icicle-logo-slot]").forEach((slot) => {
        if (slot.dataset.icicleLogoTheme !== logoTheme) {
          slot.innerHTML = logoMarkup;
          slot.dataset.icicleLogoTheme = logoTheme;
        }
      });
    });
  }

  function isValidColor(value) {
    const probe = document.createElement("div");
    probe.style.color = value;
    return Boolean(String(value).trim()) && probe.style.color !== "";
  }

  function toHexColor(value) {
    const probe = document.createElement("div");
    probe.style.color = value;
    document.body.appendChild(probe);
    const rgb = getComputedStyle(probe).color.match(/\d+/g);
    probe.remove();
    if (!rgb || rgb.length < 3) return null;
    return `#${rgb.slice(0, 3).map((part) => Number(part).toString(16).padStart(2, "0")).join("")}`;
  }

  function parseList(value) {
    return [...new Set(String(value).split(/[\n,]/).map((item) => item.trim()).filter(Boolean))];
  }

  function normalizeAccountList(value) {
    const values = Array.isArray(value) ? value : parseList(value || "");
    return [...new Set(values.map((item) => String(item).trim().replace(/^@/, "").toLowerCase()).filter(Boolean))];
  }

  function normalizeSettings(source) {
    const normalized = { ...DEFAULT_SETTINGS };
    if (typeof source.accentColor === "string" && isValidColor(source.accentColor)) normalized.accentColor = source.accentColor.trim();
    normalized.useDefaultAccent = Boolean(source.useDefaultAccent);
    normalized.matchAuthorNames = Boolean(source.matchAuthorNames);
    if (typeof source.accountAvatarColor === "string" && isValidColor(source.accountAvatarColor)) normalized.accountAvatarColor = source.accountAvatarColor.trim();
    normalized.removeGrok = Boolean(source.removeGrok);
    normalized.compactAccount = Boolean(source.compactAccount);
    normalized.hideAccountAvatar = Boolean(source.hideAccountAvatar);
    normalized.removeUpsells = Boolean(source.removeUpsells);
    normalized.blockedWords = Array.isArray(source.blockedWords)
      ? [...new Set(source.blockedWords.map((item) => String(item).trim()).filter(Boolean))]
      : parseList(source.blockedWords || "");
    normalized.blockMode = source.blockMode === "remove" ? "remove" : "blur";
    normalized.regexEnabled = Boolean(source.regexEnabled);
    normalized.bypassDetection = source.bypassDetection !== false;
    normalized.unicodeWarning = source.unicodeWarning !== false;
    normalized.blurImages = Boolean(source.blurImages);
    normalized.scanSidebarContent = Boolean(source.scanSidebarContent);
    normalized.sidebarBlockMode = source.sidebarBlockMode === "remove" ? "remove" : "blur";
    normalized.whitelistAccounts = normalizeAccountList(source.whitelistAccounts);
    normalized.whitelistMode = source.whitelistMode === "blur" ? "blur" : "show";
    return normalized;
  }

  function createFloatingButton() {
    document.querySelectorAll("[data-icicle-sidebar-button]").forEach((element) => element.remove());
    const existingButton = document.querySelector(`[${floatingButtonAttribute}]`);
    if (existingButton) return;
    const button = document.createElement("button");
    button.className = "icicle-floating-button";
    button.type = "button";
    button.setAttribute(floatingButtonAttribute, "true");
    button.setAttribute("aria-label", "Open Icicle settings");
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-pressed", "false");
    button.title = "Icicle";
    const logo = document.createElement("span");
    logo.setAttribute("data-icicle-logo-slot", "true");
    logo.setAttribute("aria-hidden", "true");
    button.append(logo);
    button.addEventListener("click", () => toggleIciclePanel(button));
    document.body.append(button);
  }

  function toggleIciclePanel(button) {
    const existing = document.querySelector(".icicle-overlay");
    if (existing) {
      closeIciclePanel(button);
      return;
    }
    openIciclePanel(button);
  }

  function openIciclePanel(button) {
    const overlay = document.createElement("div");
    overlay.className = "icicle-overlay";
    overlay.dataset.icicleTheme = getTheme();
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Icicle settings");
    overlay.innerHTML = `
      <div class="icicle-dialog" role="document">
        <header class="icicle-dialog-header">
          <div>
            <h1><span data-icicle-logo-slot="true" aria-hidden="true"></span>Icicle</h1>
            <p>Change whatever you want :3</p>
          </div>
          <button id="icicle-close-panel" class="icicle-close-button" type="button" aria-label="Close Icicle settings">×</button>
        </header>
        <div class="icicle-dialog-body">
          <section class="icicle-dialog-section" aria-labelledby="icicle-appearance-title">
            <h2 id="icicle-appearance-title">Appearance and cleanup</h2>
            <div class="icicle-setting-row icicle-color-row">
              <div class="icicle-setting-copy">
                <h3>Accent color</h3>
                <p>Apply a hex or RGB accent color across X.</p>
              </div>
              <div class="icicle-color-controls">
                <input id="icicle-accent-picker" type="color" aria-label="Pick accent color" />
                <input id="icicle-accent-input" type="text" aria-label="Accent color value" placeholder="#dbc9a4 or rgb(219, 201, 164)" spellcheck="false" />
              </div>
            </div>
            <div class="icicle-setting-row">
              <div class="icicle-setting-copy">
                <h3>Use X default accent</h3>
                <p>Leave X’s native accent colors unchanged.</p>
              </div>
              <label class="icicle-switch"><input id="icicle-use-default-accent" type="checkbox" /><span aria-hidden="true"></span></label>
            </div>
            <div class="icicle-setting-row">
              <div class="icicle-setting-copy">
                <h3>Remove Grok</h3>
                <p>Remove Grok navigation, drawers, and Grok actions.</p>
              </div>
              <label class="icicle-switch"><input id="icicle-remove-grok" type="checkbox" /><span aria-hidden="true"></span></label>
            </div>
            <div class="icicle-setting-row">
              <div class="icicle-setting-copy">
                <h3>Compact account menu</h3>
                <p>Show the display name as an initial and hide the handle.</p>
              </div>
              <label class="icicle-switch"><input id="icicle-compact-account" type="checkbox" /><span aria-hidden="true"></span></label>
            </div>
            <div class="icicle-setting-row icicle-subsetting" id="icicle-avatar-options">
              <div class="icicle-setting-copy">
                <h3>Hide profile picture</h3>
                <p>Replace account avatars with a solid color.</p>
              </div>
              <div class="icicle-avatar-controls">
                <input id="icicle-avatar-color-picker" type="color" aria-label="Pick profile picture color" />
                <input id="icicle-avatar-color-input" type="text" aria-label="Profile picture color value" placeholder="#dbc9a4" spellcheck="false" />
                <label class="icicle-switch"><input id="icicle-hide-account-avatar" type="checkbox" /><span aria-hidden="true"></span></label>
              </div>
            </div>
            <div class="icicle-setting-row">
              <div class="icicle-setting-copy">
                <h3>Remove Premium upsells</h3>
                <p>Remove Premium cards and navigation promotions.</p>
              </div>
              <label class="icicle-switch"><input id="icicle-remove-upsells" type="checkbox" /><span aria-hidden="true"></span></label>
            </div>
          </section>
          <section class="icicle-dialog-section" aria-labelledby="icicle-filter-title">
            <h2 id="icicle-filter-title">Word filters</h2>
            <div class="icicle-setting-row icicle-setting-column">
              <div class="icicle-setting-copy">
                <h3>Blocked words</h3>
                <p>Enter one word or phrase per line. Matches are case-insensitive.</p>
              </div>
              <textarea id="icicle-blocked-words" class="icicle-settings-textarea" rows="4" placeholder="word or phrase"></textarea>
            </div>
            <div class="icicle-setting-row">
              <div class="icicle-setting-copy">
                <h3>Apply blocklist to usernames and display names</h3>
                <p>Also match the author name and @handle on each tweet.</p>
              </div>
              <label class="icicle-switch"><input id="icicle-match-author-names" type="checkbox" /><span aria-hidden="true"></span></label>
            </div>
            <div class="icicle-setting-row">
              <div class="icicle-setting-copy">
                <h3>Blocked tweet behavior</h3>
                <p>Choose whether a matched tweet is blurred or removed.</p>
              </div>
              <select id="icicle-block-mode" class="icicle-settings-select" aria-label="Blocked tweet behavior">
                <option value="blur">Warn and blur until clicked</option>
                <option value="remove">Remove tweet</option>
              </select>
            </div>
            <div class="icicle-setting-row">
              <div class="icicle-setting-copy">
                <h3>Regex matching</h3>
                <p>Treat each blocked entry as a JavaScript regular expression.</p>
              </div>
              <label class="icicle-switch"><input id="icicle-regex-enabled" type="checkbox" /><span aria-hidden="true"></span></label>
            </div>
            <div class="icicle-setting-row">
              <div class="icicle-setting-copy">
                <h3>Bypass detection</h3>
                <p>Detect leetspeak, lookalike characters, spacing, punctuation, and repeated letters.</p>
              </div>
              <label class="icicle-switch"><input id="icicle-bypass-detection" type="checkbox" /><span aria-hidden="true"></span></label>
            </div>
            <div class="icicle-setting-row">
              <div class="icicle-setting-copy">
                <h3>Unusual Unicode warnings</h3>
                <p>Warn and blur tweets containing invisible, directional, combining, or confusable Unicode.</p>
              </div>
              <label class="icicle-switch"><input id="icicle-unicode-warning" type="checkbox" /><span aria-hidden="true"></span></label>
            </div>
            <div class="icicle-setting-row">
              <div class="icicle-setting-copy">
                <h3>Blur tweet images</h3>
                <p>Blur every image in a tweet until you click it.</p>
              </div>
              <label class="icicle-switch"><input id="icicle-image-blur" type="checkbox" /><span aria-hidden="true"></span></label>
            </div>
            <div class="icicle-setting-row">
              <div class="icicle-setting-copy">
                <h3>Scan trends and news</h3>
                <p>Apply the blocklist to X’s right-side trends and news cards.</p>
              </div>
              <label class="icicle-switch"><input id="icicle-scan-sidebar-content" type="checkbox" /><span aria-hidden="true"></span></label>
            </div>
            <div class="icicle-setting-row">
              <div class="icicle-setting-copy">
                <h3>Trends and news behavior</h3>
                <p>Choose whether a matched card is blurred or removed.</p>
              </div>
              <select id="icicle-sidebar-block-mode" class="icicle-settings-select" aria-label="Trends and news behavior">
                <option value="blur">Blur until clicked</option>
                <option value="remove">Remove card</option>
              </select>
            </div>
            <div class="icicle-setting-row icicle-setting-column">
              <div class="icicle-setting-copy">
                <h3>Whitelist accounts</h3>
                <p>Enter one username or handle per line.</p>
              </div>
              <textarea id="icicle-whitelist-accounts" class="icicle-settings-textarea" rows="4" placeholder="username or @username"></textarea>
            </div>
            <div class="icicle-setting-row">
              <div class="icicle-setting-copy">
                <h3>Whitelist behavior</h3>
                <p>Choose what happens when a whitelisted account uses a blocked word.</p>
              </div>
              <select id="icicle-whitelist-mode" class="icicle-settings-select" aria-label="Whitelist behavior">
                <option value="show">Show tweet fully</option>
                <option value="blur">Warn and blur until clicked</option>
              </select>
            </div>
          </section>
          <section class="icicle-dialog-section" aria-labelledby="icicle-backup-title">
            <h2 id="icicle-backup-title">Backup</h2>
            <div class="icicle-setting-row icicle-backup-row">
              <div class="icicle-setting-copy">
                <h3>Import or export Icicle settings</h3>
                <p>Includes appearance settings, word filters, and whitelist entries in JSON format.</p>
              </div>
              <div class="icicle-backup-controls">
                <button id="icicle-export-settings" type="button" class="icicle-settings-button">Export JSON</button>
                <button id="icicle-import-settings" type="button" class="icicle-settings-button">Import JSON</button>
                <input id="icicle-import-file" type="file" accept="application/json,.json" hidden />
              </div>
            </div>
          </section>
        </div>
    </div>`;
    document.body.append(overlay);
    applyFontAsset();
    applyLogoAsset();
    button.setAttribute("aria-expanded", "true");
    button.setAttribute("aria-pressed", "true");
    bindSettingsControls(overlay, button);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeIciclePanel(button);
    });
    overlay.querySelector("#icicle-close-panel").addEventListener("click", () => closeIciclePanel(button));
    document.addEventListener("keydown", handlePanelEscape, { once: true });
  }

  function handlePanelEscape(event) {
    if (event.key !== "Escape") return;
    const button = document.querySelector(`[${floatingButtonAttribute}]`);
    if (button) closeIciclePanel(button);
  }

  function closeIciclePanel(button) {
    document.querySelector(".icicle-overlay")?.remove();
    button?.setAttribute("aria-expanded", "false");
    button?.setAttribute("aria-pressed", "false");
  }

  function bindSettingsControls(overlay, sidebarButton) {
    const colorPicker = overlay.querySelector("#icicle-accent-picker");
    const colorInput = overlay.querySelector("#icicle-accent-input");
    const defaultAccentToggle = overlay.querySelector("#icicle-use-default-accent");
    const grokToggle = overlay.querySelector("#icicle-remove-grok");
    const accountToggle = overlay.querySelector("#icicle-compact-account");
    const hideAvatarToggle = overlay.querySelector("#icicle-hide-account-avatar");
    const avatarOptions = overlay.querySelector("#icicle-avatar-options");
    const avatarColorPicker = overlay.querySelector("#icicle-avatar-color-picker");
    const avatarColorInput = overlay.querySelector("#icicle-avatar-color-input");
    const upsellToggle = overlay.querySelector("#icicle-remove-upsells");
    const blockedWordsInput = overlay.querySelector("#icicle-blocked-words");
    const authorNameToggle = overlay.querySelector("#icicle-match-author-names");
    const blockModeInput = overlay.querySelector("#icicle-block-mode");
    const regexToggle = overlay.querySelector("#icicle-regex-enabled");
    const bypassToggle = overlay.querySelector("#icicle-bypass-detection");
    const unicodeToggle = overlay.querySelector("#icicle-unicode-warning");
    const imageBlurToggle = overlay.querySelector("#icicle-image-blur");
    const sidebarScanToggle = overlay.querySelector("#icicle-scan-sidebar-content");
    const sidebarBlockModeInput = overlay.querySelector("#icicle-sidebar-block-mode");
    const whitelistAccountsInput = overlay.querySelector("#icicle-whitelist-accounts");
    const whitelistModeInput = overlay.querySelector("#icicle-whitelist-mode");
    const exportButton = overlay.querySelector("#icicle-export-settings");
    const importButton = overlay.querySelector("#icicle-import-settings");
    const importFile = overlay.querySelector("#icicle-import-file");

    colorInput.value = settings.accentColor;
    colorPicker.value = toHexColor(settings.accentColor) || DEFAULT_SETTINGS.accentColor;
    defaultAccentToggle.checked = settings.useDefaultAccent;
    colorPicker.disabled = settings.useDefaultAccent;
    colorInput.disabled = settings.useDefaultAccent;
    grokToggle.checked = settings.removeGrok;
    accountToggle.checked = settings.compactAccount;
    hideAvatarToggle.checked = settings.hideAccountAvatar;
    avatarOptions.hidden = false;
    avatarColorInput.value = settings.accountAvatarColor;
    avatarColorPicker.value = toHexColor(settings.accountAvatarColor) || DEFAULT_SETTINGS.accountAvatarColor;
    upsellToggle.checked = settings.removeUpsells;
    blockedWordsInput.value = settings.blockedWords.join("\n");
    authorNameToggle.checked = settings.matchAuthorNames;
    blockModeInput.value = settings.blockMode;
    regexToggle.checked = settings.regexEnabled;
    bypassToggle.checked = settings.bypassDetection;
    unicodeToggle.checked = settings.unicodeWarning;
    imageBlurToggle.checked = settings.blurImages;
    sidebarScanToggle.checked = settings.scanSidebarContent;
    sidebarBlockModeInput.value = settings.sidebarBlockMode;
    whitelistAccountsInput.value = settings.whitelistAccounts.join("\n");
    whitelistModeInput.value = settings.whitelistMode;

    colorPicker.addEventListener("input", () => {
      colorInput.value = colorPicker.value;
      saveSettings({ accentColor: colorPicker.value });
    });
    colorInput.addEventListener("change", () => {
      if (isValidColor(colorInput.value)) saveSettings({ accentColor: colorInput.value.trim() });
      else colorInput.value = settings.accentColor;
    });
    defaultAccentToggle.addEventListener("change", () => {
      colorPicker.disabled = defaultAccentToggle.checked;
      colorInput.disabled = defaultAccentToggle.checked;
      saveSettings({ useDefaultAccent: defaultAccentToggle.checked });
    });
    grokToggle.addEventListener("change", () => saveSettings({ removeGrok: grokToggle.checked }));
    accountToggle.addEventListener("change", () => {
      saveSettings({ compactAccount: accountToggle.checked });
    });
    hideAvatarToggle.addEventListener("change", () => saveSettings({ hideAccountAvatar: hideAvatarToggle.checked }));
    avatarColorPicker.addEventListener("input", () => {
      avatarColorInput.value = avatarColorPicker.value;
      saveSettings({ accountAvatarColor: avatarColorPicker.value });
    });
    avatarColorInput.addEventListener("change", () => {
      if (isValidColor(avatarColorInput.value)) saveSettings({ accountAvatarColor: avatarColorInput.value.trim() });
      else avatarColorInput.value = settings.accountAvatarColor;
    });
    upsellToggle.addEventListener("change", () => saveSettings({ removeUpsells: upsellToggle.checked }));
    blockedWordsInput.addEventListener("change", () => saveSettings({ blockedWords: parseList(blockedWordsInput.value) }));
    authorNameToggle.addEventListener("change", () => saveSettings({ matchAuthorNames: authorNameToggle.checked }));
    blockModeInput.addEventListener("change", () => saveSettings({ blockMode: blockModeInput.value }));
    regexToggle.addEventListener("change", () => saveSettings({ regexEnabled: regexToggle.checked }));
    bypassToggle.addEventListener("change", () => saveSettings({ bypassDetection: bypassToggle.checked }));
    unicodeToggle.addEventListener("change", () => saveSettings({ unicodeWarning: unicodeToggle.checked }));
    imageBlurToggle.addEventListener("change", () => saveSettings({ blurImages: imageBlurToggle.checked }));
    sidebarScanToggle.addEventListener("change", () => saveSettings({ scanSidebarContent: sidebarScanToggle.checked }));
    sidebarBlockModeInput.addEventListener("change", () => saveSettings({ sidebarBlockMode: sidebarBlockModeInput.value }));
    whitelistAccountsInput.addEventListener("change", () => saveSettings({ whitelistAccounts: parseList(whitelistAccountsInput.value) }));
    whitelistModeInput.addEventListener("change", () => saveSettings({ whitelistMode: whitelistModeInput.value }));
    exportButton.addEventListener("click", exportSettings);
    importButton.addEventListener("click", () => importFile.click());
    importFile.addEventListener("change", () => importSettings(importFile, sidebarButton));
  }

  function saveSettings(patch) {
    settings = normalizeSettings({ ...settings, ...patch });
    storeSettings(settings);
    syncWhitelistButton();
    applySettings();
  }

  function exportSettings() {
    const payload = {
      format: "icicle-settings",
      version: 1,
      exportedAt: new Date().toISOString(),
      settings: normalizeSettings(settings)
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "icicle-settings.json";
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function importSettings(input, sidebarButton) {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const imported = payload?.settings && typeof payload.settings === "object" ? payload.settings : payload;
      settings = normalizeSettings({ ...settings, ...imported });
      await storeSettings(settings);
      applySettings();
      closeIciclePanel(sidebarButton);
      openIciclePanel(sidebarButton);
    } catch (error) {
      console.error("Icicle could not import that JSON file", error);
    } finally {
      input.value = "";
    }
  }

  function setHidden(element, hidden, key) {
    if (!element) return;
    const originalAttribute = `data-icicle-original-display-${key}`;
    if (hidden) {
      if (!element.hasAttribute(originalAttribute)) element.setAttribute(originalAttribute, element.style.display || "");
      element.setAttribute("data-icicle-hidden", key);
      if (element.style.getPropertyValue("display") !== "none") element.style.setProperty("display", "none", "important");
    } else if (element.hasAttribute(originalAttribute)) {
      const original = element.getAttribute(originalAttribute);
      if (original) element.style.display = original;
      else element.style.removeProperty("display");
      element.removeAttribute(originalAttribute);
      element.removeAttribute("data-icicle-hidden");
    }
  }

  function setCompactText(element, compact) {
    if (!element) return;
    const originalAttribute = "data-icicle-original-text";
    if (compact) {
      if (!element.hasAttribute(originalAttribute)) element.setAttribute(originalAttribute, element.textContent.trim());
      const original = element.getAttribute(originalAttribute);
      element.textContent = original ? `${original.charAt(0).toUpperCase()}...` : "...";
    } else if (element.hasAttribute(originalAttribute)) {
      element.textContent = element.getAttribute(originalAttribute);
      element.removeAttribute(originalAttribute);
    }
  }

  function applyAccountSettings() {
    const accountButton = document.querySelector('button[data-testid="SideNav_AccountSwitcher_Button"], button[aria-label="Account menu"]');
    if (!accountButton) return;
    const textBlocks = [...accountButton.querySelectorAll('div[dir="ltr"]')].filter(
      (element) => !element.querySelector('div[dir="ltr"]') && element.textContent.trim()
    );
    const nameBlock = textBlocks.find((element) => !element.textContent.trim().startsWith("@"));
    const handleBlock = textBlocks.find((element) => element.textContent.trim().startsWith("@"));
    setCompactText(nameBlock, settings.compactAccount);
    setHidden(handleBlock, settings.compactAccount, "account-handle");

    const avatar = accountButton.querySelector('[data-testid^="UserAvatar-Container"]');
    const avatarImage = accountButton.querySelector("img[alt]");
    const useSolidAvatar = settings.hideAccountAvatar;
    const accountName = avatar?.querySelector("img")?.alt || avatarImage?.alt;
    const avatarTargets = new Set([avatar]);
    if (avatarImage) avatarTargets.add(avatarImage.closest('[aria-label]'));
    if (accountName) {
      document.querySelectorAll("[aria-label]").forEach((element) => {
        if (element.getAttribute("aria-label") === accountName && element.querySelector("img")) avatarTargets.add(element);
      });
    }
    avatarTargets.forEach((target) => {
      if (!target) return;
      if (useSolidAvatar) {
        target.setAttribute("data-icicle-solid-avatar", "true");
        target.style.setProperty("--icicle-account-avatar-color", settings.accountAvatarColor);
      } else {
        target.removeAttribute("data-icicle-solid-avatar");
        target.style.removeProperty("--icicle-account-avatar-color");
      }
    });
  }

  function applyVisibilitySettings() {
    document.querySelectorAll('a[aria-label="Grok"]').forEach((element) => setHidden(element, settings.removeGrok, "grok-navigation"));
    document.querySelectorAll('[data-testid="GrokDrawer"]').forEach((element) => setHidden(element, settings.removeGrok, "grok-drawer"));
    document.querySelectorAll('path[d*="12.745 20.54l10.97-8.19"]').forEach((path) => {
      setHidden(path.closest('[data-testid="GrokDrawer"], button, a'), settings.removeGrok, "grok-action");
    });
    document.querySelectorAll("div.r-xoduu5.r-1p0dtai.r-1d2f490.r-u8s1d.r-zchlnj.r-ipm5af.r-1niwhzg.r-sdzlij.r-xf4iuw.r-o7ynqc.r-6416eg.r-1ny4l3l").forEach((element) => setHidden(element, settings.removeGrok, "grok-launcher"));
    document.querySelectorAll('aside[aria-label="Subscribe to Premium"]').forEach((element) => setHidden(element, settings.removeUpsells, "premium-aside"));
    document.querySelectorAll('a[data-testid="premium-signup-tab"], a[aria-label="Premium"][href*="premium_sign_up"]').forEach((element) => setHidden(element, settings.removeUpsells, "premium-navigation"));
    applyAccountSettings();
  }

  function getTweetAuthorDetails(tweet) {
    const userBlock = tweet.querySelector('[data-testid="User-Name"]');
    const text = userBlock?.innerText || "";
    const handle = text.match(/@([A-Za-z0-9_]+)/)?.[1];
    const href = userBlock?.querySelector('a[href^="/"]')?.getAttribute("href") || "";
    const username = handle?.toLowerCase() || href.split("/").filter(Boolean)[0]?.toLowerCase() || "";
    const displayName = text.split("\n").map((part) => part.trim()).find((part) => part && !part.startsWith("@")) || username;
    return { username, displayName };
  }

  function getTweetAuthor(tweet) {
    return getTweetAuthorDetails(tweet).username;
  }

  function getProfileUsername() {
    const profileName = document.querySelector('[data-testid="UserName"]');
    const profileHandle = profileName?.innerText?.match(/@([A-Za-z0-9_]{1,15})/)?.[1];
    if (profileHandle) return profileHandle.toLowerCase();
    const segment = window.location.pathname.split("/").filter(Boolean)[0] || "";
    if (!/^[A-Za-z0-9_]{1,15}$/.test(segment)) return "";
    if (["home", "explore", "notifications", "messages", "bookmarks", "lists", "communities", "settings", "search", "compose", "i", "premium", "grok", "login", "signup", "jobs"].includes(segment.toLowerCase())) return "";
    return segment.toLowerCase();
  }

  function getProfileActionButton() {
    return [...document.querySelectorAll("main button, main [role=button], [role=main] button, [role=main] [role=button]")]
      .filter((element) => !element.closest('[data-testid="tweet"]'))
      .find((element) => /^(follow|following|edit profile|subscribe|subscribed)\b/i.test(`${element.getAttribute("aria-label") || ""} ${element.innerText || ""}`.trim()));
  }

  function syncWhitelistButton() {
    const username = getProfileUsername();
    const existing = document.querySelector("[data-icicle-whitelist-button]");
    if (!username) {
      existing?.remove();
      return;
    }
    const whitelisted = settings.whitelistAccounts.includes(username);
    if (existing) {
      const label = existing.querySelector("[data-icicle-whitelist-label]");
      if (label) label.textContent = whitelisted ? "Remove from whitelist" : "Add to whitelist";
      existing.setAttribute("aria-label", `${whitelisted ? "Remove from" : "Add to"} whitelist @${username}`);
      return;
    }
    const action = getProfileActionButton();
    if (!action?.parentElement) return;
    const actionWrapper = action.parentElement;
    const buttonWrapper = actionWrapper.cloneNode(true);
    buttonWrapper.removeAttribute("data-testid");
    buttonWrapper.querySelectorAll("[data-testid]").forEach((element) => element.removeAttribute("data-testid"));
    const button = buttonWrapper.querySelector("button, [role=button]") || buttonWrapper;
    button.removeAttribute("data-testid");
    button.removeAttribute("aria-describedby");
    button.setAttribute("data-icicle-whitelist-button", "true");
    button.setAttribute("type", "button");
    button.setAttribute("aria-label", `${whitelisted ? "Remove from" : "Add to"} whitelist @${username}`);
    const label = [...button.querySelectorAll("span")].reverse().find((element) => !element.querySelector("span") && element.textContent.trim());
    if (label) {
      label.setAttribute("data-icicle-whitelist-label", "true");
      label.textContent = whitelisted ? "Remove from whitelist" : "Add to whitelist";
    } else {
      button.textContent = whitelisted ? "Remove from whitelist" : "Add to whitelist";
    }
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const next = settings.whitelistAccounts.includes(username)
        ? settings.whitelistAccounts.filter((account) => account !== username)
        : [...settings.whitelistAccounts, username];
      saveSettings({ whitelistAccounts: next });
    });
    actionWrapper.after(buttonWrapper);
  }

  function getTweetContent(tweet) {
    const textBlocks = [...tweet.querySelectorAll('[data-testid="tweetText"]')];
    return (textBlocks.length ? textBlocks.map((block) => block.innerText).join(" ") : tweet.innerText).trim();
  }

  function getTweetFilterContent(tweet) {
    const content = getTweetContent(tweet);
    if (!settings.matchAuthorNames) return content;
    const { username, displayName } = getTweetAuthorDetails(tweet);
    return `${content}\n${displayName}\n${username}`.trim();
  }

  function findSuspiciousUnicode(content) {
    const invisible = [...content].find((character) => character !== "\u200D" && (/[\u0000-\u0009\u000B-\u001F\u007F-\u009F\u00AD\u061C\u180E\u200B-\u200C\u200E-\u200F\u202A-\u202E\u2060-\u206F\uFEFF\uFFF9-\uFFFB]/u.test(character) || /\p{Cf}/u.test(character)));
    if (invisible) return { unicode: true, word: "non-standard Unicode", detection: "invisible or directional Unicode", found: `U+${invisible.codePointAt(0).toString(16).toUpperCase()}` };
    const combining = [...content].find((character) => /\p{M}/u.test(character) && !/[\uFE00-\uFE0F\u20E3]/u.test(character));
    if (combining) return { unicode: true, word: "non-standard Unicode", detection: "combining Unicode mark", found: `U+${combining.codePointAt(0).toString(16).toUpperCase()}` };
    const lookalike = [...content].find((character) => decodeLookalikes(character) !== character);
    if (lookalike) return { unicode: true, word: "non-standard Unicode", detection: "Unicode lookalike character", found: lookalike };
    const compatibility = [...content].find((character) => character !== character.normalize("NFKC") && /[\p{L}\p{N}]/u.test(character));
    if (compatibility) return { unicode: true, word: "non-standard Unicode", detection: "fancy or compatibility Unicode", found: compatibility };
    return null;
  }

  function decodeLookalikes(value) {
    const lookalikes = {
      А: "A", В: "B", Е: "E", К: "K", М: "M", Н: "H", О: "O", Р: "P", С: "C", Т: "T", Х: "X", У: "Y",
      а: "a", в: "b", е: "e", к: "k", м: "m", н: "h", о: "o", р: "p", с: "c", т: "t", х: "x", у: "y",
      Α: "A", Β: "B", Ε: "E", Ζ: "Z", Η: "H", Ι: "I", Κ: "K", Μ: "M", Ν: "N", Ο: "O", Ρ: "P", Τ: "T", Χ: "X", Υ: "Y",
      α: "a", β: "b", ε: "e", ζ: "z", η: "h", ι: "i", κ: "k", μ: "m", ν: "n", ο: "o", ρ: "p", τ: "t", χ: "x", υ: "y",
      І: "I", Ј: "J", Ѕ: "S", Ԍ: "G", і: "i", ј: "j", ѕ: "s", ԁ: "d", ԛ: "q", ԝ: "w", ԧ: "e",
      "ı": "i", "ℓ": "l", "ſ": "s", "ß": "b"
    };
    return value.replace(/[АВЕКМНОРСТХУасекмнопрстхуюΑΒΕΖΗΙΚΜΝΟΡΤΧΥαβεζηικμνορτχυІЈЅԌіјѕԁԛԝԧıℓſß]/g, (character) => lookalikes[character] || character);
  }

  function normalizeForDetection(value) {
    return decodeLookalikes(value.normalize("NFKC").normalize("NFKD").replace(/\p{M}/gu, "")).toLocaleLowerCase();
  }

  function compactDetection(value) {
    return normalizeForDetection(value).replace(/[^a-z0-9]/g, "");
  }

  function leetDetection(value) {
    return value.replace(/[0162345789@$!|+]/g, (character) => ({
      "0": "o", "1": "i", "2": "z", "3": "e", "4": "a", "5": "s", "6": "g", "7": "t", "8": "b", "9": "g",
      "@": "a", "$": "s", "!": "i", "|": "i", "+": "t"
    }[character] || character));
  }

  function collapseDetection(value) {
    return value.replace(/(.)\1+/g, "$1");
  }

  function findBlockedMatch(content) {
    const lowerContent = content.toLocaleLowerCase();
    for (const word of settings.blockedWords) {
      if (settings.regexEnabled) {
        try {
          const expression = new RegExp(word, "iu");
          const match = content.match(expression);
          if (match) return { word, detection: "regular expression", found: match[0] };
        } catch (error) {
          continue;
        }
      }
      if (lowerContent.includes(word.toLocaleLowerCase())) return { word, detection: "blocked word", found: word };
      if (!settings.bypassDetection) continue;

      const compactContent = compactDetection(content);
      const compactWord = compactDetection(word);
      if (!compactWord) continue;
      const decodedContent = normalizeForDetection(content).replace(/[^a-z0-9]/g, "");
      const decodedWord = normalizeForDetection(word).replace(/[^a-z0-9]/g, "");
      const leetContent = leetDetection(compactContent);
      const leetWord = leetDetection(compactWord);
      const collapsedContent = collapseDetection(compactContent);
      const collapsedWord = collapseDetection(compactWord);
      const fancyForm = content !== content.normalize("NFKC") || word !== word.normalize("NFKC");
      if (leetContent.includes(leetWord) && !compactContent.includes(compactWord)) {
        return { word, detection: "leetspeak or symbol bypass", found: leetContent };
      }
      if (decodedContent.includes(decodedWord) && compactContent.includes(compactWord) && !lowerContent.includes(word.toLocaleLowerCase())) {
        const detection = fancyForm
          ? "fancy-font or compatibility Unicode bypass"
          : /[\s\p{P}\p{S}]/u.test(content)
            ? "spacing or punctuation injection"
            : "lookalike-character bypass";
        return { word, detection, found: decodedWord };
      }
      if (collapsedContent.includes(collapsedWord) && !compactContent.includes(compactWord)) {
        return { word, detection: "repeated-character bypass", found: collapsedWord };
      }
    }
    return null;
  }

  function applyImageBlur(tweet) {
    tweet.querySelectorAll("[data-icicle-image-blurred]").forEach((image) => image.removeAttribute("data-icicle-image-blurred"));
    const media = new Set(tweet.querySelectorAll('[data-testid="tweetPhoto"]'));
    tweet.querySelectorAll('[data-testid="videoPlayer"], [data-testid="videoComponent"]').forEach((element) => {
      media.add(element.closest('[data-testid="tweetPhoto"]') || element);
    });
    media.forEach((element) => {
      if (!settings.blurImages) {
        element.removeAttribute("data-icicle-media-blurred");
        element.removeAttribute("data-icicle-media-revealed");
        element.querySelectorAll(":scope > .icicle-media-reveal").forEach((button) => button.remove());
        return;
      }
      if (element.getAttribute("data-icicle-media-revealed") === "true") return;
      element.setAttribute("data-icicle-media-blurred", "true");
      if (!element.querySelector(":scope > .icicle-media-reveal")) {
        const revealButton = document.createElement("button");
        revealButton.className = "icicle-media-reveal";
        revealButton.type = "button";
        revealButton.textContent = "Click to reveal";
        revealButton.setAttribute("aria-label", "Reveal media");
        element.append(revealButton);
      }
    });
  }

  function bindImageReveal() {
    if (window.__icicleImageRevealBound) return;
    window.__icicleImageRevealBound = true;
    document.addEventListener("click", (event) => {
      const sidebarCard = event.target instanceof Element ? event.target.closest('[data-icicle-sidebar-filter-mode="blur"]') : null;
      if (sidebarCard) {
        event.preventDefault();
        event.stopImmediatePropagation();
        sidebarCard.removeAttribute("data-icicle-sidebar-filter-mode");
        sidebarCard.setAttribute("data-icicle-sidebar-filter-revealed", "true");
        return;
      }
      const media = event.target instanceof Element ? event.target.closest("[data-icicle-media-blurred]") : null;
      if (!media) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      media.removeAttribute("data-icicle-media-blurred");
      media.setAttribute("data-icicle-media-revealed", "true");
      media.querySelectorAll(":scope > .icicle-media-reveal").forEach((button) => button.remove());
    }, true);
  }

  function clearTweetFilter(tweet) {
    setHidden(tweet, false, "blocked-tweet");
    tweet.removeAttribute("data-icicle-filter-mode");
    tweet.removeAttribute("data-icicle-filter-word");
    tweet.removeAttribute("data-icicle-filter-fingerprint");
    tweet.removeAttribute("data-icicle-filter-revealed");
    tweet.querySelectorAll("[data-icicle-warning]").forEach((warning) => warning.remove());
  }

  function addTweetWarning(tweet, match) {
    const warning = document.createElement("div");
    warning.className = "icicle-tweet-warning";
    warning.setAttribute("data-icicle-warning", "true");
    const text = document.createElement("span");
    const { username, displayName } = getTweetAuthorDetails(tweet);
    const author = displayName || (username ? `@${username}` : "an unknown account");
    const detail = match.detection !== "blocked word" ? ` (Detected as ${match.detection})` : "";
    text.textContent = `This tweet by ${author} contains "${match.word}", a flagged word${detail}.`;
    const button = document.createElement("button");
    button.className = "icicle-reveal-button";
    button.type = "button";
    button.textContent = "Reveal tweet";
    const reveal = () => {
      tweet.setAttribute("data-icicle-filter-revealed", "true");
      tweet.removeAttribute("data-icicle-filter-mode");
      warning.remove();
    };
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      event.stopPropagation();
      reveal();
    }, true);
    warning.append(text, button);
    tweet.prepend(warning);
  }

  function applyTweetFilters() {
    document.querySelectorAll('[data-testid="tweet"]').forEach((tweet) => {
      applyImageBlur(tweet);
      const content = getTweetFilterContent(tweet);
      const blockedMatch = findBlockedMatch(content);
      const unicodeMatch = settings.unicodeWarning ? findSuspiciousUnicode(content) : null;
      const match = blockedMatch && unicodeMatch
        ? { ...blockedMatch, detection: `${blockedMatch.detection}; ${unicodeMatch.detection}`, unicode: true, found: unicodeMatch.found }
        : blockedMatch || unicodeMatch;
      if (!match) {
        clearTweetFilter(tweet);
        return;
      }
      const author = getTweetAuthor(tweet);
      const isWhitelisted = author && settings.whitelistAccounts.includes(author);
      const behavior = match.unicode ? "blur" : isWhitelisted ? settings.whitelistMode : settings.blockMode;
      if (!match.unicode && isWhitelisted && behavior === "show") {
        clearTweetFilter(tweet);
        return;
      }
      const fingerprint = `${behavior}:${match.word}:${match.detection}`;
      if (tweet.dataset.icicleFilterFingerprint !== fingerprint) {
        clearTweetFilter(tweet);
        tweet.dataset.icicleFilterFingerprint = fingerprint;
      }
      if (tweet.dataset.icicleFilterRevealed === "true") return;
      if (behavior === "remove") {
        setHidden(tweet, true, "blocked-tweet");
        tweet.dataset.icicleFilterMode = "remove";
        tweet.dataset.icicleFilterWord = match.word;
        return;
      }
      setHidden(tweet, false, "blocked-tweet");
      tweet.dataset.icicleFilterMode = "blur";
      tweet.dataset.icicleFilterWord = match.word;
      if (!tweet.querySelector("[data-icicle-warning]")) addTweetWarning(tweet, match);
    });
  }

  function clearSidebarFilter(card) {
    setHidden(card, false, "blocked-sidebar-card");
    card.removeAttribute("data-icicle-sidebar-filter-mode");
    card.removeAttribute("data-icicle-sidebar-filter-revealed");
    card.removeAttribute("data-icicle-sidebar-filter-fingerprint");
  }

  function applySidebarFilters() {
    document.querySelectorAll('[data-testid="trend"], [data-testid^="news_sidebar_article_"]').forEach((card) => {
      if (!settings.scanSidebarContent) {
        clearSidebarFilter(card);
        return;
      }
      const match = findBlockedMatch(card.innerText || "");
      if (!match) {
        clearSidebarFilter(card);
        return;
      }
      const fingerprint = `${settings.sidebarBlockMode}:${match.word}:${match.detection}`;
      if (card.dataset.icicleSidebarFilterFingerprint !== fingerprint) {
        clearSidebarFilter(card);
        card.dataset.icicleSidebarFilterFingerprint = fingerprint;
      }
      if (card.dataset.icicleSidebarFilterRevealed === "true") return;
      if (settings.sidebarBlockMode === "remove") {
        setHidden(card, true, "blocked-sidebar-card");
        return;
      }
      setHidden(card, false, "blocked-sidebar-card");
      card.dataset.icicleSidebarFilterMode = "blur";
    });
  }

  function applyAccentTargets() {
    const defaultAccent = "rgb(29, 155, 240)";
    document.querySelectorAll('a, button, [role="button"], [role="tab"], svg, path, [style]').forEach((element) => {
      const style = getComputedStyle(element);
      if (style.color === defaultAccent) element.setAttribute("data-icicle-accent-color", "true");
      if (style.backgroundColor === defaultAccent) element.setAttribute("data-icicle-accent-background", "true");
      if (style.borderTopColor === defaultAccent) element.setAttribute("data-icicle-accent-border", "true");
      if (style.fill === defaultAccent) element.setAttribute("data-icicle-accent-fill", "true");
    });
    document.querySelectorAll("span").forEach((element) => {
      if (/^Show \d+ posts$/i.test(element.textContent.trim())) element.setAttribute("data-icicle-accent-color", "true");
    });
  }

  function clearAccentTargets() {
    document.querySelectorAll("[data-icicle-accent-color], [data-icicle-accent-background], [data-icicle-accent-border], [data-icicle-accent-fill]").forEach((element) => {
      element.removeAttribute("data-icicle-accent-color");
      element.removeAttribute("data-icicle-accent-background");
      element.removeAttribute("data-icicle-accent-border");
      element.removeAttribute("data-icicle-accent-fill");
    });
  }

  function applyAccentColor() {
    clearTimeout(accentScanTimer);
    if (settings.useDefaultAccent) {
      clearAccentTargets();
      document.documentElement.removeAttribute("data-icicle-accent");
      document.documentElement.style.setProperty("--icicle-accent-color", "#1d9bf0");
      return;
    }
    document.documentElement.dataset.icicleAccent = settings.accentColor;
    document.documentElement.style.setProperty("--icicle-accent-color", settings.accentColor);
    accentScanTimer = setTimeout(applyAccentTargets, 16);
  }

  function enforceDocumentTitle() {
    if (document.title !== "Icicle / X") document.title = "Icicle / X";
  }

  function applySettings() {
    applyFontAsset();
    applyLogoAsset();
    applyVisibilitySettings();
    applyTweetFilters();
    applySidebarFilters();
    applyAccentColor();
    const theme = getTheme();
    document.documentElement.dataset.icicleTheme = theme;
    if (theme !== appliedTheme) {
      appliedTheme = theme;
      storeSettings({ icicleTheme: theme });
    }
    enforceDocumentTitle();
  }

  function scheduleSync() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(sync, 16);
  }

  function sync() {
    createFloatingButton();
    syncWhitelistButton();
    applySettings();
  }

  const marker = document.createElement("div");
  marker.id = markerId;
  marker.dataset.icicleReady = "true";
  marker.setAttribute("aria-hidden", "true");
  document.documentElement.appendChild(marker);

  new MutationObserver(scheduleSync).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["style", "class"]
  });
  new MutationObserver(enforceDocumentTitle).observe(document.head, {
    childList: true,
    subtree: true,
    characterData: true
  });
  bindImageReveal();
  getStoredSettings().then((stored) => {
    const migration = {};
    if (typeof stored.accentColor !== "string" || stored.accentColor.toLowerCase() === "#1d9bf0") migration.accentColor = DEFAULT_SETTINGS.accentColor;
    if (typeof stored.accountAvatarColor !== "string" || stored.accountAvatarColor.toLowerCase() === "#1d9bf0") migration.accountAvatarColor = DEFAULT_SETTINGS.accountAvatarColor;
    settings = normalizeSettings({ ...DEFAULT_SETTINGS, ...stored, ...migration });
    if (Object.keys(migration).length) storeSettings(migration);
    sync();
  });
  sync();
})();
