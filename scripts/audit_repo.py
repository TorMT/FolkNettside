"""Inventory Git-tracked sizes and enforce fixture/binary budgets."""
import argparse
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BINARIES = {'.wasm', '.pdf', '.zip', '.7z', '.rar', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.png', '.jpg', '.jpeg', '.gif', '.stl', '.3mf', '.f3d', '.step', '.gcode', '.pyc'}


def audit():
    policy = json.loads((ROOT / 'deployment/large-files.json').read_text(encoding='utf-8'))
    paths = subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode('utf-8').split('\0')
    inventory, errors = [], []
    for name in filter(None, paths):
        path = ROOT / name
        if not path.is_file():
            errors.append(f'Tracked file missing: {name}')
            continue
        size = path.stat().st_size
        with path.open('rb') as stream:
            binary = path.suffix.lower() in BINARIES or b'\0' in stream.read(8192)
        exception = policy['exceptions'].get(name)
        limit = policy['maxBinaryBytes'] if binary else policy['maxFileBytes']
        if name.startswith('tests/fixtures/'):
            limit = policy['maxFixtureBytes']
        if exception:
            limit = exception['maxBytes']
        if size > limit:
            errors.append(f'{name}: {size:,} bytes exceeds {limit:,}')
        if size >= policy['warnBytes']:
            print(f'WARNING: {name}: {size:,} bytes' + (f' (allowance: {exception["reason"]})' if exception else ''))
        inventory.append({'path': name, 'bytes': size, 'binary': binary, 'allowance': exception})
    inventory.sort(key=lambda entry: entry['bytes'], reverse=True)
    print(f'{len(inventory)} tracked files; {sum(p["bytes"] for p in inventory):,} bytes')
    for entry in inventory[:15]:
        print(f'{entry["bytes"]:>10,}  {entry["path"]}')
    return inventory, errors


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--json', type=Path)
    args = parser.parse_args()
    inventory, errors = audit()
    if args.json:
        args.json.write_text(json.dumps(inventory, indent=2), encoding='utf-8')
    for error in errors:
        print('ERROR:', error)
    raise SystemExit(bool(errors))
