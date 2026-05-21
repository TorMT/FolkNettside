(() => {
  const params = new URLSearchParams(window.location.search);
  const title = (params.get("title") || "Tool preview").trim();
  const subtitle = (params.get("subtitle") || "Loads one selected tool or file viewer without the rest of the site navigation.").trim();
  const target = (params.get("target") || "").trim();
  const frame = document.getElementById("previewFrame");
  const titleEl = document.getElementById("previewTitle");
  const subtitleEl = document.getElementById("previewSubtitle");
  const directLink = document.getElementById("openDirect");
  const fallback = document.getElementById("previewFallback");
  const fallbackText = document.getElementById("fallbackText");

  titleEl.textContent = title;
  subtitleEl.textContent = subtitle;
  document.title = `${title} | Tool preview`;

  const hideChrome = (doc) => {
    if (!doc || doc.querySelector('style[data-portfolio-preview="1"]')) return;

    const style = doc.createElement("style");
    style.dataset.portfolioPreview = "1";
    style.textContent = `
      html, body { margin: 0 !important; }
      .navbar,
      #navbar,
      .sidebar,
      #sidebar,
      .topbar,
      .flyout,
      .page-header,
      .viewer-topbar,
      .drawer-backdrop {
        display: none !important;
      }
      .wrapper,
      .content,
      .fusion-shell {
        margin-left: 0 !important;
        padding-left: 0 !important;
      }
    `;
    doc.head.appendChild(style);

    doc.documentElement.classList.add("portfolio-preview-frame");
    doc.body?.classList?.add("portfolio-preview-frame");

    doc.querySelectorAll('a[href]').forEach((anchor) => {
      const href = anchor.getAttribute("href") || "";
      if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;
      anchor.setAttribute("target", "_blank");
      anchor.setAttribute("rel", "noopener");
    });
  };

  const normalizeTarget = (value) => {
    if (!value) return "";
    try {
      const url = new URL(value, window.location.origin);
      if (url.origin !== window.location.origin) return "";
      return url.pathname + url.search + url.hash;
    } catch {
      return "";
    }
  };

  const safeTarget = normalizeTarget(target);
  if (!safeTarget) {
    frame.hidden = true;
    fallback.hidden = false;
    fallbackText.textContent = "The selected preview target is missing or outside the current site origin.";
    directLink.removeAttribute("href");
    directLink.setAttribute("aria-disabled", "true");
    directLink.setAttribute("tabindex", "-1");
    return;
  }

  directLink.href = safeTarget;
  frame.src = safeTarget;

  frame.addEventListener("load", () => {
    let patched = false;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      window.setTimeout(() => {
        try {
          const doc = frame.contentDocument;
          if (!doc) return;
          hideChrome(doc);
          patched = true;
        } catch {}
      }, attempt * 250);
    }
    window.setTimeout(() => {
      if (!patched) {
        fallback.hidden = false;
        fallbackText.textContent = "The preview loaded, but site chrome could not be adjusted fully in-frame. You can still open the target directly.";
      }
    }, 1400);
  });
})();
