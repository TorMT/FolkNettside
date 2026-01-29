#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
inject_themes.py - Injiserer theme-støtte i eksisterende HTML-filer

Dette scriptet legger til:
1. data-theme="default" på <html>
2. <link rel="stylesheet" href="/assets/css/themes.css">
3. <script src="/assets/js/theme-switcher.js"></script>

Bruk:
    python inject_themes.py [mappe]
    python inject_themes.py .                # Alle filer i nåværende mappe
    python inject_themes.py --file index.html  # Kun én fil
"""

import sys
import re
from pathlib import Path
from typing import List, Tuple
from bs4 import BeautifulSoup

THEMES_CSS = '<link rel="stylesheet" href="/assets/css/themes.css">'
THEME_JS = '<script src="/assets/js/theme-switcher.js"></script>'

def has_theme_support(html: str) -> bool:
    """Sjekker om filen allerede har theme-støtte."""
    return 'themes.css' in html and 'theme-switcher.js' in html

def inject_theme_support(html: str) -> Tuple[str, bool]:
    """
    Injiserer theme-støtte i HTML.
    
    Returns:
        (modified_html, was_modified)
    """
    if has_theme_support(html):
        return html, False
    
    soup = BeautifulSoup(html, 'html.parser')
    modified = False
    
    # 1. Legg til data-theme på <html>
    html_tag = soup.find('html')
    if html_tag and not html_tag.get('data-theme'):
        html_tag['data-theme'] = 'default'
        modified = True
    
    # 2. Legg til themes.css i <head>
    head = soup.find('head')
    if head and 'themes.css' not in str(head):
        # Finn hvor vi skal sette inn (etter style.css hvis den finnes)
        style_css = head.find('link', href=re.compile(r'/style\.css'))
        
        themes_link = soup.new_tag('link', rel='stylesheet', href='/assets/css/themes.css')
        
        if style_css:
            # Sett inn etter style.css
            style_css.insert_after('\n  ')
            style_css.insert_after(themes_link)
        else:
            # Sett inn før </head>
            head.append('\n  ')
            head.append(themes_link)
        
        modified = True
    
    # 3. Legg til theme-switcher.js i body
    body = soup.find('body')
    if body and 'theme-switcher.js' not in str(body):
        # Finn sidebar-loader.js for å sette inn etter den
        sidebar_script = None
        for script in body.find_all('script'):
            if script.get('src') and 'sidebar-loader.js' in script['src']:
                sidebar_script = script
                break
        
        theme_script = soup.new_tag('script', src='/assets/js/theme-switcher.js')
        
        if sidebar_script:
            # Sett inn etter sidebar-loader.js
            sidebar_script.insert_after('\n  ')
            sidebar_script.insert_after(theme_script)
        else:
            # Sett inn før mobile-ui.js eller før </body>
            mobile_script = None
            for script in body.find_all('script'):
                if script.get('src') and 'mobile-ui.js' in script['src']:
                    mobile_script = script
                    break
            
            if mobile_script:
                mobile_script.insert_before(theme_script)
                mobile_script.insert_before('\n  ')
            else:
                body.append('\n  ')
                body.append(theme_script)
        
        modified = True
    
    return str(soup), modified

def process_file(filepath: Path, dry_run: bool = False) -> bool:
    """
    Prosesserer en enkelt fil.
    
    Returns:
        True hvis filen ble endret
    """
    try:
        # Les fil
        content = filepath.read_text(encoding='utf-8')
        
        # Injiser theme-støtte
        modified_content, was_modified = inject_theme_support(content)
        
        if was_modified:
            print(f"  ✓ {filepath.name}")
            
            if not dry_run:
                # Lag backup først
                backup = filepath.with_suffix(filepath.suffix + '.bak')
                if not backup.exists():
                    backup.write_text(content, encoding='utf-8')
                
                # Skriv modifisert innhold
                filepath.write_text(modified_content, encoding='utf-8')
            
            return True
        else:
            print(f"  – {filepath.name} (har allerede theme-støtte)")
            return False
        
    except Exception as e:
        print(f"  ❌ Feil ved prosessering av {filepath.name}: {e}")
        return False

def find_html_files(root: Path, exclude_patterns: List[str] = None) -> List[Path]:
    """Finner alle HTML-filer rekursivt."""
    if exclude_patterns is None:
        exclude_patterns = ['node_modules', '.git', 'backup']
    
    files = []
    for html_file in root.rglob('*.html'):
        # Skip hvis i excluded mappe
        if any(pattern in str(html_file) for pattern in exclude_patterns):
            continue
        files.append(html_file)
    
    return files

def main():
    """Main function."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Injiserer theme-støtte i eksisterende HTML-filer'
    )
    parser.add_argument(
        'root',
        nargs='?',
        default='.',
        type=Path,
        help='Mappe å starte fra (default: nåværende mappe)'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Vis hva som vil bli endret uten å faktisk endre'
    )
    parser.add_argument(
        '--file',
        type=Path,
        help='Prosesser kun en spesifikk fil'
    )
    
    args = parser.parse_args()
    
    # Validate path
    if args.file:
        if not args.file.exists():
            print(f"❌ Filen finnes ikke: {args.file}")
            sys.exit(1)
        files = [args.file]
    else:
        root = args.root.resolve()
        if not root.is_dir():
            print(f"❌ Ugyldig mappe: {root}")
            sys.exit(1)
        files = find_html_files(root)
    
    if not files:
        print("Ingen HTML-filer funnet.")
        return
    
    print(f"\n🎨 Fant {len(files)} HTML-filer")
    if args.dry_run:
        print("🏃 DRY RUN - ingen endringer vil bli gjort\n")
    else:
        print("✏️  Injiserer theme-støtte...\n")
    
    # Check if BeautifulSoup is installed
    try:
        from bs4 import BeautifulSoup
    except ImportError:
        print("❌ BeautifulSoup4 er ikke installert.")
        print("   Installer med: pip install beautifulsoup4")
        sys.exit(1)
    
    # Process files
    total_modified = 0
    for filepath in files:
        if process_file(filepath, args.dry_run):
            total_modified += 1
    
    # Summary
    print(f"\n{'=' * 50}")
    if args.dry_run:
        print(f"✓ Ville ha modifisert {total_modified} filer")
        print("  Kjør uten --dry-run for å faktisk modifisere")
    else:
        print(f"✓ Modifisert {total_modified} av {len(files)} filer")
        if total_modified > 0:
            print("  Backup-filer (.bak) er opprettet")
    print(f"{'=' * 50}\n")
    
    # Instructions
    print("\n📋 Neste steg:")
    print("1. Lag mappen /assets/css hvis den ikke finnes")
    print("2. Kopier themes.css til /assets/css/themes.css")
    print("3. Lag mappen /assets/js hvis den ikke finnes")
    print("4. Kopier theme-switcher.js til /assets/js/theme-switcher.js")
    print("5. Test siden din - du skal se en 🎨-knapp nede til høyre!")
    print()

if __name__ == '__main__':
    main()
