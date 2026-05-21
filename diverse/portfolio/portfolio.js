(() => {
  const DATA_URL = "portfolio-data.json";

  const readJson = async (url) => {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  };

  const initTabs = () => {
    const tabs = [...document.querySelectorAll('[role="tab"]')];
    const panels = [...document.querySelectorAll('[role="tabpanel"]')];
    if (!tabs.length || !panels.length) return;

    document.body.classList.add("js-ready");

    const activateTab = (tab, { focus = false, updateHash = true } = {}) => {
      const panelId = tab.getAttribute("aria-controls");
      tabs.forEach((item) => {
        const selected = item === tab;
        item.classList.toggle("is-active", selected);
        item.setAttribute("aria-selected", selected ? "true" : "false");
        item.setAttribute("tabindex", selected ? "0" : "-1");
      });
      panels.forEach((panel) => {
        panel.hidden = panel.id !== panelId;
      });
      if (updateHash) {
        try {
          history.replaceState(null, "", `#${panelId}`);
        } catch {}
      }
      if (focus) tab.focus();
    };

    tabs.forEach((tab) => {
      tab.addEventListener("click", (event) => {
        event.preventDefault();
        activateTab(tab, { focus: true, updateHash: true });
      });
      tab.addEventListener("keydown", (event) => {
        const index = tabs.indexOf(tab);
        if (index < 0) return;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          event.preventDefault();
          activateTab(tabs[(index + 1) % tabs.length], { focus: true, updateHash: true });
        } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
          event.preventDefault();
          activateTab(tabs[(index - 1 + tabs.length) % tabs.length], { focus: true, updateHash: true });
        } else if (event.key === "Home") {
          event.preventDefault();
          activateTab(tabs[0], { focus: true, updateHash: true });
        } else if (event.key === "End") {
          event.preventDefault();
          activateTab(tabs[tabs.length - 1], { focus: true, updateHash: true });
        }
      });
    });

    const wantedHash = window.location.hash.replace(/^#/, "");
    const initialTab = tabs.find((tab) => tab.getAttribute("aria-controls") === wantedHash) || tabs[0];
    activateTab(initialTab, { focus: false, updateHash: false });
  };

  const initAnalytics = async () => {
    const data = await readJson(DATA_URL);
    const analytics = data?.analytics;
    const measurementId = typeof analytics?.measurementId === "string" ? analytics.measurementId.trim() : "";
    if (!(analytics?.enabled === true && measurementId)) return null;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
      window.dataLayer.push(arguments);
    };

    const existing = document.querySelector(`script[data-portfolio-ga="${measurementId}"]`);
    if (!existing) {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
      script.dataset.portfolioGa = measurementId;
      document.head.appendChild(script);
    }

    try {
      window.gtag("js", new Date());
      window.gtag("config", measurementId, {
        anonymize_ip: true,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      });
    } catch {}

    return (eventName) => {
      try {
        if (eventName) window.gtag("event", eventName);
      } catch {}
    };
  };

  const initEventTracking = async () => {
    const track = await initAnalytics();
    document.querySelectorAll("[data-ga-event]").forEach((node) => {
      node.addEventListener("click", () => {
        if (track) track(node.getAttribute("data-ga-event"));
      });
    });
  };

  initTabs();
  initEventTracking();
})();
