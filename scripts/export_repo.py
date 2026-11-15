import os
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPORT = ROOT / "export"

# GitHub project pages is served below /<repo>/ rather than at domain root.
# This only rewrites the generated export; the local source keeps its root paths.
PAGES_BASE_PATH = os.environ.get("PAGES_BASE_PATH", "/FolkNettside").rstrip("/")

# Allowlist of files/folders to include in the exported repo
ALLOW = [
    "assets",
    "docs",
    "img",
    "includes",
    "Quiz",
    "SiteUpdater3.py",
    "navbarupdater.py",
    "index.html",
    "course-template.html",
]

SKIP_PATTERNS = [
    "*.bak",
    "index.json",
]

TEXT_SUFFIXES = {".html", ".htm", ".js", ".css", ".json"}


def copy_path(src: Path, dest: Path):
    if src.is_dir():
        shutil.copytree(src, dest, dirs_exist_ok=True)
    else:
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)


def rewrite_root_paths_for_pages():
    if not PAGES_BASE_PATH:
        return

    quoted_root = re.compile(r"""(["'`])/(?!/)""")
    css_url_root = re.compile(r"""url\(\s*(["']?)/(?!/)""", re.IGNORECASE)

    for path in EXPORT.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
            continue

        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue

        updated = quoted_root.sub(lambda m: f"{m.group(1)}{PAGES_BASE_PATH}/", text)
        updated = css_url_root.sub(
            lambda m: f"url({m.group(1)}{PAGES_BASE_PATH}/",
            updated,
        )

        if updated != text:
            path.write_text(updated, encoding="utf-8")
            print(f"Rewrote root-relative paths for GitHub Pages: {path.relative_to(EXPORT)}")


def main():
    print("Creating export folder:", EXPORT)
    if EXPORT.exists():
        print("Removing existing export folder...")
        shutil.rmtree(EXPORT)
    EXPORT.mkdir()

    for name in ALLOW:
        src = ROOT / name
        if not src.exists():
            print(f"Skipping missing: {name}")
            continue
        dest = EXPORT / name
        print(f"Copying {src} -> {dest}")
        copy_path(src, dest)

    rewrite_root_paths_for_pages()

    # Keep GitHub Pages from applying Jekyll processing to static assets.
    (EXPORT / ".nojekyll").write_text("", encoding="utf-8")

    # write a default .gitignore into export
    gitignore = EXPORT / ".gitignore"
    gitignore.write_text("""
# ignore local and large data
semestre/
temp/
diverse/
*.bak
index.json
""".lstrip())

    print("Export complete. Review 'export/' and remove any personal files before pushing.")


if __name__ == "__main__":
    main()
