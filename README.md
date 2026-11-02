# FolkNettside

Development -> PR -> GitHub Pages staging -> NTNU production.

Application code lives in GitHub. GitHub Pages tests that code with tiny synthetic
files; the full document archive and credentials remain on NTNU. The site design
and existing viewer URLs are preserved. See [ARCHITECTURE.md](ARCHITECTURE.md) for
file ownership, fixtures, live-service limits and the outstanding production-source
import. The mounted NTNU working tree is not a development/build directory.

## Local development and checks

Use Python 3.11+ and Node.js 22+ in a local clone. Add new application files to Git
before exporting; only tracked website files are published.

```powershell
git switch -c my-change
python scripts/generate_fixtures.py
python scripts/audit_repo.py
python -m unittest discover -s tests -p test_export.py -v
node scripts/test_hydro_modules.mjs
node scripts/test_viewer_integrations.mjs
python scripts/export_repo.py --target pages
python scripts/check_export.py
python scripts/serve_export.py --directory export --port 8000
```

Open `http://127.0.0.1:8000/FolkNettside/` and
`http://127.0.0.1:8000/FolkNettside/preview/`. Test the course sidebar/quiz at
`http://127.0.0.1:8000/FolkNettside/preview/course/`. The server mounts the configured
URL prefix so local tests catch the same path errors as project Pages.

In another terminal, run browser integration checks:

```powershell
python -m pip install -r tests/requirements-browser.txt
python -m playwright install chromium
python tests/test_browser.py
powershell.exe -NoProfile -ExecutionPolicy Bypass -File tests/test_deploy_ntnu.ps1
```

Fixtures include PDF, text/Python, CSV, HTML, LaTeX, notebook, STL, 3MF, Word,
Excel, PowerPoint and quiz data. All are synthetic and reproducible. Office's
Microsoft renderer needs public HTTPS; confirm rendered content on Pages after
merging. Live PHP/OAuth/provider writes require NTNU; Pages tests fixture-backed
client behavior, not those live integrations.

PR CI builds and verifies Pages without deploying. Main publishes the verified
artifact to `gh-pages`. Configure repository Pages to serve that branch's root.
The branch artifact is available in the PR Actions run. Do not merge until its
checks pass and the source changes are reviewed.

## NTNU production (manual, Windows)

Run from a separate LOCAL checkout after reviewing/merging the PR and validating
Pages. The destination must already be mounted and reachable. The production
build includes reviewed website code and PHP, and leaves external archives alone.
It does not include staging routes or test fixtures.

```powershell
python scripts/export_repo.py --target ntnu --base-path /~tormt
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/deploy_ntnu.ps1 -Destination Z:\ -BasePath /~tormt -DryRun
# Inspect the list; preserve/review any uncommitted NTNU application changes first.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/deploy_ntnu.ps1 -Destination Z:\ -BasePath /~tormt
```

Use the actual deployed URL prefix if different from `/~tormt`; domain-root hosting
uses an empty prefix. `-WhatIf` is also supported. ExecutionPolicy Bypass applies
only to the launched process. No credentials are stored, no files are deleted,
and unchanged files are skipped using content hashes. Inspect logical NTNU asset
paths in `deployment/assets.json`; the initial `/docs/viewer-examples/` paths must
be provisioned externally or mapped to real production files.

Never run the exporter in the mounted production directory. This PR does not
modify the NTNU server and does not merge itself. The existing NTNU workspace has
uncommitted application work; import its reviewed sources separately before using
GitHub as the complete source of truth for those applications.

## Repository maintenance

`python scripts/audit_repo.py --json audit-inventory.json` produces the tracked
size inventory. Binary commits above 5 MiB fail unless they have a documented,
tightly bounded runtime allowance. Fixture limits are 250 KB each. Do not commit
large course files, secrets, generated exports, Python caches or temporary dumps.

Existing setup and maintenance notes are retained in
[docs/LEGACY_README.md](docs/LEGACY_README.md),
[README_SETUP.md](README_SETUP.md), [NTNU_WEBEDIT.md](NTNU_WEBEDIT.md), and
[docs/APS_SECURITY.md](docs/APS_SECURITY.md). Development scripts and templates
remain in the repository; public exports include website assets only.
