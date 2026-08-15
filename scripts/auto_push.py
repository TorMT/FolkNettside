#!/usr/bin/env python3
"""Simple file-watcher that auto-adds, commits and pushes changes in a repo.

Usage:
  python scripts/auto_push.py --path \\webedit.ntnu.no/tormt/export --interval 3 --quiet 5

Notes:
- Uses polling (no external deps). Excludes `.git` and common large-data folders by default.
- Commits only when there are staged/uncommitted changes.
"""
from pathlib import Path
import time
import subprocess
import argparse
import hashlib


EXCLUDE_DIRS = {".git", "semestre", "temp", "diverse"}
EXCLUDE_SUFFIXES = {".bak", "index.json"}


def compute_snapshot(root: Path):
    snap = {}
    for p in root.rglob("*"):
        try:
            rel = p.relative_to(root)
        except Exception:
            continue
        parts = rel.parts
        if parts and parts[0] in EXCLUDE_DIRS:
            continue
        if p.is_file():
            if any(str(p).endswith(s) for s in EXCLUDE_SUFFIXES):
                continue
            try:
                snap[str(rel)] = p.stat().st_mtime
            except FileNotFoundError:
                continue
    return snap


def has_changes(repo_path: Path):
    # return True if there are uncommitted changes
    res = subprocess.run(["git", "status", "--porcelain"], cwd=repo_path, capture_output=True, text=True)
    return bool(res.stdout.strip())


def git_commit_and_push(repo_path: Path, message: str):
    subprocess.run(["git", "add", "-A"], cwd=repo_path)
    if not has_changes(repo_path):
        print("No changes to commit.")
        return
    subprocess.run(["git", "commit", "-m", message], cwd=repo_path)
    subprocess.run(["git", "push"], cwd=repo_path)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--path", "-p", default="export", help="Path to watch (relative or absolute)")
    parser.add_argument("--interval", "-i", type=float, default=3.0, help="Polling interval seconds")
    parser.add_argument("--quiet", "-q", type=float, default=5.0, help="Seconds of no-changes before commit")
    parser.add_argument("--message", "-m", default="Auto-update: {time}", help="Commit message template")
    args = parser.parse_args()

    repo = Path(args.path).resolve()
    if not repo.exists():
        print("Path does not exist:", repo)
        return
    print("Watching:", repo)

    last_snap = compute_snapshot(repo)
    dirty_since = None

    try:
        while True:
            time.sleep(args.interval)
            snap = compute_snapshot(repo)
            if snap != last_snap:
                now = time.time()
                if dirty_since is None:
                    dirty_since = now
                else:
                    # if quiet interval passed, commit
                    if now - dirty_since >= args.quiet:
                        msg = args.message.format(time=time.strftime("%Y-%m-%d %H:%M:%S"))
                        print("Changes stabilized; committing and pushing with message:", msg)
                        git_commit_and_push(repo, msg)
                        # reset
                        last_snap = compute_snapshot(repo)
                        dirty_since = None
            else:
                dirty_since = None
    except KeyboardInterrupt:
        print("Stopped by user")


if __name__ == "__main__":
    main()

