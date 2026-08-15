import os
matches = []
for root, dirs, files in os.walk("\\webedit.ntnu.no\\tormt\\\"):
    for fname in files:
        path = os.path.join(root, fname)
        try:
            with open(path, 'r', encoding='utf-8', errors='ignore') as fh:
                for i, line in enumerate(fh, 1):
                    if 'Maring' in line:
                        matches.append((path, i, line.rstrip('\n')))
        except Exception:
            continue
for p, ln, txt in matches:
    print(f"{p}:{ln}: {txt}")
print(f"\nTotal matches: {len(matches)}")

