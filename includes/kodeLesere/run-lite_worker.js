// run-lite_worker.js v6.0 – SINGLE RUNTIME MATPLOTLIB PATCH (NO DUPLICATES)
let pyodide = null;
let PRELUDE = "";
let currentId = null;
const loadedPackages = new Set();

// -----------------------------------------------------------
// 1) Forward Python → JS postMessage
// -----------------------------------------------------------
self.postMessageFromPython = (msg) => {
  try {
    const o = msg.toJs ? msg.toJs() : msg;
    self.postMessage(o);
  } catch (e) {
    self.postMessage({ type: "stderr", payload: "[worker forward error] " + e });
  }
};

self.addEventListener("pythonMessage", (ev) => {
  self.postMessageFromPython(ev.detail);
});

// -----------------------------------------------------------
// 2) Main message handler
// -----------------------------------------------------------
self.onmessage = async (ev) => {
  const { type, payload } = ev.data || {};

  try {
    if (type === "init") {
      await bootPyodide();

      // CRITICAL FIX: expose worker self → Python namespace
      pyodide.globals.set("self", self);

      // Also expose js_post_message if used
      pyodide.globals.set("js_post_message", (msgDict) => {
        try {
          // Convert Python dict to plain JavaScript object
          let jsObj;
          if (msgDict && typeof msgDict.toJs === 'function') {
            jsObj = msgDict.toJs({dict_converter: Object.fromEntries});
          } else if (typeof msgDict === 'object') {
            jsObj = msgDict;
          } else {
            jsObj = {type: 'unknown', payload: String(msgDict)};
          }
          self.postMessage(jsObj);
        } catch (e) {
          console.error('[js_post_message error]', e);
          self.postMessage({ type: "stderr", payload: "[js_post_message] " + e });
        }
      });

      self.postMessage({ type: "ready" });
      return;
    }

    if (type === "boot") {
      PRELUDE = String(payload || "");
      await runPythonSafe(PRELUDE, { filename: "prelude.py" });
      self.postMessage({ type: "status", payload: "Klar (prelude)" });
      return;
    }

    if (type === "run") {
      const { code, id, filename, base } = payload;
      currentId = id || null;

      await ensurePackages(["numpy", "matplotlib", "scipy"]);

      // Ensure backend is Agg
      await pyodide.runPythonAsync(`
import os
os.environ["MPLBACKEND"] = "Agg"
import matplotlib
matplotlib.use("Agg", force=True)
`);

      // numpy datasource patch - håndterer både Windows-paths og vanlige filnavn
      const patchCode = `
import sys, re, io

try:
    import numpy as np
    from numpy.lib import _datasource as _ds
    
    _open_url = globals().get('_open_url')
    _url_for_local = globals().get('_url_for_local')
    
    def _as_text_io(data, kw):
        if isinstance(data, (bytes, bytearray)):
            enc = kw.get('encoding') if isinstance(kw, dict) else None
            if enc:
                s = data.decode(enc, errors='replace')
            else:
                try:
                    s = data.decode('utf-8')
                except:
                    s = data.decode('latin-1', errors='replace')
        else:
            s = str(data)
        s = s.replace('\\r\\n', '\\n').replace('\\r', '\\n')
        return io.StringIO(s)
    
    if _open_url and _url_for_local:
        if not hasattr(_ds, '_original_open'):
            _ds._original_open = _ds.open
        
        def _patched_open(path, mode="r", *a, **kw):
            # Først prøv original open
            try:
                return _ds._original_open(path, mode, *a, **kw)
            except (FileNotFoundError, OSError):
                # Hvis filen ikke finnes lokalt, prøv å laste fra web
                try:
                    if _open_url and _url_for_local:
                        url = _url_for_local(path)
                        data = _open_url(url).read()
                        if "b" in (mode or ""):
                            return io.BytesIO(data if isinstance(data,(bytes,bytearray)) else bytes(str(data),"utf-8"))
                        return _as_text_io(data, kw if isinstance(kw, dict) else {})
                except:
                    pass
                # Hvis web-lasting også feiler, raise original error
                raise
        
        _ds.open = _patched_open
        sys.modules['numpy.lib._datasource'].open = _patched_open
except:
    pass
`;

      // Matplotlib auto-capture setup
      const matplotlibCapture = `
# AUTO-CAPTURE MATPLOTLIB FIGURES
import sys
import matplotlib.pyplot as plt
from matplotlib.backends.backend_agg import FigureCanvasAgg
import io, base64

_original_show = plt.show

def _capture_and_send_figures():
    """Capture all open figures and send as PNG"""
    try:
        figs = [plt.figure(i) for i in plt.get_fignums()]
        for fig in figs:
            try:
                # Render to PNG
                buf = io.BytesIO()
                canvas = FigureCanvasAgg(fig)
                canvas.print_png(buf)
                buf.seek(0)
                
                # Convert to base64
                b64 = base64.b64encode(buf.read()).decode('utf-8')
                dataurl = f"data:image/png;base64,{b64}"
                
                # Send to main thread - use js_post_message helper
                js_post_message({'type': 'image', 'payload': dataurl})
            except Exception as e:
                try:
                    js_post_message({'type': 'stderr', 'payload': f"Figure capture error: {e}"})
                except:
                    print(f"Figure capture error: {e}", file=sys.stderr)
        
        # Close all figures after sending
        plt.close('all')
    except Exception as e:
        try:
            js_post_message({'type': 'stderr', 'payload': f"Capture error: {e}"})
        except:
            print(f"Capture error: {e}", file=sys.stderr)

def _patched_show(*args, **kwargs):
    """Replacement for plt.show() that captures and sends figures"""
    _capture_and_send_figures()

# Replace plt.show with our capture function
plt.show = _patched_show
# NOTE: Figure.savefig patching happens at runtime (see header below)
`;

      // CUSTOM STDOUT HANDLER - Sends each line directly to JavaScript
      const customStdout = `
# Custom stdout handler that sends each line immediately
import sys
import io

class DirectStdout(io.TextIOBase):
    """Custom stdout that sends output directly to JavaScript"""
    
    def __init__(self):
        self.buffer = ""
    
    def write(self, text):
        if not text:
            return 0
        
        # Send directly to JavaScript with current cell id
        try:
            # Get current id from globals if available
            current_id = globals().get('__CURRENT_CELL_ID__', None)
            js_post_message({'type': 'stdout', 'id': current_id, 'payload': text})
        except Exception as e:
            # Fallback to printing to stderr if js_post_message fails
            try:
                print(text, file=sys.__stderr__, end='')
            except:
                pass
        
        return len(text)
    
    def flush(self):
        pass

# Replace stdout with our direct version
sys.stdout = DirectStdout()
`;

      // CUSTOM IMPORT HOOK for loading .py files from same directory
      const customImportHook = `
# CUSTOM IMPORT HOOK - Støtter moduler + pakker fra samme mappe
import sys
import importlib.abc
import importlib.machinery

_open_url = globals().get('_open_url')
_url_for_local = globals().get('_url_for_local')

def _decode_source(data):
    if isinstance(data, (bytes, bytearray)):
        for enc in ('utf-8', 'latin-1'):
            try:
                return data.decode(enc)
            except Exception:
                pass
        return data.decode('utf-8', errors='replace')
    return str(data)

class WebModuleLoader(importlib.abc.Loader):
    """Custom loader that executes preloaded code"""

    def __init__(self, fullname, code_obj, filename, is_package=False, package_path=None):
        self.fullname = fullname
        self.code_obj = code_obj
        self.filename = filename
        self.is_package = is_package
        self.package_path = package_path

    def create_module(self, spec):
        return None

    def exec_module(self, module):
        module.__file__ = self.filename
        module.__loader__ = self
        if self.is_package:
            module.__package__ = self.fullname
            module.__path__ = [self.package_path or self.fullname.replace('.', '/')]
        else:
            module.__package__ = self.fullname.rpartition('.')[0]

        module_globals = module.__dict__
        main_globals = globals()
        for key in ['_open_url', '_url_for_local', 'NB_BASE', '__NB_BASE__']:
            if key in main_globals:
                module_globals[key] = main_globals[key]

        if '__builtins__' not in module_globals:
            import builtins
            module_globals['__builtins__'] = builtins

        exec(self.code_obj, module_globals)

class WebModuleFinder(importlib.abc.MetaPathFinder):
    """Finder that loads module.py or package/__init__.py via _open_url"""

    _cache = {}

    def _candidate_paths(self, fullname):
        mod_path = fullname.replace('.', '/')
        return [
            (f"{mod_path}.py", False),
            (f"{mod_path}/__init__.py", True),
        ]

    def _fetch_code(self, rel_path):
        if rel_path in self._cache:
            return self._cache[rel_path]
        url = _url_for_local(rel_path)
        data = _open_url(url).read()
        code = _decode_source(data)
        self._cache[rel_path] = (code, url)
        return code, url

    def find_spec(self, fullname, path=None, target=None):
        if not (_open_url and _url_for_local):
            return None

        for rel_path, is_pkg in self._candidate_paths(fullname):
            try:
                code_str, source_url = self._fetch_code(rel_path)
                code_obj = compile(code_str, rel_path, 'exec')
                loader = WebModuleLoader(
                    fullname=fullname,
                    code_obj=code_obj,
                    filename=rel_path,
                    is_package=is_pkg,
                    package_path=rel_path.rsplit('/', 1)[0] if is_pkg else None,
                )
                spec = importlib.machinery.ModuleSpec(fullname, loader, origin=source_url, is_package=is_pkg)
                if is_pkg:
                    spec.submodule_search_locations = [loader.package_path]
                return spec
            except Exception:
                continue

        return None

if _open_url and _url_for_local:
    sys.meta_path = [f for f in sys.meta_path if not isinstance(f, WebModuleFinder)]
    sys.meta_path.insert(0, WebModuleFinder())
`;

      // Build header
      const header =
        `__NB_BASE__ = ${JSON.stringify(base || "")}\n` +
        `NB_BASE = __NB_BASE__\n` +
        `__name__="__main__"\n` +
        `__file__=${JSON.stringify(filename || "user_script.py")}\n` +
        `__CURRENT_CELL_ID__ = ${JSON.stringify(id || null)}\n` +
        patchCode + "\n" +
        matplotlibCapture + "\n" +
        customStdout + "\n" +
        customImportHook + "\n" +
        `# RUNTIME MATPLOTLIB SAVEFIG PATCH - aktiveres når koden kjører
import sys as _sys
if 'matplotlib.figure' in _sys.modules:
    from matplotlib.figure import Figure as _Figure
    import matplotlib.pyplot as plt
    from matplotlib.backends.backend_agg import FigureCanvasAgg as _FigureCanvasAgg
    import io as _io
    import base64 as _base64
    
    _orig_fig_savefig = _Figure.savefig
    
    def _runtime_savefig(self, fname, *args, **kwargs):
        # Lagre filen først
        _orig_fig_savefig(self, fname, *args, **kwargs)
        
        # Hvis PDF, send også PNG
        if str(fname).lower().endswith('.pdf'):
            try:
                buf = _io.BytesIO()
                canvas = _FigureCanvasAgg(self)
                canvas.print_png(buf, dpi=100)
                buf.seek(0)
                b64 = _base64.b64encode(buf.read()).decode('utf-8')
                dataurl = f"data:image/png;base64,{b64}"
                js_post_message({'type': 'image', 'payload': dataurl})
            except Exception as e:
                pass
    
    _Figure.savefig = _runtime_savefig
\n`;

      await runPythonSafe(header + "\n" + String(code || ""), {
        filename: filename || "user_script.py",
      });

      // AUTO-CAPTURE: After code execution, check for any remaining figures
      await pyodide.runPythonAsync(`
try:
    import matplotlib.pyplot as plt
    if plt.get_fignums():
        _capture_and_send_figures()
except:
    pass
`);

      self.postMessage({ type: "done", id: currentId });
      currentId = null;
      return;
    }
  } catch (e) {
    self.postMessage({
      type: "error",
      id: currentId,
      error: String(e && e.message) || e,
    });
    currentId = null;
  }
};

// -----------------------------------------------------------
// 3) Pyodide init
// -----------------------------------------------------------
async function bootPyodide() {
  if (pyodide) return;

  if (!self.loadPyodide) {
    importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.js");
  }

  pyodide = await self.loadPyodide({
    indexURL:
      self.languagePluginUrl ||
      "https://cdn.jsdelivr.net/pyodide/v0.26.1/full/",
  });

  // Setup stdout/stderr with batched mode
  pyodide.setStdout({
    batched: (s) => {
      if (s && s.length)
        self.postMessage({ type: "stdout", id: currentId, payload: s });
    },
  });

  pyodide.setStderr({
    batched: (s) => {
      if (s && s.length)
        self.postMessage({ type: "stderr", id: currentId, payload: s });
    },
  });
}

// -----------------------------------------------------------
// 4) Package loader
// -----------------------------------------------------------
async function ensurePackages(pkgs) {
  const required = [...new Set([...pkgs, "numpy", "matplotlib", "scipy"])];
  const missing = required.filter((pkg) => !loadedPackages.has(pkg));

  if (missing.length) {
    await pyodide.loadPackage(missing);
    for (const pkg of missing) loadedPackages.add(pkg);
  }

  try {
    await pyodide.runPythonAsync(`
import numpy as np
if not hasattr(np, 'trapezoid') and hasattr(np, 'trapz'):
    np.trapezoid = np.trapz
elif hasattr(np, 'trapezoid') and not hasattr(np, 'trapz'):
    np.trapz = np.trapezoid
`);
  } catch (e) {
    console.warn("[numpy compat]", e);
  }
}

// -----------------------------------------------------------
// 5) Safe Python runner
// -----------------------------------------------------------
async function runPythonSafe(code, opts) {
  try {
    await pyodide.runPythonAsync(code, opts || {});
  } catch (e) {
    self.postMessage({
      type: "error",
      id: currentId,
      error: String(e && e.message) || e,
    });
    throw e;
  }
}