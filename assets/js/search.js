/* ------------------------------------------------------------------
   FolkNettsideFolk – search.js  v1.0
   Enkel klientside-søk over 'filer/index.json' (nøkkel + files).
   Viser resultater i egen dropdown under navbar.
------------------------------------------------------------------- */
(function(){
  const input   = document.getElementById('nav-search');
  const panel   = document.getElementById('search-results');
  if (!input || !panel) return;

  function getCourseDir(){ return location.pathname.replace(/\/index\.html?$/,'/FolkNettside/'); }
  function encodePathSegments(rel){ return rel.split('/FolkNettside/').map(s => encodeURIComponent(s)).join('/FolkNettside/'); }

  function makeHrefFromIndex(key, obj, file){
    const isFileKey = /\.[a-z0-9]{1,8}$/i.test(key);
    let rel = String(file);
    const dir = (obj && typeof obj==='object' && obj.dir) ? String(obj.dir) : null;
    if (!isFileKey && dir && !rel.includes('/FolkNettside/')) rel = `${dir}/${rel}`;
    const underFiler = rel.startsWith('filer/') ? rel : `filer/${rel}`;
    const encoded = encodePathSegments(underFiler.replace(/\\/g,'/FolkNettside/'));
    return new URL(encoded, location.origin + getCourseDir()).href;
  }

  function displayName(key){
    const m = key.match(/^\s*[øo]ving(?:er)?\s*0*(\d{1,3})\b/i);
    if (m)  return `Øving ${String(parseInt(m[1],10)).padStart(2,'0')}`;
    const m2 = key.match(/^oving(\d{1,3})$/i);
    if (m2) return `Øving ${String(parseInt(m2[1],10)).padStart(2,'0')}`;
    return key.replace(/\.[^/.]+$/, "");
  }

  let items = [];
  async function build() {
    try{
      const r = await fetch('filer/index.json', {cache:'no-store'});
      const data = await r.json();

      const keys = Object.keys(data).filter(k => k !== 'welcome' && k !== 'quiz');
      const out = [];
      for (const key of keys){
        const obj = data[key];
        const files = Array.isArray(obj) ? obj : (obj?.files || []);
        for (const f of files){
          out.push({
            key,
            label: displayName(key) + ' / ' + String(f).split(/[\\/]/).pop(),
            href: makeHrefFromIndex(key, obj, f)
          });
        }
      }
      items = out;
    }catch(e){
      items = [];
    }
  }

  function clearPanel(){ panel.innerHTML = ''; panel.classList.remove('open'); }
  function openPanel(){ panel.classList.add('open'); }
  function render(list){
    if (!list.length){ clearPanel(); return; }
    openPanel();
    panel.innerHTML = list.map(it=>`<a href="${it.href}">${it.label}</a>`).join('');
    panel.querySelectorAll('a').forEach(a=>{
      a.addEventListener('click', e=>{
        e.preventDefault();
        const href = a.getAttribute('href');
        // bruk eksisterende openFile hvis tilgjengelig for riktig viewer
        if (window.openFile) window.openFile(href);
        else window.open(href, '_blank');
        clearPanel();
      });
    });
  }

  function onInput(){
    const q = input.value.trim().toLowerCase();
    if (!q) { clearPanel(); return; }
    const m = items.filter(it => it.label.toLowerCase().includes(q)).slice(0, 12);
    render(m);
  }

  function onKey(e){
    if (e.key === 'Escape') { input.blur(); clearPanel(); }
  }

  // init
  build();
  input.addEventListener('input', onInput);
  document.addEventListener('keydown', onKey);
  document.addEventListener('click', (e)=>{
    if (!panel.contains(e.target) && e.target !== input) clearPanel();
  });
})();
