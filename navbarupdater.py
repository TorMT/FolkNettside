#!/usr/bin/env python3
"""
navbarupdater.py — CLI for å oppdatere index.json, generere nye fagsider,
oppdatere navbar og legge til semester-knapper.

Før du kjører `add-course` eller `add-semester`, opprett `course-template.html` i roten.

Bruk:
  cd Z:/path/til/prosjekt
  pip install beautifulsoup4 tqdm

  # oppdater index.json:
  python navbarupdater.py update-index [root]

  # legg til nytt semester:
  python navbarupdater.py add-semester <nummer>

  # generer kurs-side + navbar:
  python navbarupdater.py add-course <semester> <slug> "<Tittel>" "<Beskrivelse>"

  # bulk fra courses.json:
  python navbarupdater.py bulk
"""

import argparse
import json
import os
import re
from pathlib import Path
from bs4 import BeautifulSoup

try:
    from tqdm import tqdm
except ModuleNotFoundError:
    tqdm = None

# --- index.json-konfig ----------------------------------------------------
OVING_RE = re.compile(r"^(?:øving|oving)0*(\d+)$", re.IGNORECASE)
ALLOWED_EXT = {'.py', '.pdf', '.ipynb'}
IMAGE_EXT = {'.jpg', '.jpeg', '.png', '.gif'}
LOCAL_ONLY_BLOCK_RE = re.compile(
    r'<!--\s*LOCAL-ONLY-START:\s*([A-Za-z0-9_-]+)\s*-->(.*?)<!--\s*LOCAL-ONLY-END:\s*\1\s*-->',
    re.DOTALL,
)


def clean_name(name: str) -> str:
    """Fjerner ledende spesialtegn fra navn."""
    return re.sub(r"^[^0-9A-Za-zÆØÅæøå]+", '', name)


def listdir(path: Path, use_progress: bool):
    """Returnerer sortert liste over entries, med optional progress bar."""
    entries = sorted(path.iterdir(), key=lambda p: p.name.lower())
    if use_progress and tqdm:
        return tqdm(entries, desc=str(path), unit='item', leave=False)
    return entries


def update_directory(root: Path, use_progress: bool = True):
    """Oppdaterer alle index.json-filer rekursivt fra root."""
    for dirpath, _, _ in os.walk(root):
        update_index(Path(dirpath), use_progress)
    print('✓ Ferdig oppdatert index.json-filer')


def update_index(dir_path: Path, use_progress: bool):
    """Genererer eller oppdaterer index.json for en enkelt mappe."""
    index = {}
    
    # Finn velkomstbilde (meme)
    for e in listdir(dir_path, False):
        if e.is_file() and e.suffix.lower() in IMAGE_EXT and 'meme' in e.name.lower():
            index['welcome'] = e.name
            break
    
    # Prosesser filer og mapper
    for e in listdir(dir_path, use_progress):
        if e.name.lower() == 'index.json':
            continue
            
        if e.is_dir():
            raw = clean_name(e.name)
            m = OVING_RE.match(raw)
            update_index(e, use_progress)
            
            # Finn alle relevante filer i undermappen
            files = [
                f for f in sorted(e.rglob('*')) 
                if f.is_file() and f.suffix.lower() in ALLOWED_EXT
            ]
            
            if files:
                key = f"oving{int(m.group(1)):02d}" if m else raw
                rel_paths = [str(f.relative_to(dir_path)) for f in files]
                index.setdefault(key, []).extend(rel_paths)
                
        elif e.suffix.lower() in ALLOWED_EXT:
            raw = clean_name(e.stem)
            m = OVING_RE.match(raw)
            key = f"oving{int(m.group(1)):02d}" if m else raw
            index.setdefault(key, []).append(e.name)
    
    # Sorter fillistene
    for v in index.values():
        if isinstance(v, list):
            v.sort()
    
    # Bygg ordnet output: welcome først, så øvinger, så resten alfabetisk
    ordered = {}
    if 'welcome' in index:
        ordered['welcome'] = index.pop('welcome')
    
    oving_keys = sorted([k for k in index if k.startswith('oving')])
    for k in oving_keys:
        ordered[k] = index.pop(k)
    
    for k in sorted(index):
        ordered[k] = index[k]

    # Skriv til fil hvis endret
    idx_file = dir_path / 'index.json'
    text = json.dumps(ordered, indent=2, ensure_ascii=False) + '\n'
    
    if not idx_file.exists() or idx_file.read_text(encoding='utf-8') != text:
        idx_file.write_text(text, encoding='utf-8')
        print(f'✓ Oppdatert {dir_path / "index.json"}')


# --- side- og navbar-funksjoner -----------------------------------------

def normalize_course_code(raw: str) -> str:
    return str(raw or '').strip().upper()


def generate_page(template: Path, out: Path, title: str, desc: str, course_code: str = ''):
    """Genererer en ny fagside fra template."""
    if not template.exists():
        print(f"✗ Template ikke funnet: {template}")
        print("  Oppretter standard HTML-mal...")
        return generate_default_page(out, title, desc, course_code)
    
    tpl = template.read_text(encoding='utf-8')
    code = normalize_course_code(course_code)
    html = (
        tpl
        .replace('{{TITLE}}', title)
        .replace('{{DESCRIPTION}}', desc)
        .replace('{{COURSE_CODE}}', code)
    )
    
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding='utf-8')
    print(f'✓ Opprettet side: {out}')
    return True


def generate_default_page(out: Path, title: str, desc: str, course_code: str = ''):
    """Genererer en standard fagside hvis template mangler."""
    # Les HTML template fra fil eller bruk hardkodet versjon
    html_content = '''<!DOCTYPE html>
<html lang="no" data-theme="default">
<head>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-BJ41MZJP0L"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-BJ41MZJP0L');
</script>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#004f9f">
  <meta name="description" content="{{DESCRIPTION}}">
  <meta name="course-code" content="{{COURSE_CODE}}">
  <meta name="karakterweb-url-template" content="https://www.karakterweb.no/ntnu/{course_code}">
  <title>{{TITLE}} - Studieressurser</title>

  <!-- Preload kritiske ressurser for raskere lasting -->
  <link rel="preload" href="/assets/css/style.css" as="style">
  <link rel="preload" href="/includes/sidebar-html-loader.js" as="script">
  <link rel="preload" href="/includes/sidebar-loader.js" as="script">
  
  <!-- Favicon (legg til hvis du har) -->
  <!-- <link rel="icon" type="image/svg+xml" href="/favicon.svg"> -->

  <!-- CSS - VIKTIG REKKEFØLGE! -->
  <link rel="stylesheet" href="/assets/css/style.css?v=4">
  <link rel="stylesheet" href="/assets/css/themes.css?v=4">
  <link rel="stylesheet" href="/assets/css/sidebar-flyout-fix.css?v=4">
  <link rel="stylesheet" href="/assets/css/sidebar-loader-theme-override.css?v=4">
  <link rel="stylesheet" href="/assets/css/navbar-theme-fix.css?v=4">
  
  <!-- ✨ QUIZ THEME CSS-FILER ✨ -->
  <link rel="stylesheet" href="/assets/css/themes-quiz-extension.css?v=1">
  <link rel="stylesheet" href="/assets/css/quiz-theme-fix.css?v=1">
  
  <link rel="stylesheet" href="/assets/css/mobile.css?v=3">

  <!-- MathJax for LaTeX-støtte i quiz (KRITISK!) -->
  <script>
    window.MathJax = {
      tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']],
        processEscapes: true,
        processEnvironments: true
      },
      options: {
        skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre']
      },
      startup: {
        pageReady: () => {
          return MathJax.startup.defaultPageReady().then(() => {
            console.log('[MathJax] Klar!');
          });
        }
      }
    };
  </script>
  <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js" async></script>
</head>
<body>
  <!-- Fallback for brukere uten JavaScript -->
  <noscript>
    <div style="padding: 2rem; background: #fff3cd; border: 2px solid #ffc107; margin: 1rem; border-radius: 8px;">
      <strong>⚠️ JavaScript er deaktivert</strong>
      <p>Denne siden krever JavaScript for full funksjonalitet. Vennligst aktiver JavaScript i nettleseren din.</p>
    </div>
  </noscript>

  <div id="navbar" class="navbar"></div>

  <div class="wrapper">
    <!-- Tom sidebar - fylles av sidebar-html-loader.js fra sidebar.html -->
    <aside class="sidebar" id="sidebar"></aside>
    
    <main class="content">
      <h1>{{TITLE}}</h1>
      <p class="course-description">
        {{DESCRIPTION}}
      </p>

      <!-- Velkomstbilde/quiz welcome container -->
      <div id="welcome-container" style="text-align: center;">
        <!-- Fylles av sidebar-loader.js -->
      </div>

      <!-- Viewer/Quiz containers -->
      <div id="quiz-container" style="display:none"></div>
      <div id="pdf-viewer-container" style="display:none">
        <object id="pdf-viewer" type="application/pdf" data=""></object>
      </div>
    </main>
  </div>

  <!-- Hent navbar-markup med feilhåndtering -->
  <script>
    fetch('/includes/navbar.html', { cache: 'no-store' })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.text();
      })
      .then(t => { 
        document.getElementById('navbar').innerHTML = t; 
      })
      .catch(err => {
        console.error('[navbar] Kunne ikke laste navbar:', err);
        document.getElementById('navbar').innerHTML = '<div style="padding:1rem;background:#f8d7da;color:#721c24;">⚠️ Navbar kunne ikke lastes</div>';
      });
  </script>

  <!-- =====================================================
       SCRIPTS - KRITISK REKKEFØLGE!
       ===================================================== -->
  
  <!-- 1. SIDEBAR MODULER (må lastes FØR sidebar-loader) -->
  <script src="/includes/sidebar-search-module.js?v=1"></script>
  <script src="/includes/sidebar-notifications-module.js?v=1.2"></script>
  
  <!-- 2. SIDEBAR SYSTEM (NY VERSJON v11.11.0 med modulstøtte) -->
  <script src="/includes/sidebar-html-loader.js"></script>
  <script src="/includes/sidebar-loader.js?v=11.16.1"></script>
  
  <!-- 3. Theme system -->
  <script src="/assets/js/theme-switcher.js?v=4"></script>
  <script src="/assets/js/flyout-theme-updater.js?v=4"></script>
  
  <!-- 4. Mobile UI (defer for raskere initial load) -->
  <script src="/includes/mobile-enhancer.js?v=3" defer></script>

  <!-- Analytics eller annen tracking (hvis du bruker det) -->
  <!-- <script src="/assets/js/analytics.js" defer></script> -->
</body>
</html>'''
    
    # Replace placeholders
    code = normalize_course_code(course_code)
    html = (
        html_content
        .replace('{{TITLE}}', title)
        .replace('{{DESCRIPTION}}', desc)
        .replace('{{COURSE_CODE}}', code)
    )
    
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding='utf-8')
    print(f'✓ Opprettet side med standard mal: {out}')
    return True


def find_dropdown_header(dropdown):
    """Finner header-elementet i en dropdown (enten a eller button)."""
    return (
        dropdown.find('a', class_='dropbtn') or 
        dropdown.find('button', class_='dropbtn') or
        dropdown.find('a') or
        dropdown.find('button')
    )


def extract_local_only_blocks(raw_html: str):
    """Hent ut blokker som skal bevares 1:1 mellom oppdateringer."""
    blocks = {}
    for m in LOCAL_ONLY_BLOCK_RE.finditer(raw_html):
        name = m.group(1).strip()
        blocks[name] = m.group(0)
    return blocks


def restore_local_only_blocks(original_html: str, generated_html: str, skip_names=None) -> str:
    """Erstatt LOCAL-ONLY-blokker i generert html med originalt innhold."""
    blocks = extract_local_only_blocks(original_html)
    if not blocks:
        return generated_html
    skip = {str(x).strip() for x in (skip_names or [])}

    def repl(match):
        name = match.group(1).strip()
        if name in skip:
            return match.group(0)
        return blocks.get(name, match.group(0))

    return LOCAL_ONLY_BLOCK_RE.sub(repl, generated_html)


def write_navbar_preserving_local_only(nav: Path, soup: BeautifulSoup, original_html: str, skip_names=None):
    """Skriv navbar-filen og behold side-spesifikke LOCAL-ONLY-blokker."""
    generated = str(soup)
    merged = restore_local_only_blocks(original_html, generated, skip_names=skip_names)
    nav.write_text(merged, encoding='utf-8')


def update_navbar(nav: Path, sem: str, slug: str, title: str):
    """Legger til et nytt kurs i navbar under riktig semester."""
    if not nav.exists():
        print(f"✗ Navbar ikke funnet: {nav}")
        return False
    
    original_html = nav.read_text(encoding='utf-8')
    soup = BeautifulSoup(original_html, 'html.parser')
    heading = f"{sem}. Semester"
    
    # Finn riktig semester-dropdown
    target = None
    for dropdown in soup.select('.navbar-left .dropdown'):
        header = find_dropdown_header(dropdown)
        if header and header.text.strip() == heading:
            target = dropdown
            break
    
    if not target:
        print(f"✗ Fant ikke '{heading}' i navbar.html")
        print(f"  Tips: Kjør 'python navbarupdater.py add-semester {sem}' først")
        return False
    
    # Sjekk om lenke allerede eksisterer
    href = f"/semestre/{sem}/{slug}/index.html"
    if target.select_one(f".dropdown-content a[href='{href}']"):
        print(f"— Lenke {href} finnes allerede")
        return True
    
    # Lag ny lenke
    a = soup.new_tag('a', href=href)
    a['role'] = 'menuitem'
    a.string = title
    
    # Legg til i dropdown
    dropdown_content = target.select_one('.dropdown-content')
    dropdown_content.append('\n        ')
    dropdown_content.append(a)
    
    write_navbar_preserving_local_only(
        nav,
        soup,
        original_html,
        skip_names={'NAVBAR_LEFT_SEMESTERS'},
    )
    print(f"✓ Oppdatert navbar: la til {title} i {heading}")
    return True


def add_semester(nav: Path, base: Path, sem: str):
    """Legger til et nytt semester i navbar og oppretter mappe."""
    if not nav.exists():
        print(f"✗ Navbar ikke funnet: {nav}")
        return False
    
    original_html = nav.read_text(encoding='utf-8')
    soup = BeautifulSoup(original_html, 'html.parser')
    left = soup.select_one('.navbar-left')
    
    if not left:
        print("✗ Fant ikke '.navbar-left' i navbar.html")
        return False
    
    heading = f"{sem}. Semester"
    
    # Sjekk om semester allerede eksisterer
    existing = None
    for dropdown in left.select('div.dropdown'):
        header = find_dropdown_header(dropdown)
        if header and header.text.strip() == heading:
            existing = dropdown
            break
    
    if existing:
        # Flytt til slutt
        existing.extract()
        left.append(existing)
        print(f"— Flyttet semester {sem} til slutt")
    else:
        # Opprett ny dropdown
        html = f"""
<div class='dropdown'>
  <button class='dropbtn' aria-haspopup='true' aria-expanded='false'>
    {sem}. Semester
  </button>
  <div class='dropdown-content' role='menu'></div>
</div>
"""
        frag = BeautifulSoup(html, 'html.parser').div
        left.append('\n    ')
        left.append(frag)
        print(f"✓ La til semester {sem} i navbar")
    
    # Opprett mappe
    sem_path = base / sem
    sem_path.mkdir(parents=True, exist_ok=True)
    print(f"✓ Opprettet mappe 'semestre/{sem}'")
    
    write_navbar_preserving_local_only(
        nav,
        soup,
        original_html,
        skip_names={'NAVBAR_LEFT_SEMESTERS'},
    )
    return True


# --- CLI ---------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description='Verktøy for å administrere fagsider og navbar'
    )
    subparsers = parser.add_subparsers(dest='cmd', help='Tilgjengelige kommandoer')
    
    # update-index
    update_parser = subparsers.add_parser(
        'update-index',
        help='Oppdater index.json-filer rekursivt'
    )
    update_parser.add_argument(
        'root',
        nargs='?',
        default='.',
        type=Path,
        help='Rotmappe (standard: nåværende mappe)'
    )
    
    # add-semester
    semester_parser = subparsers.add_parser(
        'add-semester',
        help='Legg til nytt semester i navbar'
    )
    semester_parser.add_argument('semester', help='Semesternummer (f.eks. 3)')
    
    # add-course
    course_parser = subparsers.add_parser(
        'add-course',
        help='Legg til nytt kurs'
    )
    course_parser.add_argument('semester', help='Semesternummer')
    course_parser.add_argument('slug', help='URL-vennlig navn (f.eks. matte3)')
    course_parser.add_argument('title', help='Fullt kursnavn')
    course_parser.add_argument(
        'description',
        nargs='?',
        default='',
        help='Kursbeskrivelse (valgfri)'
    )
    course_parser.add_argument(
        '--course-code',
        default='',
        help='Fagkode for Karakterweb (f.eks. EXPH0300). Standard: bruker slug.'
    )
    
    # bulk
    bulk_parser = subparsers.add_parser(
        'bulk',
        help='Legg til flere kurs fra courses.json'
    )
    bulk_parser.add_argument(
        'config',
        nargs='?',
        default='courses.json',
        type=Path,
        help='Konfigurasjonsfil (standard: courses.json)'
    )
    
    args = parser.parse_args()
    
    # Finn prosjektrot
    root = Path(__file__).parent
    navf = root / 'includes' / 'navbar.html'
    
    # Utfør kommando
    if args.cmd == 'update-index':
        update_directory(Path(args.root), True)
        
    elif args.cmd == 'add-semester':
        add_semester(navf, root / 'semestre', args.semester)
        
    elif args.cmd == 'add-course':
        template = root / 'course-template.html'
        
        # Generer side
        course_path = root / 'semestre' / args.semester / args.slug / 'index.html'
        course_code = args.course_code or args.slug
        if generate_page(template, course_path, args.title, args.description, course_code):
            # Opprett filer-mappe og index.json med welcome placeholder
            files_dir = course_path.parent / 'filer'
            files_dir.mkdir(parents=True, exist_ok=True)
            
            # Bruker samme placeholder som andre sider
            placeholder_index = {
                "welcome": "/img/welcome-generic.svg"
            }
            (files_dir / 'index.json').write_text(
                json.dumps(placeholder_index, indent=2, ensure_ascii=False) + '\n',
                encoding='utf-8'
            )
            print(f"✓ Opprettet index.json med placeholder-bilde")
            
            # Oppdater navbar
            update_navbar(navf, args.semester, args.slug, args.title)
        
    elif args.cmd == 'bulk':
        cfg = args.config if args.config.is_absolute() else root / args.config
        
        if not cfg.exists():
            print(f"✗ Konfigurasjonsfil ikke funnet: {cfg}")
            return
        
        template = root / 'course-template.html'
        
        data = json.loads(cfg.read_text(encoding='utf-8'))
        
        for sem, courses in data.items():
            for c in courses:
                spath = root / 'semestre' / sem / c['slug'] / 'index.html'
                
                if generate_page(
                    template,
                    spath,
                    c['title'],
                    c.get('description', ''),
                    c.get('course_code', c.get('slug', ''))
                ):
                    # Opprett filer-mappe med placeholder
                    files_dir = spath.parent / 'filer'
                    files_dir.mkdir(parents=True, exist_ok=True)
                    placeholder_index = {
                        "welcome": "/img/welcome-generic.svg"
                    }
                    (files_dir / 'index.json').write_text(
                        json.dumps(placeholder_index, indent=2, ensure_ascii=False) + '\n',
                        encoding='utf-8'
                    )
                    
                    # Oppdater navbar
                    update_navbar(navf, sem, c['slug'], c['title'])
    
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
