#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
mobile_auto_fix.py - Automatisk fiksing av mobilproblemer

Dette scriptet fikser:
✅ Legger til mobile-enhancer.js i alle HTML-filer
✅ Legger til data-theme="default" på <html>
✅ Sikrer riktig CSS-rekkefølge
✅ Fikser sidebar/navbar klasser

Bruk:
    python mobile_auto_fix.py .
    python mobile_auto_fix.py --dry-run .
"""

import sys
import re
from pathlib import Path
from typing import List, Tuple

def print_header(text):
    print(f"\n{'=' * 60}")
    print(f"{text:^60}")
    print(f"{'=' * 60}\n")

def fix_html_file(filepath: Path, dry_run: bool = False) -> dict:
    """Fikser en enkelt HTML-fil for mobil."""
    result = {
        'path': filepath,
        'changes': [],
        'modified': False,
        'error': None
    }
    
    try:
        content = filepath.read_text(encoding='utf-8')
        original = content
        
        # 1. Legg til data-theme hvis mangler
        if 'data-theme' not in content:
            content = re.sub(
                r'<html\s+lang="no"([^>]*)>',
                r'<html lang="no" data-theme="default"\1>',
                content
            )
            if content != original:
                result['changes'].append('Lagt til data-theme="default"')
                result['modified'] = True
        
        # 2. Legg til themes.css hvis mangler
        if 'themes.css' not in content:
            # Finn style.css og legg til themes.css etter
            content = re.sub(
                r'(<link\s+rel="stylesheet"\s+href="[^"]*style\.css"[^>]*>)',
                r'\1\n  <link rel="stylesheet" href="/assets/css/themes.css">',
                content
            )
            if content != original:
                result['changes'].append('Lagt til themes.css')
                result['modified'] = True
        
        # 3. Legg til mobile-enhancer.js hvis mangler
        if 'mobile-enhancer.js' not in content:
            # Legg til før </body>
            content = re.sub(
                r'(</body>)',
                r'  <script src="/includes/mobile-enhancer.js"></script>\n\1',
                content
            )
            if content != original:
                result['changes'].append('Lagt til mobile-enhancer.js')
                result['modified'] = True
        
        # 4. Sikre klasser på sidebar
        if '<aside' in content and 'class="sidebar"' not in content:
            content = re.sub(
                r'<aside([^>]*)>',
                r'<aside class="sidebar"\1>',
                content
            )
            if content != original:
                result['changes'].append('Lagt til class="sidebar" på <aside>')
                result['modified'] = True
        
        # 5. Skriv tilbake hvis modifisert
        if result['modified'] and not dry_run:
            # Backup først
            backup = filepath.with_suffix(filepath.suffix + '.bak')
            if not backup.exists():
                backup.write_text(original, encoding='utf-8')
            
            # Skriv ny versjon
            filepath.write_text(content, encoding='utf-8')
        
    except Exception as e:
        result['error'] = str(e)
    
    return result

def find_html_files(root: Path, exclude: List[str] = None) -> List[Path]:
    """Finner alle HTML-filer."""
    if exclude is None:
        exclude = ['node_modules', '.git', 'backup', '.bak', 'dist', 'build']
    
    files = []
    for html_file in root.rglob('*.html'):
        if any(pattern in str(html_file) for pattern in exclude):
            continue
        files.append(html_file)
    
    return sorted(files)

def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Auto-fiks mobilproblemer i HTML-filer'
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
    
    args = parser.parse_args()
    
    # Header
    print_header("📱 Mobil Auto-Fix")
    
    if args.dry_run:
        print("🏃 DRY RUN - Ingen endringer vil bli gjort\n")
    
    # Find files
    print(f"🔍 Søker etter HTML-filer i {args.root}...")
    files = find_html_files(args.root)
    
    if not files:
        print("❌ Ingen HTML-filer funnet")
        sys.exit(0)
    
    print(f"📄 Fant {len(files)} HTML-filer\n")
    
    # Process files
    results = []
    for filepath in files:
        result = fix_html_file(filepath, args.dry_run)
        results.append(result)
        
        # Print result
        if result['error']:
            print(f"❌ {filepath.name}: {result['error']}")
        elif result['modified']:
            print(f"✓ {filepath.name}:")
            for change in result['changes']:
                print(f"   - {change}")
        else:
            print(f"– {filepath.name}: ingen endringer")
    
    # Summary
    print_header("📊 Oppsummering")
    
    total_modified = sum(1 for r in results if r['modified'])
    total_errors = sum(1 for r in results if r['error'])
    
    print(f"Filer prosessert:      {len(results)}")
    print(f"Filer modifisert:      {total_modified}")
    if total_errors > 0:
        print(f"Feil:                  {total_errors}")
    
    if args.dry_run:
        print("\n⚠️ DRY RUN - Kjør uten --dry-run for å faktisk endre")
    elif total_modified > 0:
        print("\n✓ Backup-filer (.bak) er opprettet")
    
    print("\n🎉 Ferdig!")
    
    if total_modified > 0 and not args.dry_run:
        print("\n📋 Neste steg:")
        print("1. Test siden din på mobil")
        print("2. Sjekk at ☰-knappen vises")
        print("3. Test navigasjon")
        print("4. Test theme-bytte")
        print("\n💡 Hvis problemer:")
        print("   - Sjekk DevTools → Console")
        print("   - Sjekk at filer lastes (Network tab)")
        print("   - Les MOBILE_FIXES.md for mer hjelp")

if __name__ == '__main__':
    main()