/* run-lite.js v32.0 – NO DUPLICATE PDF PLOTS
   Features:
   1. Print statements appear on separate lines (custom DirectStdout)
   2. Support for importing .py files from same directory  
   3. Imported modules can load data files (input.txt, etc.) via pathlib
   4. Better error messages and debugging when files fail to load
   5. PDF files saved with fig.savefig() are shown inline as images (no duplicates!)
*/
(() => {
  const $ = (sel, el = document) => el.querySelector(sel);

  // ---------- Theme ----------
  function ensureTheme(){
    if (document.getElementById("runlite-theme")) return;
    const css = `
:root{
  --bg:#1e1e1e;--fg:#d4d4d4;--muted:#9ca3af;--btn:#2a2a2a;--btnB:#3a3a3a;
  --kw:#c586c0;--str:#ce9178;--com:#6a9955;--num:#4fc1ff;--fn:#dcdcaa
}
.runlite .code{white-space:pre}
.runlite.lineno .code{counter-reset:line;white-space:pre}
.runlite.lineno .code>div{display:block}
.runlite.lineno .code>div::before{counter-increment:line;content:counter(line);
  display:inline-block;width:3ch;opacity:.5;margin-right:.75ch}
.runlite.softwrap .code{white-space:pre-wrap}
.runlite [data-k=kw]{color:var(--kw) !important}
.runlite [data-k=str]{color:var(--str) !important}
.runlite [data-k=com]{color:var(--com) !important}
.runlite [data-k=num]{color:var(--num) !important}
.runlite [data-k=fn]{color:var(--fn) !important}
.runlite .cell{border:1px solid #2a2a2a;border-radius:.75rem;margin:1rem 0;background:#111}
.runlite .head{display:flex;gap:.5rem;align-items:center;padding:.5rem .75rem;border-bottom:1px solid #2a2a2a;background:#171717}
.runlite .code{padding:.75rem 1rem;font-family:Consolas,ui-monospace,monospace;color:var(--fg)}
.runlite .out{border-top:1px dashed #2a2a2a;padding:.5rem .75rem;white-space:pre-wrap;min-height:1.2em;color:var(--fg)}
.runlite .imgbox{padding:8px 0}
.runlite .btn{background:#2a2a2a;border:1px solid #3a3a3a;color:var(--fg);padding:.35rem .6rem;border-radius:.5rem;cursor:pointer;transition:opacity 0.2s,background 0.2s}
.runlite .btn:disabled{opacity:.5;cursor:not-allowed;background:#1a1a1a;color:#666}
.runlite .active{box-shadow:0 0 0 2px rgba(100,180,255,.15) inset}
.runlite .md{background:#0f0f0f;border:1px solid #2a2a2a;border-radius:.75rem;margin:1rem 0}
.runlite .md .mdbody{padding:1rem 1.25rem;line-height:1.7;color:#e0e0e0}
.runlite .md h1,.runlite .md h2,.runlite .md h3{margin-top:1.2em;margin-bottom:.5em;font-weight:600;color:#fff}
.runlite .md h1{font-size:1.8em;border-bottom:2px solid #3a3a3a;padding-bottom:.3em}
.runlite .md h2{font-size:1.5em;border-bottom:1px solid #2a2a2a;padding-bottom:.2em}
.runlite .md h3{font-size:1.3em}
.runlite .md p{margin:.8em 0}
.runlite .md code{background:#1a1a1a;padding:.15em .4em;border-radius:.3em;font-size:.9em;color:#ff9d76}
.runlite .md pre{background:#0a0a0a;border:1px solid #2a2a2a;border-radius:.5em;padding:1em;overflow-x:auto;margin:1em 0}
.runlite .md pre code{background:transparent;padding:0;color:#d4d4d4}
.runlite .md strong{color:#fff;font-weight:600}
.runlite .md em{color:#b4d4ff;font-style:italic}
.runlite .md img{max-width:100%;border-radius:.5em;margin:1em 0}
.runlite .md .mjx-chtml{color:#fff !important;font-size:1.1em !important}
.runlite .plot-loading{color:#9ca3af;font-style:italic;padding:.5rem 0}
.runlite .spinner{display:inline-block;width:14px;height:14px;border:2px solid #444;border-top-color:#4fc1ff;border-radius:50%;animation:spin 0.8s linear infinite;margin-right:0.5rem;vertical-align:middle}
@keyframes spin{to{transform:rotate(360deg)}}
`;
    const style = document.createElement("style");
    style.id = "runlite-theme";
    style.textContent = css;
    document.head.appendChild(style);
  }
  ensureTheme();
  
  // ---------- Load MathJax if not present ----------
  function ensureMathJax(){
    if (window.MathJax) return;
    
    window.MathJax = {
      tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']],
        processEscapes: true,
        processEnvironments: true
      },
      svg: {
        fontCache: 'global'
      },
      options: {
        skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code']
      }
    };
    
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js';
    script.async = true;
    document.head.appendChild(script);
  }
  ensureMathJax();

  // ---------- URL / mode ----------
  const urlObj = new URL(location.href);
  const src = urlObj.searchParams.get("file") || "";
  const guessMode = src.toLowerCase().endsWith(".py") ? "py" : "ipynb";
  const mode = (window.__RUNLITE_MODE__ || guessMode);
  console.log("[run-lite] mode =", mode, "file =", src);

  function dirnameOf(urlPath) {
    try {
      const u = new URL(urlPath, location.origin);
      const parts = u.pathname.split("/FolkNettside/").filter(Boolean);
      parts.pop();
      return parts.length > 0 
        ? new url("/FolkNettside/FolkNettside/" + parts.join("/FolkNettside/") + "/FolkNettside/", location.origin).href.replace(/\/$/, "")
        : location.origin;
    } catch (e) {
      console.warn("[dirnameOf] fallback:", e);
      const s = String(urlPath || "");
      const i = s.lastIndexOf("/FolkNettside/");
      return i >= 0 ? s.slice(0, i) : "";
    }
  }
  const base = src ? dirnameOf(src) : "";

  // ---------- highlight ----------
const highlightPython = window.__CUSTOM_HIGHLIGHT__ || function(txt) {
  const esc = (s) => String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  let html = esc(txt ?? "");
  
  // Use unique string markers instead of null bytes (more reliable in HTML context)
  const MARKER_START = "___HLPROTECT_";
  const MARKER_END = "___";
  let protected = [];
  
  function protect(match) {
    const id = protected.length;
    protected.push(match);
    return MARKER_START + id + MARKER_END;
  }
  
  function restore(html) {
    // Replace all markers with their protected content
    let result = html;
    for (let i = 0; i < protected.length; i++) {
      const marker = MARKER_START + i + MARKER_END;
      result = result.split(marker).join(protected[i]);
    }
    return result;
  }
  
  // 1. Triple-quoted strings (docstrings) - highest priority
  html = html.replace(/"""[\s\S]*?"""|'''[\s\S]*?'''/FolkNettside/g, 
    m => protect('<span data-k="str">' + m + '</span>'));
  
  // 2. Prefixed strings: f"...", r"...", b"...", u"..." (including combinations like fr"...")
  html = html.replace(/\b([fFrRbBuU]{1,2})(["'])(?:\\[\s\S]|(?!\2)[^\\\r\n])*?\2/g,
    m => protect('<span data-k="str">' + m + '</span>'));
  
  // 3. Regular strings
  html = html.replace(/(["'])(?:\\[\s\S]|(?!\1)[^\\\r\n])*?\1/g,
    m => protect('<span data-k="str">' + m + '</span>'));
  
  // 4. Comments (MUST come after strings to avoid matching # inside strings)
  html = html.replace(/(#[^\n]*)/g,
    m => protect('<span data-k="com">' + m + '</span>'));
  
  // 5. Numbers (int, float, scientific notation, hex)
  html = html.replace(/\b(0[xX][0-9a-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/g,
    m => protect('<span data-k="num">' + m + '</span>'));
  
  // 6. Keywords
  const keywords = /\b(False|None|True|and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield)\b/g;
  html = html.replace(keywords,
    m => protect('<span data-k="kw">' + m + '</span>'));
  
  // 7. Built-in functions
  const builtins = /\b(abs|all|any|ascii|bin|bool|bytearray|bytes|callable|chr|classmethod|compile|complex|dict|dir|divmod|enumerate|eval|exec|filter|float|format|frozenset|getattr|hasattr|hash|help|hex|id|input|int|isinstance|issubclass|iter|len|list|locals|map|max|memoryview|min|next|object|oct|open|ord|pow|print|property|range|repr|reversed|round|set|setattr|slice|sorted|staticmethod|str|sum|super|tuple|type|vars|zip)\b/g;
  html = html.replace(builtins,
    m => protect('<span data-k="fn">' + m + '</span>'));
  
  // Restore all protected spans
  html = restore(html);
  
  // Wrap each line in a div for line numbering
  return html.split("\n").map(l => '<div>' + (l || '&nbsp;') + '</div>').join("");
};


  // ---------- tiny markdown ----------
  function renderMarkdown(md){
    let s = String(md || "");
    const esc = (t)=>String(t).replace(/[&<>]/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;' }[m]));
    s = s.replace(/^###### (.*)$/gm,'<h6>$1</h6>')
         .replace(/^##### (.*)$/gm,'<h5>$1</h5>')
         .replace(/^#### (.*)$/gm,'<h4>$1</h4>')
         .replace(/^### (.*)$/gm,'<h3>$1</h3>')
         .replace(/^## (.*)$/gm,'<h2>$1</h2>')
         .replace(/^# (.*)$/gm,'<h1>$1</h1>');
    s = s.replace(/```([\s\S]*?)```/FolkNettside/g, (m,code)=> `<pre><code>${esc(code)}</code></pre>`);
    s = s.replace(/`([^`]+)`/FolkNettside/g,'<code>$1</code>');
    s = s.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\*(.+?)\*/g,'<em>$1</em>');
    s = s.replace(/!\{([^}]+)\}/g, (m,src)=> `<img alt="" src="${esc(src.trim())}">`);
    s = s.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (m,alt,url)=> `<img alt="${esc(alt)}" src="${esc(url.trim())}" />`);
    s = s.replace(/\n{2,}/g, '</p><p>');
    return `<p>${s}</p>`;
  }

  // ---------- Python prelude (CACHED) ----------
  let CACHED_PRELUDE = null;
  function buildPrelude() {
    if (CACHED_PRELUDE) return CACHED_PRELUDE;
    
    CACHED_PRELUDE = String.raw`
import io, sys, builtins, types, re, os, importlib, importlib.util, importlib.abc, warnings

# Disable Matplotlib GUI warnings ("cannot show figure")
warnings.filterwarnings(
    "ignore",
    message="Matplotlib is currently using agg, which is a non-GUI backend, so cannot show the figure"
)

# Status announcer - bruker self.postMessage i worker
def _announce(msg):
    try:
        self.postMessage({"type": "status", "payload": str(msg)})
    except Exception:
        pass

def _stderr(s):
    try:
        self.postMessage({"type": "stderr", "payload": str(s)})
    except Exception:
        pass

try:
    from pyodide.http import open_url as _open_url
except Exception:
    _open_url = None

def input(prompt=""):
    try:
        import js
        ans = js.window.prompt(str(prompt) or "input:")
        return "" if ans is None else str(ans)
    except Exception:
        return ""

try:
    NB_BASE
except NameError:
    NB_BASE = globals().get("__NB_BASE__", "")

globals().setdefault("__NBSTATE", types.SimpleNamespace(base_url=NB_BASE))
globals().setdefault("NBSTATE", globals()["__NBSTATE"])

def _norm_name(p):
    """Normaliserer filnavn fra absolutte paths til bare filnavn"""
    s = str(p).strip()
    # Erstatt backslash med forward slash
    s = s.replace("\\", "/FolkNettside/")
    # Fjern Windows-driver
    s = re.sub(r"^[A-Za-z]:/", "", s)
    # Ta filnavnet
    if "/FolkNettside/" in s:
        s = s.split("/FolkNettside/")[-1]
    return s

def _url_for_local(p):
    name = _norm_name(p)
    _stderr(f"[_url_for_local] Original: {p}\n")
    _stderr(f"[_url_for_local] Normalized: {name}\n")
    base = str(NB_BASE or "")
    if not base: 
        _stderr(f"[_url_for_local] WARNING: No NB_BASE set, using just filename\n")
        return name
    
    # Hvis p er en Path-objekt eller absolutt path, bruk bare filnavnet
    p_str = str(p)
    if "/FolkNettside/" in p_str or "\\" in p_str:
        # Absolutt eller relativt path - bruk bare filnavnet
        result = base + "/FolkNettside/" + name
    else:
        # Bare et filnavn
        result = base + "/FolkNettside/" + p_str
    
    _stderr(f"[_url_for_local] Final URL: {result}\n")
    return result

__orig_open = builtins.open
def open(file, mode="r", *a, **kw):
    if "r" in mode and ("w" not in mode and "a" not in mode and "+" not in mode):
        try:
            return __orig_open(file, mode, *a, **kw)
        except Exception as e:
            _stderr(f"[open] Local file failed: {file}, trying web... ({e})\n")
            try:
                if _open_url is None: 
                    raise RuntimeError("open_url ikke tilgjengelig")
                
                url = _url_for_local(file)
                _stderr(f"[open] Fetching from URL: {url}\n")
                
                data = _open_url(url).read()
                
                # Sjekk om vi fikk HTML (typisk 404-side)
                if isinstance(data, (bytes, bytearray)):
                    text_preview = data[:100].decode('utf-8', errors='ignore')
                elif isinstance(data, str):
                    text_preview = data[:100]
                else:
                    text_preview = str(data)[:100]
                
                if text_preview.strip().startswith('<'):
                    _stderr(f"[open] ERROR: Got HTML response (probably 404): {text_preview}\n")
                    raise FileNotFoundError(f"File not found at {url} (got HTML response)")
                
                _stderr(f"[open] Successfully loaded {len(data) if hasattr(data, '__len__') else '?'} bytes\n")
                
                if "b" in mode:
                    return io.BytesIO(data if isinstance(data,(bytes,bytearray)) else bytes(str(data),"utf-8"))
                if isinstance(data,(bytes,bytearray)):
                    enc = kw.get("encoding") or "utf-8"
                    try: return io.StringIO(data.decode(enc))
                    except: return io.StringIO(data.decode("latin-1", errors="replace"))
                return io.StringIO(str(data))
            except Exception as e2:
                _stderr(f"[open] Web fetch also failed: {e2}\n")
                raise
    return __orig_open(file, mode, *a, **kw)

builtins.open = open

# OGSÅ overstyr io.open for pathlib.Path.open() kompatibilitet
import sys
__orig_io_open = sys.modules['io'].open
sys.modules['io'].open = open

# CUSTOM IMPORT HOOK - Laster .py filer fra samme mappe
import importlib.abc
import importlib.machinery

class WebModuleFinder(importlib.abc.MetaPathFinder):
    """Custom import finder that loads .py files from web"""
    
    def find_spec(self, fullname, path, target=None):
        # Kun håndter enkle modulnavn (ikke pakker med punktum)
        if '.' in fullname:
            return None
        
        # Prøv å laste fra samme mappe som hovedfilen
        module_filename = fullname + '.py'
        
        try:
            if _open_url and _url_for_local:
                module_url = _url_for_local(module_filename)
                
                # Forsøk å laste filen
                try:
                    data = _open_url(module_url).read()
                    
                    # Konverter til string
                    if isinstance(data, (bytes, bytearray)):
                        code_str = data.decode('utf-8')
                    else:
                        code_str = str(data)
                    
                    # Kompiler koden
                    code_obj = compile(code_str, module_filename, 'exec')
                    
                    # Returner en spec som bruker vår custom loader
                    return importlib.machinery.ModuleSpec(
                        fullname, 
                        WebModuleLoader(code_obj, module_filename),
                        origin=module_url
                    )
                except Exception as e:
                    # Filen finnes ikke eller feil ved lasting - la Python prøve andre steder
                    pass
        except:
            pass
        
        return None

class WebModuleLoader(importlib.abc.Loader):
    """Custom loader that executes preloaded code"""
    
    def __init__(self, code_obj, filename):
        self.code_obj = code_obj
        self.filename = filename
    
    def create_module(self, spec):
        # Returner None for å la Python lage modulen
        return None
    
    def exec_module(self, module):
        # Sett __file__ attributt
        module.__file__ = self.filename
        
        # Gi modulen tilgang til nødvendige globale variabler
        module_globals = module.__dict__
        main_globals = globals()
        
        # Kopier kritiske variabler fra main namespace
        for key in ['_open_url', '_url_for_local', 'NB_BASE', '__NB_BASE__']:
            if key in main_globals:
                module_globals[key] = main_globals[key]
        
        # Sett opp builtins slik at modulen bruker samme open() overstyring
        if '__builtins__' not in module_globals:
            import builtins
            module_globals['__builtins__'] = builtins
        
        # Kjør koden i modulens namespace
        exec(self.code_obj, module_globals)

# Installer custom import hook
if _open_url and _url_for_local:
    # Fjern eksisterende hvis den finnes
    sys.meta_path = [f for f in sys.meta_path if not isinstance(f, WebModuleFinder)]
    # Legg til vår finder først i listen
    sys.meta_path.insert(0, WebModuleFinder())

# MATPLOTLIB FIX - Sender figurer via self.postMessage
def _setup_matplotlib():
    try:
        import matplotlib
        matplotlib.use("Agg", force=True)
        import matplotlib.pyplot as plt
        from matplotlib.backends.backend_agg import FigureCanvasAgg
        import io, base64
        
        _original_show = plt.show
        
        def _patched_show(*args, **kwargs):
            try:
                figs = [plt.figure(n) for n in plt.get_fignums()]
                for fig in figs:
                    buf = io.BytesIO()
                    canvas = FigureCanvasAgg(fig)
                    canvas.print_png(buf, dpi=100)
                    buf.seek(0)
                    b64 = base64.b64encode(buf.read()).decode("utf-8")
                    dataurl = f"data:image/png;base64,{b64}"
                    
                    # VIKTIG: Bruker self.postMessage i worker-kontekst
                    self.postMessage({
                        "type": "figure",
                        "payload": dataurl
                    })
                    
                    plt.close(fig)
            except Exception as e:
                _stderr(f"[matplotlib] Error: {e}\n")
        
        plt.show = _patched_show
        # NOTE: Figure.savefig patching er flyttet til runtime (i worker header)
        
    except Exception as e:
        _stderr(f"[matplotlib setup] {e}\n")

_setup_matplotlib()

# FILE EXPORT HELPER - Sender filer fra Pyodide til JavaScript for nedlasting
def export_file(filepath, as_name=None):
    """
    Eksporterer en fil fra Pyodide's filsystem til JavaScript
    slik at brukeren kan laste den ned.
    
    Args:
        filepath: Path til filen i Pyodide (f.eks. '/FolkNettside/home/pyodide/resultat.csv')
        as_name: Valgfritt navn for nedlasting (standard: bruker basename)
    """
    try:
        from pathlib import Path
        import base64
        
        p = Path(filepath)
        if not p.exists():
            _stderr(f"[export_file] File not found: {filepath}\n")
            return False
        
        # Les filen
        with open(filepath, 'rb') as f:
            data = f.read()
        
        # Konverter til base64
        b64_data = base64.b64encode(data).decode('utf-8')
        
        # Bestem filnavn
        filename = as_name if as_name else p.name
        
        # Send til JavaScript
        js_post_message({
            'type': 'file_export',
            'filename': filename,
            'data': b64_data,
            'size': len(data)
        })
        
        return True
    except Exception as e:
        _stderr(f"[export_file] Error exporting {filepath}: {e}\n")
        return False

# Si fra til JavaScript at vi er klare
_announce("Klar")
`;
    return CACHED_PRELUDE

  }

  // ---------- cells, state ----------
  const cells = [];
  let cellById = Object.create(null);
  let currentRun = null;
  let lastRun = null;
  let activeOutBox = null;
  let pendingFigures = [];
  let figureLock = false;
  let graceTimer = null;

  const tb = {
    status: $("#status"),
    runAll: $("#runAll"),
    copy: $("#copyAll"),
    stop: $("#stop"),
    ln: $("#toggleLn"),
    wrap: $("#toggleWrap"),
    raw: $("#raw"),
    vscode: $("#vscode")
  };

  function setStatus(msg){
    if (tb.status) tb.status.textContent = String(msg);
  }

  if (tb.raw && src){
    tb.raw.href = src;
  }
  if (tb.vscode && src){
    const absSrc = new URL(src, location.href).href;
    const localPath = decodeURIComponent(new URL(src, location.href).pathname);
    const localUriPath = encodeURI(localPath.startsWith("/FolkNettside/") ? localPath : "/FolkNettside/" + localPath);
    tb.vscode.href = "vscode://file" + localUriPath;
    tb.vscode.setAttribute("data-fallback", "https://vscode.dev/?url=" + encodeURIComponent(absSrc));
    tb.vscode.addEventListener("click", () => {
      const fallback = tb.vscode.getAttribute("data-fallback");
      if (!fallback) return;
      setTimeout(() => {
        if (document.visibilityState === "visible") {
          window.open(fallback, "_blank", "noopener");
        }
      }, 900);
    });
  }

  const wrap = $("#wrap");
  const FILENAME = src.split("/FolkNettside/").pop() || "notebook.py";

  // Viktig: worker ligger fast i /includes/kodeLesere/
  const WORKER_URL = "/FolkNettside/includes/kodeLesere/run-lite_worker.js";

  let worker = null;
  let bootReady = false;

  function enableRunButtons(enabled){
    // Disable/enable cell run buttons
    document.querySelectorAll(".cell .head .btnRun").forEach(btn => {
      btn.disabled = !enabled;
    });
    
    // Disable/enable toolbar buttons
    if (tb.runAll) tb.runAll.disabled = !enabled;
    if (tb.copy) tb.copy.disabled = !enabled;
    // Stop button skal alltid være enabled (for å kunne stoppe worker)
    // if (tb.stop) tb.stop.disabled = !enabled;
  }

  function bootWorker() {
    if (worker) {
      try { worker.terminate(); } catch {}
    }
    
    cellById = Object.create(null);
    currentRun = null;
    lastRun = null;
    activeOutBox = null;
    pendingFigures = [];
    figureLock = false;
    
    worker = new Worker(WORKER_URL);
    worker.onmessage = onMsg;
    worker.postMessage({ type: "init" });
    bootReady = false;
    enableRunButtons(false);
  }

  function appendFigureTo(targetOut, dataUrl){
    if (!targetOut) {
      console.warn("[appendFigureTo] No target output box");
      return;
    }
    
    // Fjern loading melding hvis den finnes
    const loading = targetOut.parentElement.querySelector(".plot-loading");
    if (loading) loading.remove();
    
    let figwrap = targetOut.parentElement.querySelector(".imgbox");
    if (!figwrap){
      figwrap = document.createElement("div");
      figwrap.className = "imgbox";
      figwrap.style.padding = "8px 0";
      targetOut.parentElement.appendChild(figwrap);
    }
    const img = document.createElement("img");
    img.src = String(dataUrl || "");
    img.style.maxWidth = "100%";
    img.style.display = "block";
    figwrap.appendChild(img);
  }

  function resolveOutBox(idHint){
    if (idHint && cellById[idHint]) {
      return cellById[idHint].out;
    }
    if (currentRun && currentRun.out) {
      return currentRun.out;
    }
    if (activeOutBox) {
      return activeOutBox;
    }
    if (lastRun && lastRun.out) {
      return lastRun.out;
    }
    const firstCode = cells.find(c => c.type === "code");
    return firstCode ? firstCode.out : null;
  }

  function onMsg(ev) {
    const d = ev.data || {};
    const { type, payload, id, error } = d;

    if (type === "ready"){
      // Pyodide er lastet – vi kan allerede aktivere knapper
      setStatus("Laster prelude…");
      worker.postMessage({ type: "boot", payload: buildPrelude() });
      
      // Viktig: marker systemet som klart, uavhengig av status-meldinger
      bootReady = true;
      enableRunButtons(true);
      return;
    }

    
    if (type === "status"){
      setStatus(String(payload||""));
      if (String(payload||"").toLowerCase().includes("klar")) {
        bootReady = true;
        enableRunButtons(true);
      }
      document.querySelectorAll('.cell .head .btnRun').forEach(b => {
        b.disabled = !bootReady;
      });
      return;
    }
    
    if (type === "stdout"){
      const ob = resolveOutBox(id);
      if (ob) {
        const text = String(payload || "");
        
        // Håndter \r for progress bars (carriage return overskriving)
        if (text.includes('\r')) {
          const lines = ob.textContent.split('\n');
          const newLines = text.split('\n');
          
          for (let i = 0; i < newLines.length; i++) {
            if (newLines[i].includes('\r')) {
              // Split på \r og ta siste del (overskriver)
              const parts = newLines[i].split('\r');
              newLines[i] = parts[parts.length - 1];
              
              // Overskrive siste linje i output
              if (lines.length > 0) {
                lines[lines.length - 1] = newLines[i];
              } else {
                lines.push(newLines[i]);
              }
            } else {
              lines.push(newLines[i]);
            }
          }
          
          ob.textContent = lines.join('\n');
        } else {
          // Vanlig stdout - legg til teksten som den er
          // CSS white-space:pre-wrap vil håndtere newlines riktig
          ob.textContent += text;
        }
      }
      return;
    }
    
    if (type === "stderr"){
      const ob = resolveOutBox(id);
      if (ob) ob.textContent += String(payload||"");
      return;
    }
    
    if (type === "figure"){
      if (figureLock) {
        pendingFigures.push({id, payload});
        return;
      }
    
      
      const ob = resolveOutBox(id);
      if (ob) {
        appendFigureTo(ob, payload);
      } else {
        pendingFigures.push({id, payload});
      }
      return;
    }
    
    if (type === "image"){
      // Handle matplotlib PNG images sent from worker
      if (figureLock) {
        pendingFigures.push({id, payload});
        return;
      }
      
      const ob = resolveOutBox(id);
      if (ob) {
        appendFigureTo(ob, payload);
      } else {
        pendingFigures.push({id, payload});
      }
      return;
    }
    
    if (type === "pdf_preview") {
    const ob = resolveOutBox(id);
    if (ob) {
        appendFigureTo(ob, payload); // viser PNG-versjonen av PDF
    }
    return;
    }

    if (type === "file_export") {
      // Handle file export from Python
      try {
        const { filename, data, size } = payload;
        console.log(`[file_export] Receiving ${filename} (${size} bytes)`);
        
        // Decode base64 to binary
        const binaryString = atob(data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Create blob and download link
        const blob = new Blob([bytes]);
        const url = URL.createObjectURL(blob);
        
        // Create download link
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        setTimeout(() => {
          URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }, 100);
        
        // Show message to user
        const ob = resolveOutBox(id);
        if (ob) {
          ob.textContent += `\n📥 Lastet ned: ${filename}\n`;
        }
        
        console.log(`[file_export] Successfully downloaded ${filename}`);
      } catch (e) {
        console.error('[file_export] Error:', e);
      }
      return;
    }

    
    if (type === "done"){ 
      finishCell(id); 
      return; 
    }
    
    if (type === "error"){
      const msg = error ?? payload ?? "Ukjent feil";
      const ob = resolveOutBox(id);
      if (ob) {
        ob.textContent += String(msg);
      } else {
        setStatus("Feil: " + String(msg));
      }
      console.error("[run-lite] Worker error:", msg);
      finishCell(id, true);
      return;
    }
  }

  function addCodeCell(srcText){
    const id = Math.random().toString(36).slice(2);
    const cell=document.createElement("div"); 
    cell.className="cell";
    
    const head=document.createElement("div"); 
    head.className="head";

    const runBtn=document.createElement("button"); 
    runBtn.className="btn btnRun"; 
    runBtn.textContent="▶ Kjør denne";
    runBtn.disabled = !bootReady;
    
    const hideBtn=document.createElement("button"); 
    hideBtn.className="btn"; 
    hideBtn.textContent="Skjul output";

    head.appendChild(runBtn); 
    head.appendChild(hideBtn);

    const code=document.createElement("div"); 
    code.className="code"; 
    code.innerHTML=highlightPython(srcText);
    
    const out=document.createElement("div"); 
    out.className="out"; 
    out.textContent="";
    
    cell.appendChild(head); 
    cell.appendChild(code); 
    cell.appendChild(out);
    wrap.appendChild(cell);

    const rec = { type:"code", id, el:cell, code:srcText, out };
    cells.push(rec);
    cellById[id] = rec;

    runBtn.onclick = ()=> runCell(rec);
    hideBtn.onclick = ()=> { 
      out.style.display = (out.style.display==="none" ? "" : "none"); 
    };
  }

  function renderMdCell(md, attachments){
    if (attachments && typeof attachments === "object"){
      for (const [name, dict] of Object.entries(attachments)){
        const mime = Object.keys(dict)[0];
        const b64  = dict[mime];
        const dataUrl = `data:${mime};base64,${b64}`;
        const re = new RegExp(
          `\\(\\s*attachment:${name.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\s*\\)`, 
          "g"
        );
        md = md.replace(re, `(${dataUrl})`);
      }
    }
    
    const box=document.createElement("div"); 
    box.className="cell";
    
    const inner=document.createElement("div"); 
    inner.className="mdbody"; 
    inner.innerHTML=renderMarkdown(md);
    
    box.className="md";
    box.appendChild(inner);
    wrap.appendChild(box);
    cells.push({ type:"md", el:box });
    
    if (window.MathJax && MathJax.typesetPromise) {
      MathJax.typesetPromise([inner]).catch(()=>{});
    }
  }

  function startCell(rec){
    rec.el.classList.add("active");
    rec.out.textContent = "";
    
    const figwrap = rec.el.querySelector(".imgbox");
    if (figwrap) figwrap.remove();
    
    // Fjern gammel loader hvis den finnes
    const oldLoading = rec.el.querySelector(".plot-loading");
    if (oldLoading) oldLoading.remove();
  
    // Lag en ny loader rett over output
    const loading = document.createElement("div");
    loading.className = "plot-loading";
    loading.innerHTML = '<span class="spinner"></span>Kjører / laster pakker…';
    rec.el.insertBefore(loading, rec.out);
    
    activeOutBox = rec.out;
    currentRun = rec;
    lastRun = rec;
    figureLock = false;
  
    if (pendingFigures.length){
      for (const {payload} of pendingFigures) {
        appendFigureTo(rec.out, payload);
      }
      pendingFigures = [];
    }
  
    if (graceTimer){ 
      clearTimeout(graceTimer);
      graceTimer = null;
    }
  }

  function finishCell(id, isErr=false){
    const rec = cellById[id];
    
    if (graceTimer){ 
      clearTimeout(graceTimer); 
      graceTimer = null;
    }
    
    // Fjern eventuell loader
    if (rec) {
      const loading = rec.el.querySelector(".plot-loading");
      if (loading) loading.remove();
    }
    
    figureLock = true;
    
    graceTimer = setTimeout(() => {
      if (rec) rec.el.classList.remove("active");
      
      if (!isErr && rec && !rec.out.textContent.trim()){
        const figwrap = rec.el.querySelector(".imgbox");
        if (!figwrap || !figwrap.children.length) {
          rec.out.textContent = "[ingen output]";
        }
      }
      
      if (currentRun && rec && currentRun.id === rec.id) {
        currentRun = null;
      }
      if (activeOutBox === (rec && rec.out)) {
        activeOutBox = null;
      }
      
      figureLock = false;
      graceTimer = null;
      setStatus("Klar");
    }, 600);
  }

  function runCell(rec){
    if (!bootReady) {
      console.warn("[runCell] Not ready yet");
      return;
    }
    startCell(rec);
    worker.postMessage({ 
      type:"run", 
      payload:{
        code:rec.code, 
        id:rec.id, 
        filename:FILENAME, 
        base: base 
      } 
    });
  }

  async function runAll(){
    if (!bootReady) {
      console.warn("[runAll] Not ready yet");
      return;
    }
    
    for (const rec of cells){
      if (rec.type!=="code") continue;
      
      await new Promise((resolve)=>{
        function onMsgOnce(ev){
          const { type, id } = ev.data||{};
          if ((type==="done" || type==="error") && id===rec.id){
            worker.removeEventListener("message", onMsgOnce);
            resolve();
          }
        }
        worker.addEventListener("message", onMsgOnce);
        startCell(rec);
        worker.postMessage({ 
          type:"run", 
          payload:{ 
            code:rec.code, 
            id:rec.id, 
            filename:FILENAME, 
            base: base 
          } 
        });
      });
    }
    setStatus("Klar");
  }

  function copyAll(){
    const txt = cells.filter(c=>c.type==="code").map(c=>c.code).join("\n\n");
    navigator.clipboard.writeText(txt).catch((e)=>{
      console.warn("[copyAll] Failed:", e);
    });
  }

  function stopRun(){
    if (worker) {
      worker.terminate();
      worker = null;
    }
    
    if (graceTimer) {
      clearTimeout(graceTimer);
      graceTimer = null;
    }
    
    cellById = Object.create(null);
    currentRun = null;
    lastRun = null;
    activeOutBox = null;
    pendingFigures = [];
    figureLock = false;
    
    bootWorker();
    setStatus("Stoppet (worker restartet)");
  }

  const wrapEl = $("#wrap");
  if (tb.ln) { 
    tb.ln.checked = true; 
    wrapEl.classList.add("lineno","runlite"); 
    tb.ln.onchange = ()=>{ 
      wrapEl.classList.toggle("lineno", tb.ln.checked); 
    }; 
  }
  if (tb.wrap) {
    tb.wrap.onchange = ()=>{ 
      wrapEl.classList.toggle("softwrap", tb.wrap.checked); 
      wrapEl.classList.add("runlite"); 
    };
  }
  if (tb.runAll) tb.runAll.onclick = runAll;
  if (tb.copy) tb.copy.onclick = copyAll;
  if (tb.stop) tb.stop.onclick = stopRun;

  // ---------- loaders ----------
  async function loadIpynb(url){
    try {
      setStatus("Henter notebook…");
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok){ 
        setStatus(`Feil ved lasting: ${res.status}`); 
        return; 
      }
      
      const raw = await res.text();
      let nb = null;
      
      try { 
        nb = JSON.parse(raw); 
      } catch (e) {
        console.warn("[run-lite] Ikke gyldig JSON, faller tilbake til .py", e);
        addCodeCell(raw);
        setStatus("Klar");
        return;
      }
      
      const cellsJson = (nb.cells || nb.worksheets?.[0]?.cells || []);
      
      for (const c of cellsJson){
        const cellType = c.cell_type || c.cellType || c.type || "code";
        
        if (cellType === "code"){
          const src = (c.source || c.input || []).join 
            ? (c.source || c.input).join("") 
            : (c.source || c.input || "");
          addCodeCell(String(src));
        } else if (cellType === "markdown") {
          const md = (c.source || []).join 
            ? c.source.join("") 
            : (c.source || "");
          renderMdCell(String(md), c.attachments || {});
        }
      }
      
      setStatus("Klar");
    } catch (e){ 
      console.error("[loadIpynb]", e); 
      setStatus("Feil ved parsing: " + e.message); 
    }
  }

  async function loadPy(url){
    try {
      setStatus("Henter skript…");
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok){ 
        setStatus(`Klarte ikke å laste ${url}: ${res.status}`); 
        return; 
      }
      const txt = await res.text();
      addCodeCell(txt);
      setStatus("Klar");
    } catch (e) {
      console.error("[loadPy]", e);
      setStatus("Feil ved lasting: " + e.message);
    }
  }

  // ---------- boot ----------
  (async function init(){
    if (!wrap){ 
      console.warn("[run-lite] #wrap mangler"); 
      setStatus("Feil: mangler container");
      return;
    }
    
    bootWorker();
    
    if (!src){ 
      setStatus("Ingen fil valgt"); 
      return; 
    }
    
    if (mode === "ipynb") {
      await loadIpynb(src);
    } else {
      await loadPy(src);
    }
  })();
})();