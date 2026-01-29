#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
add_modules_to_html.py – Legger til modul-scripts i eksisterende HTML-filer

Dette scriptet oppdaterer eksisterende index.html filer ved å legge til
script-tags for sidebar-modulene FØR sidebar-loader.js
"""

from pathlib import Path
import re
import argparse

# Scripts som skal legges til
MODULE_SCRIPTS = '''  <!-- 1. SIDEBAR MODULER (må lastes FØR sidebar-loader) -->
  <script src="/includes/sidebar-search-module.js?v=1"></script>
  <script src="/includes/sidebar-notifications-module.js?v=1.2"></script>
  
  <!-- 2. SIDEBAR SYSTEM (NY VERSJON v11.11.0 med modulstøtte) -->'''

def find_html_files(root_dir: Path) -> list[Path]:
    """Finn alle index.html filer."""
    return list(root_dir.rglob("*/index.html"))

def update_html_file(html_path: Path, dry_run: bool = False) -> bool:
    """
    Oppdater en HTML-fil ved å legge til modul-scripts.
    Returnerer True hvis filen ble endret.
    """
    try:
        content = html_path.read_text(encoding='utf-8')
    except Exception as e:
        print(f"❌ Kunne ikke lese {html_path}: {e}")
        return False
    
    # Sjekk om modulene allerede er lagt til
    if 'sidebar-search-module.js' in content:
        return False  # Allerede oppdatert
    
    # Finn hvor sidebar-html-loader.js eller sidebar-loader.js er
    # Pattern: <script src="/includes/sidebar-html-loader.js"
    pattern = r'(<script src="/includes/sidebar-html-loader\.js")'
    
    if not re.search(pattern, content):
        # Prøv å finne sidebar-loader.js i stedet
        pattern = r'(<script src="/includes/sidebar-loader\.js[^>]*>)'
        if not re.search(pattern, content):
            print(f"⚠️  Kunne ikke finne sidebar-loader i {html_path}")
            return False
    
    # Sett inn modulscripts FØR sidebar-html-loader eller sidebar-loader
    new_content = re.sub(
        pattern,
        MODULE_SCRIPTS + r'\n  \1',
        content,
        count=1
    )
    
    # Oppdater også versjonsnummer på sidebar-loader hvis det finnes
    new_content = re.sub(
        r'(<script src="/includes/sidebar-loader\.js)(")',
        r'\1?v=11.11.0\2',
        new_content
    )
    
    if dry_run:
        return True
    
    # Skriv tilbake
    try:
        html_path.write_text(new_content, encoding='utf-8')
        return True
    except Exception as e:
        print(f"❌ Kunne ikke skrive til {html_path}: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(
        description="Legg til modul-scripts i eksisterende index.html filer"
    )
    parser.add_argument(
        "root",
        nargs="?",
        default=".",
        type=Path,
        help="Rotmappe å søke i (default: nåværende mappe)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Vis hva som ville skjedd uten å endre filer"
    )
    
    args = parser.parse_args()
    
    root = args.root.resolve()
    if not root.is_dir():
        print(f"❌ Rotmappe ikke funnet: {root}")
        return 1
    
    print(f"🔍 Søker etter HTML-filer i: {root}\n")
    html_files = find_html_files(root)
    
    if not html_files:
        print("⚠️  Ingen HTML-filer funnet!")
        return 0
    
    print(f"✓ Fant {len(html_files)} HTML-filer\n")
    
    if args.dry_run:
        print("DRY RUN - ingen filer vil bli endret\n")
    
    updated = 0
    skipped = 0
    
    for html_file in html_files:
        relative_path = html_file.relative_to(root)
        
        if update_html_file(html_file, args.dry_run):
            print(f"{'[VILLE OPPDATERE]' if args.dry_run else '✓ Oppdatert:':16} {relative_path}")
            updated += 1
        else:
            skipped += 1
    
    # Oppsummering
    print(f"\n{'='*60}")
    if args.dry_run:
        print(f"Ville oppdatert: {updated} filer")
        print(f"Ville hoppet over: {skipped} filer (allerede oppdatert)")
    else:
        print(f"✓ Oppdatert: {updated} filer")
        if skipped > 0:
            print(f"⏭️  Hoppet over: {skipped} filer (allerede oppdatert)")
    
    print("\n📋 Neste steg:")
    print("1. Last opp modulfilene til /includes/ på serveren:")
    print("   - sidebar-search-module.js")
    print("   - sidebar-notifications-module.js")
    print("   - sidebar-loader.js (v11.11.0)")
    print("2. Test i nettleseren!")
    
    return 0

if __name__ == "__main__":
    exit(main())