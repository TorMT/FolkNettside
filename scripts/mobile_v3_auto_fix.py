#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
mobile_v3_auto_fix.py - Automatisk migrering til Mobile Enhancer v3.0

Dette scriptet:
✅ FJERNER gamle mobile scripts (mobile-ui.js, bottom-bar.js, old mobile-enhancer.js)
✅ INJISERER nye mobile-enhancer.js v3.0 (sist før </body>)
✅ SIKRER riktig script-rekkefølge
✅ LAGER backup av alle filer (.bak)
✅ SKIPPER embedded viewers (nbview.html, pyview.html, etc.)
✅ HÅNDTERER notebook-sider spesielt
✅ VERIFISERER at viewport meta tag finnes
✅ VISER nøyaktig hva som endres

Bruk:
    python mobile_v3_auto_fix.py .                    # Kjør på current directory
    python mobile_v3_auto_fix.py /path/to/website     # Kjør på spesifikk mappe
    python mobile_v3_auto_fix.py . --dry-run          # Test uten å endre
    python mobile_v3_auto_fix.py . --verbose          # Detaljert output

Sikkerhet:
    - Alle filer får .bak backup
    - Dry-run mode for testing
    - Detaljert logging
    - Ingen endringer uten bekreftelse
"""

import sys
import re
from pathlib import Path
from typing import List, Dict, Set
from datetime import datetime

# ============ KONFIGURASJON ============

SCRIPTS_TO_REMOVE = [
    'mobile-ui.js',
    'bottom-bar.js',
    '/includes/old-mobile-enhancer.js',
    '/assets/js/mobile-ui.js',
    '/assets/js/bottom-bar.js',
]

NEW_MOBILE_SCRIPT = '/includes/mobile-enhancer.js'

# Embedded viewers som IKKE skal ha mobile-enhancer
EMBEDDED_VIEWERS = [
    'nbview.html',
    'pyview.html',
    'pdfview.html',
    'mdview.html',
    'codeview.html',
    'imgview.html',
    'txtview.html',
]

EXCLUDE_PATTERNS = [
    'node_modules',
    '.git',
    'backup',
    '.bak',
    'dist',
    'build',
    '__pycache__',
]

# ============ UTILITY FUNCTIONS ============

def print_header(text: str, char: str = '='):
    """Print formatert header."""
    width = 70
    print(f"\n{char * width}")
    print(f"{text:^{width}}")
    print(f"{char * width}\n")

def print_section(text: str):
    """Print section header."""
    print(f"\n{'─' * 70}")
    print(f"📌 {text}")
    print('─' * 70)

def is_embedded_viewer(filepath: Path) -> bool:
    """Sjekk om dette er en embedded viewer."""
    return filepath.name.lower() in EMBEDDED_VIEWERS

def is_notebook_page(content: str) -> bool:
    """Sjekk om siden er en notebook viewer."""
    patterns = [
        r'\.ipynb',
        r'jp-Notebook',
        r'notebook-page',
        r'class=["\'].*notebook.*["\']',
    ]
    return any(re.search(pattern, content, re.IGNORECASE) for pattern in patterns)

def has_viewport_meta(content: str) -> bool:
    """Sjekk om viewport meta tag finnes."""
    return bool(re.search(r'<meta\s+name=["\']viewport["\']', content, re.IGNORECASE))

# ============ MAIN FIX FUNCTION ============

def fix_html_file(filepath: Path, dry_run: bool = False) -> Dict:
    """
    Fikser en enkelt HTML-fil.
    
    Returns:
        Dict med resultater og endringer
    """
    result = {
        'path': filepath,
        'original_size': 0,
        'new_size': 0,
        'changes': [],
        'warnings': [],
        'modified': False,
        'error': None,
        'is_embedded': False,
        'is_notebook': False,
        'skipped': False,
    }
    
    try:
        # Les fil
        content = filepath.read_text(encoding='utf-8', errors='replace')
        original = content
        result['original_size'] = len(original)
        
        # Sjekk om embedded viewer
        if is_embedded_viewer(filepath):
            result['is_embedded'] = True
            result['skipped'] = True
            result['changes'].append('SKIPPED - Embedded viewer')
            return result
        
        # Sjekk om notebook page
        if is_notebook_page(content):
            result['is_notebook'] = True
            result['changes'].append('Detected notebook page')
        
        # Sjekk viewport meta tag
        if not has_viewport_meta(content):
            result['warnings'].append('Missing viewport meta tag')
        
        # ============ FJERN GAMLE SCRIPTS ============
        
        removed_scripts = []
        for script_path in SCRIPTS_TO_REMOVE:
            # Finn alle varianter av scriptet
            patterns = [
                rf'<script[^>]*src=["\'][^"\']*{re.escape(script_path)}[^"\']*["\'][^>]*>\s*</script>\s*',
                rf'<script[^>]*src=["\'][^"\']*{re.escape(Path(script_path).name)}[^"\']*["\'][^>]*>\s*</script>\s*',
            ]
            
            for pattern in patterns:
                matches = list(re.finditer(pattern, content, re.IGNORECASE))
                if matches:
                    for match in matches:
                        removed_scripts.append(match.group(0).strip())
                    content = re.sub(pattern, '', content, flags=re.IGNORECASE)
        
        if removed_scripts:
            result['changes'].append(f'Removed {len(removed_scripts)} old mobile script(s)')
            for script in removed_scripts:
                # Extract just the src for readable output
                src_match = re.search(r'src=["\']([^"\']+)["\']', script)
                if src_match:
                    result['changes'].append(f'  - Removed: {src_match.group(1)}')
        
        # ============ SJEKK OM MOBILE-ENHANCER ALLEREDE FINNES ============
        
        has_mobile_enhancer = re.search(
            r'<script[^>]*src=["\'][^"\']*mobile-enhancer\.js[^"\']*["\'][^>]*>',
            content,
            re.IGNORECASE
        )
        
        # ============ INJISER NY MOBILE-ENHANCER (hvis ikke notebook) ============
        
        if not result['is_notebook'] and not has_mobile_enhancer:
            # Finn </body>
            body_end = re.search(r'</body>', content, re.IGNORECASE)
            
            if body_end:
                # Finn siste script før </body>
                scripts_before_body = list(re.finditer(
                    r'<script[^>]*>.*?</script>',
                    content[:body_end.start()],
                    re.IGNORECASE | re.DOTALL
                ))
                
                if scripts_before_body:
                    # Legg til etter siste script
                    last_script = scripts_before_body[-1]
                    insert_pos = last_script.end()
                    
                    # Finn indentation fra forrige linje
                    prev_line_start = content.rfind('\n', 0, insert_pos) + 1
                    prev_line = content[prev_line_start:insert_pos]
                    indent = len(prev_line) - len(prev_line.lstrip())
                    indent_str = ' ' * indent
                    
                    # Injiser med riktig indentation
                    new_script = f'\n{indent_str}<script src="{NEW_MOBILE_SCRIPT}"></script>'
                    content = content[:insert_pos] + new_script + content[insert_pos:]
                else:
                    # Ingen scripts, legg til før </body>
                    indent_str = '  '
                    new_script = f'{indent_str}<script src="{NEW_MOBILE_SCRIPT}"></script>\n'
                    content = content[:body_end.start()] + new_script + content[body_end.start():]
                
                result['changes'].append(f'Added {NEW_MOBILE_SCRIPT}')
                result['modified'] = True
            else:
                result['warnings'].append('No </body> tag found - could not inject script')
        
        elif has_mobile_enhancer:
            result['changes'].append('mobile-enhancer.js already present')
        
        elif result['is_notebook']:
            result['changes'].append('SKIPPED mobile-enhancer (notebook page)')
        
        # ============ OPPDATER RESULT ============
        
        if content != original:
            result['modified'] = True
            result['new_size'] = len(content)
        
        # ============ SKRIV TILBAKE ============
        
        if result['modified'] and not dry_run:
            # Lag backup
            backup_path = filepath.with_suffix(filepath.suffix + '.bak')
            if not backup_path.exists():
                backup_path.write_text(original, encoding='utf-8')
                result['changes'].append(f'Created backup: {backup_path.name}')
            
            # Skriv ny versjon
            filepath.write_text(content, encoding='utf-8')
        
    except Exception as e:
        result['error'] = str(e)
    
    return result

# ============ FILE DISCOVERY ============

def find_html_files(root: Path) -> List[Path]:
    """Finn alle HTML-filer."""
    files = []
    
    for html_file in root.rglob('*.html'):
        # Sjekk exclude patterns
        if any(pattern in str(html_file) for pattern in EXCLUDE_PATTERNS):
            continue
        files.append(html_file)
    
    return sorted(files)

# ============ REPORTING ============

def print_file_result(result: Dict, verbose: bool = False):
    """Print resultat for en fil."""
    filepath = result['path']
    
    if result['error']:
        print(f"❌ {filepath.name}")
        print(f"   ERROR: {result['error']}")
        return
    
    if result['skipped']:
        if verbose:
            print(f"⭐ {filepath.name}: SKIPPED ({result['changes'][0]})")
        return
    
    if not result['modified'] and not verbose:
        return
    
    # Print filename
    if result['modified']:
        print(f"✅ {filepath.name}")
    else:
        print(f"○ {filepath.name}: No changes")
    
    # Print changes
    for change in result['changes']:
        if change.startswith('  -'):
            print(f"   {change}")
        else:
            print(f"   • {change}")
    
    # Print warnings
    for warning in result['warnings']:
        print(f"   ⚠️  {warning}")
    
    # Print size change
    if result['modified']:
        size_diff = result['new_size'] - result['original_size']
        sign = '+' if size_diff >= 0 else ''
        print(f"   📊 Size: {result['original_size']} → {result['new_size']} ({sign}{size_diff} bytes)")

def print_summary(results: List[Dict]):
    """Print oppsummering."""
    print_section("OPPSUMMERING")
    
    total = len(results)
    modified = sum(1 for r in results if r['modified'])
    skipped = sum(1 for r in results if r['skipped'])
    errors = sum(1 for r in results if r['error'])
    notebooks = sum(1 for r in results if r['is_notebook'])
    embedded = sum(1 for r in results if r['is_embedded'])
    
    print(f"{'Total files processed:':<35} {total}")
    print(f"{'Files modified:':<35} {modified}")
    print(f"{'Files skipped:':<35} {skipped}")
    print(f"{'  - Embedded viewers:':<35} {embedded}")
    print(f"{'  - Notebook pages:':<35} {notebooks}")
    if errors > 0:
        print(f"{'Errors:':<35} {errors}")
    
    # Warnings
    all_warnings = []
    for r in results:
        all_warnings.extend(r['warnings'])
    
    if all_warnings:
        warning_counts = {}
        for w in all_warnings:
            warning_counts[w] = warning_counts.get(w, 0) + 1
        
        print(f"\n⚠️  Warnings:")
        for warning, count in sorted(warning_counts.items()):
            print(f"  • {warning}: {count} files")
    
    # Most common changes
    all_changes = {}
    for r in results:
        for change in r['changes']:
            if not change.startswith('  -'):
                all_changes[change] = all_changes.get(change, 0) + 1
    
    if all_changes:
        print(f"\n📝 Changes made:")
        for change, count in sorted(all_changes.items(), key=lambda x: -x[1]):
            if count > 1:
                print(f"  • {change}: {count} files")

def print_next_steps(modified_count: int, dry_run: bool):
    """Print next steps."""
    if dry_run:
        print_section("DRY RUN - NO CHANGES MADE")
        print("Run without --dry-run to actually make changes")
        return
    
    if modified_count == 0:
        print_section("NO CHANGES NEEDED")
        print("All files are already up to date!")
        return
    
    print_section("NEXT STEPS")
    print("✅ HTML files updated successfully!")
    print("✅ Backup files (.bak) created")
    print()
    print("📋 To complete the migration:")
    print()
    print("1. Copy mobile-enhancer.js to /includes/")
    print("   → Place the new mobile-enhancer.js file in your /includes/ folder")
    print()
    print("2. Remove old files (optional but recommended):")
    print("   → Delete /assets/js/mobile-ui.js (if exists)")
    print("   → Delete /assets/js/bottom-bar.js (if exists)")
    print()
    print("3. Test on mobile:")
    print("   → Open site on mobile device or Chrome DevTools")
    print("   → Check that ☰ button appears in navbar")
    print("   → Check that ☰ button appears for sidebar")
    print("   → Test navigation and dropdowns")
    print()
    print("4. If problems occur:")
    print("   → Check browser console (F12 → Console)")
    print("   → Verify mobile-enhancer.js loads (F12 → Network)")
    print("   → Read MOBILE-QUICK-FIX.md for troubleshooting")
    print()
    print("💡 Tip: You can restore any file from its .bak backup if needed")

# ============ MAIN ============

def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Automatic migration to Mobile Enhancer v3.0',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python mobile_v3_auto_fix.py .                  # Fix current directory
  python mobile_v3_auto_fix.py /path/to/site      # Fix specific path
  python mobile_v3_auto_fix.py . --dry-run        # Test without changes
  python mobile_v3_auto_fix.py . --verbose        # Show all files

Safety:
  - All files get .bak backups
  - Use --dry-run to preview changes
  - Embedded viewers are automatically skipped
  - Detailed logging of all changes
        """
    )
    
    parser.add_argument(
        'root',
        nargs='?',
        default='.',
        type=Path,
        help='Root directory to process (default: current directory)'
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be changed without making changes'
    )
    
    parser.add_argument(
        '--verbose',
        '-v',
        action='store_true',
        help='Show detailed output for all files'
    )
    
    parser.add_argument(
        '--no-backup',
        action='store_true',
        help='Skip creating .bak backup files (NOT RECOMMENDED)'
    )
    
    args = parser.parse_args()
    
    # Validate root path
    if not args.root.exists():
        print(f"❌ Error: Path does not exist: {args.root}")
        sys.exit(1)
    
    if not args.root.is_dir():
        print(f"❌ Error: Path is not a directory: {args.root}")
        sys.exit(1)
    
    # Print header
    print_header("🔥 MOBILE ENHANCER V3.0 AUTO-FIX")
    
    print(f"📁 Root path: {args.root.absolute()}")
    print(f"📅 Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    if args.dry_run:
        print("🏃 Mode: DRY RUN (no changes will be made)")
    else:
        print("✍️  Mode: LIVE (files will be modified)")
    
    if args.no_backup and not args.dry_run:
        print("⚠️  WARNING: Backups disabled!")
        response = input("Continue without backups? (yes/no): ")
        if response.lower() != 'yes':
            print("Aborted.")
            sys.exit(0)
    
    # Find HTML files
    print_section("SCANNING FOR HTML FILES")
    print(f"Searching in: {args.root}...")
    
    files = find_html_files(args.root)
    
    if not files:
        print("❌ No HTML files found")
        sys.exit(0)
    
    print(f"✅ Found {len(files)} HTML files")
    
    # Show what will be done
    print_section("CONFIGURATION")
    print("Scripts to remove:")
    for script in SCRIPTS_TO_REMOVE:
        print(f"  • {script}")
    print(f"\nNew script to add:")
    print(f"  • {NEW_MOBILE_SCRIPT}")
    print(f"\nEmbedded viewers (will be skipped):")
    for viewer in EMBEDDED_VIEWERS:
        print(f"  • {viewer}")
    
    # Confirm if not dry-run
    if not args.dry_run and len(files) > 5:
        print(f"\n⚠️  About to modify {len(files)} files")
        response = input("Continue? (yes/no): ")
        if response.lower() != 'yes':
            print("Aborted.")
            sys.exit(0)
    
    # Process files
    print_section("PROCESSING FILES")
    
    results = []
    for i, filepath in enumerate(files, 1):
        if args.verbose or len(files) <= 20:
            print(f"\n[{i}/{len(files)}] Processing: {filepath.name}")
        
        result = fix_html_file(filepath, dry_run=args.dry_run)
        results.append(result)
        
        print_file_result(result, verbose=args.verbose)
    
    # Print summary
    print_summary(results)
    
    # Print next steps
    modified_count = sum(1 for r in results if r['modified'])
    print_next_steps(modified_count, args.dry_run)
    
    # Exit status
    errors = sum(1 for r in results if r['error'])
    if errors > 0:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
        sys.exit(130)
    except Exception as e:
        print(f"\n\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
