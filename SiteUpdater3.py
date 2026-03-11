#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
site_updater.py – Oppdaterer, genererer eller fjerner index.json rekursivt.

v15.2 - ULTRA-OPTIMALISERT (FIKSET)
• LRU cache på hjelpefunksjoner
• Batch string operations
• Symlink loop protection
• SHA256-basert change detection (stabil mellom kjøringer)
• Optimalisert dict/list operations
• Effektiv memory usage

Tilpasninger:
• .html er nå lovlig filtype (for f.eks. egne visningsfiler)
• index.html blir aldri tatt med i "files"-lister / index.json (så du ikke får den i sidebaren)
• .url/.webloc blir forsøkt tolket til URL og lagres som "filnavn|url"
"""

from __future__ import annotations
import argparse, json, re, os, hashlib
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple
from functools import lru_cache

try:
    from tqdm import tqdm  # type: ignore
except ModuleNotFoundError:
    tqdm = None  # type: ignore

# Pre-compiled regex patterns for bedre ytelse
OVING_RE     = re.compile(r"^(?:øving|oving)0*(\d+)$", re.IGNORECASE)
OVING_KEY    = re.compile(r"^oving(\d{2})$", re.IGNORECASE)
CLEAN_RE     = re.compile(r"^[^0-9A-Za-zÆØÅæøå]+")
BESKYTTET_RE = re.compile(r"beskyttet|hemmelig", re.IGNORECASE)

# ✅ Endring: lagt til ".html"
ALLOWED_EXT = {
    ".py", ".pdf", ".ipynb",
    ".mp4", ".webm", ".ogg", ".mov", ".m4v",
    ".url", ".webloc",
    ".html", ".stl", ".fbm"
}
# Standard mapper vi alltid ignorerer (case-insensitiv)
DEFAULT_BLACKLIST = {"node_modules", ".git", "__pycache__", "venv", ".venv"}
IMAGE_EXT        = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"}
DEFAULT_WELCOME  = "/img/welcome-generic.svg"

# Global cache
_quiz_normalized: Set[Path] = set()
_file_cache: Dict[Path, List[str]] = {}
_visited_paths: Set[str] = set()  # For symlink loop detection


# ---------------------------- hjelpefunksjoner ----------------------------

@lru_cache(maxsize=1024)
def format_path_cached(path_str: str) -> str:
    """Cached version av format_path"""
    try:
        p = Path(path_str)
        return str(p.relative_to(Path.cwd()))
    except Exception:
        return path_str

def format_path(path: Path) -> str:
    return format_path_cached(str(path))

@lru_cache(maxsize=512)
def clean_name(name: str) -> str:
    return CLEAN_RE.sub("", name)

@lru_cache(maxsize=512)
def clean_beskyttet(name: str) -> str:
    return name.replace("(beskyttet)", "").replace("hemmelig", "").strip()

@lru_cache(maxsize=512)
def is_beskyttet(key: str) -> bool:
    return BESKYTTET_RE.search(key) is not None

@lru_cache(maxsize=256)
def is_python_oving(key: str) -> bool:
    return key.lower().startswith("pythonøving")

def should_use_as_welcome(name: str, is_file: bool) -> bool:
    if not is_file:
        return False
    n = name.lower()
    ext = Path(name).suffix.lower()
    return ext in IMAGE_EXT and ("meme" in n or "velkomst" in n)

def parse_shortcut_file(path: Path) -> Optional[str]:
    """Prøv å lese en .url/.webloc-fil og returner URL hvis mulig."""
    try:
        text = path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return None

    # Windows .url files often contain a line like: URL=https://...
    m = re.search(r"^URL\s*=\s*(https?://\S+)", text, re.IGNORECASE | re.MULTILINE)
    if m:
        return m.group(1).strip()

    # macOS .webloc files may be XML/plist containing <string>https://...</string>
    m = re.search(r"<string>\s*(https?://[^<\s]+)\s*</string>", text, re.IGNORECASE)
    if m:
        return m.group(1).strip()

    # Fallback: plain text containing a URL
    m = re.search(r'(https?://[^"\s]+)', text)
    if m:
        return m.group(1).strip()

    return None

def files_in_dir_for_index(dir_root: Path) -> List[str]:
    """Cachet versjon med os.scandir og symlink loop protection"""
    if dir_root in _file_cache:
        return _file_cache[dir_root]

    out: List[str] = []
    visited: Set[str] = set()

    def scan_dir(d: str, prefix: str = "") -> None:
        # Resolve real path for loop detection
        try:
            real_path = os.path.realpath(d)
        except OSError:
            return

        if real_path in visited:
            return  # Symlink loop detected
        visited.add(real_path)

        try:
            with os.scandir(d) as it:
                for entry in it:
                    try:
                        if entry.is_file(follow_symlinks=True):
                            suf = os.path.splitext(entry.name)[1].lower() if entry.name else ""
                            if suf in ALLOWED_EXT:
                                # ✅ Endring: aldri ta med index.html i fil-lister
                                if entry.name.lower() == "index.html":
                                    continue

                                # Hvis shortcut-fil, prøv å hente mål-URL – behold original filnavn som label
                                if suf in (".url", ".webloc"):
                                    try:
                                        url = parse_shortcut_file(Path(entry.path))
                                        if url:
                                            out.append(prefix + entry.name + "|" + url)
                                        else:
                                            out.append(prefix + entry.name)
                                    except Exception:
                                        out.append(prefix + entry.name)
                                else:
                                    out.append(prefix + entry.name)

                        elif entry.is_dir(follow_symlinks=True):
                            scan_dir(entry.path, prefix + entry.name + "/")
                    except (PermissionError, OSError):
                        pass
        except (PermissionError, OSError):
            pass

    scan_dir(str(dir_root))
    out.sort(key=str.lower)
    _file_cache[dir_root] = out
    return out

def sort_keys(index: Dict[str, object], include_quiz: bool) -> List[str]:
    """Optimalisert key sorting"""
    order: List[str] = []
    keys = list(index.keys())

    if "welcome" in keys:
        order.append("welcome")
    # Permanent settings section (blacklist) bør vises tidlig
    if "blacklist" in keys:
        order.append("blacklist")
    if include_quiz and "quiz" in keys:
        order.append("quiz")

    oving_keys: List[str] = []
    py_keys: List[str] = []
    others: List[str] = []
    locked: List[str] = []

    for k in keys:
        if k in ("welcome", "quiz"):
            continue

        if is_beskyttet(k):
            locked.append(k)
        elif OVING_KEY.match(k):
            oving_keys.append(k)
        elif is_python_oving(k):
            py_keys.append(k)
        else:
            others.append(k)

    oving_keys.sort(key=lambda k: int(OVING_KEY.match(k).group(1)))  # type: ignore[union-attr]
    py_keys.sort(key=str.lower)
    others.sort(key=str.lower)
    locked.sort(key=str.lower)

    order.extend(oving_keys)
    order.extend(py_keys)
    order.extend(others)
    order.extend(locked)
    return order


# -------------------- OPTIMALISERT: normaliser quiz-bildestier --------------------

def _try_png_jpg(p: Path) -> Optional[Path]:
    """Returner en eksisterende fil ved å prøve .png/.jpg/.jpeg-varianter."""
    stem_str = str(p.parent / p.stem)
    for suff in (".png", ".jpg", ".jpeg"):
        path_str = stem_str + suff
        if os.path.exists(path_str):
            return Path(path_str)
    return None

def normalize_quiz_images(course_dir: Path, dry_run: bool = False, verbose: bool = True) -> bool:
    """Bruker cache og raskere fil-operasjoner"""
    if course_dir in _quiz_normalized:
        return False

    quiz_json = course_dir / "quiz" / "quiz.json"
    if not quiz_json.exists():
        _quiz_normalized.add(course_dir)
        return False

    try:
        with open(quiz_json, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        if verbose:
            print(f"[quiz] Hopper over (ugyldig JSON): {format_path(quiz_json)}  ({e})")
        _quiz_normalized.add(course_dir)
        return False

    questions = data.get("questions", [])
    if not isinstance(questions, list):
        _quiz_normalized.add(course_dir)
        return False

    changed = False
    base_quiz = course_dir / "quiz"

    # Pre-cache eksisterende filer
    bilder_dir = base_quiz / "bilder"
    existing_files: Set[str] = set()
    if bilder_dir.exists():
        try:
            with os.scandir(bilder_dir) as it:
                existing_files = {entry.name for entry in it if entry.is_file()}
        except OSError:
            pass

    candidates_dirs = [
        base_quiz / "bilder",
        base_quiz,
        course_dir / "filer" / "quiz" / "bilder",
    ]

    for q in questions:
        if not isinstance(q, dict):
            continue
        img = q.get("image")
        if not isinstance(img, str):
            continue

        raw = img.strip()
        if not raw or raw.startswith(("http://", "https://", "/")):
            continue

        # Hvis det allerede er en mappe i stien (f.eks. "bilder/x.png"), behold det men fikse ext om nødvendig
        if "/" in raw:
            disk_path = base_quiz / raw
            if not disk_path.exists():
                alt = _try_png_jpg(disk_path)
                if alt:
                    new_rel = alt.relative_to(base_quiz).as_posix()
                    if q.get("image") != new_rel:
                        q["image"] = new_rel
                        changed = True
                        if verbose:
                            print(f"[quiz] Endret (ext): {raw} -> {new_rel}")
            continue

        filename = raw

        # Hvis fil finnes i quiz/bilder, normaliser til "bilder/<fil>"
        if filename in existing_files:
            new_rel = f"bilder/{filename}"
            if q.get("image") != new_rel:
                q["image"] = new_rel
                changed = True
                if verbose:
                    print(f"[quiz] Normalisert: {raw} -> {new_rel}")
            continue

        # Ellers: finn i kandidatmapper
        found: Optional[Path] = None
        for d in candidates_dirs:
            cand = d / filename
            if cand.exists():
                found = cand
                break
            alt = _try_png_jpg(cand)
            if alt:
                found = alt
                break

        if found:
            new_rel = found.relative_to(base_quiz).as_posix()
            if q.get("image") != new_rel:
                q["image"] = new_rel
                changed = True
                if verbose:
                    print(f"[quiz] Fant i {found.parent.name}: {raw} -> {new_rel}")
        elif verbose:
            print(f"[quiz] ADVARSEL: Finner ikke bilde '{filename}' i {format_path(base_quiz)}[/bilder].")

    if changed and not dry_run:
        backup = quiz_json.with_suffix(".json.bak")
        try:
            if not backup.exists():
                backup.write_text(quiz_json.read_text(encoding="utf-8"), encoding="utf-8")
        except Exception:
            pass

        with open(quiz_json, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.write("\n")

    _quiz_normalized.add(course_dir)
    return changed


# -------------------------- hovedindeksering --------------------------

def compute_json_hash(data: dict) -> str:
    """Compute stable SHA256 hash of JSON content"""
    json_str = json.dumps(data, indent=2, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(json_str.encode("utf-8")).hexdigest()

def update_directory(
    dir_path: Path,
    use_progress: bool = True,
    include_quiz: bool = True,
    max_depth: Optional[int] = None,
    current_depth: int = 0,
    global_blacklist: Optional[Set[str]] = None,
) -> Dict[str, object]:
    """
    Oppdater index.json for en mappe.

    Args:
        dir_path: Mappen som skal indekseres
        use_progress: Vis fremdriftslinje
        include_quiz: Inkluder quiz-metadata
        max_depth: Maks rekursjonsdybde (None = ubegrenset)
        current_depth: Nåværende dybde (intern bruk)
        global_blacklist: Valgfrie globale mapper å blacklist'e (ikke persistert)
    """
    # Symlink loop detection
    try:
        real_path = str(dir_path.resolve())
    except (OSError, RuntimeError):
        return {}

    if real_path in _visited_paths:
        print(f"ADVARSEL: Symlink loop detektert i {format_path(dir_path)}")
        return {}
    _visited_paths.add(real_path)

    index: Dict[str, object] = {}

    # Bruk os.scandir for maksimal ytelse
    entries: List[Tuple[str, bool, bool]] = []
    try:
        with os.scandir(dir_path) as it:
            for entry in it:
                try:
                    entries.append((entry.name, entry.is_dir(follow_symlinks=True), entry.is_file(follow_symlinks=True)))
                except OSError:
                    pass
    except OSError:
        _visited_paths.discard(real_path)
        return {}

    # Les lokalt blacklist fra eksisterende index.json (hvis finnes)
    idx_file = dir_path / "index.json"
    local_blacklist: Set[str] = set()
    try:
        if idx_file.exists():
            with open(idx_file, "r", encoding="utf-8") as f:
                existing = json.load(f)
            lb = existing.get("blacklist")
            if isinstance(lb, list):
                local_blacklist = {str(x).lower() for x in lb if isinstance(x, str)}
    except Exception:
        pass

    # Kombiner default, lokal og global blacklist (case-insensitiv)
    combined_blacklist: Set[str] = {n.lower() for n in DEFAULT_BLACKLIST}
    if local_blacklist:
        combined_blacklist |= local_blacklist
    if global_blacklist:
        combined_blacklist |= {n.lower() for n in global_blacklist}

    # 1) Velkomst
    for name, _is_dir, is_file in entries:
        if should_use_as_welcome(name, is_file):
            index["welcome"] = name
            break
    if "welcome" not in index:
        index["welcome"] = DEFAULT_WELCOME

    # 1b) Quiz-metadata
    if include_quiz:
        quiz_rel: Optional[str] = None
        q_here = dir_path / "quiz" / "quiz.json"
        if q_here.exists():
            quiz_rel = "quiz/quiz.json"
            normalize_quiz_images(dir_path, dry_run=False, verbose=True)
        elif dir_path.name.lower() == "filer":
            q_sibling = dir_path.parent / "quiz" / "quiz.json"
            if q_sibling.exists():
                quiz_rel = "quiz/quiz.json"
                normalize_quiz_images(dir_path.parent, dry_run=False, verbose=True)
        if quiz_rel:
            index["quiz"] = quiz_rel

    # 2) Sorter entries
    entries.sort(key=lambda x: x[0].lower())

    if use_progress and tqdm is not None:
        entries = tqdm(entries, desc=format_path(dir_path), unit="item", leave=False)  # type: ignore[assignment]

    # Pre-allocate for subdirs
    subdirs_to_process: List[Tuple[str, str, str]] = []

    for name, is_dir, is_file in entries:
        if name.lower() == "index.json":
            continue
        if is_dir and name.lower() == "quiz":
            continue

        # Permanent blacklist: hopp over mapper som er listet i index.json -> "blacklist"
        if is_dir and name.lower() in combined_blacklist:
            continue

        beskyttet = is_beskyttet(name)
        cleaned = clean_beskyttet(name)
        raw = clean_name(cleaned)

        if is_dir:
            m = OVING_RE.match(raw)
            key = f"oving{int(m.group(1)):02d}" if m else raw
            subdirs_to_process.append((name, raw, key))
        elif is_file:
            name_lower = name.lower()
            suf = os.path.splitext(name)[1].lower() if name else ""

            if suf in ALLOWED_EXT:
                # ✅ Endring: aldri legg index.html inn i index.json (sidebar)
                if name_lower == "index.html":
                    continue

                m = OVING_RE.match(raw)
                key = f"oving{int(m.group(1)):02d}" if m else raw
                if key not in index:
                    index[key] = {"beskyttet": beskyttet, "files": []}

                # Hvis shortcut-fil, prøv å ekstrahere URL og lagre URL i stedet for filnavn
                if suf in (".url", ".webloc"):
                    try:
                        url = parse_shortcut_file(dir_path / name)
                        if url:
                            index[key]["files"].append(f"{name}|{url}")  # type: ignore[index]
                        else:
                            index[key]["files"].append(name)  # type: ignore[index]
                    except Exception:
                        index[key]["files"].append(name)  # type: ignore[index]
                else:
                    index[key]["files"].append(name)  # type: ignore[index]

    # Process subdirectories
    should_recurse = max_depth is None or current_depth < max_depth

    for name, _raw, key in subdirs_to_process:
        entry_path = dir_path / name
        beskyttet = is_beskyttet(name)

        if should_recurse:
            sub_index = update_directory(entry_path, use_progress, include_quiz, max_depth, current_depth + 1, global_blacklist=global_blacklist)
        else:
            sub_index = {}

        files = files_in_dir_for_index(entry_path)

        obj: Dict[str, object] = {"dir": name, "beskyttet": beskyttet, "files": files}
        if "welcome" in sub_index:
            obj["welcome"] = sub_index["welcome"]
        if include_quiz and "quiz" in sub_index:
            obj["quiz"] = sub_index["quiz"]
        index[key] = obj

    # 3) Sorter fil-lister
    for v in index.values():
        if isinstance(v, dict) and "files" in v:
            files_list = v["files"]
            if isinstance(files_list, list) and len(files_list) > 1:
                files_list.sort(key=str.lower)

    # 4) Skriv index.json - kun hvis endret
    if index:
        # Persister lokal blacklist hvis den eksisterer i tidligere index.json
        if local_blacklist:
            index["blacklist"] = sorted(local_blacklist)

        keys_order = sort_keys(index, include_quiz)
        ordered_index = {k: index[k] for k in keys_order}

        needs_update = True
        if idx_file.exists():
            try:
                new_hash = compute_json_hash(ordered_index)
                with open(idx_file, "r", encoding="utf-8") as f:
                    existing = json.load(f)
                existing_hash = compute_json_hash(existing)
                needs_update = existing_hash != new_hash
            except (json.JSONDecodeError, OSError, UnicodeDecodeError):
                pass

        if needs_update:
            with open(idx_file, "w", encoding="utf-8") as f:
                json.dump(ordered_index, f, indent=2, ensure_ascii=False)
                f.write("\n")
            print(f"Oppdatert {format_path(idx_file)}")

        _visited_paths.discard(real_path)
        return ordered_index

    if idx_file.exists():
        idx_file.unlink()
        print(f"Slettet {format_path(idx_file)}")

    _visited_paths.discard(real_path)
    return {}


def main(argv: Optional[List[str]] = None) -> None:
    parser = argparse.ArgumentParser(description="Oppdater index.json-filer rekursivt.")
    parser.add_argument("root", nargs="?", default=".", type=Path, help="Rotmappe å starte fra")
    parser.add_argument("--no-progress", action="store_true", help="Skru av fremdriftsindikator (tqdm).")
    parser.add_argument("--no-quiz", action="store_true", help="Ikke registrer quiz i index.json.")
    parser.add_argument("--only", "-o", action="store_true", help="Oppdater KUN denne mappen (ikke undermapper).")
    parser.add_argument("--shallow", "-s", action="store_true", help="Oppdater denne mappen og ett nivå ned.")
    parser.add_argument("--blacklist", help="Komma-separert liste av mappe-navn å blacklist'e i alle mapper (påvirker ikke vedvarende indeks).", default="")
    args = parser.parse_args(argv)

    root = args.root.resolve()
    if not root.is_dir():
        parser.error(f"Sti må være en eksisterende mappe, fikk: {root}")

    use_prog = not args.no_progress and tqdm is not None
    if not use_prog and tqdm is None and not args.no_progress:
        print("tqdm ikke installert – kjører uten fremdriftslinjer. Installer: pip install tqdm")

    # Clear caches on new run
    _quiz_normalized.clear()
    _file_cache.clear()
    _visited_paths.clear()

    # Clear LRU caches
    format_path_cached.cache_clear()
    clean_name.cache_clear()
    clean_beskyttet.cache_clear()
    is_beskyttet.cache_clear()
    is_python_oving.cache_clear()

    # Bestem rekursjonsdybde
    max_depth = None
    if args.only:
        max_depth = 0
        print(f"Oppdaterer KUN {format_path(root)} (ingen undermapper)")
    elif args.shallow:
        max_depth = 1
        print(f"Oppdaterer {format_path(root)} og direkte undermapper (shallow)")
    else:
        print(f"Oppdaterer {format_path(root)} rekursivt (alle undermapper)")

    # Parse global CLI blacklist (ikke persistert med mindre du legger det i index.json selv)
    global_blacklist = set(n.strip() for n in args.blacklist.split(",") if n.strip()) if args.blacklist else set()

    update_directory(root, use_prog, include_quiz=not args.no_quiz, max_depth=max_depth, global_blacklist=global_blacklist)
    print("Ferdig oppdatert")

if __name__ == "__main__":
    main()
