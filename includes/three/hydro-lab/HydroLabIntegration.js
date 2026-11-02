// Enkel plugin-hook som kan injiseres i alle viewer-sider.

function ensureStyles() {
  if (document.getElementById('hydro-lab-plugin-style')) return;
  const style = document.createElement('style');
  style.id = 'hydro-lab-plugin-style';
  style.textContent = `
  .hydro-lab-fab{position:fixed;right:14px;bottom:14px;z-index:5000;border:1px solid rgba(0,0,0,.2);background:#1d4ed8;color:#fff;border-radius:999px;padding:10px 14px;font-weight:800;cursor:pointer}
  .hydro-lab-sheet{position:fixed;right:14px;bottom:58px;width:min(980px,96vw);height:min(76vh,760px);background:#fff;border:1px solid rgba(0,0,0,.22);border-radius:12px;box-shadow:0 20px 50px rgba(0,0,0,.35);display:none;z-index:5001;overflow:hidden}
  .hydro-lab-sheet.open{display:block}
  .hydro-lab-sheet iframe{width:100%;height:calc(100% - 42px);border:0}
  .hydro-lab-top{height:42px;display:flex;align-items:center;justify-content:space-between;padding:0 10px;background:#f3f4f6;border-bottom:1px solid #d1d5db}
  `;
  document.head.appendChild(style);
}

export function installHydroLabPlugin({ demoUrl = new URL('./HydroLabDemo.html', import.meta.url).href, title = 'HydroLab' } = {}) {
  ensureStyles();
  if (document.querySelector('.hydro-lab-fab')) return;

  const btn = document.createElement('button');
  btn.className = 'hydro-lab-fab';
  btn.textContent = 'HydroLab';

  const sheet = document.createElement('div');
  sheet.className = 'hydro-lab-sheet';
  sheet.innerHTML = `<div class="hydro-lab-top"><strong>${title}</strong><button id="hydroLabSheetClose">Lukk</button></div><iframe src="${demoUrl}" title="${title}"></iframe>`;

  const close = () => sheet.classList.remove('open');
  btn.onclick = () => sheet.classList.toggle('open');
  sheet.querySelector('#hydroLabSheetClose')?.addEventListener('click', close);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

  document.body.appendChild(btn);
  document.body.appendChild(sheet);
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => installHydroLabPlugin());
}
