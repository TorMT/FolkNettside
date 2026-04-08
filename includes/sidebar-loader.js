/* --------------------------------------------------------------------
   FolkNettsideFolk â€“ sidebar-loader.js  v11.15.2
   --------------------------------------------------------------------
   FIKSET: Fil ikoner og CSS/JS-blanding
   
   â€¢ Riktig rekkefÃ¸lge: ØvingXX â†’ PythonØvingâ€¦ â†’ andre â†’ beskyttet
   â€¢ PDF/py/ipynb/code (C/C++/C#/Java) i viewer; robust 3s fallback for PDF
   â€¢ pyview/nbview/codeview bruker ?file= â€¦
   â€¢ Skjuler beskyttet flyout/innhold til passord er godkjent
   â€¢ Quiz-knapp rendrer i innholdet (auto-finner quiz.json + fikser bildepaths)
   â€¢ Tittel/innhold havner ikke under sidebaren
   â€¢ Robust JSON-innlasting (stripper BOM, viser feilsnutt ved HTML/404, osv.)
   â€¢ Nested flyouts: Filer med "/" i navnet (f.eks. "DelA/fil.pdf") fÃ¥r nested flyout
   â€¢ BUGFIX v11.15.2:
     â€“ Fikset CSS/JS-blanding som Ã¸dela fil-ikoner
     â€“ Alle ikoner fungerer nÃ¥ korrekt
     â€“ Bedre struktur i CSS-injeksjon
-------------------------------------------------------------------- */

/**************** 1) Dynamisk CSS ****************************************/
(function () {
  const id = 'folknettside-css-v11152';
  if (document.getElementById(id)) return;

  const css = `
    :root{ 
      --nav-h:48px; 
      --side-w:198px; 
      --gap:28px; 
      --pad-left:calc(var(--side-w) + var(--gap));
      --safe-area-bottom: env(safe-area-inset-bottom, 0px);
    }
    
    html,body{ margin:0;padding:0;height:100%; font-family:sans-serif;background:#555; overflow-y:scroll;overflow-x:hidden; }
    body{display:flex;flex-direction:column;min-height:100vh;}

    /* ---------- SIDEBAR ---------- */
    .sidebar{ 
      position:fixed;
      top:var(--nav-h);
      left:0; 
      width:var(--side-w);
      height:calc(100vh - var(--nav-h)); 
      background:var(--sidebar-bg, #004f9f);
      color:var(--sidebar-text, #fff);
      overflow-y:auto;
      -webkit-overflow-scrolling:touch;
      -ms-overflow-style:-ms-autohiding-scrollbar;
      overscroll-behavior:auto;
      z-index:1000;
      padding-bottom:calc(3.5rem + var(--safe-area-bottom));
      scroll-padding-bottom:calc(3.5rem + var(--safe-area-bottom));
    }
    
    .sidebar h3{margin:0 0 0.25rem 0.75rem;font-size:1.75rem;}
    .dropdown-oving{position:relative;width:100%;}
    .dropdown-btn{ 
      width:100%;
      padding:0.6rem 1rem 0.6rem 1.25rem;
      background:none;
      border:none;
      color:var(--sidebar-text, #fff);
      font-weight:600;
      text-align:left;
      cursor:pointer; 
    }
    .dropdown-btn:hover{background:var(--sidebar-hover, rgba(255,255,255,0.14));}
    .dropdown-oving.active>.dropdown-btn{background:var(--sidebar-active, #2e5e96);}
    
    /* DESKTOP FLYOUT STYLING */
    @media(min-width:769px){
      .sidebar .dropdown-content{ 
        position:fixed;
        left:var(--side-w); 
        top:calc(var(--nav-h) - 6px);
        width:260px;
        display:none;
        background:var(--sidebar-bg, #004f9f);
        color:var(--sidebar-text, #fff);
        box-shadow:0 2px 8px rgba(0,0,0,.15);
        z-index:1100;
        opacity:1;
        transition:opacity 0.1s ease;
        max-height:calc(100vh - var(--nav-h) - 20px);
        overflow-y:auto;
        overflow-x:hidden;
        -webkit-overflow-scrolling:touch;
      }
      
      .sidebar .dropdown-content::-webkit-scrollbar {
        width:8px;
      }
      
      .sidebar .dropdown-content::-webkit-scrollbar-track {
        background:rgba(255, 255, 255, 0.1);
        border-radius:4px;
      }
      
      .sidebar .dropdown-content::-webkit-scrollbar-thumb {
        background:rgba(255, 255, 255, 0.3);
        border-radius:4px;
      }
      
      .sidebar .dropdown-content::-webkit-scrollbar-thumb:hover {
        background:rgba(255, 255, 255, 0.5); 
      }
      
      .sidebar .dropdown-content a,
      .nested-flyout a{ 
        display:flex;
        align-items:center;
        padding:0.5rem 1rem;
        color:var(--sidebar-text, #fff);
        text-decoration:none;
        transition:background 0.15s;
      }
      
      .sidebar .dropdown-content a:hover,
      .nested-flyout a:hover{
        background:var(--sidebar-hover, rgba(255,255,255,0.12));
      }
      
      .nested-flyout{
        position:fixed;
        width:260px;
        display:none;
        background:var(--sidebar-bg, #004f9f);
        color:var(--sidebar-text, #fff);
        box-shadow:0 2px 8px rgba(0,0,0,.15);
        z-index:2000;
        opacity:0;
        transition:opacity 0.1s ease;
        max-height:calc(100vh - var(--nav-h) - 20px);
        overflow-y:auto;
        overflow-x:hidden;
        -webkit-overflow-scrolling:touch;
      }
      
      .nested-flyout::-webkit-scrollbar {
        width:8px;
      }
      
      .nested-flyout::-webkit-scrollbar-track {
        background:rgba(255, 255, 255, 0.1);
        border-radius:4px;
      }
      
      .nested-flyout::-webkit-scrollbar-thumb {
        background:rgba(255, 255, 255, 0.3);
        border-radius:4px;
      }
      
      .nested-flyout::-webkit-scrollbar-thumb:hover {
        background:rgba(255, 255, 255, 0.5);
      }
      
      .nested-folder-item{
        position:relative;
        display:flex;
        align-items:center;
        padding:0.5rem 1rem;
        cursor:pointer;
        transition:background 0.15s;
      }
      
      .nested-folder-item:hover{
        background:var(--sidebar-hover, rgba(255,255,255,0.12));
      }
      
      .nested-folder-item::after{ 
        content:'â–¸';
        position:absolute;
        right:8px;
        font-size:1.1em; 
      }
    }

    /* ---------- INNHOLD ---------- */
    .wrapper{ 
      margin-left:var(--pad-left)!important;
      width:calc(100% - var(--pad-left))!important;
      padding-top:calc(var(--nav-h) - 12px);
      display:flex;
      flex:1 1 auto;
      background:#fff;
      box-sizing:border-box;
      position:relative;
      z-index:0; 
    }
    
    .content{ 
      flex:1 1 auto;
      overflow:visible;
      padding:0 1rem 0 var(--gap);
      box-sizing:border-box;
      position:relative;
      background:#fff; 
    }
    
    .content h1{margin:1rem 0 0.5rem 0;color:#004f9f;cursor:pointer;}
    .course-description{margin:0 0 1rem 0;max-width:42rem;line-height:1.5;}

    /* ---------- VIEWER/QUIZ ---------- */
    #pdf-viewer-container{display:none;height:calc(100vh - var(--nav-h) - 3rem);overflow:auto;}
    #media-viewer-container{display:none;height:calc(100vh - var(--nav-h) - 3rem);overflow:auto;}
    #media-viewer{width:100%;height:100%;border:none;background:#000}
    
    .file-icon{
      display:inline-flex;
      width:20px;
      height:14px;
      margin-right:10px;
      align-items:center;
      justify-content:center;
      vertical-align:middle;
      flex:0 0 20px;
      overflow:hidden;
    }
    
    .file-icon svg{
      width:100%;
      height:100%;
      display:block;
    }
    
    .file-label{
      display:block;
      flex:1;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
    }
    
    .dropdown-content a .file-icon,
    .nested-flyout a .file-icon,
    .nested-folder-item .file-icon{
      margin-right:10px;
    }
    
    #pdf-viewer{width:100%;height:100%;border:none;}
    #quiz-container{margin-top:0.75rem;}

    #pdf-viewer-resize{
      display:none; 
      height:10px; 
      cursor:ns-resize;
      background:repeating-linear-gradient(90deg,#e5e5e5 0 16px,#d4d4d4 16px 32px);
      border:1px solid #cfcfcf; 
      border-top:none; 
      opacity:.8; 
      user-select:none;
    }

    .msg{ 
      background:#fdecec;
      color:#932323;
      border:1px solid #f2bbbb;
      padding:.6rem .8rem;
      border-radius:6px;
      max-width:56rem;
      line-height:1.4;
      font-size:.95rem;
      margin:.75rem 0; 
    }
    
    .file-label.watched::before{
      content:"âœ“ ";
      color:#8BC34A;
      margin-right:6px;
      font-weight:700;
    }
    
    .nested-folder-item.watched>.file-label::after{
      content:" âœ“";
      color:#8BC34A;
      margin-left:6px;
    }
  `;
  
  const st = document.createElement('style');
  st.id = id;
  st.textContent = css;
  document.head.appendChild(st);
})();

/**************** 2) Utils (UENDRET fra v11.11.0) ************************/
const BESKYTTET_HASH = '818728143377c056986a23cbcdb765add0aa174625da9c5afc34b8b9ef712500';

function isOk() { return sessionStorage.getItem('beskyttet_ok') === '1'; }

async function sha256Hex(str){
  const enc = new TextEncoder();
  const data = enc.encode(String(str));
  const hash = await crypto.subtle.digest('SHA-256', data);
  const bytes = Array.from(new Uint8Array(hash));
  return bytes.map(b=>b.toString(16).padStart(2,'0')).join('');
}

async function askPass(){
  if (isOk()) return true;
  const p = prompt('Dette dokumentet er beskyttet. Skriv inn passord:');
  if (!p) return false;
  try{
    const h = await sha256Hex(p);
    if (h === BESKYTTET_HASH){
      sessionStorage.setItem('beskyttet_ok','1');
      return true;
    }
  }catch(e){ }
  alert('Feil passord!');
  return false;
}

function getCourseDir(){ return location.pathname.replace(/\/index\.html?$/,'/'); }
function isMobileViewport(){ return window.matchMedia('(max-width: 1024px)').matches; }
function encodePathSegments(rel){ return rel.split('/').map(s => encodeURIComponent(s)).join('/'); }
function getCourseCode(){
  const candidates = [
    document.querySelector('meta[name="course-code"]')?.getAttribute('content'),
    document.querySelector('meta[name="fagkode"]')?.getAttribute('content'),
    document.body?.dataset?.courseCode,
    document.querySelector('[data-course-code]')?.getAttribute('data-course-code')
  ];
  const found = candidates.find(v => String(v || '').trim());
  return String(found || '').trim().toUpperCase();
}
function getKarakterwebUrl(courseCode){
  const code = String(courseCode || '').trim().toUpperCase();
  if (!code) return null;
  const codeLower = code.toLowerCase();
  const tplMeta = document.querySelector('meta[name="karakterweb-url-template"]')?.getAttribute('content');
  if (tplMeta){
    return String(tplMeta)
      .replaceAll('{COURSE_CODE}', encodeURIComponent(code))
      .replaceAll('{course_code}', encodeURIComponent(codeLower));
  }
  return `https://www.karakterweb.no/ntnu/${encodeURIComponent(codeLower)}`;
}
function toAbsUrl(rel, baseDir){
  const s = String(rel||'');
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('/')) return new URL(s, location.origin).href;
  const encoded = encodePathSegments(s.replace(/\\/g,'/'));
  return new URL(encoded, location.origin + baseDir).href;
}

function setupResize(bar, box){
  let startY=0, startH=0, dragging=false;
  const key = 'viewerH:'+getCourseDir();

  const onMove = (e)=>{
    if (!dragging) return;
    const dy = (e.clientY || e.touches?.[0]?.clientY) - startY;
    let h = Math.max(280, startH + dy);
    const maxH = Math.max(window.innerHeight*2, 800);
    h = Math.min(h, maxH);
    box.style.height = h+'px';
  };
  const onUp = ()=>{
    if (!dragging) return;
    dragging=false;
    document.removeEventListener('mousemove',onMove);
    document.removeEventListener('mouseup',onUp);
    document.removeEventListener('touchmove',onMove);
    document.removeEventListener('touchend',onUp);
    try{
      const h = Math.round(box.getBoundingClientRect().height);
      localStorage.setItem(key, String(h));
    }catch{}
  };
  const onDown = (e)=>{
    e.preventDefault();
    startY = (e.clientY || e.touches?.[0]?.clientY);
    startH = box.getBoundingClientRect().height;
    dragging=true;
    document.addEventListener('mousemove',onMove);
    document.addEventListener('mouseup',onUp);
    document.addEventListener('touchmove',onMove,{passive:false});
    document.addEventListener('touchend',onUp);
  };
  bar.addEventListener('mousedown', onDown);
  bar.addEventListener('touchstart', onDown, {passive:false});
}

function ensureViewer(){
  const c = document.querySelector('.content');
  let box = document.getElementById('pdf-viewer-container');
  if(!box){
    box = document.createElement('div'); box.id='pdf-viewer-container';
    const f = document.createElement('object'); f.id='pdf-viewer'; f.type='application/pdf';
    box.appendChild(f); c.appendChild(box);
  }

  let bar = document.getElementById('pdf-viewer-resize');
  if(!bar){
    bar = document.createElement('div'); bar.id='pdf-viewer-resize';
    c.appendChild(bar);
    setupResize(bar, box);
  }
  try{
    const key = 'viewerH:'+getCourseDir();
    const saved = localStorage.getItem(key);
    if (saved && /^\d+$/.test(saved)) box.style.height = saved+'px';
  }catch{}

  return {box, frame: box.firstElementChild};
}

function replaceViewerFrame(tag){
  const box = document.getElementById('pdf-viewer-container');
  if (!box) return null;

  const current = box.firstElementChild;
  if (current && current.tagName.toLowerCase() === tag) return current;

  const next = document.createElement(tag);
  next.id = 'pdf-viewer';
  next.style.width = '100%';
  next.style.height = '100%';
  next.style.border = 'none';

  if (tag === 'iframe'){
    next.setAttribute('loading', 'lazy');
    next.setAttribute('allow', 'fullscreen');
    next.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  } else {
    next.type = 'application/pdf';
  }

  if (current) current.replaceWith(next);
  else box.appendChild(next);

  return next;
}

function ensureMediaViewer(){
  const c = document.querySelector('.content');
  let box = document.getElementById('media-viewer-container');
  if(!box){
    box = document.createElement('div'); box.id='media-viewer-container';
    const holder = document.createElement('div'); holder.id='media-viewer'; holder.style.width='100%'; holder.style.height='100%';
    box.appendChild(holder); c.appendChild(box);
  }
  return {box, holder: document.getElementById('media-viewer')};
}

function _videoKey(url){ try{ return 'videoPos:'+encodeURIComponent(String(url)); }catch(e){ return 'videoPos:'+String(url); } }
function _watchedKey(url){ try{ return 'videoWatched:'+encodeURIComponent(String(url)); }catch(e){ return 'videoWatched:'+String(url); } }
function saveVideoPos(url, seconds){ try{ localStorage.setItem(_videoKey(url), String(Math.floor(seconds||0))); }catch{} }
function loadVideoPos(url){ try{ const v=localStorage.getItem(_videoKey(url)); return v?parseInt(v,10):0; }catch{return 0} }
function markVideoWatched(url){ try{ localStorage.setItem(_watchedKey(url),'1'); }catch{} refreshWatchedStatus(); }
function isVideoWatched(url){ try{ return localStorage.getItem(_watchedKey(url))==='1'; }catch{return false} }

function refreshWatchedStatus(){ 
  try{ 
    document.querySelectorAll('#sidebar .dropdown-content a, .nested-flyout a').forEach(a=>{ 
      const href=a.getAttribute('href')||''; 
      if (!href) return; 
      try{ 
        const u=new URL(href, location.origin); 
        const key = u.href; 
        if (isVideoWatched(key)) a.querySelector('.file-label')?.classList.add('watched'); 
        else a.querySelector('.file-label')?.classList.remove('watched'); 
      }catch(e){ } 
    });
    
    document.querySelectorAll('.nested-folder-item').forEach(folderItem=>{
      const links = folderItem.querySelectorAll('.nested-flyout a'); 
      if (!links.length) return; 
      let all=true; 
      links.forEach(l=>{ 
        const href=l.getAttribute('href')||''; 
        try{ 
          const u=new URL(href, location.origin); 
          if (!isVideoWatched(u.href)) all=false; 
        }catch(e){ all=false; } 
      }); 
      if (all) folderItem.classList.add('watched'); 
      else folderItem.classList.remove('watched');
    }); 
  }catch(e){} 
}

const _ytApiState = {loaded:false,callbacks:[]};
function ensureYouTubeAPI(cb){ 
  if (_ytApiState.loaded) return cb && cb(); 
  if (window.YT && window.YT.Player){ 
    _ytApiState.loaded=true; 
    if (cb) cb(); 
    return; 
  } 
  _ytApiState.callbacks.push(cb); 
  if (document.getElementById('yt-api')) return; 
  const s=document.createElement('script'); 
  s.id='yt-api'; 
  s.src='https://www.youtube.com/iframe_api'; 
  document.head.appendChild(s); 
  window.onYouTubeIframeAPIReady = function(){ 
    _ytApiState.loaded=true; 
    _ytApiState.callbacks.forEach(f=>f && f()); 
    _ytApiState.callbacks=[]; 
  }; 
}

function toggleWelcome(v){
  document.querySelector('.course-description')?.style.setProperty('display', v?'block':'none');
  document.getElementById('welcome-img')?.style.setProperty('display', v?'block':'none');
}

function toYouTubeEmbed(url){
  try{
    const s = String(url||'').trim();
    let m = s.match(/youtu\.be\/([-_0-9A-Za-z]+)/i);
    if (m) return 'https://www.youtube.com/embed/' + m[1] + '?rel=0';
    m = s.match(/[?&]v=([-_0-9A-Za-z]+)/i);
    if (m) return 'https://www.youtube.com/embed/' + m[1] + '?rel=0';
    m = s.match(/youtube\.com\/embed\/([-_0-9A-Za-z]+)/i);
    if (m) return 'https://www.youtube.com/embed/' + m[1] + '?rel=0';
    return null;
  }catch(e){return null}
}

function isEmbeddableVideoUrl(url){
  const s = String(url || '').trim();
  const lower = s.toLowerCase();
  return (
    lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.ogg') ||
    lower.endsWith('.mov') || lower.endsWith('.m4v') ||
    /^https?:\/\/(?:www\.)?(youtube\.com|youtu\.be)\//i.test(s) ||
    /^https?:\/\/(?:[\w.-]+\.)?panopto\.eu\//i.test(s) ||
    /panopto.*Viewer\.aspx/i.test(s)
  );
}

function openVideoPlaylistInViewer(payload){
  const key = 'video-playlist:' + Date.now() + ':' + Math.random().toString(36).slice(2);
  try{
    window.__videoPlaylistPayloads = window.__videoPlaylistPayloads || {};
    window.__videoPlaylistPayloads[key] = payload || {};
  }catch(e){}
  try{
    localStorage.setItem(key, JSON.stringify(payload || {}));
  }catch(e){}
  openInViewer(`/includes/kodeLesere/video-embed-list.html?playlistKey=${encodeURIComponent(key)}`, 'html');
}

function parseVideoListText(text){
  const items = [];
  const lines = String(text || '').split(/\r?\n/);
  for (const rawLine of lines){
    const line = String(rawLine || '').trim();
    if (!line || line.startsWith('#')) continue;

    // [Tittel](https://...)
    let m = line.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/i);
    if (m){
      if (isEmbeddableVideoUrl(m[2])) items.push({title: m[1].trim(), description: m[1].trim(), url: m[2].trim()});
      continue;
    }

    // Tittel|https://...|beskrivelse|tema1,tema2
    const pipePos = line.indexOf('|');
    if (pipePos > 0){
      const parts = line.split('|').map(p => p.trim());
      const title = parts[0] || '';
      const url = parts[1] || '';
      const description = parts[2] || '';
      const themes = (parts[3] || '').split(',').map(t => t.trim()).filter(Boolean);
      if (isEmbeddableVideoUrl(url)) items.push({title: title || url, description: description || title || '', themes, url});
      continue;
    }

    // Ren URL
    if (isEmbeddableVideoUrl(line)){
      items.push({title: line, description: '', url: line});
    }
  }
  return items;
}

function parseVideoListJson(text){
  try{
    const data = JSON.parse(String(text || ''));
    const arr = Array.isArray(data) ? data : (Array.isArray(data?.videos) ? data.videos : null);
    if (!arr) return [];
    return arr.map(v => {
      if (!v || typeof v !== 'object') return null;
      const url = String(v.url || '').trim();
      if (!isEmbeddableVideoUrl(url)) return null;
      const title = String(v.title || url).trim();
      const description = String(v.description || '').trim();
      const themes = Array.isArray(v.themes) ? v.themes.map(x => String(x).trim()).filter(Boolean) : [];
      const group = String(v.group || v.group_title || '').trim();
      const part = String(v.part || v.part_label || '').trim();
      return { title, description, themes, group, part, url };
    }).filter(Boolean);
  }catch(e){
    return [];
  }
}


function isPotentialVideoListFile(url){
  const lower = String(url || '').toLowerCase().split('?')[0].split('#')[0];
  return (
    lower.endsWith('.txt') ||
    lower.endsWith('.md') ||
    lower.endsWith('.list') ||
    lower.endsWith('.links') ||
    lower.endsWith('.csv') ||
    lower.endsWith('.json')
  );
}

async function tryOpenVideoListFile(url){
  try{
    if (!isPotentialVideoListFile(url)) return false;
    const lower = String(url || '').toLowerCase().split('?')[0].split('#')[0];
    const fetchCandidates = [];
    if (!lower.endsWith('.json')) fetchCandidates.push(String(url).replace(/\.[^.?#/]+(?=($|[?#]))/, '.json'));
    fetchCandidates.push(url);

    for (const candidate of Array.from(new Set(fetchCandidates))){
      const res = await fetch(candidate, {cache: 'no-store'}).catch(() => null);
      if (!res || !res.ok) continue;
      const text = await res.text();
      const candidateLower = String(candidate || '').toLowerCase().split('?')[0].split('#')[0];
      let items = [];
      if (candidateLower.endsWith('.json')) items = parseVideoListJson(text);
      if (!items.length) items = parseVideoListText(text);
      if (!items.length) continue;
      const fileName = decodeURIComponent(String(url).split('/').pop().split('?')[0] || 'Videoer');
      openVideoPlaylistInViewer({ title: fileName, items });
      return true;
    }
    return false;
  }catch(e){
    return false;
  }
}


function openInViewer(url, kind){
  if (kind === 'video' || kind === 'youtube' || kind === 'panopto'){
    const {box, holder} = ensureMediaViewer();
    try{ if (holder._fallbackTimer) { clearTimeout(holder._fallbackTimer); holder._fallbackTimer = null; } }catch{}
    holder.innerHTML = '';
    
    if (kind === 'youtube'){
      const embed = toYouTubeEmbed(url);
      const ifrId = 'yt-' + Date.now();
      const ifr = document.createElement('iframe');
      ifr.id = ifrId;
      ifr.src = embed || url;
      ifr.width = '100%'; 
      ifr.height = '100%'; 
      ifr.setAttribute('frameborder','0');
      ifr.setAttribute('allow','autoplay; encrypted-media; fullscreen');
      ifr.allowFullscreen = true;
      holder.appendChild(ifr);
      
      const stamp = Date.now(); 
      holder._loadStamp = stamp;
      ifr.addEventListener('load', ()=>{ 
        if (holder._fallbackTimer){ 
          clearTimeout(holder._fallbackTimer); 
          holder._fallbackTimer = null; 
        } 
      });
      holder._fallbackTimer = setTimeout(()=>{ 
        if (holder._loadStamp === stamp) window.open(url, '_blank'); 
      }, 5000);
      
      try{ 
        holder._ytPlayers = holder._ytPlayers || {}; 
        ensureYouTubeAPI(()=>{
          try{
            const player = new YT.Player(ifrId, {
              events: {
                onReady: (ev)=>{
                  try{
                    const saved = loadVideoPos(url);
                    if (saved && saved > 5){ ev.target.seekTo(saved, true); }
                    const pid = setInterval(()=>{ 
                      try{ 
                        const t = ev.target.getCurrentTime(); 
                        saveVideoPos(url, t); 
                      }catch{} 
                    }, 2000);
                    holder._ytPlayers[ifrId] = {player: ev.target, poll: pid};
                  }catch(e){}
                },
                onStateChange: (ev)=>{
                  try{ 
                    if (ev.data === YT.PlayerState.ENDED) { 
                      markVideoWatched(url); 
                    } 
                  }catch{}
                }
              }
            });
          }catch(e){}
        }); 
      }catch(e){}
      
    } else if (kind === 'panopto'){
      let embedUrl = String(url).replace(/Viewer\.aspx/i, 'Embed.aspx');
      const ifr2 = document.createElement('iframe');
      ifr2.src = embedUrl;
      ifr2.width = '100%'; 
      ifr2.height = '100%'; 
      ifr2.setAttribute('frameborder','0');
      ifr2.setAttribute('allow','autoplay; encrypted-media; fullscreen');
      ifr2.allowFullscreen = true;
      holder.appendChild(ifr2);
      
      const stamp2 = Date.now(); 
      holder._loadStamp = stamp2;
      ifr2.addEventListener('load', ()=>{ 
        if (holder._fallbackTimer){ 
          clearTimeout(holder._fallbackTimer); 
          holder._fallbackTimer = null; 
        } 
      });
      holder._fallbackTimer = setTimeout(()=>{ 
        if (holder._loadStamp === stamp2) window.open(url, '_blank'); 
      }, 5000);
      
      try{ 
        const ctrl = document.createElement('div'); 
        ctrl.style.position='absolute'; 
        ctrl.style.right='12px'; 
        ctrl.style.bottom='12px'; 
        ctrl.style.zIndex='9999'; 
        ctrl.innerHTML = '<button class="mark-watched">Markér som sett</button>'; 
        holder.appendChild(ctrl); 
        ctrl.querySelector('.mark-watched').addEventListener('click', ()=> markVideoWatched(url)); 
      }catch(e){}
      
    } else {
      const vid = document.createElement('video');
      vid.controls = true; 
      vid.autoplay = true; 
      vid.style.width = '100%'; 
      vid.style.height = '100%';
      const src = document.createElement('source'); 
      src.src = url; 
      vid.appendChild(src);
      holder.appendChild(vid);
      
      try{ vid.play().catch(()=>{}); }catch{}
      
      const stamp3 = Date.now(); 
      holder._loadStamp = stamp3;
      const clearVideoFallback = ()=>{ 
        if (holder._fallbackTimer){ 
          clearTimeout(holder._fallbackTimer); 
          holder._fallbackTimer = null; 
        } 
      };
      vid.addEventListener('loadedmetadata', clearVideoFallback);
      vid.addEventListener('canplay', clearVideoFallback);
      holder._fallbackTimer = setTimeout(()=>{ 
        if (holder._loadStamp === stamp3) window.open(url, '_blank'); 
      }, 5000);
    }
    
    box.style.display = 'block'; 
    toggleWelcome(false);
    
    const pdfBox = document.getElementById('pdf-viewer-container');
    if (pdfBox) pdfBox.style.display = 'none';
    const bar = document.getElementById('pdf-viewer-resize');
    if (bar) bar.style.display = 'none';
    const q = document.getElementById('quiz-container');
    if (q) q.style.display = 'none';
    
    return;
  }

  const {box} = ensureViewer();
  const useIframeForPdf = kind === 'pdf' && isMobileViewport();
  // Backward-compat alias (older codepaths/patches may reference this name)
  const userframeForPdf = useIframeForPdf;
  globalThis.userframeForPdf = userframeForPdf;
  const frame = useIframeForPdf
    ? (replaceViewerFrame('iframe') || box.firstElementChild)
    : (replaceViewerFrame('object') || box.firstElementChild);
  let target = url;

  if (kind === 'py')         target = `/includes/kodeLesere/pyview.html?file=${encodeURIComponent(url)}`;
  else if (kind === 'ipynb') target = `/includes/kodeLesere/nbview.html?file=${encodeURIComponent(url)}`;
  else if (kind === 'fusion') target = `/includes/kodeLesere/fusionview.html?file=${encodeURIComponent(url)}`;
  else if (kind === 'html')  target = `/includes/kodeLesere/htmlview.html?file=${encodeURIComponent(url)}`;
  else if (kind === 'stl') target = `/includes/kodeLesere/stlview.html?file=${encodeURIComponent(url)}`;
  else if (kind === 'fbm') target = `/includes/kodeLesere/fbmview.html?file=${encodeURIComponent(url)}`;
  else if (kind === '3mf') target = `/includes/kodeLesere/3mfhydro.html?file=${encodeURIComponent(url)}`;
  else if (kind === 'f3d') target = `/includes/kodeLesere/f3dview.html?file=${encodeURIComponent(url)}`;
  else if (kind === 'code')  target = `/includes/kodeLesere/codeview.html?file=${encodeURIComponent(url)}`;

  if (kind === 'pdf' && frame.tagName.toLowerCase() === 'object') frame.type = 'application/pdf';
  else frame.removeAttribute('type');

  console.info('[sidebar-loader] openInViewer', { kind, sourceUrl: url, target });
  if (frame._fallbackTimer) { clearTimeout(frame._fallbackTimer); frame._fallbackTimer = null; }
  if (frame.tagName.toLowerCase() === 'iframe') frame.src = target;
  else frame.data = target;
  box.style.display='block'; 
  toggleWelcome(false);

  const bar = document.getElementById('pdf-viewer-resize');
  if (bar) bar.style.display = userframeForPdf ? 'none' : 'block';

  const thisLoad = Date.now(); 
  frame._loadStamp = thisLoad;
  frame.onload = () => { 
    if (frame._fallbackTimer) { 
      clearTimeout(frame._fallbackTimer); 
      frame._fallbackTimer = null; 
    } 
  };

  if (kind === 'pdf'){
    frame._fallbackTimer = setTimeout(()=>{
      const loaded = frame.tagName.toLowerCase() === 'iframe' ? frame.src : frame.data;
      if (frame._loadStamp === thisLoad && loaded === target) window.open(url, '_blank');
    }, 3000);
  }
  
  const mv = document.getElementById('media-viewer-container');
  if (mv){ 
    mv.style.display = 'none'; 
    const h = document.getElementById('media-viewer'); 
    try{ 
      if (h && h._fallbackTimer) { 
        clearTimeout(h._fallbackTimer); 
        h._fallbackTimer = null; 
      } 
    }catch{}
    if (h) h.innerHTML = ''; 
  }
  
  const q = document.getElementById('quiz-container');
  if (q) q.style.display = 'none';
  
  document.querySelectorAll('.dropdown-oving').forEach(d=>d.classList.remove('active'));
}

function openFile(url){
  const lower = String(url || '').toLowerCase();
  const clean = lower.split('?')[0].split('#')[0];
  console.info('[sidebar-loader] openFile', { url, clean });
  const fusionFlag = new URLSearchParams(window.location.search).get('fusionviewer');
  const fusionViewerEnabled =
    window.ENABLE_FUSION_VIEWER !== false &&
    fusionFlag !== '0';
  if (clean.endsWith('.pdf'))   return openInViewer(url, 'pdf');
  if (clean.endsWith('.ipynb')) return openInViewer(url, 'ipynb');
  if (clean.endsWith('.py'))    return openInViewer(url, 'py');
  if (clean.endsWith('.stl')) return openInViewer(url, 'stl');
  if (clean.endsWith('.html')) {
    if (!/\/filer\//i.test(clean) || clean.endsWith('/index.html')) {
      window.location.href = url;
      return;
    }
    return openInViewer(url, 'html');
  }
  if (clean.endsWith('.fbm')) return openInViewer(url, 'fbm');
  if (/\.(3mf|3fm|fm3)$/.test(clean)) return openInViewer(url, '3mf');
  if (fusionViewerEnabled && /\.(f3d|f3z|step|stp|iges|igs|obj|sat|smt|x_t|x_b|sldprt|sldasm)$/.test(clean)) return openInViewer(url, 'fusion');
  if (/\.(step|iges|fbx|abc|usd|usda|usdc|usdz|ifc|draco|vdb|obj|ply|vtk|gltf|glb)$/.test(lower)) return openInViewer(url, 'f3d');
  if (lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.ogg') || lower.endsWith('.mov') || lower.endsWith('.m4v')){
    return openInViewer(url, 'video');
  }
  if (/^https?:\/\/(?:www\.)?(youtube\.com|youtu\.be)\//i.test(url)){
    return openInViewer(url, 'youtube');
  }
  if (/^https?:\/\/(?:[\w.-]+\.)?panopto\.eu\//i.test(url) || /panopto.*Viewer\.aspx/i.test(url)){
    return openInViewer(url, 'panopto');
  }
  if (/\.(c|cc|cpp|cxx|h|hh|hpp|cs|java)$/.test(lower)) {
    return openInViewer(url, 'code');
  }
  window.open(url, '_blank');
}

window.openFile = openFile;

async function autoFindQuizRel(courseDir){
  const candidates = ['quiz/quiz.json','filer/quiz/quiz.json'];
  for (const rel of candidates){
    const url = toAbsUrl(rel, courseDir);
    try{
      const r = await fetch(url, {cache:'no-store', method:'GET'});
      if (r.ok) return rel;
    }catch{}
  }
  return null;
}

/**************** 3) Navn + sort (UENDRET) *******************************/
function repairMojibakeLabel(value){
  return String(value || '')
    .replace(/Ã˜/g, 'Ø')
    .replace(/Ã¸/g, 'ø')
    .replace(/Ã…/g, 'Å')
    .replace(/Ã¥/g, 'å')
    .replace(/Ã†/g, 'Æ')
    .replace(/Ã¦/g, 'æ')
    .replace(/â€“|â€”/g, ' - ')
    .replace(/Â/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
function displayName(key){
  const fixed = repairMojibakeLabel(key);
  const m = fixed.match(/^\s*[Øøo]ving(?:er)?\s*0*(\d{1,3})\b/i);
  if (m)  return `Øving ${String(parseInt(m[1],10)).padStart(2,'0')}`;
  const m2 = fixed.match(/^oving(\d{1,3})$/i);
  if (m2) return `Øving ${String(parseInt(m2[1],10)).padStart(2,'0')}`;
  return fixed.replace(/\s*\((?:beskyttet|hemmelig)\)\s*/gi, '').replace(/\.[^/.]+$/, '');
}

function sortSidebarKeys(data){
  const keys = Object.keys(data).filter(k => k !== 'welcome' && k !== 'quiz');
  const ovingNum = (k) => {
    const fixed = repairMojibakeLabel(k);
    if (/^oving\d{2}$/i.test(fixed)) return parseInt(fixed.slice(5), 10);
    const m = fixed.match(/^\s*[Øøo]ving(?:er)?\s*0*(\d{1,3})\b/i);
    return m ? parseInt(m[1], 10) : null;
  };
  const isPy   = k => /^pythonøving/i.test(repairMojibakeLabel(k));
  const isLock = k => !!(data[k]?.beskyttet) || /beskyttet|hemmelig/i.test(repairMojibakeLabel(k));
  const oving = keys.filter(k => ovingNum(k) !== null && !isLock(k)).sort((a,b)=>ovingNum(a)-ovingNum(b));
  const py    = keys.filter(k => !oving.includes(k) && isPy(k) && !isLock(k)).sort((a,b)=>repairMojibakeLabel(a).localeCompare(repairMojibakeLabel(b),'nb'));
  const other = keys.filter(k => !oving.includes(k) && !py.includes(k) && !isLock(k)).sort((a,b)=>repairMojibakeLabel(a).localeCompare(repairMojibakeLabel(b),'nb'));
  const lock  = keys.filter(isLock).sort((a,b)=>repairMojibakeLabel(a).localeCompare(repairMojibakeLabel(b),'nb'));
  return [...oving, ...py, ...other, ...lock];
}



/**************** 4) NYTT: Nested flyout builder **************************/

function groupFilesByFolders(files) {
  const folders = {};
  const rootFiles = [];
  
  files.forEach(file => {
    const s = String(file||'').trim();
    if (s.indexOf('|') >= 0){
      const pipePos = s.indexOf('|');
      const slashPos = s.indexOf('/');
      const parts = s.split('|');
      const urlPart = (parts[1] || parts[0] || '').trim();
      if ((slashPos === -1 || slashPos > pipePos) && (/^https?:\/\//i.test(urlPart) || urlPart.startsWith('//'))){
        rootFiles.push(s);
        return;
      }
    }
    if (/^https?:\/\//i.test(s)) {
      rootFiles.push(s);
      return;
    }

    if (s.includes('/')) {
      const parts = s.split('/');
      const folderName = parts[0];
      if (!folders[folderName]) {
        folders[folderName] = [];
      }
      folders[folderName].push(s);
    } else {
      rootFiles.push(s);
    }
  });
  
  return { folders, rootFiles };
}

function iconForFile(file){
  try{
    let s = String(file||'').trim();
    if (s.indexOf('|') >= 0){ const p = s.split('|'); s = (p[1] || p[0] || '').trim(); }
    const lower = s.toLowerCase();
    
    if (/^https?:\/\/(?:www\.)?(youtube\.com|youtu\.be)\//i.test(s)){
      return '<span class="file-icon youtube" style="background:#FF0000;border-radius:3px">'
        + '<svg viewBox="0 0 24 16" width="18" height="12" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">'
        + '<rect rx="2" x="0" y="0" width="24" height="16" fill="transparent"/>'
        + '<polygon points="9,4 16,8 9,12" style="fill:#ffffff"/>'
        + '</svg>'
        + '</span>';
    }
    
    if (/^https?:\/\/(?:[\w.-]+\.)?panopto\.eu\//i.test(s) || /panopto/i.test(s)){
      return '<span class="file-icon panopto" style="background:#6A1B9A;border-radius:3px">'
        + '<svg viewBox="0 0 24 16" width="18" height="12" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">'
        + '<rect rx="2" x="0" y="0" width="24" height="16" fill="transparent"/>'
        + '<polygon points="9,4 16,8 9,12" style="fill:#ffffff"/>'
        + '</svg>'
        + '</span>';
    }
    
    if (lower.endsWith('.py') || lower.endsWith('.ipynb')){
      return '<span class="file-icon python" style="background:#3572A5;border-radius:3px">'
        + '<svg viewBox="0 0 24 16" width="18" height="12" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">'
        + '<rect rx="2" x="0" y="0" width="24" height="16" fill="transparent"/>'
        + '<path d="M7 11c2-1 3-3 4-4 1-1 2-2 2-2" style="stroke:#ffffff; stroke-width:1.6; fill:none; stroke-linecap:round; stroke-linejoin:round"/>'
        + '</svg>'
        + '</span>';
    }
    
    if (lower.endsWith('.pdf')){
      return '<span class="file-icon pdf" style="background:#D32F2F;border-radius:3px">'
        + '<svg viewBox="0 0 24 16" width="18" height="12" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">'
        + '<rect rx="2" x="0" y="0" width="24" height="16" fill="transparent"/>'
        + '<rect x="4" y="3" width="12" height="10" rx="1" style="fill:#ffffff"/>'
        + '<rect x="6" y="5" width="2" height="6" rx="0.5" style="fill:#D32F2F"/>'
        + '<rect x="9" y="5" width="2" height="6" rx="0.5" style="fill:#D32F2F"/>'
        + '</svg>'
        + '</span>';
    }
    
    if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.gif') || lower.endsWith('.svg')){
      return '<span class="file-icon image" style="background:#4CAF50;border-radius:3px">'
        + '<svg viewBox="0 0 24 16" width="18" height="12" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">'
        + '<rect rx="2" x="0" y="0" width="24" height="16" fill="transparent"/>'
        + '<circle cx="6" cy="5" r="2" style="fill:#ffffff"/>'
        + '<path d="M3 12l5-5 6 6 7-6v6z" style="fill:#ffffff"/>'
        + '</svg>'
        + '</span>';
    }

    if (lower.endsWith('.stl') || lower.endsWith('.fbm') || (/\.(3mf|3fm|fm3)$/.test(lower)) || /\.(step|iges|fbx|abc|usd|usda|usdc|usdz|ifc|draco|vdb|obj|ply|vtk|gltf|glb)$/.test(lower)){
  return '<span class="file-icon model" style="background:#009688;border-radius:3px">'
    + '<svg viewBox="0 0 24 16" width="18" height="12" xmlns="http://www.w3.org/2000/svg">'
    + '<rect rx="2" x="0" y="0" width="24" height="16" fill="transparent"/>'
    + '<path d="M4 12l6-8 6 8z" fill="#fff"/>'
    + '</svg></span>';
}
    
    if (lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.ogg') || lower.endsWith('.mov') || lower.endsWith('.m4v')){
      return '<span class="file-icon video" style="background:#444;border-radius:3px">'
        + '<svg viewBox="0 0 24 16" width="18" height="12" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">'
        + '<rect rx="2" x="0" y="0" width="24" height="16" fill="transparent"/>'
        + '<polygon points="9,4 16,8 9,12" style="fill:#ffffff"/>'
        + '</svg>'
        + '</span>';
    }
  }catch(e){}
  return '';
}

function buildNestedFlyoutHTML(files, makeHrefFunc, isPyGroup) {
  const { folders, rootFiles } = groupFilesByFolders(files);
  let html = '';

  function makeLabel(f){
    try{
      let s = String(f||'').trim();
      let labelPart = null;
      let urlPart = null;
      if (s.indexOf('|') >= 0){
        const parts = s.split('|');
        labelPart = parts[0] || null;
        urlPart = parts[1] || null;
      }
      if (urlPart) s = urlPart;
      
      const anyVid = String(s).match(/[?&]v=([^&]+)/i);
      if (/^https?:\/\//i.test(s) || anyVid){
        const m = anyVid || s.match(/[?&]v=([^&]+)/i);
        if (m) {
          if (labelPart) return labelPart;
          return 'YouTube â€“ ' + decodeURIComponent(m[1]);
        }
        const m2 = s.match(/youtu\.be\/([-_0-9A-Za-z]+)/i);
        if (m2) {
          if (labelPart) return labelPart;
          return 'YouTube â€“ ' + decodeURIComponent(m2[1]);
        }
        try{
          const u = new URL(s);
          const segs = u.pathname.split('/').filter(Boolean);
          if (segs.length) return decodeURIComponent(segs[segs.length-1]);
        }catch(e){}
        return labelPart || s.replace(/^https?:\/\//i,'');
      }

      const base = labelPart || String(f).split(/[\\\/]/).pop().replace(/\.[^/.]+$/, '');
      return base;
    }catch(e){
      return String(f);
    }
  }

  const rootItems = rootFiles.map(f => ({f, label: makeLabel(f)}));
  rootItems.sort((a,b)=> a.label.localeCompare(b.label, undefined, {numeric: true, sensitivity: 'base'}));
  rootItems.forEach(item => {
    const f = item.f;
    const href = makeHrefFunc(f);
    const label = (isPyGroup ? 'ðŸ ' : '') + (item.label.length>40 ? item.label.slice(0,38)+'â€¦' : item.label);
    const icon = iconForFile(f);
    html += `<a href="${href}" data-file="${f}">${icon}<span class="file-label">${label}</span></a>`;
  });
  
  Object.keys(folders).sort((a,b)=> a.localeCompare(b, undefined, {numeric: true, sensitivity: 'base'})).forEach(folderName => {
    let folderFiles = folders[folderName] || [];
    folderFiles = folderFiles.slice().sort((x,y)=>{
      const lx = makeLabel(x.substring(folderName.length+1));
      const ly = makeLabel(y.substring(folderName.length+1));
      return lx.localeCompare(ly, undefined, {numeric: true, sensitivity: 'base'});
    });
    
    html += `<div class="nested-folder-item" data-folder="${folderName}">`;
    html += `<span class="file-icon folder" style="background:#6B6B6B;border-radius:3px" aria-hidden="true">`;
    html += '<svg viewBox="0 0 24 16" width="18" height="12" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">';
    html += '<rect rx="2" x="0" y="0" width="24" height="16" fill="transparent"/>';
    html += '<path d="M3 6h6l2 2h8v6H3z" style="fill:#fff"/>';
    html += '</svg></span>';
    html += `<span class="file-label">${folderName}</span>`;
    html += `<div class="nested-flyout">`;
    
    const subFiles = folderFiles.map(f => f.substring(folderName.length + 1));
    const playlistItems = subFiles.map(subFile => {
      const fullFile = `${folderName}/${subFile}`;
      const href = makeHrefFunc(fullFile);
      if (!isEmbeddableVideoUrl(href)) return null;
      return {
        title: makeLabel(subFile),
        description: makeLabel(subFile),
        url: href
      };
    }).filter(Boolean);

    if (playlistItems.length){
      const payload = encodeURIComponent(JSON.stringify({
        title: folderName,
        items: playlistItems
      }));
      html += `<a href="#" class="video-collection-link" data-playlist="${payload}" title="Ã…pne alle videoer i innebygd modus">`;
      html += `<span class="file-icon video" style="background:#D32F2F;border-radius:3px" aria-hidden="true">`;
      html += '<svg viewBox="0 0 24 16" width="18" height="12" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">';
      html += '<rect rx="2" x="0" y="0" width="24" height="16" fill="transparent"/>';
      html += '<path d="M8 4l10 4-10 4z" style="fill:#fff"/>';
      html += '</svg></span>';
      html += '<span class="file-label">Se alle videoer (embedded)</span>';
      html += '</a>';
    }

    html += buildNestedFlyoutHTML(subFiles, (subFile) => makeHrefFunc(`${folderName}/${subFile}`), isPyGroup);
    
    html += `</div></div>`;
  });
  
  return html;
}

/**************** 5) Sidebar + velkomst + quiz ***************************/
async function initSidebar(){
  const data = await fetch('filer/index.json',{cache:'no-store'}).then(r=>r.json()).catch(()=>null);
  if(!data) return;

  try{
    Object.keys(data).forEach(k=>{
      const v = data[k];
      if (Array.isArray(v)){
        data[k] = v.map(x=>String(x).replace(/\\+/g,'/'));
      } else if (v && typeof v === 'object'){
        if (v.files && Array.isArray(v.files)){
          v.files = v.files.map(x=>String(x).replace(/\\+/g,'/'));
        } else if (v.files && !Array.isArray(v.files)){
          v.files = [String(v.files)];
        }
      }
    });
  }catch(e){}

  const sb = document.getElementById('sidebar');
  const courseDir = getCourseDir();

  if (data.welcome) {
    const content = document.querySelector('.content');
    let img = document.getElementById('welcome-img');
    if(!img){
      img=document.createElement('img'); 
      img.id='welcome-img'; 
      img.alt='Velkomst';
      Object.assign(img.style,{maxWidth:'420px',display:'block',margin:'2rem auto'});
    }
    const src = /^(https?:|\.\/|\/)/.test(data.welcome) ? data.welcome : 'filer/'+data.welcome;
    img.src = src || '/img/welcome-generic.svg';
    const desc=document.querySelector('.course-description');
    desc ? desc.after(img) : content.append(img);
  }

  if (!data.quiz){
    const found = await autoFindQuizRel(courseDir);
    if (found) data.quiz = found;
  }

  const keys = sortSidebarKeys(data);

  function makeHref(key, obj, file){
    const isFileKey = /\.[a-z0-9]{1,8}$/i.test(key);
    let rel = String(file || '');
    if (rel.indexOf('|') >= 0){
      const parts = rel.split('|');
      rel = parts[1] || parts[0] || '';
    }
    rel = String(rel).trim();
    if (!/^https?:\/\//i.test(rel)){
      if (/^(?:www\.|youtube\.com|youtu\.be|panopto\.|watch\?|watch=)/i.test(rel) || /[?&]v=[-_0-9A-Za-z]+/i.test(rel)){
        rel = 'https://' + rel.replace(/^\//,'');
      }
      if (rel.startsWith('//')) rel = 'https:' + rel;
    }
    const httpIdx = String(rel).search(/https?:\/\//i);
    if (httpIdx >= 0) return rel.substring(httpIdx);
    if (rel.startsWith('/')) return rel;
    const dir = (obj && typeof obj==='object' && obj.dir) ? String(obj.dir) : null;
    
    if (!isFileKey && dir) {
      if (!rel.startsWith(dir + '/') && !rel.startsWith('filer/')) {
        rel = `${dir}/${rel}`;
      }
    }
    
    const underFiler = rel.startsWith('filer/') ? rel : `filer/${rel}`;
    const encoded = encodePathSegments(underFiler.replace(/\\/g,'/'));
    return new URL(encoded, location.origin + courseDir).href;
  }

  const hasCourseCode = !!getCourseCode();
  const isLockedSection = (key, obj) => {
    return !!(obj?.beskyttet) || /beskyttet|hemmelig/i.test(repairMojibakeLabel(key));
  };
  const karakterwebBtnHtml = `
    <div class="dropdown-oving">
      <div class="dropdown-btn" id="karakterweb-btn">
        <img src="https://www.karakterweb.no/favicon.ico" alt="" aria-hidden="true"
             style="width:16px;height:16px;vertical-align:-3px;margin-right:8px;border-radius:3px;">
        Karakterweb
      </div>
    </div>
  `;

  let html = '<h3>Øvinger</h3>';
  let karakterwebInserted = false;
  for (const key of keys){
    const obj = data[key];
    const locked = !!(obj && obj.beskyttet);
    const lock = locked ? '&#128274; ' : '';
    let files = [];
    if (Array.isArray(obj)) files = obj;
    else if (obj?.files) files = obj.files;

    if (hasCourseCode && !karakterwebInserted && isLockedSection(key, obj)){
      html += karakterwebBtnHtml;
      karakterwebInserted = true;
    }

    if (locked && !isOk()){
      html += `<div class="dropdown-oving"><div class="dropdown-btn beskyttet">${lock}${displayName(key)}</div></div>`;
      continue;
    }

    if (files && files.length){
      const isPyGroup = /^pythonøving/i.test(String(key));
      const contentHTML = buildNestedFlyoutHTML(files, (f) => makeHref(key, obj, f), isPyGroup);
      
      html += `<div class="dropdown-oving">
        <div class="dropdown-btn${locked?' beskyttet':''}">${lock}${displayName(key)}</div>
        <div class="dropdown-content">${contentHTML}</div>
      </div>`;
      continue;
    }
    html += `<div class="dropdown-oving"><div class="dropdown-btn${locked?' beskyttet':''}">${lock}${displayName(key)}</div></div>`;
  }

  if (hasCourseCode && !karakterwebInserted){
    html += karakterwebBtnHtml;
  }

  if (data.quiz){ 
    html += `<div class="dropdown-oving"><div class="dropdown-btn" id="quiz-btn">ðŸ§© Quiz</div></div>`; 
  }
  sb.innerHTML = html;
  refreshWatchedStatus();

  /* ========== DESKTOP FLYOUT SETUP ========== */
  let lockedMenu = null;
  let _nestedZCounter = 2000;
  
  function setupNestedFlyout(folderItem, parentMenu) {
    const nestedFlyout = folderItem.querySelector('.nested-flyout');
    if (!nestedFlyout) return;

    let nestedHoverTimer = null;
    let nestedLockedFlyout = null;

    if (nestedFlyout.parentElement !== document.body) {
      document.body.appendChild(nestedFlyout);
      nestedFlyout.dataset.movedToBody = '1';
      nestedFlyout.style.zIndex = 2000;
    }

    const showNested = () => {
      parentMenu.querySelectorAll('.nested-flyout').forEach(nf => {
        if (nf !== nestedFlyout) nf.style.display = 'none';
      });

      const parentRect = parentMenu.getBoundingClientRect();
      const itemRect = folderItem.getBoundingClientRect();
      
      nestedFlyout.style.display = 'block';
      nestedFlyout.style.opacity = '0';
      void nestedFlyout.offsetHeight;
      
      const menuHeight = nestedFlyout.scrollHeight;
      const viewportHeight = window.innerHeight;
      
      let left = parentRect.right;
      let top = itemRect.top;
      
      if (top + menuHeight > viewportHeight - 10) {
        top = Math.max(10, viewportHeight - menuHeight - 10);
      }
      
      const menuWidth = 260;
      if (left + menuWidth > window.innerWidth - 10) {
        left = parentRect.left - menuWidth;
      }
      
      try{ nestedFlyout.style.zIndex = String(++_nestedZCounter); }catch{}
      nestedFlyout.style.left = left + 'px';
      nestedFlyout.style.top = top + 'px';
      nestedFlyout.style.opacity = '1';
    };

    const hideNested = () => {
      if (nestedLockedFlyout === nestedFlyout) return;
      nestedFlyout.style.opacity = '0';
      setTimeout(() => {
        if (nestedLockedFlyout !== nestedFlyout && nestedFlyout.style.opacity === '0') {
          nestedFlyout.style.display = 'none';
        }
      }, 100);
    };

    folderItem.addEventListener('mouseenter', () => {
      if (nestedHoverTimer) clearTimeout(nestedHoverTimer);
      nestedHoverTimer = setTimeout(showNested, 200);
    });

    folderItem.addEventListener('mouseleave', (e) => {
      if (nestedHoverTimer) clearTimeout(nestedHoverTimer);
      const related = e.relatedTarget;
      if (related && (nestedFlyout.contains(related) || related === nestedFlyout)) {
        return;
      }
      setTimeout(hideNested, 200);
    });

    nestedFlyout.addEventListener('mouseenter', () => {
      if (nestedHoverTimer) clearTimeout(nestedHoverTimer);
    });

    nestedFlyout.addEventListener('mouseleave', (e) => {
      const related = e.relatedTarget;
      if (related && (folderItem.contains(related) || related === folderItem)) {
        return;
      }
      setTimeout(hideNested, 200);
    });

    folderItem.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (nestedHoverTimer) clearTimeout(nestedHoverTimer);
      
      if (nestedLockedFlyout === nestedFlyout) {
        nestedLockedFlyout = null;
        hideNested();
      } else {
        showNested();
        nestedLockedFlyout = nestedFlyout;
      }
    });

    nestedFlyout.querySelectorAll('.nested-folder-item').forEach(nfi => {
      setupNestedFlyout(nfi, nestedFlyout);
    });
  }
  
  sb.querySelectorAll('.dropdown-oving').forEach(div=>{
    const menu=div.querySelector('.dropdown-content'); 
    if(!menu) return;
    
    let hoverTimer = null;
    let isCalculating = false;
    
    const calculatePosition = () => {
      if (isCalculating) return;
      isCalculating = true;
      
      const r = div.getBoundingClientRect();
      const navHeight = 48;
      
      menu.style.visibility = 'hidden';
      menu.style.display = 'block';
      menu.style.opacity = '0';
      
      const menuHeight = menu.getBoundingClientRect().height;
      const viewportHeight = window.innerHeight;
      
      let top = Math.max(r.top, navHeight);
      
      if (top + menuHeight > viewportHeight - 10) {
        top = Math.max(navHeight, viewportHeight - menuHeight - 10);
      }
      
      menu.style.top = top + 'px';
      menu.style.visibility = 'visible';
      
      isCalculating = false;
      return true;
    };
    
    const show = () => {
      if (lockedMenu && lockedMenu !== menu) return;
      clearTimeout(hoverTimer);
      
      calculatePosition();
      
      hoverTimer = setTimeout(() => {
        if (lockedMenu && lockedMenu !== menu) return;
        requestAnimationFrame(() => {
          menu.style.opacity = '1';
        });
      }, 150);
    };
    
    const hide = () => {
      if (lockedMenu === menu) return;
      clearTimeout(hoverTimer);
      
      const hasOpenNested = Array.from(menu.querySelectorAll('.nested-flyout')).some(nf => 
        nf.style.display === 'block' && nf.style.opacity === '1'
      );
      
      if (hasOpenNested) return;
      
      menu.style.opacity = '0';
      setTimeout(() => {
        if (lockedMenu !== menu && menu.style.opacity === '0') {
          menu.style.display = 'none';
        }
      }, 100);
    };
    
    div.querySelector('.dropdown-btn')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('beskyttet')) return;
      
      e.stopPropagation();
      clearTimeout(hoverTimer);
      
      if (lockedMenu === menu) {
        lockedMenu = null;
        menu.style.opacity = '0';
        setTimeout(() => {
          if (lockedMenu !== menu) menu.style.display = 'none';
        }, 100);
      } else {
        if (lockedMenu) {
          lockedMenu.style.opacity = '0';
          const prevMenu = lockedMenu;
          setTimeout(() => {
            if (lockedMenu !== prevMenu) prevMenu.style.display = 'none';
          }, 100);
        }
        lockedMenu = menu;
        calculatePosition();
        requestAnimationFrame(() => {
          menu.style.opacity = '1';
        });
      }
    });
    
    div.addEventListener('mouseenter', show);
    div.addEventListener('mouseleave', hide);
    menu.addEventListener('mouseenter', () => clearTimeout(hoverTimer));
    menu.addEventListener('mouseleave', hide);
    
    menu.querySelectorAll('.nested-folder-item').forEach(folderItem => {
      setupNestedFlyout(folderItem, menu);
    });
  });
  
  document.addEventListener('click', (e) => {
    if (!lockedMenu) return;
    
    const clickedLink = e.target.closest('.dropdown-content a, .nested-flyout a');
    const clickedInLockedMenu = clickedLink && lockedMenu.contains(clickedLink);
    const clickedNestedFolder = e.target.closest('.nested-folder-item');
    const lockedDiv = lockedMenu.closest('.dropdown-oving');
    
    const shouldUnlock = (!lockedDiv || !lockedDiv.contains(e.target)) && !clickedNestedFolder;
    
    if (shouldUnlock || clickedInLockedMenu) {
      const menuToHide = lockedMenu;
      lockedMenu = null;
      menuToHide.style.opacity = '0';
      setTimeout(() => {
        if (lockedMenu !== menuToHide) {
          menuToHide.style.display = 'none';
          document.querySelectorAll('.nested-flyout').forEach(nf => {
            nf.style.display = 'none';
          });
        }
      }, 100);
    }
  });

  /* Mobil-toggle */
  if (window.matchMedia('(max-width: 768px)').matches){
    sb.querySelectorAll('.dropdown-oving').forEach(div=>{
      const btn=div.querySelector('.dropdown-btn'); 
      const menu=div.querySelector('.dropdown-content');
      if(!btn||!menu) return;
      btn.addEventListener('click',e=>{
        e.preventDefault();
        sb.querySelectorAll('.dropdown-content').forEach(m=>m.style.display='none');
        menu.style.display = menu.style.display==='block' ? 'none' : 'block';
      });
      document.addEventListener('click',e=>{ 
        if(!div.contains(e.target)) menu.style.display='none'; 
      });
    });
  }

  /* Passord-beskyttede seksjoner */
  sb.querySelectorAll('.dropdown-btn.beskyttet').forEach(btn=>{
    btn.addEventListener('click', e=>{
      if (!isOk()){
        e.preventDefault();
        if (askPass()) location.reload();
      }
    });
  });

  /* Klikk-Ã¥pne filer */
  async function handleFlyoutAnchorClick(e, a){
    e.preventDefault();
    const q = document.getElementById('quiz-container'); 
    if (q) q.style.display = 'none';
    if (a.classList.contains('video-collection-link')){
      try{
        const raw = a.getAttribute('data-playlist') || '';
        const payload = JSON.parse(decodeURIComponent(raw));
        if (payload && Array.isArray(payload.items) && payload.items.length){
          openVideoPlaylistInViewer(payload);
        }
      }catch(e){}
      return;
    }
    const href = a.getAttribute('href'); 
    if(!href) return;
    if (await tryOpenVideoListFile(href)){
      sb.querySelectorAll('.dropdown-oving').forEach(d=>d.classList.remove('active'));
      a.closest('.dropdown-oving')?.classList.add('active');
      return;
    }
    const lower = href.toLowerCase();
    
    if (
      lower.endsWith('.pdf') || lower.endsWith('.py') || lower.endsWith('.ipynb') || lower.endsWith('.html') ||
      lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.ogg') || lower.endsWith('.stl') ||
      lower.endsWith('.mov') || lower.endsWith('.m4v') ||lower.split('?')[0].split('#')[0].endsWith('.fbm') ||
      /\.(3mf|3fm|fm3)$/.test(lower.split('?')[0].split('#')[0]) ||
      /\.(step|iges|fbx|abc|usd|usda|usdc|usdz|ifc|draco|vdb|obj|ply|vtk|gltf|glb)$/.test(lower) ||
      /^https?:\/\/(?:www\.)?(youtube\.com|youtu\.be)\//i.test(href) ||
      /^https?:\/\/(?:[\w.-]+\.)?panopto\.eu\//i.test(href) ||
      /\.(c|cc|cpp|cxx|h|hh|hpp|cs|java)$/.test(lower)
    ){
      openFile(href);
    } else {
      window.open(href, '_blank');
    }

    sb.querySelectorAll('.dropdown-oving').forEach(d=>d.classList.remove('active'));
    a.closest('.dropdown-oving')?.classList.add('active');
  }

  sb.querySelectorAll('.dropdown-content a').forEach(a=>{
    a.addEventListener('click', e=> handleFlyoutAnchorClick(e, a));
  });

  document.addEventListener('click', (e) => {
    const a = e.target.closest('.nested-flyout a');
    if (a) handleFlyoutAnchorClick(e, a);
  });

  /* Hjem pÃ¥ tittel */
  document.querySelector('.content h1')?.addEventListener('click', ()=>{
    location.reload();
  });

  /* -------------------------------- Quiz ------------------------------ */

  function fixRelativeImages(qdata, quizUrl){
    try{
      const base = quizUrl.slice(0, quizUrl.lastIndexOf('/')+1);
      (qdata?.questions||[]).forEach(q=>{
        if (!q || !q.image) return;

        const raw = String(q.image).trim();

        if (/^https?:\/\//i.test(raw) || raw.startsWith('/')) { 
          q.image = raw; 
          q._imgTry = [raw]; 
          return; 
        }

        let p = raw.replace(/^\.\/+/,'');
        p = p.replace(/^quiz\//i,'');

        const primary = new URL(p.includes('/') ? p : `bilder/${p}`, base).href;
        const alt1 = new URL(`quiz/${p.replace(/^quiz\//i,'')}`, base).href;
        const alt2 = new URL(p.replace(/^bilder\//i,''), base).href;
        const alt3 = new URL((p.includes('/') ? p : p), base).href;

        const uniq = Array.from(new Set([primary, alt1, alt2, alt3]));
        q.image  = uniq[0];
        q._imgTry = uniq;
      });
    }catch{}
    return qdata;
  }

  async function loadJsonRobust(url){
    const r = await fetch(url,{cache:'no-store'});
    const text = await r.text();
    if(!r.ok){
      const snip = text.slice(0,200).replace(/\s+/g,' ');
      throw new Error(`[${r.status} ${r.statusText}] ${snip}`);
    }
    const clean = text.replace(/^\uFEFF/,'');
    try{
      return JSON.parse(clean);
    }catch(e){
      const snip = clean.slice(0,200).replace(/\s+/g,' ');
      throw new Error(`JSON parse error: ${e.message}. Utdrag: ${snip}`);
    }
  }

  const quizBtn = document.getElementById('quiz-btn');
  if (quizBtn){
    quizBtn.addEventListener('click', async ()=>{
      try{ 
        document.getElementById('pdf-viewer-container')?.style.setProperty('display','none'); 
      }catch{}
      const content = document.querySelector('.content');
      let box = document.getElementById('quiz-container');
      if(!box){ 
        box=document.createElement('div'); 
        box.id='quiz-container'; 
        content.prepend(box); 
      }
      box.style.display = 'block';

      await new Promise(res=>{
        if(window.FolkQuiz) return res();
        const s=document.createElement('script');
        s.src='/includes/quiz-lite.js?v=7';
        s.onload=res;
        document.head.appendChild(s);
      });

      const persistKey='folkQuiz:'+getCourseDir();

      const tried = [];
      const rels = Array.from(new Set([data.quiz, 'quiz/quiz.json','filer/quiz/quiz.json'].filter(Boolean)));
      for (const rel of rels){
        const url = toAbsUrl(rel, courseDir);
        tried.push(url);
        try{
          const qdata = fixRelativeImages(await loadJsonRobust(url), url);
          if(!window.FolkQuiz || typeof window.FolkQuiz.render!=='function'){
            alert('Kunne ikke laste quizen: quiz-lite.js lastet, men window.FolkQuiz mangler.');
            return;
          }

          window.FolkQuiz.render(box, qdata, persistKey);
          toggleWelcome(false);
          return;
        }catch(err){
          tried[tried.length-1] += `  [${err.message}]`;
        }
      }

      alert('Quiz-modulen er ikke tilgjengelig.\nForsÃ¸kte:\n- ' + tried.join('\n- '));
    });
  }

  let pendingKarakterwebUrl = null;
  const karakterwebBtn = document.getElementById('karakterweb-btn');
  if (karakterwebBtn){
    karakterwebBtn.addEventListener('click', ()=>{
      const courseCode = getCourseCode();
      if (!courseCode){
        alert('Mangler fagkode. Legg til f.eks. <meta name="course-code" content="TMA4100"> i siden.');
        return;
      }
      const karakterwebUrl = getKarakterwebUrl(courseCode);
      if (!karakterwebUrl){
        alert('Kunne ikke bygge Karakterweb-lenke for faget.');
        return;
      }
      pendingKarakterwebUrl = karakterwebUrl;
      openInViewer(karakterwebUrl, 'html');
      sb.querySelectorAll('.dropdown-oving').forEach(d=>d.classList.remove('active'));
      karakterwebBtn.closest('.dropdown-oving')?.classList.add('active');
    });
  }

  window.addEventListener('message', (ev) => {
    const data = ev?.data;
    if (!data || data.type !== 'htmlview-status') return;
    if (!pendingKarakterwebUrl) return;
    if (data.file !== pendingKarakterwebUrl) return;
    if (data.status === 'blocked' || data.status === 'timeout'){
      window.open(pendingKarakterwebUrl, '_blank', 'noopener');
      pendingKarakterwebUrl = null;
    } else if (data.status === 'loaded'){
      pendingKarakterwebUrl = null;
    }
  });

  /* Modul-initialisering */
  if (window.SidebarSearch && typeof window.SidebarSearch.init === 'function') {
    try {
      window.SidebarSearch.init(sb);
      console.log('âœ“ Sidebar Search Module initialized');
    } catch (err) {
      console.error('[sidebar-loader] Kunne ikke initialisere sÃ¸kemodul:', err);
    }
  }
  
  if (window.SidebarNotifications && typeof window.SidebarNotifications.init === 'function') {
    try {
      window.SidebarNotifications.init(courseDir);
      console.log('âœ“ Sidebar Notifications Module initialized');
    } catch (err) {
      console.error('[sidebar-loader] Kunne ikke initialisere notifikasjonsmodul:', err);
    }
  }
}

document.readyState==='loading'
  ? document.addEventListener('DOMContentLoaded', initSidebar)
  : initSidebar();

/**************** 6) Versjons-badge **************************************/
(function(){
  const id='version-badge',txt='v11.15.2';
  let b=document.getElementById(id);
  if(!b){
    b=document.createElement('div');
    b.id=id;
    Object.assign(b.style,{
      position:'fixed',
      right:'8px',
      bottom:'8px',
      background:'#444',
      color:'#fff',
      padding:'3px 6px',
      fontSize:'12px',
      borderRadius:'4px',
      opacity:'0.6',
      zIndex:'1000'
    });
    document.body.appendChild(b);
  } 
  b.textContent=txt;
})();
/* -------------------------------------------------------------------- */
