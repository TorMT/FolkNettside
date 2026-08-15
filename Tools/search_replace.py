# //lagt til av AI i etterkant//
import os, argparse

def _ai_get_root():
    p = os.environ.get('WEBEDIT_ROOT')
    if p:
        return p
    parser = argparse.ArgumentParser(add_help=False)
    parser.add_argument('--root', default=None)
    args, _ = parser.parse_known_args()
    if args.root:
        return args.root
    candidates = [r'\\\\webedit.ntnu.no\\tormt', r'Z:\\']
    for c in candidates:
        try:
            if os.path.exists(c):
                return c
        except Exception:
            pass
    return os.getcwd()

ROOT = _ai_get_root()
# //lagt til av AI i etterkant//
#!/usr/bin/env python3
import argparse
import os
import re
import shutil
from pathlib import Path


def preserve_case_replace(m, repl):
    s = m.group(0)
    if s.isupper():
        return repl.upper()
    if s.islower():
        return repl.lower()
    if s[0].isupper():
        return repl.capitalize()
    return repl


def is_text_file(path: Path) -> bool:
    try:
        with open(path, 'rb') as f:
            chunk = f.read(1024)
            if b'\x00' in chunk:
                return False
    except Exception:
        return False
    return True


def replace_in_file(path: Path, pat, repl, flags, preserve_case, dry_run, backup):
    try:
        text = path.read_text(encoding='utf-8')
    except Exception:
        try:
            text = path.read_text(encoding='latin-1')
        except Exception:
            return False
    if not pat.search(text):
        return False
    new_text = pat.sub(lambda m: preserve_case_replace(m, repl) if preserve_case else repl, text)
    if dry_run:
        print(f"[DRY] Would replace in: {path}")
        return True
    if backup:
        bak = path.with_name(path.name + '.bak')
        if not bak.exists():
            shutil.copy2(path, bak)
    path.write_text(new_text, encoding='utf-8')
    print(f"Replaced in: {path}")
    return True


def main():
    p = argparse.ArgumentParser(description='Search and replace tool for workspace files and names')
    p.add_argument('--root', '-r', default=r'\\webedit.ntnu.no\\tormt\\\', help='Root folder to search (default \\webedit.ntnu.no\\tormt\\\)')
    p.add_argument('--search', '-s', required=True, help='Search string or regex')
    p.add_argument('--replace', '-t', required=True, help='Replacement string')
    p.add_argument('--regex', action='store_true', help='Treat search as regex (default: literal)')
    p.add_argument('--ignore-case', action='store_true', help='Case-insensitive search')
    p.add_argument('--dry-run', action='store_true', help='Do not write changes; just report')
    p.add_argument('--backup', action='store_true', help='Create .bak copy for changed files')
    p.add_argument('--rename-files', action='store_true', help='Also rename files whose names match')
    p.add_argument('--rename-dirs', action='store_true', help='Also rename directories whose names match')
    p.add_argument('--preserve-case', action='store_true', help='Try to preserve case of matched text when replacing')
    args = p.parse_args()

    flags = 0
    if args.ignore_case:
        flags |= re.IGNORECASE

    if args.regex:
        pat = re.compile(args.search, flags)
    else:
        pat = re.compile(re.escape(args.search), flags)

    root = Path(args.root)
    if not root.exists():
        print('Root path does not exist:', root)
        return

    # Rename directories/files first (topdown)
    for dirpath, dirnames, filenames in os.walk(root, topdown=True):
        # directories
        for i, d in enumerate(list(dirnames)):
            if pat.search(d):
                old = Path(dirpath) / d
                new_name = pat.sub(lambda m: preserve_case_replace(m, args.replace) if args.preserve_case else args.replace, d)
                new = Path(dirpath) / new_name
                if new.exists():
                    print(f"Skipping rename dir (exists): {old} -> {new}")
                else:
                    if args.dry_run:
                        print(f"[DRY] Would rename dir: {old} -> {new}")
                    else:
                        try:
                            old.rename(new)
                            print(f"Renamed dir: {old} -> {new}")
                            dirnames[i] = new_name
                        except Exception as e:
                            print(f"Failed rename dir {old} -> {new}: {e}")
        # files
        for f in list(filenames):
            if pat.search(f) and args.rename_files:
                oldf = Path(dirpath) / f
                new_name = pat.sub(lambda m: preserve_case_replace(m, args.replace) if args.preserve_case else args.replace, f)
                newf = Path(dirpath) / new_name
                if newf.exists():
                    print(f"Skipping rename file (exists): {oldf} -> {newf}")
                else:
                    if args.dry_run:
                        print(f"[DRY] Would rename file: {oldf} -> {newf}")
                    else:
                        try:
                            oldf.rename(newf)
                            print(f"Renamed file: {oldf} -> {newf}")
                        except Exception as e:
                            print(f"Failed rename file {oldf} -> {newf}: {e}")

    # Replace inside files
    modified = 0
    for dirpath, dirnames, filenames in os.walk(root):
        for f in filenames:
            path = Path(dirpath) / f
            if not is_text_file(path):
                continue
            changed = replace_in_file(path, pat, args.replace, flags, args.preserve_case, args.dry_run, args.backup)
            if changed:
                modified += 1

    print(f"\nTotal modified files: {modified}")

if __name__ == '__main__':
    main()


