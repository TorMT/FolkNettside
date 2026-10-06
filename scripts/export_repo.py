"""Tracked-code exports: Pages fixtures or NTNU external production archive."""
import argparse
import html
import json
import os
import re
import shutil
import subprocess
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
EXPORT = ROOT / 'export'
WEB_ROOTS = {'assets', 'img', 'includes', 'Quiz', 'Tools', 'semestre', 'diverse', 'om', 'kontakt', 'docs'}
WEB_SUFFIXES = {'.html', '.htm', '.js', '.mjs', '.css', '.json', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.wasm', '.php', '.txt', '.md', '.webmanifest', '.woff', '.woff2'}
TEXT_SUFFIXES = {'.html', '.htm', '.js', '.mjs', '.css', '.json'}
JUNK = re.compile(r'(^|/)(__pycache__|\.cache|\.siteupdater-backups|temp_subs|node_modules)(/|$)|(^|/)tmp_|\.bak(?:\.|$)|\.backup_|\.orig\.html$')


def tracked_files(root=ROOT):
    return [Path(p) for p in subprocess.check_output(['git', 'ls-files', '-z'], cwd=root).decode('utf-8').split('\0') if p]


def base_path(value):
    value = value.rstrip('/')
    if value and (not value.startswith('/') or '..' in value or not re.fullmatch(r'/[A-Za-z0-9_~/-]+', value)):
        raise ValueError('Base path must be empty or a safe absolute URL path')
    return value


def rewrite_text(text, base):
    # Prefix known website roots only, never JS '/' delimiters or external URLs.
    if not base:
        return text
    roots = '|'.join(sorted(WEB_ROOTS | {'index.html', 'jszip.min.js', 'preview', 'deployment'}))
    pattern = rf'''(?P<lead>["'`(=\s])/((?:{roots})(?=[/"'`?#)\s]))'''
    return re.sub(pattern, lambda m: m['lead'] + base + '/' + m[2], text)


def write(out, rel, content):
    dest = out / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(content, encoding='utf-8')


def preview_routes(out, manifest):
    navbar = (out / 'includes/navbar.html').read_text(encoding='utf-8')
    routes = {unquote(p) for p in re.findall(r'href="(/[^"?#]+)"', navbar)}
    routes.add('/preview/course/index.html')
    template = (ROOT / 'course-template.html').read_text(encoding='utf-8')
    fixture_paths = [Path(a['pages']).name for a in manifest['assets'].values()]
    for route in sorted(routes):
        rel = route.lstrip('/')
        if route.endswith('/'):
            rel += 'index.html'
        if not rel.endswith('.html') or (out / rel).exists():
            continue
        title = html.escape(Path(rel).parent.name or 'Preview')
        if route.startswith(('/semestre/', '/preview/course/')):
            content = template.replace('{{TITLE}}', title).replace('{{DESCRIPTION}}', 'Staging: fixture files; production archive stays on NTNU.').replace('{{COURSE_CODE}}', 'PREVIEW')
            folder = Path(rel).parent
            write(out, folder / 'filer/index.json', json.dumps({'Testfiler': fixture_paths, 'welcome': '/img/welcome-generic.svg', 'quiz': '/preview/quiz.json'}, ensure_ascii=False))
            # Sidebar's folder tree expects course-relative names. Alias the
            # same minimal fixture inputs here, preserving existing file URLs.
            for asset in manifest['assets'].values():
                shutil.copy2(ROOT / asset['fixture'], out / folder / 'filer' / Path(asset['pages']).name)
            # The source sidebar is a static example linking nonexistent PDFs.
            # Keep its styles/scripts but replace demo links with fixture links.
            sidebar = (ROOT / 'includes/sidebar.html').read_text(encoding='utf-8')
            sidebar = re.sub(r'filer/oving[123]\.pdf', '/preview/files/sample.pdf', sidebar)
            write(out, folder / 'sidebar.html', sidebar)
        else:
            content = f'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>{title} staging</title><link rel="stylesheet" href="/assets/css/style.css"></head><body><main><h1>{title}</h1><p>This production route has no application source in Git yet. Import its reviewed source before it can be tested here.</p><a href="/preview/">Viewer fixtures</a></main></body></html>'
        write(out, rel, content)
    links = []
    for key, asset in manifest['assets'].items():
        if asset.get('viewer'):
            links.append(f'<li><a href="/{asset["viewer"]}?asset={key}">{html.escape(key)}</a> (<a href="/{asset["pages"]}">fixture</a>)</li>')
    write(out, 'preview/index.html', '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Viewer staging</title><link rel="stylesheet" href="/assets/css/style.css"></head><body><main><h1>Viewer staging</h1><p>Small synthetic files. Office embedding needs public HTTPS. PHP clients use local fixtures; live authentication and writes require NTNU.</p><a href="/preview/course/">Course UI, sidebar and quiz</a><ul>' + ''.join(links) + '</ul><a href="/index.html">Home</a></main></body></html>')
    write(out, 'preview/quiz.json', (ROOT / 'tests/fixtures/quiz.json').read_text(encoding='utf-8'))
    home = out / 'index.html'
    text = home.read_text(encoding='utf-8')
    text = re.sub(r'(<body\b[^>]*>)', r'\1<a href="/preview/" style="display:block;padding:8px;text-align:center">Staging: viewer fixtures</a>', text, count=1)
    home.write_text(text, encoding='utf-8')


def build(target='pages', output=None, base=None):
    out = Path(output or (EXPORT if target == 'pages' else ROOT / 'export-ntnu')).absolute()
    # No arbitrary deletion: output is a direct export* child of this checkout.
    if out.parent != ROOT or not out.name.startswith('export') or out.is_symlink() or (out.exists() and out.resolve() != out):
        raise ValueError('Output must be a direct export* directory of this checkout')
    base = base_path(base if base is not None else (os.environ.get('PAGES_BASE_PATH', '/FolkNettside') if target == 'pages' else os.environ.get('NTNU_BASE_PATH', '')))
    manifest = json.loads((ROOT / 'deployment/assets.json').read_text(encoding='utf-8'))
    selected = []
    for rel in tracked_files():
        name = rel.as_posix()
        if JUNK.search(name) or not (ROOT / rel).is_file():
            continue
        if name in {'index.html', 'jszip.min.js', 'assets/pdf/goyplassholder.pdf'} or (rel.parts[0] in WEB_ROOTS and rel.suffix.lower() in WEB_SUFFIXES):
            if target == 'pages' and rel.suffix.lower() == '.php':
                continue
            selected.append(rel)
    if target == 'pages':
        for asset in manifest['assets'].values():
            src = ROOT / asset['fixture']
            if not src.is_file() or src.stat().st_size > 250_000:
                raise ValueError(f'Missing or oversized fixture: {src}')
    if out.exists():
        shutil.rmtree(out)
    out.mkdir()
    for rel in selected:
        dest = out / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / rel, dest)
    if target == 'pages':
        for asset in manifest['assets'].values():
            dest = out / asset['pages']
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(ROOT / asset['fixture'], dest)
        preview_routes(out, manifest)
    resolved = {key: base + '/' + asset[target].lstrip('/') for key, asset in manifest['assets'].items()}
    runtime = {'target': target, 'basePath': base, 'assets': resolved, 'assetParameters': {key: asset.get('parameter', 'file') for key, asset in manifest['assets'].items()}, 'apiFixtures': manifest['pagesApi'] if target == 'pages' else {}}
    write(out, 'deployment/config.js', 'window.SiteDeployment = ' + json.dumps(runtime, ensure_ascii=False) + ';\n')
    shutil.copy2(ROOT / 'deployment/runtime.js', out / 'deployment/runtime.js')
    for path in out.rglob('*'):
        if not path.is_file() or path.suffix.lower() not in TEXT_SUFFIXES:
            continue
        text = path.read_text(encoding='utf-8')
        if path.suffix.lower() in {'.html', '.htm'} and re.search(r'<head\b', text, re.I):
            injection = '<script src="/deployment/config.js"></script><script src="/deployment/runtime.js"></script>'
            text = re.sub(r'(<head\b[^>]*>)', lambda m: m[1] + injection, text, count=1, flags=re.I)
        if path != out / 'deployment/config.js':
            text = rewrite_text(text, base)
        path.write_text(text, encoding='utf-8')
    write(out, '.nojekyll', '')
    files = sorted(p.relative_to(out).as_posix() for p in out.rglob('*') if p.is_file())
    write(out, 'deployment/build.json', json.dumps({'target': target, 'basePath': base, 'files': files}, indent=2))
    size = sum(p.stat().st_size for p in out.rglob('*') if p.is_file())
    print(f'{target}: {len(files)+1} files, {size:,} bytes -> {out}')
    return out


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--target', choices=['pages', 'ntnu'], default='pages')
    parser.add_argument('--output', type=Path)
    parser.add_argument('--base-path', help='URL prefix; empty string for localhost/domain root')
    args = parser.parse_args()
    build(args.target, args.output, args.base_path)


if __name__ == '__main__':
    main()
