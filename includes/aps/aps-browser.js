import { initViewer, loadModel } from './aps-auth.js';

export async function fetchConfig(configUrl) {
  const resp = await fetch(configUrl, { cache: 'no-store' });
  if (!resp.ok) throw new Error(`Could not load config: ${configUrl}`);
  return resp.json();
}

export async function fetchModels(configUrl) {
  const resp = await fetch(`/FolkNettside/includes/aps/api/models.php?config=${encodeURIComponent(configUrl)}`, { cache: 'no-store' });
  const text = await resp.text();
  let data = {};
  try { data = text ? JSON.parse(text) : {}; } catch (err) { throw new Error(text || 'Invalid APS models response.'); }
  if (!resp.ok) throw new Error(data.error || 'Could not load APS models.');
  return data;
}

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (typeof text === 'string') node.textContent = text;
  return node;
}

function groupByFolder(models) {
  const map = new Map();
  for (const model of models) {
    const folder = model.folderPath || model.group || 'Rot';
    if (!map.has(folder)) map.set(folder, []);
    map.get(folder).push(model);
  }
  return [...map.entries()].map(([folder, items]) => ({ folder, items }));
}

export async function mountApsBrowser({ configUrl, listEl, viewerEl, statusEl, metaEl }) {
  const config = await fetchConfig(configUrl);
  let viewer = null;
  let modelsPayload = null;

  const setStatus = (message, tone = 'info') => {
    statusEl.textContent = message || '';
    statusEl.dataset.tone = tone;
  };

  const showModel = async (model, button) => {
    listEl.querySelectorAll('.aps-model-button').forEach(btn => btn.classList.toggle('is-active', btn === button));
    if (metaEl) {
      metaEl.innerHTML = '';
      const title = el('h3', 'aps-meta-title', model.name || 'Ukjent modell');
      const sub = el('p', 'aps-meta-sub', model.note || model.folderPath || '');
      metaEl.appendChild(title);
      metaEl.appendChild(sub);
      if (model.webUrl) {
        const a = el('a', 'aps-meta-link', '?pne i Autodesk');
        a.href = model.webUrl;
        a.target = '_blank';
        a.rel = 'noopener';
        metaEl.appendChild(a);
      }
    }
    if (!model.urn) {
      setStatus('Denne demooppf?ringen mangler URN. Legg inn ekte APS hub/project/folder og secrets for live viewer.', 'warn');
      viewerEl.innerHTML = '<div class="aps-placeholder">Viewer er klar, men denne demooppf?ringen har ingen URN enn?.</div>';
      return;
    }
    try {
      if (!viewer) viewer = await initViewer(viewerEl, configUrl, { theme: config.theme || 'light-theme' });
      setStatus(`Laster ${model.name} ...`, 'info');
      await loadModel(viewer, model.urn);
      setStatus(`Viser ${model.name}`, 'ok');
    } catch (err) {
      console.error('[aps-browser] load error', err);
      setStatus(`Kunne ikke laste ${model.name}: ${err.message || err}`, 'error');
    }
  };

  try {
    modelsPayload = await fetchModels(configUrl);
  } catch (err) {
    setStatus(err.message || String(err), 'error');
    return;
  }

  const models = Array.isArray(modelsPayload.models) ? modelsPayload.models : [];
  const groups = groupByFolder(models);
  setStatus(modelsPayload.notice || (models.length ? `Fant ${models.length} modeller.` : 'Ingen modeller funnet.'), models.length ? 'ok' : 'warn');
  listEl.innerHTML = '';

  groups.forEach((group, groupIndex) => {
    const section = el('section', 'aps-folder-group');
    const heading = el('h3', 'aps-folder-title', group.folder);
    section.appendChild(heading);
    const wrap = el('div', 'aps-folder-items');
    group.items.forEach((model, index) => {
      const button = el('button', 'aps-model-button');
      button.type = 'button';
      button.appendChild(el('span', 'aps-model-name', model.name || `Modell ${index + 1}`));
      button.appendChild(el('span', 'aps-model-meta', model.versionName || model.type || 'APS-modell'));
      button.addEventListener('click', () => showModel(model, button));
      wrap.appendChild(button);
      if (groupIndex === 0 && index === 0) queueMicrotask(() => button.click());
    });
    section.appendChild(wrap);
    listEl.appendChild(section);
  });
}
