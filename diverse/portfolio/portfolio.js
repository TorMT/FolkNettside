(() => {
  const DATA_URL = "portfolio-data.json";
  const MUNIN_INDEX_URL = "/diverse/Njord/filer/index.json";

  const readJson = async (url) => {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  };

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const makePreviewUrl = ({ title, subtitle = "", target }) => {
    if (!target) return "";
    const params = new URLSearchParams();
    params.set("title", title);
    if (subtitle) params.set("subtitle", subtitle);
    params.set("target", target);
    return `/diverse/portfolio/preview/tool-preview.html?${params.toString()}`;
  };

  const humanizeLabel = (value) =>
    String(value || "")
      .replace(/\.[^.]+$/, "")
      .replace(/[_-]+/g, " ")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/\s+/g, " ")
      .trim();

  const initTabs = () => {
    const tabs = [...document.querySelectorAll('[role="tab"]')];
    const panels = [...document.querySelectorAll('[role="tabpanel"]')];
    if (!tabs.length || !panels.length) return null;

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

    const activatePanel = (panelId, options = {}) => {
      const tab = tabs.find((item) => item.getAttribute("aria-controls") === panelId);
      if (!tab) return false;
      activateTab(tab, options);
      return true;
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

    document.addEventListener("click", (event) => {
      const link = event.target.closest("[data-tab-target]");
      if (!link) return;
      const panelId = (link.getAttribute("data-tab-target") || "").trim();
      if (!panelId) return;
      event.preventDefault();
      if (!activatePanel(panelId, { focus: true, updateHash: true })) return;
      document.getElementById(panelId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    window.addEventListener("hashchange", () => {
      const panelId = window.location.hash.replace(/^#/, "");
      if (!panelId) return;
      activatePanel(panelId, { focus: false, updateHash: false });
    });

    const wantedHash = window.location.hash.replace(/^#/, "");
    const initialTab = tabs.find((tab) => tab.getAttribute("aria-controls") === wantedHash) || tabs[0];
    activateTab(initialTab, { focus: false, updateHash: false });

    return { activatePanel };
  };

  const buildMuninFileEntries = (indexData) => {
    if (!indexData || typeof indexData !== "object") return [];

    const entries = [];
    const allowedTypes = new Set(["f3z", "stl", "pdf", "html", "share"]);
    const includePattern = /(munin|nj26|study report|studies_report)/i;

    Object.entries(indexData).forEach(([groupName, groupData]) => {
      if (!groupData || !Array.isArray(groupData.files)) return;
      const dir = String(groupData.dir || groupName || "").trim();
      if (!dir) return;

      groupData.files.forEach((rawFile) => {
        const raw = String(rawFile || "").trim();
        if (!raw) return;

        const [relativePath, externalTarget = ""] = raw.split("|");
        if (!includePattern.test(relativePath)) return;

        const isExternal = /^https?:\/\//i.test(externalTarget);
        const ext = isExternal
          ? "share"
          : ((relativePath.match(/\.([a-z0-9]+)$/i) || [])[1] || "").toLowerCase();
        if (!allowedTypes.has(ext)) return;

        entries.push({
          dir,
          relativePath,
          externalTarget: isExternal ? externalTarget : "",
          ext,
          isLegacy: /^Foreldet\//i.test(relativePath),
        });
      });
    });

    const priority = { f3z: 0, stl: 1, pdf: 2, html: 3, share: 4 };
    const seen = new Set();
    return entries
      .filter((entry) => {
        const key = `${entry.dir}::${entry.relativePath}::${entry.externalTarget}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) =>
        Number(a.isLegacy) - Number(b.isLegacy) ||
        (priority[a.ext] ?? 99) - (priority[b.ext] ?? 99) ||
        a.relativePath.localeCompare(b.relativePath)
      );
  };

  const describeMuninFile = (entry) => {
    const baseName = entry.relativePath.split("/").pop() || entry.relativePath;
    const title = humanizeLabel(baseName);
    const folderLabel = entry.isLegacy ? `${entry.dir} / Foreldet` : entry.dir;

    if (entry.ext === "f3z") {
      return {
        title,
        kicker: entry.isLegacy ? "Legacy assembly" : "Current assembly",
        summary: entry.isLegacy
          ? "Legacy Fusion assembly package kept as a browser-side reference for older Munin geometry review."
          : "Current Fusion assembly package used for focused Munin preview and geometry inspection workflows.",
        folderLabel,
      };
    }
    if (entry.ext === "stl") {
      return {
        title,
        kicker: entry.isLegacy ? "Legacy mesh" : "Mesh export",
        summary: "Triangulated STL export used for lighter browser-side geometry preview and quick visual inspection.",
        folderLabel,
      };
    }
    if (entry.ext === "pdf") {
      return {
        title,
        kicker: "Drawing export",
        summary: "Drawing sheet export from the Munin design workflow, useful for quick review without opening the full file hub.",
        folderLabel,
      };
    }
    if (entry.ext === "html") {
      return {
        title,
        kicker: "Study / report",
        summary: "HTML study or report output related to Munin calculations or design iteration.",
        folderLabel,
      };
    }
    return {
      title,
      kicker: "External share",
      summary: "External CAD/share link kept as part of the curated Munin file set.",
      folderLabel,
    };
  };

  const buildMuninLinks = (entry) => {
    if (entry.ext === "share") {
      return {
        previewUrl: entry.externalTarget,
        previewLabel: "Open external share",
        directUrl: entry.externalTarget,
        directLabel: "Open share",
      };
    }

    const rawPath = `/diverse/Njord/filer/${entry.dir}/${entry.relativePath}`;
    const directUrl = encodeURI(rawPath);

    if (entry.ext === "f3z") {
      const target = `/includes/kodeLesere/fusionview.html?file=${encodeURIComponent(rawPath)}&locked=1`;
      return {
        previewUrl: makePreviewUrl({
          title: "Munin Fusion Preview",
          subtitle: "Focused preview of a Munin Fusion assembly from the curated file library.",
          target,
        }),
        previewLabel: "Open preview",
        directUrl,
        directLabel: "Open file",
      };
    }

    if (entry.ext === "stl") {
      const target = `/includes/kodeLesere/stlview.html?file=${encodeURIComponent(rawPath)}&locked=1`;
      return {
        previewUrl: makePreviewUrl({
          title: "Munin STL Preview",
          subtitle: "Focused preview of a Munin STL export from the curated file library.",
          target,
        }),
        previewLabel: "Open preview",
        directUrl,
        directLabel: "Open file",
      };
    }

    return {
      previewUrl: makePreviewUrl({
        title: entry.ext === "pdf" ? "Munin Drawing Preview" : "Munin Study Preview",
        subtitle: "Focused preview of a curated Munin file from the portfolio library.",
        target: rawPath,
      }),
      previewLabel: entry.ext === "pdf" ? "Open drawing" : "Open preview",
      directUrl,
      directLabel: "Open file",
    };
  };

  const initMuninFileLibrary = async () => {
    const mount = document.getElementById("muninFileLibrary");
    const countEl = document.getElementById("muninFileCount");
    if (!mount || !countEl) return;

    const data = await readJson(MUNIN_INDEX_URL);
    const entries = buildMuninFileEntries(data);

    if (!entries.length) {
      countEl.textContent = "No curated Munin files were found in the generated index.";
      mount.innerHTML = `
        <article class="file-card">
          <p class="file-kicker">Unavailable</p>
          <h3>Curated file list not available</h3>
          <p class="file-empty">The generated index could not provide any Munin-related files for this portfolio tab.</p>
        </article>
      `;
      return;
    }

    countEl.textContent = `${entries.length} curated Munin files available from the generated index.`;
    mount.innerHTML = entries
      .map((entry) => {
        const meta = describeMuninFile(entry);
        const links = buildMuninLinks(entry);
        return `
          <article class="file-card">
            <div class="file-card-header">
              <div>
                <p class="file-kicker">${escapeHtml(meta.kicker)}</p>
                <h3>${escapeHtml(meta.title)}</h3>
              </div>
              <span class="file-badge">${escapeHtml(entry.ext === "share" ? "link" : entry.ext)}</span>
            </div>
            <p>${escapeHtml(meta.summary)}</p>
            <p class="file-path">${escapeHtml(meta.folderLabel)} · ${escapeHtml(entry.relativePath)}</p>
            <div class="project-links">
              <a href="${escapeHtml(links.previewUrl)}" target="_blank" rel="noopener">${escapeHtml(links.previewLabel)}</a>
              <a href="${escapeHtml(links.directUrl)}" target="_blank" rel="noopener">${escapeHtml(links.directLabel)}</a>
            </div>
          </article>
        `;
      })
      .join("");
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
  initMuninFileLibrary();
  initEventTracking();
})();
