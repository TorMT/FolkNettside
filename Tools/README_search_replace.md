Search and Replace Tool

Usage examples:

- Dry run, literal replace (case-sensitive):
  python Tools\search_replace.py -r \\webedit.ntnu.no\\tormt\\ -s "Maring" -t "Marin" --dry-run

- Replace case-insensitive, create backups, preserve case when replacing:
  python Tools\search_replace.py -r \\webedit.ntnu.no\\tormt\\ -s "maring" -t "marin" --ignore-case --backup --preserve-case

- Replace in filenames and directories as well:
  python Tools\search_replace.py -r \\webedit.ntnu.no\\tormt\\ -s "Maring" -t "Marin" --rename-files --rename-dirs --dry-run

Notes:
- The tool attempts to skip binary files by checking for null bytes.
- When using `--backup`, a `.bak` copy is created next to any modified file.
- Use `--dry-run` first to verify changes before writing.

