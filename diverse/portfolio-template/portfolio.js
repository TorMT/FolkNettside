(() => {
  const PLACEHOLDER_GA = '{{GA_MEASUREMENT_ID}}';
  const STATUS = new Set(['Active', 'Prototype', 'In development', 'Archived']);

  const deepMerge = (base, extra) => {
    if (Array.isArray(base) || Array.isArray(extra)) return extra ?? base;
    if (!base || typeof base !== 'object') return extra ?? base;
    const out = { ...base };
    Object.entries(extra || {}).forEach(([k, v]) => {
      out[k] = (v && typeof v === 'object' && !Array.isArray(v)) ? deepMerge(base[k], v) : v;
    });
    return out;
  };

  const readJson = async (url) => {
    try { const r = await fetch(url, { cache: 'no-store' }); if (!r.ok) return null; return await r.json(); }
    catch { return null; }
  };

  const bindText = (key, value) => document.querySelectorAll(`[data-bind="${key}"]`).forEach(n => n.textContent = value || n.textContent);
  const bindHref = (key, value) => document.querySelectorAll(`[data-bind-href="${key}"]`).forEach(n => { if (value) n.href = value; });

  const renderProjects = (projects = []) => {
    const grid = document.getElementById('project-grid'); if (!grid || !projects.length) return;
    grid.innerHTML = '';
    projects.forEach(p => {
      const status = STATUS.has(p.status) ? p.status : 'Prototype';
      const tags = (p.tags || []).map(t => `<li>${t}</li>`).join('');
      const demo = p.demoUrl ? `<a href="${p.demoUrl}" target="_blank" rel="noopener" data-ga-event="portfolio_project_demo_click">Demo</a>` : '';
      const source = p.sourceUrl ? `<a href="${p.sourceUrl}" target="_blank" rel="noopener" data-ga-event="portfolio_project_source_click">Source</a>` : '';
      grid.insertAdjacentHTML('beforeend', `<article class="project-card"><h3>${p.title || 'Project title'}</h3><p class="status">${status}</p><p>${p.summary || ''}</p><p>${p.description || ''}</p><ul class="tag-list">${tags}</ul><div class="hero-actions">${demo}${source}</div></article>`);
    });
  };

  const renderExperience = (exp = []) => {
    const el = document.getElementById('experience-list'); if (!el || !exp.length) return;
    el.innerHTML = exp.map(e => `<article><h3>${e.role || ''} · ${e.organization || ''}</h3><p class="meta">${e.period || `${e.start || ''} – ${e.end || ''}`}</p><p>${e.description || ''}</p></article>`).join('');
  };

  const renderSkills = (skills = []) => {
    const el = document.getElementById('skills-list'); if (!el || !skills.length) return;
    el.innerHTML = skills.map(s => `<li>${s}</li>`).join('');
  };

  const initAnalytics = async (analytics) => {
    const id = analytics?.measurementId;
    if (!(analytics?.enabled && id && id !== PLACEHOLDER_GA)) return null;
    if (!window.gtag) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function(){ window.dataLayer.push(arguments); };
      const s = document.createElement('script');
      s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
      document.head.appendChild(s);
    }
    window.gtag('js', new Date());
    window.gtag('config', id, { anonymize_ip: true, allow_google_signals: false, allow_ad_personalization_signals: false });
    return (eventName) => { try { window.gtag && window.gtag('event', eventName); } catch {} };
  };

  (async () => {
    const base = await readJson('portfolio-data.example.json') || {};
    const local = await readJson('portfolio-data.local.json') || {};
    const linkedin = await readJson('portfolio-linkedin.local.json') || {};
    const merged = deepMerge(deepMerge(base, local), {
      profile: {
        title: linkedin?.profile?.headline,
        location: linkedin?.profile?.location,
        summary: linkedin?.profile?.about
      },
      links: { linkedin: linkedin?.profile?.profileUrl },
      experience: linkedin?.experience,
      skills: linkedin?.skills
    });

    bindText('profile.name', merged?.profile?.name);
    bindText('profile.title', merged?.profile?.title);
    bindText('profile.location', merged?.profile?.location);
    bindText('profile.summary', merged?.profile?.summary);
    bindHref('links.linkedin', merged?.links?.linkedin);
    bindHref('links.github', merged?.links?.github);
    bindHref('links.portfolio', merged?.links?.portfolio);
    const emailA = document.querySelector('[data-bind-email="profile.email"]');
    if (emailA && merged?.profile?.email) { emailA.textContent = merged.profile.email; emailA.href = `mailto:${merged.profile.email}`; }

    renderProjects(merged?.projects);
    renderExperience(merged?.experience);
    renderSkills(merged?.skills);

    document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const t = document.querySelector(a.getAttribute('href') || ''); if (!t) return;
      e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));

    const track = await initAnalytics(merged.analytics);
    document.querySelectorAll('[data-ga-event]').forEach(el => el.addEventListener('click', () => track && track(el.getAttribute('data-ga-event'))));
  })();
})();
