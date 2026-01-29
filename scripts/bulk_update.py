#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
bulk_update.py - Bulk-oppdatering av HTML-filer

Dette scriptet kombinerer:
1. fix_encoding.py - Fikser encoding
2. inject_themes.py - Legger til theme-støtte

Og gjør det på ALLE HTML-filer samtidig!

Bruk:
    python bulk_update.py .                 # Oppdater alt
    python bulk_update.py --dry-run .       # Test uten endringer
    python bulk_update.py --encoding-only . # Bare encoding
    python bulk_update.py --themes-only .   # Bare themes
"""

import sys
import argparse
from pathlib import Path
from typing import List, Tuple

try:
    from bs4 import BeautifulSoup
except ImportError:
    print("❌ BeautifulSoup4 er ikke installert.")
    print("   Installer med: pip install beautifulsoup4")
    sys.exit(1)

# Import from other scripts
import re

# Encoding fixes (from fix_encoding.py)
ENCODING_FIXES = {
    'Ã¥': 'å', 'Ã¦': 'æ', 'Ã¸': 'ø',
    'Ã…': 'Å', 'Ã†': 'Æ', 'Ã˜': 'Ø',
    'â€¢': '•', 'â€"': '–', 'â€"': '—',
    'â€˜': ''', 'â€™': ''', 'â€œ': '"', 'â€': '"',
    'â€¦': '…', 'â‚¬': '€',
}

# Theme injection constants
THEMES_CSS = '<link rel="stylesheet" href="/assets/css/themes.css">'
THEME_JS = '<script src="/assets/js/theme-switcher.js"></script>'

def print_header(text):
    print(f"\n{'=' * 60}")
    print(f"{text:^60}")
    print(f"{'=' * 60}\n")

def fix_encoding(text: str) -> Tuple[str, int]:
    """Fikser encoding-problemer."""
    fixes = 0
    for wrong, correct in ENCODING_FIXES.items():
        if wrong in text:
            count = text.count(wrong)
            text = text.replace(wrong, correct)
            fixes += count
    return text, fixes

def has_theme_support(html: str) -> bool:
    """Sjekker om filen har theme-støtte."""
    return 'themes.css' in html and 'theme-switcher.js' in html

def inject_themes(html: str) -> Tuple[str, bool]:
    """Injiserer theme-støtte."""
    if has_theme_support(html):
        return html, False
    
    try:
        soup = BeautifulSoup(html, 'html.parser')
        modified = False
        
        # 1. data-theme på <html>
        html_tag = soup.find('html')
        if html_tag and not html_tag.get('data-theme'):
            html_tag['data-theme'] = 'default'
            modified = True
        
        # 2. themes.css i <head>
        head = soup.find('head')
        if head and 'themes.css' not in str(head):
            style_css = head.find('link', href=re.compile(r'/style\.css'))
            themes_link = soup.new_tag('link', rel='stylesheet', href='/assets/css/themes.css')
            
            if style_css:
                style_css.insert_after('\n  ')
                style_css.insert_after(themes_link)
            else:
                head.append('\n  ')
                head.append(themes_link)
            modified = True
        
        # 3. theme-switcher.js i <body>
        body = soup.find('body')
        if body and 'theme-switcher.js' not in str(body):
            sidebar_script = None
            for script in body.find_all('script'):
                if script.get('src') and 'sidebar-loader.js' in script['src']:
                    sidebar_script = script
                    break
            
            theme_script = soup.new_tag('script', src='/assets/js/theme-switcher.js')
            
            if sidebar_script:
                sidebar_script.insert_after('\n  ')
                sidebar_script.insert_after(theme_script)
            else:
                body.append('\n  ')
                body.append(theme_script)
            modified = True
        
        return str(soup), modified
    except Exception as e:
        print(f"  ⚠ Kunne ikke injisere themes: {e}")
        return html, False

def process_file(filepath: Path, 
                 fix_enc: bool = True, 
                 inj_themes: bool = True,
                 dry_run: bool = False) -> dict:
    """Prosesserer en enkelt fil."""
    result = {
        'path': filepath,
        'encoding_fixes': 0,
        'themes_injected': False,
        'modified': False,
        'error': None
    }
    
    try:
        # Les fil
        try:
            content = filepath.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            content = filepath.read_text(encoding='latin-1')
        
        original = content
        
        # 1. Fix encoding
        if fix_enc:
            content, fixes = fix_encoding(content)
            result['encoding_fixes'] = fixes
            if fixes > 0:
                result['modified'] = True
        
        # 2. Inject themes
        if inj_themes:
            content, injected = inject_themes(content)
            result['themes_injected'] = injected
            if injected:
                result['modified'] = True
        
        # Skriv tilbake hvis modifisert
        if result['modified'] and not dry_run:
            # Backup først
            backup = filepath.with_suffix(filepath.suffix + '.bak')
            if not backup.exists():
                backup.write_text(original, encoding='utf-8')
            
            # Skriv oppdatert innhold
            filepath.write_text(content, encoding='utf-8')
        
    except Exception as e:
        result['error'] = str(e)
    
    return result

def find_html_files(root: Path, exclude_patterns: List[str] = None) -> List[Path]:
    """Finner alle HTML-filer."""
    if exclude_patterns is None:
        exclude_patterns = ['node_modules', '.git', 'backup', '.bak']
    
    files = []
    for html_file in root.rglob('*.html'):
        if any(pattern in str(html_file) for pattern in exclude_patterns):
            continue
        files.append(html_file)
    
    return sorted(files)

def main():
    parser = argparse.ArgumentParser(
        description='Bulk-oppdater HTML-filer (encoding + themes)'
    )
    parser.add_argument(
        'root',
        nargs='?',
        default='.',
        type=Path,
        help='Mappe å starte fra'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Vis hva som vil bli endret uten å endre'
    )
    parser.add_argument(
        '--encoding-only',
        action='store_true',
        help='Bare fiks encoding, ikke injiser themes'
    )
    parser.add_argument(
        '--themes-only',
        action='store_true',
        help='Bare injiser themes, ikke fiks encoding'
    )
    parser.add_argument(
        '--exclude',
        nargs='+',
        default=[],
        help='Mønstre å ekskludere (f.eks. backup test)'
    )
    
    args = parser.parse_args()
    
    # Validate
    if not args.root.is_dir():
        print(f"❌ Ugyldig mappe: {args.root}")
        sys.exit(1)
    
    # Header
    print_header("🔄 Bulk Update - FolkNettsideFolk")
    
    if args.dry_run:
        print("🏃 DRY RUN - Ingen endringer vil bli gjort\n")
    
    # Determine what to do
    fix_enc = not args.themes_only
    inj_themes = not args.encoding_only
    
    if fix_enc:
        print("✓ Fikser encoding")
    if inj_themes:
        print("✓ Injiserer theme-støtte")
    
    # Find files
    print(f"\n🔍 Søker etter HTML-filer i {args.root}...")
    exclude_patterns = ['node_modules', '.git', 'backup', '.bak'] + args.exclude
    files = find_html_files(args.root, exclude_patterns)
    
    if not files:
        print("❌ Ingen HTML-filer funnet")
        sys.exit(0)
    
    print(f"📄 Fant {len(files)} HTML-filer\n")
    
    # Process files
    results = []
    for filepath in files:
        result = process_file(filepath, fix_enc, inj_themes, args.dry_run)
        results.append(result)
        
        # Print result
        if result['error']:
            print(f"❌ {filepath.name}: {result['error']}")
        elif result['modified']:
            parts = []
            if result['encoding_fixes'] > 0:
                parts.append(f"{result['encoding_fixes']} encoding fixes")
            if result['themes_injected']:
                parts.append("themes injected")
            print(f"✓ {filepath.name}: {', '.join(parts)}")
        else:
            print(f"– {filepath.name}: ingen endringer")
    
    # Summary
    print_header("📊 Oppsummering")
    
    total_modified = sum(1 for r in results if r['modified'])
    total_encoding = sum(r['encoding_fixes'] for r in results)
    total_themes = sum(1 for r in results if r['themes_injected'])
    total_errors = sum(1 for r in results if r['error'])
    
    print(f"Filer prosessert:      {len(results)}")
    print(f"Filer modifisert:      {total_modified}")
    if fix_enc:
        print(f"Encoding-fikser:       {total_encoding}")
    if inj_themes:
        print(f"Themes injisert:       {total_themes}")
    if total_errors > 0:
        print(f"Feil:                  {total_errors}")
    
    if args.dry_run:
        print("\n⚠️ DRY RUN - Kjør uten --dry-run for å faktisk endre")
    elif total_modified > 0:
        print("\n✓ Backup-filer (.bak) er opprettet")
    
    print("\n🎉 Ferdig!")
    
    if total_modified > 0 and not args.dry_run:
        print("\n📋 Neste steg:")
        print("1. Test siden din: python -m http.server 8000")
        print("2. Åpne http://localhost:8000")
        print("3. Sjekk at 🎨-knappen vises")
        print("4. Test theme-bytte!")

if __name__ == '__main__':
    main()
