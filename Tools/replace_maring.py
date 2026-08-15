import os
import re
import shutil
from pathlib import Path

ROOT = Path(r"\\webedit.ntnu.no\\tormt\\")
PAT = re.compile(r"maring", re.I)

def preserve_case_replace(m):
    s = m.group(0)
    if s.isupper():
        return 'MARIN'
    if s.islower():
        return 'marin'
    if s[0].isupper():
        return 'Marin'
    return 'Marin'

changed_files = []
renamed_paths = []

# First, rename directories and files (top-down)
for dirpath, dirnames, filenames in os.walk(ROOT, topdown=True):
    # rename directories in-place to keep walking consistent
    for i, d in enumerate(list(dirnames)):
        if PAT.search(d):
            old = Path(dirpath) / d
            new_name = PAT.sub(preserve_case_replace, d)
            new = Path(dirpath) / new_name
            if new.exists():
                print(f"Skipping rename (target exists): {old} -> {new}")
            else:
                try:
                    old.rename(new)
                    renamed_paths.append((str(old), str(new)))
                    # update dirnames so os.walk continues into renamed dir
                    dirnames[i] = new_name
                    print(f"Renamed dir: {old} -> {new}")
                except Exception as e:
                    print(f"Failed rename dir {old} -> {new}: {e}")
    # rename files
    for f in list(filenames):
        if PAT.search(f):
            oldf = Path(dirpath) / f
            new_name = PAT.sub(preserve_case_replace, f)
            newf = Path(dirpath) / new_name
            if newf.exists():
                print(f"Skipping file rename (target exists): {oldf} -> {newf}")
            else:
                try:
                    oldf.rename(newf)
                    renamed_paths.append((str(oldf), str(newf)))
                    print(f"Renamed file: {oldf} -> {newf}")
                except Exception as e:
                    print(f"Failed rename file {oldf} -> {newf}: {e}")

# Then, replace inside files
for dirpath, dirnames, filenames in os.walk(ROOT):
    for f in filenames:
        path = Path(dirpath) / f
        try:
            text = path.read_text(encoding='utf-8')
        except Exception:
            try:
                text = path.read_text(encoding='latin-1')
            except Exception:
                continue
        if PAT.search(text):
            new_text = PAT.sub(lambda m: preserve_case_replace(m), text)
            # backup original if no backup exists
            bak = path.with_suffix(path.suffix + '.bak')
            if not bak.exists():
                try:
                    shutil.copy2(path, bak)
                except Exception as e:
                    print(f"Could not create backup for {path}: {e}")
            try:
                path.write_text(new_text, encoding='utf-8')
                changed_files.append(str(path))
                print(f"Replaced in file: {path}")
            except Exception as e:
                print(f"Failed to write file {path}: {e}")

# Summary
print('\nSummary:')
print('Renamed paths:')
for a,b in renamed_paths:
    print(a, '->', b)
print('\nModified files:')
for p in changed_files:
    print(p)
print('\nDone.')

