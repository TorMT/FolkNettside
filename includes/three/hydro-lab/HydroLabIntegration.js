// Enkel plugin-hook som kan injiseres i alle viewer-sider.

function ensureStyles() {
  if (document.getElementById('hydro-lab-plugin-style')) return;
  const style = document.createElement('style');
  style.id = 'hydro-lab-plugin-style';
  style.textContent = `
  .hydro-lab-fab{position:fixed;right:14px;bottom:14px;z-index:5000;border:1px solid rgba(0,0,0,.2);background:#1d4ed8;color:#fff;border-radius:999px;padding:10px 14px;font-weight:800;cursor:pointer}
  .hydro-lab-inline-btn{display:inline-flex;align-items:center;justify-content:center}
  .hydro-lab-sheet{position:fixed;right:14px;bottom:58px;width:min(980px,96vw);height:min(76vh,760px);background:#fff;border:1px solid rgba(0,0,0,.22);border-radius:12px;box-shadow:0 20px 50px rgba(0,0,0,.35);display:none;z-index:5001;overflow:hidden}
  .hydro-lab-sheet.open{display:block}
  .hydro-lab-sheet iframe{width:100%;height:calc(100% - 42px);border:0}
  .hydro-lab-top{height:42px;display:flex;align-items:center;justify-content:space-between;padding:0 10px;background:#f3f4f6;border-bottom:1px solid #d1d5db}
  `;
  document.head.appendChild(style);
}

const DEFAULT_DEMO_URL = '/includes/three/hydro-lab/HydroLabDemo.html';

function resolveDemoUrl(demoUrl) {
  try {
    return new URL(demoUrl, window.location.origin).toString();
  } catch {
    return demoUrl;
  }
}

export function installHydroLabPlugin({ demoUrl = DEFAULT_DEMO_URL, title = 'HydroLab', mountSelector = '[data-hydro-lab-mount]' } = {}) {
  ensureStyles();
  if (document.querySelector('.hydro-lab-trigger')) return;
  const iframeUrl = resolveDemoUrl(demoUrl);
  const mount = mountSelector ? document.querySelector(mountSelector) : null;

  const btn = document.createElement('button');
  btn.className = mount ? 'hydro-lab-trigger hydro-lab-inline-btn' : 'hydro-lab-trigger hydro-lab-fab';
  if (mount) {
    const extraClass = mount.getAttribute('data-hydro-lab-button-class');
    if (extraClass) btn.className += ` ${extraClass}`;
    btn.type = 'button';
  }
  btn.textContent = 'HydroLab';

  const sheet = document.createElement('div');
  sheet.className = 'hydro-lab-sheet';
  sheet.innerHTML = `<div class="hydro-lab-top"><strong>${title}</strong><button id="hydroLabSheetClose">Lukk</button></div><div class="hydro-lab-body"></div>`;

  let iframeLoaded = false;
  function ensureIframe() {
    if (iframeLoaded) return;
    const body = sheet.querySelector('.hydro-lab-body');
    if (!body) return;
    const frame = document.createElement('iframe');
    frame.src = iframeUrl;
    frame.title = title;
    body.appendChild(frame);
    iframeLoaded = true;
  }

  const close = () => sheet.classList.remove('open');
  btn.onclick = () => {
    const opening = !sheet.classList.contains('open');
    if (opening) ensureIframe();
    sheet.classList.toggle('open');
  };
  sheet.querySelector('#hydroLabSheetClose')?.addEventListener('click', close);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  if (mount) mount.appendChild(btn);
  else document.body.appendChild(btn);
  document.body.appendChild(sheet);
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => installHydroLabPlugin());
}
