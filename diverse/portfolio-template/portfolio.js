(() => {
  const PLACEHOLDER_GA = "{{GA_MEASUREMENT_ID}}";
  const STATUS = new Set(["Active", "Prototype", "In development", "Archived"]);

  const deepMerge = (base, extra) => {
    if (Array.isArray(base) || Array.isArray(extra)) return extra ?? base;
    if (!base || typeof base !== "object") return extra ?? base;
    const out = { ...base };
    Object.entries(extra || {}).forEach(([key, value]) => {
      out[key] = value && typeof value === "object" && !Array.isArray(value)
        ? deepMerge(base[key], value)
        : value;
    });
    return out;
  };

  const readJson = async (url) => {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  };

  const isRealValue = (value) => {
    if (!value || typeof value !== "string") return false;
    const trimmed = value.trim();
    return trimmed.length > 0 && !(trimmed.startsWith("{{") && trimmed.endsWith("}}"));
  };

  const bindText = (key, value) => {
    document.querySelectorAll(`[data-bind="${key}"]`).forEach((node) => {
      if (value) node.textContent = value;
    });
  };

  const bindHref = (key, value) => {
    document.querySelectorAll(`[data-bind-href="${key}"]`).forEach((node) => {
      if (!isRealValue(value)) {
        node.style.display = "none";
        return;
      }
      node.setAttribute("href", value);
      if (node.classList.contains("contact-card")) {
        const valueNode = node.querySelector(".contact-value");
        if (valueNode) valueNode.textContent = value;
      }
    });
  };

  const createTag = (text) => {
    const li = document.createElement("li");
    li.textContent = text;
    return li;
  };

  const createProjectCard = (project) => {
    const article = document.createElement("article");
    article.className = "project-card";

    if (isRealValue(project.imageUrl)) {
      const media = document.createElement("div");
      media.className = "project-media";
      const image = document.createElement("img");
      image.className = "project-image";
      image.src = project.imageUrl;
      image.alt = project.imageAlt || project.title || "Project screenshot";
      image.loading = "lazy";
      media.appendChild(image);
      article.appendChild(media);
    }

    const status = document.createElement("p");
    status.className = "status-pill";
    status.textContent = STATUS.has(project.status) ? project.status : "Prototype";
    article.appendChild(status);

    const title = document.createElement("h3");
    title.textContent = project.title || "Project title";
    article.appendChild(title);

    const summary = document.createElement("p");
    summary.textContent = project.summary || "";
    article.appendChild(summary);

    if (project.description) {
      const description = document.createElement("p");
      description.textContent = project.description;
      article.appendChild(description);
    }

    if (Array.isArray(project.tags) && project.tags.length) {
      const tags = document.createElement("ul");
      tags.className = "tag-list";
      project.tags.forEach((tag) => tags.appendChild(createTag(tag)));
      article.appendChild(tags);
    }

    const links = [];
    if (isRealValue(project.demoUrl)) links.push({ href: project.demoUrl, text: "Demo", eventName: "portfolio_project_demo_click" });
    if (isRealValue(project.sourceUrl)) links.push({ href: project.sourceUrl, text: "Source", eventName: "portfolio_project_source_click" });

    if (links.length) {
      const linkWrap = document.createElement("div");
      linkWrap.className = "project-links";
      links.forEach((item) => {
        const anchor = document.createElement("a");
        anchor.href = item.href;
        anchor.target = "_blank";
        anchor.rel = "noopener";
        anchor.dataset.gaEvent = item.eventName;
        anchor.textContent = item.text;
        linkWrap.appendChild(anchor);
      });
      article.appendChild(linkWrap);
    }

    return article;
  };

  const renderProjects = (projects = []) => {
    const grid = document.getElementById("project-grid");
    if (!grid || !projects.length) return;
    grid.innerHTML = "";
    projects.forEach((project) => grid.appendChild(createProjectCard(project)));
  };

  const renderExperience = (experience = []) => {
    const container = document.getElementById("experience-list");
    if (!container || !experience.length) return;
    container.innerHTML = "";
    experience.forEach((item) => {
      const article = document.createElement("article");
      article.className = "stack-item";

      const title = document.createElement("h3");
      title.textContent = [item.role, item.organization].filter(Boolean).join(" | ");
      article.appendChild(title);

      const meta = document.createElement("p");
      meta.className = "stack-meta";
      meta.textContent = item.period || [item.start, item.end].filter(Boolean).join(" - ");
      article.appendChild(meta);

      if (item.description) {
        const description = document.createElement("p");
        description.textContent = item.description;
        article.appendChild(description);
      }

      container.appendChild(article);
    });
  };

  const renderSkills = (skills = []) => {
    const list = document.getElementById("skills-list");
    if (!list || !skills.length) return;
    list.innerHTML = "";
    skills.forEach((skill) => list.appendChild(createTag(skill)));
  };

  const initAnalytics = async (analytics) => {
    const measurementId = analytics?.measurementId;
    if (!(analytics?.enabled && measurementId && measurementId !== PLACEHOLDER_GA)) return null;
    if (!window.gtag) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () {
        window.dataLayer.push(arguments);
      };
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
      document.head.appendChild(script);
    }
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      anonymize_ip: true,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
    return (eventName) => {
      try {
        if (eventName) window.gtag("event", eventName);
      } catch {}
    };
  };

  (async () => {
    const base = await readJson("portfolio-data.example.json") || {};
    const local = await readJson("portfolio-data.local.json") || {};
    const linkedin = await readJson("portfolio-linkedin.local.json") || {};

    let merged = deepMerge(deepMerge(base, local), {
      profile: {
        title: linkedin?.profile?.headline,
        location: linkedin?.profile?.location,
        summary: linkedin?.profile?.about,
      },
      links: {
        linkedin: linkedin?.profile?.profileUrl,
      },
      experience: linkedin?.experience,
      skills: linkedin?.skills,
    });

    const safePublicDataUrl = merged?.integrations?.safePublicDataUrl;
    const integrationsEnabled = merged?.integrations?.enabled === true && isRealValue(safePublicDataUrl);
    if (integrationsEnabled) {
      const publicData = await readJson(safePublicDataUrl);
      if (publicData && typeof publicData === "object") merged = deepMerge(merged, publicData);
    }

    bindText("profile.name", merged?.profile?.name);
    bindText("profile.title", merged?.profile?.title);
    bindText("profile.location", merged?.profile?.location);
    bindText("profile.summary", merged?.profile?.summary);
    bindHref("links.linkedin", merged?.links?.linkedin);
    bindHref("links.github", merged?.links?.github);
    bindHref("links.portfolio", merged?.links?.portfolio);

    const emailLink = document.querySelector('[data-bind-email="profile.email"]');
    if (emailLink && isRealValue(merged?.profile?.email)) {
      emailLink.setAttribute("href", `mailto:${merged.profile.email}`);
      const valueNode = emailLink.querySelector(".contact-value");
      if (valueNode) valueNode.textContent = merged.profile.email;
    } else if (emailLink) {
      emailLink.style.display = "none";
    }

    renderProjects(merged?.projects);
    renderExperience(merged?.experience);
    renderSkills(merged?.skills);

    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener("click", (event) => {
        const target = document.querySelector(anchor.getAttribute("href") || "");
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    const track = await initAnalytics(merged?.analytics);
    document.querySelectorAll("[data-ga-event]").forEach((node) => {
      node.addEventListener("click", () => {
        if (track) track(node.getAttribute("data-ga-event"));
      });
    });
  })();
})();
