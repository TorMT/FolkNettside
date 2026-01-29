#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fix_welcome_margin.py - Fjerner inline margin fra #welcome-container i HTML-filer
"""

import argparse
import re
from pathlib import Path
from typing import List, Tuple

# Mer robust regex:
# - matcher div med id="welcome-container" uansett attributt-rekkefølge
# - matcher både " og '
# - fanger style-innholdet som egen gruppe
PATTERN = re.compile(
    r'(<div\b[^>]*\bid=[\'"]welcome-container[\'"][^>]*\bstyle=[\'"])([^\'"]*)([\'"])',
    re.IGNORECASE
)

def find_html_files(root: Path) -> List[Path]:
    """Finner .html og .htm rekursivt, uansett store/små bokstaver."""
    valid_exts = {".html", ".htm"}
    files = []

    for p in root.rglob("*"):      # Rekursiv scanning av alle mapper
        if p.is_file() and p.suffix.lower() in valid_exts:
            files.append(p)

    return sorted(files)

def check_file_needs_fix(file_path: Path) -> bool:
    """Sjekker om fila faktisk matcher regexen vår."""
    try:
        content = file_path.read_text(encoding="utf-8")
        return bool(PATTERN.search(content))
    except Exception:
        return False

def fix_file(file_path: Path, dry_run: bool = False) -> Tuple[bool, str]:
    """Fjerner margin fra inline style i welcome-container."""
    try:
        content = file_path.read_text(encoding='utf-8')

        if not PATTERN.search(content):
            return False, "Ingen endringer nødvendig"

        def replacer(match):
            before = match.group(1)   # <div ... style="
            style  = match.group(2)   # innholdet i style="..."
            quote  = match.group(3)   # avsluttende " eller '

            # Fjern margin: ...;
            new_style = re.sub(r'\s*margin\s*:[^;"]*;?', '', style, flags=re.IGNORECASE)

            # Rydd opp dobbelt-semikolon osv.
            new_style = re.sub(r';{2,}', ';', new_style).strip()

            return f"{before}{new_style}{quote}"

        new_content = PATTERN.sub(replacer, content)

        if new_content == content:
            return False, "Ingen endringer nødvendig"

        if dry_run:
            return True, "Ville blitt endret (dry-run)"

        # Lag backup
        backup = file_path.with_suffix(file_path.suffix + '.bak')
        if not backup.exists():
            backup.write_text(content, encoding='utf-8')

        # Skriv endret versjon
        file_path.write_text(new_content, encoding='utf-8')

        return True, "✓ Endret (backup: .bak)"

    except Exception as e:
        return False, f"✗ Feil: {e}"

def show_preview(file_path: Path) -> None:
    """Viser før og etter endring."""
    try:
        content = file_path.read_text(encoding='utf-8')
        match = PATTERN.search(content)
        if not match:
            return

        lines = content.splitlines()
        for i, line in enumerate(lines, 1):
            if PATTERN.search(line):
                print(f"\n  Linje {i} (før):")
                print(f"    {line.strip()}")

                new_line = PATTERN.sub(
                    lambda m: m.group(1) +
                              re.sub(r'\s*margin\s*:[^;"]*;?', '', m.group(2), flags=re.IGNORECASE).strip() +
                              m.group(3),
                    line
                )

                print(f"  Linje {i} (etter):")
                print(f"    {new_line.strip()}")
                break

    except Exception as e:
        print(f"(Kunne ikke vise preview: {e})")

def main():
    parser = argparse.ArgumentParser(description="Fjerner inline margin fra #welcome-container i HTML-filer")
    parser.add_argument("root", nargs="?", default=".", type=Path)
    parser.add_argument("--auto", action="store_true")
    parser.add_argument("--dry-run", action="store_true")

    args = parser.parse_args()
    root = args.root.resolve()

    if not root.is_dir():
        parser.error(f"Mappen finnes ikke: {root}")

    print(f"🔍 Søker etter HTML-filer i: {root}\n")

    html_files = find_html_files(root)
    files_to_fix = [f for f in html_files if check_file_needs_fix(f)]

    if not files_to_fix:
        print("✓ Ingen filer trenger endring!")
        return

    print(f"Fant {len(files_to_fix)} fil(er) som trenger endring:\n")

    changed = 0
    skipped = 0

    for file_path in files_to_fix:
        rel = file_path.relative_to(root)
        print(f"📄 {rel}")

        if not args.auto and not args.dry_run:
            show_preview(file_path)

            while True:
                resp = input("\n  Endre denne filen? [j/n/q/a]: ").lower()
                if resp in ("j", "y", "ja", "yes"):
                    break
                if resp in ("n", "nei", "no"):
                    print("  ⊗ Hoppet over\n")
                    skipped += 1
                    continue
                if resp in ("q", "quit"):
                    print("\n❌ Avbrutt av bruker")
                    return
                if resp in ("a", "alle", "all"):
                    args.auto = True
                    break
                print("Ugyldig valg.")

        success, msg = fix_file(file_path, args.dry_run)

        print(f"  {msg}\n")

        if success:
            changed += 1
        elif "Ingen endringer" not in msg:
            skipped += 1

    print("─" * 50)
    if args.dry_run:
        print(f"Dry-run: {changed} fil(er) ville blitt endret")
    else:
        print(f"Oppsummering:")
        print(f"  ✓ Endret: {changed}")
        print(f"  ⊗ Hoppet over: {skipped}")
        print(f"  📁 Totalt sjekket: {len(files_to_fix)}")

if __name__ == "__main__":
    main()
