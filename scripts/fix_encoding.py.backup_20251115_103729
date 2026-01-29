#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fix_encoding.py - Fikser UTF-8 encoding-problemer i HTML-filer

Dette scriptet finner og fikser vanlige encoding-problemer som:
- â€¢ → •
- Ã¸ → ø
- Ã¥ → å
- â€" → –
osv.

Bruk:
    python fix_encoding.py [mappe]
    python fix_encoding.py .  # Fikser alle HTML-filer i nåværende mappe
"""

import sys
import re
from pathlib import Path
from typing import Dict, List, Tuple

# Vanlige encoding-feil og deres riktige verdier
ENCODING_FIXES: Dict[str, str] = {
    # Norwegian characters
    'Ã¥': 'å',
    'Ã¦': 'æ',
    'Ã¸': 'ø',
    'Ã…': 'Å',
    'Ã†': 'Æ',
    'Ã˜': 'Ø',
    
    # Special characters
    'â€¢': '•',
    'â€"': '–',
    'â€"': '—',
    'â€˜': ''',
    'â€™': ''',
    'â€œ': '"',
    'â€': '"',
    'â€¦': '…',
    'â‚¬': '€',
    
    # Combined characters
    'Ã¸ving': 'øving',
    'Ã˜ving': 'Øving',
    'mÃ¥': 'må',
    'fÃ¥': 'få',
    'sÃ¥': 'så',
    'nÃ¥': 'nå',
    'pÃ¥': 'på',
    'fÃ¸r': 'før',
    'gÃ¥': 'gå',
    'bÃ¥de': 'både',
    
    # HTML entities that got double-encoded
    '&acirc;&#128;&#147;': '–',
    '&Atilde;&cedil': 'ø',
    '&Atilde;&yen': 'å',
    '&Atilde;&brvbar': 'æ',
}

def fix_encoding(text: str) -> Tuple[str, int]:
    """
    Fikser encoding-problemer i tekst.
    
    Returns:
        (fixed_text, num_fixes)
    """
    original = text
    fixes = 0
    
    # Apply all fixes
    for wrong, correct in ENCODING_FIXES.items():
        if wrong in text:
            count = text.count(wrong)
            text = text.replace(wrong, correct)
            fixes += count
    
    return text, fixes

def process_file(filepath: Path, dry_run: bool = False) -> bool:
    """
    Prosesserer en enkelt fil.
    
    Returns:
        True hvis filen ble endret
    """
    try:
        # Les fil - prøv UTF-8 først, deretter latin-1
        try:
            content = filepath.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            content = filepath.read_text(encoding='latin-1')
        
        # Fiks encoding
        fixed_content, num_fixes = fix_encoding(content)
        
        if num_fixes > 0:
            print(f"  📝 {filepath.name}: {num_fixes} fixes")
            
            if not dry_run:
                # Lag backup først
                backup = filepath.with_suffix(filepath.suffix + '.bak')
                if not backup.exists():
                    backup.write_text(content, encoding='utf-8')
                
                # Skriv fikset innhold
                filepath.write_text(fixed_content, encoding='utf-8')
            
            return True
        
        return False
        
    except Exception as e:
        print(f"  ❌ Feil ved prosessering av {filepath.name}: {e}")
        return False

def find_html_files(root: Path) -> List[Path]:
    """Finner alle HTML-filer rekursivt."""
    return list(root.rglob('*.html'))

def main():
    """Main function."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Fikser UTF-8 encoding-problemer i HTML-filer'
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
    
    print(f"\n🔍 Fant {len(files)} HTML-filer")
    if args.dry_run:
        print("🏃 DRY RUN - ingen endringer vil bli gjort\n")
    else:
        print("✏️  Fikser encoding-problemer...\n")
    
    # Process files
    total_fixed = 0
    for filepath in files:
        if process_file(filepath, args.dry_run):
            total_fixed += 1
    
    # Summary
    print(f"\n{'=' * 50}")
    if args.dry_run:
        print(f"✓ Ville ha fikset {total_fixed} filer")
        print("  Kjør uten --dry-run for å faktisk fikse")
    else:
        print(f"✓ Fikset {total_fixed} av {len(files)} filer")
        if total_fixed > 0:
            print("  Backup-filer (.bak) er opprettet")
    print(f"{'=' * 50}\n")

if __name__ == '__main__':
    main()
