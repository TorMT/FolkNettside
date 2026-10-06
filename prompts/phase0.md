# Claude Phase 0A — repository audit before cleanup

You are working locally inside the checked-out repository `TorMT/FolkNettside`.

**Do not try to fetch the GitHub repository through the public GitHub website.**
Use the local working tree, local git history and local git commands as the primary source of truth.

Start by reading these local files completely:
- `docs/ROADMAP_V2.md`
- `docs/TECHNICAL_AUDIT.md`
- `docs/CLAUDE_PHASE0_BRIEF.md`
- `docs/PHASE3_ENGINEERING_WORKSPACE.md`
- `README.md`
- GitHub issue #38 only if `gh` is authenticated and available; otherwise continue from the local docs

## Purpose

FolkNettside has grown organically for almost two years. Features, viewers, tools, theme fixes, mobile patches and migration scripts have accumulated over time.

The goal is to migrate from that organically grown system to one coherent maintainable architecture **without losing intentionally useful functionality**.

This run is **Phase 0A: audit and cleanup plan only**.

### Hard checkpoint

Do **not delete, move, rename or substantially refactor runtime files in this run**.

First:
1. inspect the repository
2. build a dependency/reference map
3. establish a reproducible baseline
4. create the cleanup plan
5. open a draft PR containing the plan/audit work only

Stop there for human review.

Actual deletion/refactoring will happen in Phase 0B after the classification table has been reviewed.

## Git setup

Start from current `main`.

Create:
`phase0/cleanup-audit`

Do not:
- commit directly to `main`
- merge the PR yourself
- rewrite git history
- force push

## Missing-input rule

If one of the required local docs is missing:
- report exactly which file is missing
- continue only if the remaining documents and repository are sufficient to perform the audit safely
- do not invent requirements that were supposed to come from a missing document

If the local repository itself is not available, stop and report that. Do not substitute a public GitHub scrape.

## 1. Establish a baseline before cleanup

Before classifying deletions, determine and document the existing supported commands.

Inspect:
- `.github/workflows/`
- `scripts/`
- `README.md`
- package/config files if present

Run the safest applicable existing checks, including where supported:
- current automated tests
- GitHub Pages export/build
- static/reference checks

Record the exact commands and outcomes in `docs/PHASE0_CLEANUP_PLAN.md`.

If there is no existing broken-link crawler or browser test, record that gap rather than silently inventing success.

Where practical, add **audit-only** tooling/tests that do not change runtime behaviour, such as:
- internal-link/reference checker for the exported site
- duplicate/orphan inventory
- generated-output manifest
- file-size inventory

Do not add a major new framework merely for Phase 0A.

## 2. Build a real dependency/reference map

Inspect at minimum:
- root HTML/pages
- `course-template.html`
- `SiteUpdater3.py`
- `navbarupdater.py`
- `includes/`
- `includes/kodeLesere/`
- `includes/three/`
- `Tools/`
- `assets/js/`
- `assets/css/`
- `scripts/`
- GitHub Actions/export pipeline

Do not rely only on grep/search.

Account for:
- normal HTML/script/style references
- dynamic script injection
- ES module imports
- generated course pages
- template-generated references
- file-extension routing
- iframe/viewer routing
- runtime routing from `index.json`
- scripts called by other scripts
- build/export allowlists
- navigation entries and active tabs

For every major file/subsystem classify as:
- ACTIVE
- ACTIVE-LEGACY
- ORPHAN
- DUPLICATE
- DEV/MIGRATION
- ARCHIVE
- UNKNOWN

For each proposed cleanup candidate record:
- path
- purpose
- evidence
- references
- active navigation/runtime reachability
- proposed action
- risk
- verification required before Phase 0B

## 3. Strong cleanup candidates to investigate

These are candidates, not approved deletions:
- `includes/sidebar-loaderny.js`
- `includes/three/HydroStatikkGammel.js`
- `includes/kodeLesere/3mfhydro.reportdrawer.bak.html`
- `Tools/KrystallStrukturerGammel.html`
- `*.from_semestre.orig.html`
- root `tmp_fusion_*.html`
- duplicate JSZip bundles/loaders
- obsolete theme/mobile/flyout injection or repair scripts
- one-off mass-edit/search-replace/migration scripts
- superseded tool variants

A file with no obvious textual reference is not automatically safe to delete.

## 4. Tools and viewers

Inventory **all** current tools/viewers and decide whether each should:
- survive unchanged temporarily
- survive but be rewritten later
- merge into shared infrastructure
- become developer-only
- archive
- be removed in Phase 0B

A tool survives because it is actively used or intentionally valuable, not simply because it exists.

Pay special attention to:
- code/Python/notebook/CSV/HTML/LaTeX/PDF/Office viewers
- video viewer
- STL/3MF/Fusion/STEP viewers/loaders
- hydrostatics
- CoolProp
- FluidKalkulator
- ChemDraw
- crystal structures
- periodic table
- quiz
- brewing/hydrometer/recipe tools

## 5. UI debt inventory

Do not perform the full redesign yet.

Document:
- duplicate controls
- duplicated toolbars
- inconsistent loading/error states
- floating controls that should move to Settings
- repeated theme propagation
- mobile-only repair code
- duplicated navigation
- obsolete UI that should disappear

Future direction already decided:
- theme picker -> `Settings > Appearance`
- Google -> `Settings > Account & Connections`
- Autodesk -> `Settings > Account & Connections`
- common viewer actions -> shared ViewerShell
- engineering defaults -> `Settings > Engineering`

The current floating theme selector is legacy architecture.

## 6. Authentication requirement

**Public by default. Authentication is OPTIONAL.**

Do not create or propose a mandatory login wall.

Signed-out users must still be able to use:
- homepage
- portfolio
- semester/course navigation
- public course resources
- public viewers
- public tools
- public engineering visualizations

Authentication should only unlock features that genuinely require a connected provider, such as:
- Google Drive sync
- cloud state
- Autodesk/APS resources
- future private integrations

Inspect the existing Google/Drive implementation and document the migration toward one shared optional account/connection service.

Never put:
- client secrets
- access tokens
- refresh tokens
- private credentials
into committed docs, examples or frontend code.

If you discover a real secret/token in tracked client-side or repository files:
- do not reproduce its value in the audit
- identify only the path/type
- flag it prominently for credential rotation/removal

## 7. Semester/course model must stay

The Study experience remains:

`Semester -> Course -> Resources`

Do not replace this with a generic dashboard.

Portfolio and Study are two presentations of one site.

Portfolio should not expose internal-looking academic/archive navigation such as `kok` by default.

This is presentation filtering, not authentication.

## 8. Course-page migration audit

Do not regenerate all course pages in Phase 0A.

Instead:
- inventory how existing course pages differ
- identify hand-edited exceptions
- identify common markup that should disappear into shared components
- identify metadata required to regenerate them later
- identify URL compatibility constraints

Final target for a later phase:
- one canonical course skeleton
- course-specific metadata/data
- shared navbar/course navigation
- shared ViewerShell
- shared Settings access
- shared responsive shell
- deterministic generator
- all course pages regenerated once the skeleton is stable
- existing URLs preserved where practical

If an old publicly reachable page/tool is eventually removed, plan either:
- a compatible replacement at the same URL, or
- an explicit redirect/retirement stub where appropriate

## 9. Karakterweb

Treat Karakterweb as one shared course capability.

Audit the current implementation and propose the later shared design:
- course code from canonical metadata
- URL: `https://karakterweb.no/ntnu/{course_code}`
- clean in-view presentation when embedding is allowed
- always provide a visible open-in-new-tab action
- never rely solely on iframe load/error to conclude cross-origin embedding works
- treat embed detection as a Phase 1 implementation risk
- no blank iframe as the only user feedback
- no per-course copies
- automated URL/integration tests

Document realistic strategies for the embed/fallback behaviour rather than pretending cross-origin iframe blocking is always detectable in-browser.

## 10. NTNU production boundary

Do not touch production deployment or external NTNU/webedit locations during this task.

For Phase 0A, treat as production and off-limits:
- any filesystem path outside this repository that is an NTNU/webedit deployment target
- mounted/network paths for `webedit.ntnu.no`
- any production copy reached through deployment scripts

You may READ deployment scripts/configuration to understand them.
Do not execute a production deployment.

GitHub Pages/export is staging/test only.

## 11. Browser/runtime verification

If browser automation is already available locally, use it for representative pages.

Representative validation set should eventually include:
- homepage
- at least one early-semester course
- at least one recent course
- PDF viewer
- code/Python/notebook path
- video viewer
- 3D/model viewer
- hydro viewer
- quiz
- one unusual/legacy tool

If Playwright or equivalent is not already available, do not install a large browser stack just to satisfy this prompt. Record the missing runtime-verification capability and propose it for the next step.

## Deliverable

Create:

`docs/PHASE0_CLEANUP_PLAN.md`

It must contain:
1. baseline commands and results
2. repository dependency/reference overview
3. classification table
4. proposed Phase 0B deletions
5. ACTIVE-LEGACY list
6. tools/viewers that intentionally survive
7. UI debt findings
8. auth/settings findings
9. course-page regeneration findings
10. Karakterweb findings and embedding risk
11. secret/security findings without secret values
12. production/deployment boundaries
13. proposed cleanup commit groups
14. regression risks
15. exact validation plan for Phase 0B

Commit the plan/audit changes only.

Push the branch.

If `gh` is authenticated, open a DRAFT PR against `main` with a clear summary and link/reference to issue #38.

If `gh` is not authenticated or unavailable:
- do not fail the audit
- push the branch if git credentials permit
- print the GitHub compare/PR creation URL or exact command for the user

Then STOP.

Do not perform Phase 0B deletions until the human has reviewed the cleanup plan.
