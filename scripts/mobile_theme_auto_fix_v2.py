#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
mobile_theme_auto_fix_v2.py - FORBEDRET versjon

Dette scriptet fikser:
✅ Legger til mobile-enhancer.js (v2.0) i alle HTML-filer
✅ Legger til theme-switcher.js (v2.1) i alle HTML-filer
✅ SKIPPER nbview.html, pyview.html og andre embedded viewers
✅ Legger til data-theme="default" på <html>
✅ Sikrer riktig CSS-rekkefølge
✅ Fikser sidebar/navbar klasser
✅ Håndterer ipynb-filer spesielt
✅ Legger til meta theme-color
✅ Sikrer UTF-8 encoding

Bruk:
    python mobile_theme_auto_fix_v2.py .
    python mobile_theme_auto_fix_v2.py --dry-run .
"""

import sys
import re
from pathlib import Path
from typing import List, Dict

def print_header(text):
    print(f"\n{'=' * 60}")
    print(f"{text:^60}")
    print(f"{'=' * 60}\n")

def is_notebook_page(filepath: Path) -> bool:
    """Sjekk om dette er en Jupyter notebook visning."""
    content = filepath.read_text(encoding='utf-8', errors='ignore')
    return (
        '.ipynb' in content.lower() or
        'jp-notebook' in content.lower() or
        'notebook-page' in content.lower()
    )

def is_embedded_viewer(filepath: Path) -> bool:
    """
    Sjekk om dette er en embedded viewer som ikke trenger theme-switcher.
    Disse sidene vises INNE i andre sider og skal ikke ha egne UI-elementer.
    """
    filename = filepath.name.lower()
    
    # Liste over filer som er embedded viewers
    embedded_files = [
        'nbview.html',      # Notebook viewer
        'pyview.html',      # Python file viewer
        'pdfview.html',     # PDF viewer
        'mdview.html',      # Markdown viewer
        'imgview.html',     # Image viewer
        'txtview.html',     # Text viewer
    ]
    
    return filename in embedded_files

def fix_html_file(filepath: Path, dry_run: bool = False) -> Dict:
    """Fikser en enkelt HTML-fil for mobil og themes."""
    result = {
        'path': filepath,
        'changes': [],
        'modified': False,
        'error': None,
        'is_notebook': False,
        'is_embedded': False,
        'skipped': False
    }
    
    try:
        content = filepath.read_text(encoding='utf-8', errors='ignore')
        original = content
        
        # Sjekk om dette er en embedded viewer
        is_embedded = is_embedded_viewer(filepath)
        result['is_embedded'] = is_embedded
        
        if is_embedded:
            result['skipped'] = True
            result['changes'].append('SKIPPED - Embedded viewer (no theme-switcher needed)')
            return result
        
        # Sjekk om dette er en notebook-side
        is_nb = is_notebook_page(filepath)
        result['is_notebook'] = is_nb
        
        # 1. Legg til UTF-8 meta tag hvis mangler
        if '<meta charset' not in content.lower():
            head_match = re.search(r'<head[^>]*>', content, re.IGNORECASE)
            if head_match:
                content = content[:head_match.end()] + \
                         '\n  <meta charset="UTF-8">' + \
                         content[head_match.end():]
                result['changes'].append('Lagt til UTF-8 meta tag')
                result['modified'] = True
        
        # 2. Legg til data-theme hvis mangler
        if 'data-theme' not in content:
            content = re.sub(
                r'<html\s+lang="no"([^>]*)>',
                r'<html lang="no" data-theme="default"\1>',
                content,
                flags=re.IGNORECASE
            )
            if content != original:
                result['changes'].append('Lagt til data-theme="default"')
                result['modified'] = True
        
        # 3. Legg til meta theme-color
        if 'meta name="theme-color"' not in content:
            viewport_match = re.search(
                r'<meta name="viewport"[^>]*>',
                content,
                re.IGNORECASE
            )
            if viewport_match:
                content = content[:viewport_match.end()] + \
                         '\n  <meta name="theme-color" content="#004f9f">' + \
                         content[viewport_match.end():]
                result['changes'].append('Lagt til meta theme-color')
                result['modified'] = True
        
        # 4. Legg til themes.css hvis mangler
        if 'themes.css' not in content:
            # Finn style.css og legg til themes.css etter
            style_match = re.search(
                r'(<link\s+rel="stylesheet"\s+href="[^"]*style\.css"[^>]*>)',
                content,
                re.IGNORECASE
            )
            if style_match:
                content = content[:style_match.end()] + \
                         '\n  <link rel="stylesheet" href="/assets/css/themes.css">' + \
                         content[style_match.end():]
                result['changes'].append('Lagt til themes.css')
                result['modified'] = True
        
        # 5. Legg til sidebar-flyout-fix.css hvis mangler
        if 'sidebar-flyout-fix.css' not in content:
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
        
        # 6. Legg til theme-switcher.js hvis mangler (IKKE på embedded viewers)
        if not is_embedded and 'theme-switcher' not in content:
            # Legg til før </body>
            body_end = re.search(r'</body>', content, re.IGNORECASE)
            if body_end:
                content = content[:body_end.start()] + \
                         '  <script src="/assets/js/theme-switcher.js"></script>\n' + \
                         content[body_end.start():]
                result['changes'].append('Lagt til theme-switcher.js')
                result['modified'] = True
        
        # 7. Legg til flyout-theme-updater.js hvis mangler
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
        
        # 8. Legg til mobile-enhancer.js hvis mangler (IKKE på notebook-sider eller embedded)
        if not is_nb and not is_embedded and 'mobile-enhancer.js' not in content:
            # Legg til før theme-switcher.js eller før </body>
            theme_switcher = re.search(
                r'<script\s+src="[^"]*theme-switcher\.js"[^>]*>',
                content,
                re.IGNORECASE
            )
            if theme_switcher:
                insert_pos = theme_switcher.start()
                content = content[:insert_pos] + \
                         '  <script src="/includes/mobile-enhancer.js"></script>\n' + \
                         content[insert_pos:]
            else:
                body_end = re.search(r'</body>', content, re.IGNORECASE)
                if body_end:
                    content = content[:body_end.start()] + \
                             '  <script src="/includes/mobile-enhancer.js"></script>\n' + \
                             content[body_end.start():]
            result['changes'].append('Lagt til mobile-enhancer.js')
            result['modified'] = True
        elif is_nb or is_embedded:
            result['changes'].append('SKIPPED mobile-enhancer (notebook/embedded page)')
        
        # 9. Sikre klasser på sidebar (IKKE på notebook-sider eller embedded)
        if not is_nb and not is_embedded and '<aside' in content and 'class="sidebar"' not in content:
            content = re.sub(
                r'<aside([^>]*)>',
                r'<aside class="sidebar"\1>',
                content,
                flags=re.IGNORECASE
            )
            if content != original:
                result['changes'].append('Lagt til class="sidebar" på <aside>')
                result['modified'] = True
        
        # 10. Legg til notebook-marker hvis notebook-side
        if is_nb and 'notebook-page' not in content:
            body_match = re.search(r'<body([^>]*)>', content, re.IGNORECASE)
            if body_match:
                body_tag = body_match.group(0)
                if 'class=' in body_tag:
                    content = re.sub(
                        r'<body([^>]*class=")([^"]*)"',
                        r'<body\1\2 notebook-page"',
                        content,
                        flags=re.IGNORECASE
                    )
                else:
                    content = re.sub(
                        r'<body([^>]*)>',
                        r'<body class="notebook-page"\1>',
                        content,
                        flags=re.IGNORECASE
                    )
                if content != original:
                    result['changes'].append('Lagt til notebook-page class')
                    result['modified'] = True
        
        # 11. Skriv tilbake hvis modifisert
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

def print_summary(results: List[Dict]):
    """Print en fin oppsummering."""
    print_header("📊 Oppsummering")
    
    total = len(results)
    modified = sum(1 for r in results if r['modified'])
    errors = sum(1 for r in results if r['error'])
    notebooks = sum(1 for r in results if r['is_notebook'])
    embedded = sum(1 for r in results if r['is_embedded'])
    skipped = sum(1 for r in results if r['skipped'])
    
    print(f"{'Totalt filer prosessert:':<30} {total}")
    print(f"{'Filer modifisert:':<30} {modified}")
    print(f"{'Notebook-sider:':<30} {notebooks}")
    print(f"{'Embedded viewers (skipped):':<30} {embedded}")
    print(f"{'Totalt skipped:':<30} {skipped}")
    if errors > 0:
        print(f"{'Feil:':<30} {errors}")
    
    # Grupper endringer
    all_changes = {}
    for r in results:
        for change in r['changes']:
            all_changes[change] = all_changes.get(change, 0) + 1
    
    if all_changes:
        print("\n" + "─" * 60)
        print("Endringer gjort:")
        for change, count in sorted(all_changes.items(), key=lambda x: -x[1]):
            print(f"  • {change}: {count} filer")

def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Auto-fiks mobil og theme problemer (v2 - SKIPPER embedded viewers)'
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
        '--verbose',
        '-v',
        action='store_true',
        help='Vis detaljert output'
    )
    
    args = parser.parse_args()
    
    # Header
    print_header("🔥 Mobil & Theme Auto-Fix v2.1")
    
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
        if args.verbose or result['error'] or result['modified'] or result['skipped']:
            if result['error']:
                print(f"❌ {filepath.name}: {result['error']}")
            elif result['skipped']:
                print(f"⏭️  {filepath.name}: SKIPPED (embedded viewer)")
            elif result['modified']:
                print(f"✓ {filepath.name}:")
                for change in result['changes']:
                    print(f"   - {change}")
                if result['is_notebook']:
                    print(f"   📓 Notebook page")
                if result['is_embedded']:
                    print(f"   📦 Embedded viewer")
            elif args.verbose:
                print(f"○ {filepath.name}: ingen endringer")
    
    # Summary
    print_summary(results)
    
    if args.dry_run:
        print("\n⚠️  DRY RUN - Kjør uten --dry-run for å faktisk endre")
    elif sum(1 for r in results if r['modified']) > 0:
        print("\n✅ Backup-filer (.bak) er opprettet")
    
    print("\n🎉 Ferdig!")
    
    if sum(1 for r in results if r['modified']) > 0 and not args.dry_run:
        print("\n📋 Neste steg:")
        print("1. Kopier theme-switcher-v2.1.js til /assets/js/theme-switcher.js")
        print("2. Kopier flyout-theme-updater.js til /assets/js/")
        print("3. Kopier sidebar-flyout-fix.css til /assets/css/")
        print("4. Test siden din")
        print("5. Sjekk at det kun er ÉN 🎨-knapp")
        print("6. Test flyout theme-bytte")
        print("\n💡 Hvis fortsatt duplikater:")
        print("   - Kjør: python cleanup_duplicates.py .")

if __name__ == '__main__':
    main()
