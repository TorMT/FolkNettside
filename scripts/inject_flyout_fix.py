#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
inject_flyout_fix.py - Automatisk injisering av flyout theme fixes

Dette scriptet:
✅ Legger til sidebar-flyout-fix.css i <head>
✅ Legger til flyout-theme-updater.js før </body>
✅ Sikrer riktig rekkefølge (etter themes.css og theme-switcher.js)
✅ Lager backup

Bruk:
    python inject_flyout_fix.py .
    python inject_flyout_fix.py --dry-run .
"""

import sys
import re
from pathlib import Path
from typing import List, Dict

def print_header(text):
    print(f"\n{'=' * 60}")
    print(f"{text:^60}")
    print(f"{'=' * 60}\n")

def inject_flyout_fix(filepath: Path, dry_run: bool = False) -> Dict:
    """Injiserer flyout fixes i en HTML-fil."""
    result = {
        'path': filepath,
        'changes': [],
        'modified': False,
        'error': None
    }
    
    try:
        content = filepath.read_text(encoding='utf-8', errors='ignore')
        original = content
        
        # 1. Legg til sidebar-flyout-fix.css hvis mangler
        if 'sidebar-flyout-fix.css' not in content:
            # Finn themes.css og legg til etter
            themes_css = re.search(
                r'(<link\s+rel="stylesheet"\s+href="[^"]*themes\.css"[^>]*>)',
                content,
                re.IGNORECASE
            )
            if themes_css:
                content = content[:themes_css.end()] + \
                         '\n  <link rel="stylesheet" href="/assets/css/sidebar-flyout-fix.css">' + \
                         content[themes_css.end():]
                result['changes'].append('Lagt til sidebar-flyout-fix.css')
                result['modified'] = True
            else:
                # Hvis ikke themes.css finnes, legg til i <head>
                head_end = re.search(r'</head>', content, re.IGNORECASE)
                if head_end:
                    content = content[:head_end.start()] + \
                             '  <link rel="stylesheet" href="/assets/css/sidebar-flyout-fix.css">\n' + \
                             content[head_end.start():]
                    result['changes'].append('Lagt til sidebar-flyout-fix.css i <head>')
                    result['modified'] = True
        
        # 2. Legg til flyout-theme-updater.js hvis mangler
        if 'flyout-theme-updater.js' not in content:
            # Finn theme-switcher.js og legg til etter
            theme_switcher = re.search(
                r'(<script\s+src="[^"]*theme-switcher\.js"[^>]*></script>)',
                content,
                re.IGNORECASE
            )
            if theme_switcher:
                content = content[:theme_switcher.end()] + \
                         '\n  <script src="/assets/js/flyout-theme-updater.js"></script>' + \
                         content[theme_switcher.end():]
                result['changes'].append('Lagt til flyout-theme-updater.js')
                result['modified'] = True
            else:
                # Hvis ikke theme-switcher.js, legg til før </body>
                body_end = re.search(r'</body>', content, re.IGNORECASE)
                if body_end:
                    content = content[:body_end.start()] + \
                             '  <script src="/assets/js/flyout-theme-updater.js"></script>\n' + \
                             content[body_end.start():]
                    result['changes'].append('Lagt til flyout-theme-updater.js før </body>')
                    result['modified'] = True
        
        # 3. Skriv tilbake hvis modifisert
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
        description='Injiser flyout theme fixes i HTML-filer'
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
    print_header("🎨 Flyout Theme Fix Injector")
    
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
        result = inject_flyout_fix(filepath, args.dry_run)
        results.append(result)
        
        # Print result
        if result['error']:
            print(f"❌ {filepath.name}: {result['error']}")
        elif result['modified']:
            print(f"✓ {filepath.name}:")
            for change in result['changes']:
                print(f"   - {change}")
        else:
            print(f"○ {filepath.name}: ingen endringer")
    
    # Summary
    print_header("📊 Oppsummering")
    
    total_modified = sum(1 for r in results if r['modified'])
    total_errors = sum(1 for r in results if r['error'])
    
    print(f"Filer prosessert:      {len(results)}")
    print(f"Filer modifisert:      {total_modified}")
    if total_errors > 0:
        print(f"Feil:                  {total_errors}")
    
    if args.dry_run:
        print("\n⚠️  DRY RUN - Kjør uten --dry-run for å faktisk endre")
    elif total_modified > 0:
        print("\n✅ Backup-filer (.bak) er opprettet")
    
    print("\n🎉 Ferdig!")
    
    if total_modified > 0 and not args.dry_run:
        print("\n📋 Neste steg:")
        print("1. Kopier sidebar-flyout-fix.css til /assets/css/")
        print("2. Kopier flyout-theme-updater.js til /assets/js/")
        print("3. Test siden din")
        print("4. Åpne en flyout fra sidebar")
        print("5. Bytt theme og se at flyout oppdateres")
        print("\n💡 Hvis problemer:")
        print("   - Kjør: window.forceUpdateFlyouts() i console")
        print("   - Sjekk DevTools → Console for errors")
        print("   - Les FLYOUT_FIX_README.md")

if __name__ == '__main__':
    main()
