import os
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPORT = ROOT / "export"

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


def copy_path(src: Path, dest: Path):
    if src.is_dir():
        shutil.copytree(src, dest, dirs_exist_ok=True)
    else:
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)


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
