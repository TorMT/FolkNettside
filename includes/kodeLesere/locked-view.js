(function () {
  const params = new URLSearchParams(window.location.search);
  const isLocked = ["1", "true", "yes"].includes(String(params.get("locked") || "").toLowerCase());
  if (!isLocked) return;

  document.documentElement.classList.add("is-locked");
  document.body.classList.add("is-locked");
  document.body.setAttribute("data-locked-view", "1");

  const style = document.createElement("style");
  style.setAttribute("data-locked-style", "1");
  style.textContent = `
    body.is-locked .navbar,
    body.is-locked #navbar,
    body.is-locked .topbar,
    body.is-locked .sidebar,
    body.is-locked #sidebar,
    body.is-locked #hud,
    body.is-locked #uiWrap,
    body.is-locked #toolbar,
    body.is-locked .viewer-topbar,
    body.is-locked .inspector-drawer,
    body.is-locked .drawer-backdrop,
    body.is-locked .flyout,
    body.is-locked .page-header { display:none !important; }

    html.is-locked, body.is-locked { margin:0 !important; width:100% !important; height:100% !important; overflow:hidden !important; }
    body.is-locked .fusion-shell { grid-template-columns:minmax(0,1fr) !important; max-width:none !important; padding:0 !important; gap:0 !important; }
    body.is-locked .viewer-shell, body.is-locked .viewer-stage, body.is-locked iframe, body.is-locked embed, body.is-locked object { width:100% !important; min-height:100vh !important; height:100vh !important; max-height:100vh !important; border:0 !important; border-radius:0 !important; box-shadow:none !important; }
  `;
  document.head.appendChild(style);

  function withLocked(url) {
    try {
      const u = new URL(url, window.location.origin);
      if (u.origin !== window.location.origin) return url;
      if (!u.searchParams.has("locked")) u.searchParams.set("locked", "1");
      return u.pathname + u.search + u.hash;
    } catch {
      return url;
    }
  }

  function patchNode(node) {
    if (!(node instanceof Element)) return;
    if (node.tagName === "IFRAME" && node.getAttribute("src")) node.setAttribute("src", withLocked(node.getAttribute("src")));
    if (node.tagName === "A" && node.getAttribute("href")) node.setAttribute("href", withLocked(node.getAttribute("href")));
    node.querySelectorAll?.("iframe[src],a[href]").forEach((el) => {
      const attr = el.tagName === "IFRAME" ? "src" : "href";
      el.setAttribute(attr, withLocked(el.getAttribute(attr)));
    });
  }

  patchNode(document.documentElement);
  const obs = new MutationObserver((mutations) => {
    mutations.forEach((m) => {
      if (m.type === "childList") m.addedNodes.forEach(patchNode);
      if (m.type === "attributes") patchNode(m.target);
    });
  });
  obs.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["src", "href"] });
})();
