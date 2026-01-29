#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
complete_theme_fix.py - KOMPLETT theme-fix

Dette scriptet:
✅ Legger til themes.css
✅ Legger til sidebar-flyout-fix.css
✅ Legger til sidebar-loader-theme-override.css (NYTT!)
✅ Legger til navbar-theme-fix.css (NYTT!)
✅ Legger til theme-switcher.js
✅ Legger til flyout-theme-updater.js
✅ SKIPPER embedded viewers (nbview, pyview, etc.)

Bruk:
    python complete_theme_fix.py .
    python complete_theme_fix.py --dry-run .
"""

import sys
import re
from pathlib import Path
from typing import List, Dict

def print_header(text):
    print(f"\n{'=' * 60}")
    print(f"{text:^60}")
    print(f"{'=' * 60}\n")

def is_embedded_viewer(filepath: Path) -> bool:
    """Sjekk om dette er en embedded viewer."""
    filename = filepath.name.lower()
    embedded_files = [
        'nbview.html',
        'pyview.html',
        'pdfview.html',
        'mdview.html',
        'imgview.html',
        'txtview.html',
    ]
    return filename in embedded_files

def fix_html_file(filepath: Path, dry_run: bool = False) -> Dict:
    """Injiserer alle theme-filer i HTML."""
    result = {
        'path': filepath,
        'changes': [],
        'modified': False,
        'error': None,
        'is_embedded': False,
        'skipped': False
    }
    
    try:
        content = filepath.read_text(encoding='utf-8', errors='ignore')
        original = content
        
        # Sjekk om embedded viewer
        is_embedded = is_embedded_viewer(filepath)
        result['is_embedded'] = is_embedded
        
        if is_embedded:
            result['skipped'] = True
            result['changes'].append('SKIPPED - Embedded viewer')
            return result
        
        # 1. Legg til data-theme hvis mangler
        if 'data-theme' not in content:
            content = re.sub(
                r'<html\s+lang="no"([^>]*)>',
                r'<html lang="no" data-theme="default"\1>',
                content,
                flags=re.IGNORECASE
            )
            if content != original:
                result['changes'].append('✅ data-theme="default"')
                result['modified'] = True
        
        # 2. Legg til themes.css hvis mangler
        if 'themes.css' not in content:
            style_match = re.search(
                r'(<link\s+rel="stylesheet"\s+href="[^"]*style\.css"[^>]*>)',
                content,
                re.IGNORECASE
            )
            if style_match:
                content = content[:style_match.end()] + \
                         '\n  <link rel="stylesheet" href="/assets/css/themes.css">' + \
                         content[style_match.end():]
                result['changes'].append('✅ themes.css')
                result['modified'] = True
        
        # 3. Legg til sidebar-flyout-fix.css
        if 'sidebar-flyout-fix.css' not in content:
            themes_match = re.search(
                r'(<link\s+rel="stylesheet"\s+href="[^"]*themes\.css"[^>]*>)',
                content,
                re.IGNORECASE
            )
            if themes_match:
                content = content[:themes_match.end()] + \
                         '\n  <link rel="stylesheet" href="/assets/css/sidebar-flyout-fix.css">' + \
                         content[themes_match.end():]
                result['changes'].append('✅ sidebar-flyout-fix.css')
                result['modified'] = True
        
        # 4. Legg til sidebar-loader-theme-override.css (NYTT!)
        if 'sidebar-loader-theme-override.css' not in content:
            flyout_match = re.search(
                r'(<link\s+rel="stylesheet"\s+href="[^"]*sidebar-flyout-fix\.css"[^>]*>)',
                content,
                re.IGNORECASE
            )
            if flyout_match:
                content = content[:flyout_match.end()] + \
                         '\n  <link rel="stylesheet" href="/assets/css/sidebar-loader-theme-override.css">' + \
                         content[flyout_match.end():]
                result['changes'].append('✅ sidebar-loader-theme-override.css (fikser sidebar-loader)')
                result['modified'] = True
        
        # 5. Legg til navbar-theme-fix.css (NYTT!)
        if 'navbar-theme-fix.css' not in content:
            override_match = re.search(
                r'(<link\s+rel="stylesheet"\s+href="[^"]*sidebar-loader-theme-override\.css"[^>]*>)',
                content,
                re.IGNORECASE
            )
            if override_match:
                content = content[:override_match.end()] + \
                         '\n  <link rel="stylesheet" href="/assets/css/navbar-theme-fix.css">' + \
                         content[override_match.end():]
                result['changes'].append('✅ navbar-theme-fix.css (fikser navbar dropdowns)')
                result['modified'] = True
        
        # 6. Legg til theme-switcher.js
        if 'theme-switcher' not in content:
            body_end = re.search(r'</body>', content, re.IGNORECASE)
            if body_end:
                content = content[:body_end.start()] + \
                         '  <script src="/assets/js/theme-switcher.js"></script>\n' + \
                         content[body_end.start():]
                result['changes'].append('✅ theme-switcher.js')
                result['modified'] = True
        
        # 7. Legg til flyout-theme-updater.js
        if 'flyout-theme-updater.js' not in content:
            theme_switcher = re.search(
                r'(<script\s+src="[^"]*theme-switcher\.js"[^>]*></script>)',
                content,
                re.IGNORECASE
            )
            if theme_switcher:
                content = content[:theme_switcher.end()] + \
                         '\n  <script src="/assets/js/flyout-theme-updater.js"></script>' + \
                         content[theme_switcher.end():]
                result['changes'].append('✅ flyout-theme-updater.js')
                result['modified'] = True
        
        # 8. Skriv tilbake
        if result['modified'] and not dry_run:
            backup = filepath.with_suffix(filepath.suffix + '.bak')
            if not backup.exists():
                backup.write_text(original, encoding='utf-8')
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
        description='KOMPLETT theme-fix (inkl. sidebar-loader og navbar)'
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
        help='Vis hva som vil bli endret'
    )
    
    args = parser.parse_args()
    
    print_header("🎨 KOMPLETT Theme Fix v3.0")
    
    if args.dry_run:
        print("🏃 DRY RUN\n")
    
    print(f"🔍 Søker etter HTML-filer i {args.root}...")
    files = find_html_files(args.root)
    
    if not files:
        print("❌ Ingen HTML-filer funnet")
        sys.exit(0)
    
    print(f"📄 Fant {len(files)} HTML-filer\n")
    
    # Process
    results = []
    for filepath in files:
        result = fix_html_file(filepath, args.dry_run)
        results.append(result)
        
        if result['error']:
            print(f"❌ {filepath.name}: {result['error']}")
        elif result['skipped']:
            print(f"⏭️  {filepath.name}: SKIPPED")
        elif result['modified']:
            print(f"✓ {filepath.name}:")
            for change in result['changes']:
                print(f"   {change}")
        else:
            print(f"○ {filepath.name}: OK")
    
    # Summary
    print_header("📊 Oppsummering")
    
    total = len(results)
    modified = sum(1 for r in results if r['modified'])
    skipped = sum(1 for r in results if r['skipped'])
    errors = sum(1 for r in results if r['error'])
    
    print(f"Totalt filer:          {total}")
    print(f"Modifisert:            {modified}")
    print(f"Skipped (embedded):    {skipped}")
    if errors > 0:
        print(f"Feil:                  {errors}")
    
    if args.dry_run:
        print("\n⚠️  DRY RUN - Kjør uten --dry-run for å endre")
    elif modified > 0:
        print("\n✅ Backup (.bak) opprettet")
    
    print("\n🎉 Ferdig!")
    
    if modified > 0 and not args.dry_run:
        print("\n📋 Neste steg:")
        print("1. Kopier CSS-filer til /assets/css/:")
        print("   - themes.css")
        print("   - sidebar-flyout-fix.css")
        print("   - sidebar-loader-theme-override.css (NYTT!)")
        print("   - navbar-theme-fix.css (NYTT!)")
        print("2. Kopier JS-filer til /assets/js/:")
        print("   - theme-switcher.js")
        print("   - flyout-theme-updater.js")
        print("3. Hard refresh: Ctrl+Shift+R")
        print("4. Test alle themes!")

if __name__ == '__main__':
    main()
