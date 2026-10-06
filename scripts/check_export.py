"""Check fixture contracts and HTML resources in a Pages export."""
import argparse
import json
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]


class References(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in {'script', 'img', 'iframe', 'source', 'embed'} and attrs.get('src'):
            self.refs.append((attrs['src'], True))
        if tag == 'link' and attrs.get('href') and attrs.get('rel') in {'stylesheet', 'preload', 'modulepreload', 'icon'}:
            self.refs.append((attrs['href'], True))
        if tag == 'a' and attrs.get('href'):
            self.refs.append((attrs['href'], False))


def check(out):
    out = Path(out).resolve()
    build = json.loads((out / 'deployment/build.json').read_text(encoding='utf-8'))
    base = build['basePath']
    manifest = json.loads((ROOT / 'deployment/assets.json').read_text(encoding='utf-8'))
    errors, warnings = set(), set()
    for key, asset in manifest['assets'].items():
        if not (out / asset['pages']).is_file():
            errors.add(f'Missing fixture: {key}')
        if not (out / asset['viewer']).is_file():
            errors.add(f'Missing viewer: {key}')
    for file in out.rglob('*.html'):
        parser = References()
        parser.feed(file.read_text(encoding='utf-8'))
        for value, required in parser.refs:
            url = urlsplit(value)
            if url.scheme or url.netloc or not url.path or '{{' in value:
                continue
            rel = unquote(url.path)
            if rel.startswith('/'):
                if base and not rel.startswith(base + '/'):
                    (errors if required else warnings).add(f'{file.relative_to(out)}: outside base path: {value}')
                    continue
                target = out / rel[len(base):].lstrip('/')
            else:
                target = file.parent / rel
            if target.is_dir():
                target /= 'index.html'
            if not target.is_file():
                # Existing tools contain optional/demo document links; expose
                # these as warnings. Static code/styles are always required.
                optional_document = target.suffix.lower() in {'.pdf', '.stl', '.step', '.f3d', '.3mf', '.docx', '.xlsx', '.pptx'}
                (errors if required and not optional_document else warnings).add(f'{file.relative_to(out)}: missing {value}')
    if any(out.rglob('*.php')):
        errors.add('Pages must not publish PHP source')
    if sum(p.stat().st_size for p in out.rglob('*') if p.is_file()) > 35 * 1024 * 1024:
        errors.add('Pages export exceeds the 35 MiB staging budget')
    for warning in sorted(warnings):
        print('WARNING:', warning)
    for error in sorted(errors):
        print('ERROR:', error)
    print(f'Export references: {len(errors)} errors, {len(warnings)} optional/existing-link warnings')
    return errors


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', nargs='?', default='export')
    args = parser.parse_args()
    raise SystemExit(bool(check(args.directory)))
