#!/usr/bin/env python3
"""
Skript for å legge til Google Analytics på alle HTML-sider i FolkNettsideFolk
"""

import os
import sys
from pathlib import Path

# Google Analytics-koden som skal settes inn
GOOGLE_ANALYTICS = '''<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-BJ41MZJP0L"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-BJ41MZJP0L');
</script>'''


def add_analytics_to_file(filepath):
    """
    Legger til Google Analytics i en HTML-fil hvis den ikke allerede har det
    """
    try:
        # Les filen
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Sjekk om Google Analytics allerede er der
        if 'G-BJ41MZJP0L' in content or 'gtag' in content:
            print(f"⏭️  Hopper over {filepath.name} (har allerede analytics)")
            return False
        
        # Finn hvor vi skal sette inn koden
        # Først prøv å sette inn før </head>
        if '</head>' in content:
            # Sett inn rett før </head>
            new_content = content.replace('</head>', f'{GOOGLE_ANALYTICS}\n</head>')
            action = "før </head>"
        elif '<body>' in content or '<body ' in content:
            # Hvis ingen </head>, sett inn i begynnelsen av <body>
            import re
            new_content = re.sub(
                r'(<body[^>]*>)',
                r'\1\n' + GOOGLE_ANALYTICS,
                content,
                count=1
            )
            action = "etter <body>"
        else:
            # Hvis verken head eller body, sett inn i begynnelsen
            new_content = GOOGLE_ANALYTICS + '\n' + content
            action = "i begynnelsen av filen"
        
        # Skriv tilbake til filen
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"✅ Oppdatert {filepath.name} ({action})")
        return True
        
    except Exception as e:
        print(f"❌ Feil ved behandling av {filepath.name}: {e}")
        return False


def main():
    # Få mappe-path fra kommandolinje eller bruk gjeldende mappe
    if len(sys.argv) > 1:
        directory = Path(sys.argv[1])
    else:
        directory = Path('.')
    
    if not directory.exists():
        print(f"❌ Mappen {directory} finnes ikke!")
        sys.exit(1)
    
    print(f"🔍 Søker etter HTML-filer i {directory.absolute()}...\n")
    
    # Finn alle HTML-filer
    html_files = list(directory.rglob('*.html'))
    
    if not html_files:
        print("❌ Fant ingen HTML-filer!")
        sys.exit(1)
    
    print(f"Fant {len(html_files)} HTML-fil(er)\n")
    
    # Behandle hver fil
    updated_count = 0
    for filepath in html_files:
        if add_analytics_to_file(filepath):
            updated_count += 1
    
    print(f"\n{'='*60}")
    print(f"✨ Ferdig! Oppdatert {updated_count} av {len(html_files)} filer")
    print(f"{'='*60}")


if __name__ == '__main__':
    main()