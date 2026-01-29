import os
import sys
import re
from pathlib import Path

def check_text_files(root):
    pat = re.compile(r"maring", re.I)
    hyphens = ['-', '\u2010', '\u2011', '\u2012', '\u2013', '\u2014', '\u2015']
    matches = []
    for dirpath, dirnames, filenames in os.walk(root):
        # check dirnames and filenames
        for d in dirnames:
            if pat.search(d):
                matches.append((os.path.join(dirpath, d), 'DIR_NAME'))
        for f in filenames:
            if pat.search(f):
                matches.append((os.path.join(dirpath, f), 'FILE_NAME'))
            path = os.path.join(dirpath, f)
            try:
                with open(path, 'r', encoding='utf-8', errors='ignore') as fh:
                    for i, line in enumerate(fh, 1):
                        if pat.search(line):
                            matches.append((f"{path}:{i}", line.rstrip('\n')))
            except Exception:
                continue
    return matches

if __name__ == '__main__':
    root = sys.argv[1] if len(sys.argv) > 1 else r"Z:\\"
    matches = check_text_files(root)
    for m in matches:
        print(m[0], ':', m[1])
    print('\nTotal matches:', len(matches))
