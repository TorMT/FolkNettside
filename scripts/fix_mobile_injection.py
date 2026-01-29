#!/usr/bin/env python3
# fix_mobile_injection_safe.py
# Patche index.html for mobil uten å påvirke desktop-farger.

import sys, re
from pathlib import Path

VIEWPORT = '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
STYLE    = '<link rel="stylesheet" href="/assets/css/style.css">'
MOBILE   = '<link rel="stylesheet" href="/assets/css/mobile.css?v=4" media="(max-width: 768px)">'
MUI      = '<script src="/assets/js/mobile-ui.js?v=4" defer></script>'
LOADER_RX = re.compile(r'(/includes/sidebar-loader\.js)(?!\?v=)', re.I)

def ensure_viewport(html:str)->str:
    if 'name="viewport"' in html.lower(): return html
    m = re.search(r'(<meta[^>]*charset[^>]*>\s*)', html, re.I)
    return html.replace(m.group(1), m.group(1)+VIEWPORT+"\n") if m else html.replace("<head>", "<head>\n  "+VIEWPORT+"\n", 1)

def dedupe_and_place_style(html:str)->str:
    # Fjern alle men behold én STYLE rett etter <title> (eller i head hvis ikke finnes)
    # 1) fjern alle forekomster
    html_no = html.replace(STYLE, "")
    # 2) finn </head> og injiser STYLE før den, men etter eksisterende <link rel="...style.css"> hvis finnes
    if '</head>' in html_no:
        # plasser STYLE rett FØR første forekomst av mobile.css om den finnes; ellers før </head>
        pos_mobile = html_no.find('assets/css/mobile.css')
        if pos_mobile != -1:
            # sett inn STYLE før mobile.css-taggen
            return re.sub(r'(\s*<link[^>]+assets/css/mobile\.css[^\n]*\n?)', STYLE + r"\n" + r"\1", html_no, count=1, flags=re.I)
        else:
            return html_no.replace("</head>", f"  {STYLE}\n</head>", 1)
    return html_no + "\n" + STYLE + "\n"

def ensure_mobile_css(html:str)->str:
    # Bruk alltid media-guard slik at desktop ikke berøres
    if "assets/css/mobile.css" in html:
        # erstatt ev. eksisterende uten media med guarded
        html = re.sub(r'<link\s+rel="stylesheet"\s+href="/assets/css/mobile\.css[^"]*">\s*',
                      MOBILE + "\n", html, flags=re.I)
        return html
    return html.replace("</head>", f"  {MOBILE}\n</head>", 1)

def ensure_mobile_js(html:str)->str:
    if "assets/js/mobile-ui.js" in html: return html
    return html.replace("</body>", f"  {MUI}\n</body>", 1)

def patch_navbar_fetch(html:str)->str:
    return html.replace("fetch('/includes/navbar.html')",
                        "fetch('/includes/navbar.html', { cache: 'no-store' })")

def bump_loader(html:str)->str:
    # valgfritt: behold, skader ikke
    return LOADER_RX.sub(r"\1?v=1192", html)

def process(p:Path)->bool:
    src = p.read_text(encoding="utf-8", errors="ignore")
    out = src

    # Head
    out = ensure_viewport(out)
    out = dedupe_and_place_style(out)      # én style.css
    out = ensure_mobile_css(out)           # mobile.css med media-guard

    # Body
    out = patch_navbar_fetch(out)
    out = bump_loader(out)
    out = ensure_mobile_js(out)

    if out != src:
        bak = p.with_suffix(p.suffix + ".bak")
        if not bak.exists(): bak.write_text(src, encoding="utf-8")
        p.write_text(out, encoding="utf-8")
        print("✔ Patchet", p)
        return True
    return False

def main():
    root = Path(sys.argv[1] if len(sys.argv)>1 else ".").resolve()
    if not root.exists():
        print("Ugyldig sti:", root); sys.exit(1)

    total = 0
    for f in root.rglob("index.html"):
        try:
            total += 1 if process(f) else 0
        except Exception as e:
            print("Feil på", f, "->", e)
    print(f"Ferdig. Patchet {total} filer.")

if __name__ == "__main__":
    main()
