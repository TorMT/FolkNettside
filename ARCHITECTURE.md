# Architecture: code in Git, archive on NTNU

Development -> pull request -> GitHub Pages staging -> NTNU production.

GitHub is authoritative for reviewed application HTML, CSS, JavaScript, PHP,
WebAssembly runtimes, templates, scripts and public configuration. The NTNU
webedit tree may additionally hold the document archive, secrets and generated
course metadata. A production directory is never a build input or build output.

## Repository and outputs

```text
.github/workflows/export-and-deploy.yml  PR checks / main Pages publishing
assets/, includes/, Tools/, Quiz/        shared application sources
semestre/, diverse/, om/, kontakt/       reviewed application sources when added
course-template.html                    course UI template
jszip.min.js                            shared ZIP runtime
deployment/assets.json                  logical fixture / production mappings
deployment/runtime.js                   single browser deployment boundary
deployment/large-files.json             file budgets and documented allowances
scripts/export_repo.py                  both target exports
scripts/deploy_ntnu.ps1                  Windows copy-only production deployment
scripts/audit_repo.py, check_export.py   size and reference guards
scripts/generate_fixtures.py             reproducible synthetic fixture generator
scripts/serve_export.py                 local server with project-path mounting
tests/fixtures/                         tiny synthetic viewer inputs
tests/test_export.py, test_browser.py    build and browser integration checks
export/                                ignored Pages build
export-ntnu/                           ignored NTNU build
```

Only `git ls-files` website sources are exported. Add new application files to
Git before building. Untracked mounted archives, secrets, `.venv`, caches,
backups and development scripts cannot leak through recursive directory copies.
The public placeholder PDF and runtime WASM files are retained deliberately.
Large production documents are ignored; do not use `git add -f` for the archive.
Indexes and application code under course/diverse directories are no longer
blanket-ignored. Audit any such content for personal data before committing it.

## Targets and asset resolution

`python scripts/export_repo.py` remains the backward-compatible Pages build.
`--target pages` writes `export/`; `--target ntnu` writes `export-ntnu/`.
`--output` is restricted to a direct `export*` child of the local checkout so
cleanup cannot delete an arbitrary directory. Do not build from a mounted NTNU
checkout. The production deployer rejects network-source checkouts outright.

Both exports use the same tracked sources. Known root-relative website paths
are prefixed only in exported text; JavaScript slash delimiters, external URLs,
protocol-relative URLs and already-prefixed paths remain unchanged. Set
`--base-path /FolkNettside` for project Pages; set `--base-path /~tormt` if that is
the production URL prefix. Empty base paths support domain-root hosting.
`PAGES_BASE_PATH` and `NTNU_BASE_PATH` are fallback environment settings.

`deployment/assets.json` associates logical IDs with a small `fixture`, its
`pages` URL, an external `ntnu` URL and the existing viewer. Generated
`deployment/config.js` resolves the target URLs. The shared runtime exposes
`SiteAssets.resolve(id)` and converts `?asset=pdf` to the existing `?file=...`
interface before viewer scripts execute. Ordinary `?file=` URLs remain valid.
No target checks are scattered through viewer JavaScript.

The NTNU mappings initially reserve `/docs/viewer-examples/sample.*`. They are
explicit external paths, not documents supplied by the production build. Set
these to real archive paths before using logical-asset links on production,
or place representative files there outside Git. The existing production
course/sidebar `?file=` links do not depend on these example mappings.

Pages copies synthetic fixtures and generates missing course routes using the
existing course template, sidebar and quiz modules. Course-relative fixture
aliases preserve the sidebar's folder-tree expectations. `/preview/` lists the
viewer links. Missing non-course application routes show an honest source-missing
notice. Actual tracked application routes are exported without replacement.
NTNU does not export these generated routes or fixtures and never overwrites
untracked course pages or archives. Reviewed tracked course pages/indexes, when
added, are published normally by both targets.

## Static staging versus live services

Pages cannot execute PHP. It excludes PHP source entirely. The single runtime
boundary intercepts same-origin `.php` requests and returns deterministic
responses from `pagesApi` in the manifest. The current fixtures cover leaderboard,
hydrometer empty-state and APS demo-catalog clients. Unknown services return an
explicit 501 response; live APS token acquisition returns 503. Fixture requests
never reach production and never persist server data. On NTNU the adapter is
inactive and real PHP requests execute normally.

This permits testing the shared UI and service-boundary states, not live OAuth,
Autodesk translation/rendering, provider data or persistent server writes.
Add contract-accurate fixtures whenever new API-backed application code is added.
Do not claim these mocks validate live backend integrations.

Office uses Microsoft's existing online renderer. Local checks verify iframe
URLs and downloadable valid OOXML packages; rendered Word/Excel/PowerPoint must
be checked on publicly reachable HTTPS Pages. Other third-party JS/CDNs also
need network access. Proprietary F3D/FBM live workflows and external video embeds
still require representative licensed/public inputs and manual verification;
the tetrahedron STL/3MF exercises the shared local 3D loader and hydro geometry.

## CI and size policy

PRs run tracked-file budgets, deterministic fixture/build tests, existing hydro
and viewer regression checks, Pages export, internal static-resource checks and
real Chromium viewer tests at `/FolkNettside`. They upload a preview artifact,
including `.nojekyll`; PRs have read-only repository permissions and never deploy.
Main builds the same artifact and the separate write-permission deployment job
publishes it to `gh-pages`. Existing architecture and branch publishing remain.
No force push, history rewriting or automatic PR merging is involved.

The guard warns at 1 MiB, fails binary files above 5 MiB, all other files above
10 MiB and individual fixture files above 250 KB. Two exact-path runtime WASM
allowances have tight ceilings and documented reasons. The complete preview has
a 35 MiB budget. Audit output lists the largest tracked files; use
`python scripts/audit_repo.py --json audit-inventory.json` for the full inventory.
Static styles/scripts/images and fixture links are checked strictly. The three
PDF links in the standalone source `includes/sidebar.html` are legacy demo
links and currently produce warnings; generated course sidebars substitute the
PDF fixture. External service behavior is not an internal-reference check.

## Safe NTNU deployment

From a separate LOCAL checkout, build and compare against an already mounted
`\\webedit.ntnu.no\tormt` directory. Credentials stay in Windows/NTNU tooling.
The destination must already exist; no mount or credential storage is attempted.
The deployer consumes the generated build file list, compares SHA-256 content,
copies changed website files, reports unchanged/copied/planned counts and never
uses deletion or mirror synchronization. It rejects overlapping source/destination
paths, path traversal and destination reparse points. Partial copy failure stops
the script; rerun to finish remaining changes. Deployment is not transactional.
`-DryRun` and PowerShell `-WhatIf` do not change destination content. Both still
build locally. `-AllowLocalDestination` exists solely for a local test sandbox.

Always inspect the dry-run list before a real deployment. Existing uncommitted
NTNU code could be overwritten by tracked files with the same paths: commit and
review those changes first. Deploy only after the PR is reviewed/merged and the
Pages artifact is validated. This migration has not deployed to NTNU.

## Audit scope and outstanding source gap

The starting GitHub main had 199 tracked files, totaling 17,586,737 bytes. Two
WASM runtimes dominate the size, not a course document archive. Removed from
tracking (retained on the local filesystem): two `__pycache__` files, the generated
backup manifest, `_siteupdater_dryrun.txt`, five `tmp_*` HTML dumps and two
`temp_subs` VTT downloads. Existing `.orig.html`, `.bak.html` and the encoding
script backup remain tracked because their unique content has not been proven
reproducible; they are ignored for future additions and excluded from exports.
No required source file was removed, and old Git history remains unchanged.

The provided `Z:` workspace is `\\webedit.ntnu.no\tormt`, with substantial staged,
unstaged and untracked application changes. It was only read. Those changes
(including the diving application and local production course content) are not
on GitHub main and were not silently incorporated into this infrastructure PR.
Their reviewed application code must be committed in a separate change before
GitHub can be authoritative for ALL current production applications. The generated
missing-source notices make this limitation visible on staging. Production archive
files and credentials must remain outside that follow-up source import.
