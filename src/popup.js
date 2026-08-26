document.addEventListener("DOMContentLoaded", async () => {
  const statusText = document.querySelector("#status-text");
  const version = document.querySelector("#version");

  version.textContent = `Version ${chrome.runtime.getManifest().version}`;

  try {
    const stored = await chrome.storage.local.get(["accentColor", "icicleTheme"]);
    document.documentElement.style.setProperty("--icicle-accent", stored.accentColor || "#dbc9a4");
    document.documentElement.dataset.icicleTheme = stored.icicleTheme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const svgResponse = await fetch(chrome.runtime.getURL("assets/icicle.svg"));
    const markup = await svgResponse.text();
    const svg = new DOMParser().parseFromString(markup, "image/svg+xml").documentElement;
    const darkBackground = getComputedStyle(document.body).backgroundColor === "rgb(0, 0, 0)";
    const bodyFill = darkBackground ? "#ffffff" : "#000000";
    const innerFill = darkBackground ? "#000000" : "#ffffff";
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("fill", bodyFill);
    svg.querySelectorAll("path").forEach((path) => {
      const fill = (path.getAttribute("fill") || "").toLowerCase();
      const stroke = path.getAttribute("stroke");
      if (stroke) {
        path.setAttribute("stroke", bodyFill);
        path.style.setProperty("stroke", bodyFill, "important");
        path.style.setProperty("fill", "none", "important");
        return;
      }
      const pathFill = fill === "#ffffff" || fill === "#fff" ? innerFill : bodyFill;
      path.setAttribute("fill", pathFill);
      path.style.setProperty("fill", pathFill, "important");
    });
    document.querySelectorAll("[data-icicle-logo-slot]").forEach((slot) => {
      slot.innerHTML = svg.outerHTML;
    });
    const pingResponse = await chrome.runtime.sendMessage({ type: "ICICLE_PING" });
    statusText.textContent = pingResponse?.ok ? "Extension is ready" : "Extension needs attention";
  } catch {
    statusText.textContent = "Extension needs attention";
  }
});
