const APS_VIEWER_CSS = 'https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/style.min.css';
const APS_VIEWER_JS = 'https://developer.api.autodesk.com/modelderivative/v2/viewers/7.*/viewer3D.min.js';

function ensureStyle(href) {
  if ([...document.querySelectorAll('link[rel="stylesheet"]')].some(link => link.href === href)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

function ensureScript(src) {
  return new Promise((resolve, reject) => {
    const existing = [...document.querySelectorAll('script')].find(script => script.src === src);
    if (existing) {
      if (window.Autodesk?.Viewing) return resolve();
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export async function loadViewerRuntime() {
  ensureStyle(APS_VIEWER_CSS);
  if (window.Autodesk?.Viewing) return window.Autodesk.Viewing;
  await ensureScript(APS_VIEWER_JS);
  return window.Autodesk.Viewing;
}

export async function fetchToken(configUrl) {
  const url = `/FolkNettside/includes/aps/api/token.php?config=${encodeURIComponent(configUrl)}`;
  const resp = await fetch(url, { cache: 'no-store' });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || 'Could not get APS token.');
  }
  return resp.json();
}

export function createAccessTokenProvider(configUrl) {
  return async (callback) => {
    try {
      const { access_token, expires_in } = await fetchToken(configUrl);
      callback(access_token, expires_in || 3599);
    } catch (err) {
      console.error('[aps-auth] token error', err);
      throw err;
    }
  };
}

export async function initViewer(container, configUrl, options = {}) {
  const Viewing = await loadViewerRuntime();
  const getAccessToken = createAccessTokenProvider(configUrl);
  return new Promise((resolve, reject) => {
    Viewing.Initializer({ env: 'AutodeskProduction', getAccessToken }, () => {
      const viewer = new Viewing.GuiViewer3D(container, {
        extensions: ['Autodesk.DocumentBrowser'],
        ...(options.viewerConfig || {})
      });
      viewer.start();
      viewer.setTheme(options.theme || 'light-theme');
      resolve(viewer);
    }, reject);
  });
}

export async function loadModel(viewer, urn) {
  if (!urn) throw new Error('Missing model URN.');
  return new Promise((resolve, reject) => {
    const onSuccess = (doc) => resolve(viewer.loadDocumentNode(doc, doc.getRoot().getDefaultGeometry()));
    const onFailure = (code, message, errors) => reject({ code, message, errors });
    window.Autodesk.Viewing.Document.load(`urn:${urn}`, onSuccess, onFailure);
  });
}

export function destroyViewer(viewer) {
  try { viewer?.finish?.(); } catch (err) {}
}
