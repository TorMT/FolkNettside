#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
install.py - Automatisk installasjon av FolkNettsideFolk Theme System

Denne scriptet:
1. Oppretter mapper
2. Kopierer filer til riktige plasseringer
3. Tar backup av eksisterende filer
4. Verifiserer installasjonen
5. Gir tydelig feedback

Bruk:
    python install.py
    python install.py --dry-run    # Vis hva som vil skje
    python install.py --no-backup  # Ikke ta backup
"""

import sys
import os
import shutil
from pathlib import Path
from datetime import datetime
import argparse

# Farger for terminal output
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    BOLD = '\033[1m'
    END = '\033[0m'

def print_header(text):
    print(f"\n{Colors.BOLD}{Colors.BLUE}{'=' * 60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{text:^60}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.BLUE}{'=' * 60}{Colors.END}\n")

def print_success(text):
    print(f"{Colors.GREEN}✓ {text}{Colors.END}")

def print_warning(text):
    print(f"{Colors.YELLOW}⚠ {text}{Colors.END}")

def print_error(text):
    print(f"{Colors.RED}✗ {text}{Colors.END}")

def print_info(text):
    print(f"{Colors.BLUE}ℹ {text}{Colors.END}")

# Filmapping: source -> destination
FILE_MAPPINGS = {
    # CSS-filer
    'themes.css': 'assets/css/themes.css',
    
    # JavaScript-filer
    'theme-switcher.js': 'assets/js/theme-switcher.js',
    'mobile-enhancer.js': 'includes/mobile-enhancer.js',
    
    # HTML-templates
    'navbar-enhanced.html': 'includes/navbar.html',
    'sidebar-enhanced.html': 'includes/sidebar.html',
    'course-template-with-themes.html': 'course-template.html',
    
    # Verktøy
    'theme-creator.html': 'tools/theme-creator.html',
    
    # Python-scripts
    'fix_encoding.py': 'scripts/fix_encoding.py',
    'inject_themes.py': 'scripts/inject_themes.py',
    'bulk_update.py': 'scripts/bulk_update.py',
    
    # Dokumentasjon
    'MASTER_GUIDE.md': 'docs/MASTER_GUIDE.md',
    'THEMES_README.md': 'docs/THEMES_README.md',
    'EASY_THEME_GUIDE.md': 'docs/EASY_THEME_GUIDE.md',
    'IMPROVEMENTS.md': 'docs/IMPROVEMENTS.md',
    'INSTALL.md': 'docs/INSTALL.md',
}

def create_directories(dry_run=False):
    """Oppretter nødvendige mapper."""
    directories = [
        'assets/css',
        'assets/js',
        'includes',
        'tools',
        'scripts',
        'docs'
    ]
    
    print_header("Oppretter mapper")
    
    for directory in directories:
        path = Path(directory)
        if path.exists():
            print_info(f"{directory} finnes allerede")
        else:
            if not dry_run:
                path.mkdir(parents=True, exist_ok=True)
            print_success(f"Opprettet {directory}")
    
    return True

def backup_file(filepath, dry_run=False):
    """Tar backup av en fil."""
    if not filepath.exists():
        return None
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = filepath.with_suffix(f'{filepath.suffix}.backup_{timestamp}')
    
    if not dry_run:
        shutil.copy2(filepath, backup_path)
    
    return backup_path

def install_files(dry_run=False, no_backup=False):
    """Kopierer filer til riktige plasseringer."""
    print_header("Installerer filer")
    
    source_dir = Path(__file__).parent
    installed = 0
    backed_up = 0
    skipped = 0
    
    for source_name, dest_path in FILE_MAPPINGS.items():
        source = source_dir / source_name
        dest = Path(dest_path)
        
        # Sjekk om source finnes
        if not source.exists():
            print_warning(f"Finner ikke {source_name}, hopper over")
            skipped += 1
            continue
        
        # Backup eksisterende fil
        if dest.exists() and not no_backup:
            backup_path = backup_file(dest, dry_run)
            if backup_path and not dry_run:
                print_info(f"Backup: {dest.name} → {backup_path.name}")
                backed_up += 1
        
        # Kopier fil
        if not dry_run:
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, dest)
        
        print_success(f"Installert: {source_name} → {dest_path}")
        installed += 1
    
    print(f"\n{Colors.BOLD}Installert: {installed} filer{Colors.END}")
    if backed_up > 0:
        print(f"{Colors.BOLD}Backup tatt: {backed_up} filer{Colors.END}")
    if skipped > 0:
        print(f"{Colors.BOLD}Hoppet over: {skipped} filer{Colors.END}")
    
    return installed > 0

def verify_installation():
    """Verifiserer at installasjonen er OK."""
    print_header("Verifiserer installasjon")
    
    critical_files = [
        'assets/css/themes.css',
        'assets/js/theme-switcher.js',
    ]
    
    recommended_files = [
        'includes/navbar.html',
        'includes/sidebar.html',
        'tools/theme-creator.html',
    ]
    
    all_ok = True
    
    print(f"{Colors.BOLD}Kritiske filer:{Colors.END}")
    for filepath in critical_files:
        path = Path(filepath)
        if path.exists():
            size = path.stat().st_size / 1024
            print_success(f"{filepath} ({size:.1f} KB)")
        else:
            print_error(f"{filepath} mangler!")
            all_ok = False
    
    print(f"\n{Colors.BOLD}Anbefalte filer:{Colors.END}")
    for filepath in recommended_files:
        path = Path(filepath)
        if path.exists():
            size = path.stat().st_size / 1024
            print_success(f"{filepath} ({size:.1f} KB)")
        else:
            print_warning(f"{filepath} ikke funnet (valgfri)")
    
    return all_ok

def print_next_steps():
    """Viser neste steg etter installasjon."""
    print_header("Neste steg")
    
    steps = [
        "1. Oppdater dine HTML-filer:",
        "   python scripts/inject_themes.py .",
        "",
        "2. Start lokal server:",
        "   python -m http.server 8000",
        "",
        "3. Åpne i browser:",
        "   http://localhost:8000",
        "",
        "4. Sjekk at 🎨-knappen vises nede til høyre",
        "",
        "5. Test theme-bytte!",
        "",
        "6. Åpne verktøy:",
        "   - Theme Creator: http://localhost:8000/tools/theme-creator.html",
        "",
        "📖 Les INSTALL.md for full veiledning"
    ]
    
    for step in steps:
        print(step)

def main():
    parser = argparse.ArgumentParser(
        description='Installer FolkNettsideFolk Theme System'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Vis hva som vil skje uten å faktisk gjøre endringer'
    )
    parser.add_argument(
        '--no-backup',
        action='store_true',
        help='Ikke ta backup av eksisterende filer'
    )
    
    args = parser.parse_args()
    
    # Header
    print(f"""
{Colors.BOLD}{Colors.BLUE}
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║     FolkNettsideFolk Theme System Installer v2.0.0     ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
{Colors.END}
""")
    
    if args.dry_run:
        print_warning("DRY RUN MODE - Ingen endringer vil bli gjort\n")
    
    # Sjekk at vi er i riktig mappe
    if not Path('index.html').exists() and not Path('semestre').exists():
        print_error("Dette ser ikke ut til å være prosjektmappen din!")
        print_info("Naviger til prosjektmappen først:")
        print_info("  cd /path/to/DIN-PROSJEKTMAPPE")
        print_info("  python install.py")
        sys.exit(1)
    
    try:
        # 1. Opprett mapper
        if not create_directories(args.dry_run):
            print_error("Kunne ikke opprette mapper")
            sys.exit(1)
        
        # 2. Installer filer
        if not install_files(args.dry_run, args.no_backup):
            print_error("Kunne ikke installere filer")
            sys.exit(1)
        
        if args.dry_run:
            print_warning("\nDette var en DRY RUN - ingen endringer ble gjort")
            print_info("Kjør uten --dry-run for å faktisk installere")
            sys.exit(0)
        
        # 3. Verifiser
        if not verify_installation():
            print_warning("\nNoen kritiske filer mangler!")
            print_info("Kjør scriptet på nytt eller installer manuelt")
            sys.exit(1)
        
        # 4. Success!
        print_header("Installasjon fullført! 🎉")
        print_next_steps()
        
    except KeyboardInterrupt:
        print_error("\n\nInstallasjon avbrutt av bruker")
        sys.exit(1)
    except Exception as e:
        print_error(f"\n\nFeil under installasjon: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
