# Codex Phase 0 — audit and cleanup

You are working locally inside the checked-out repository TorMT/FolkNettside.

Read completely:
- docs/ROADMAP_V2.md
- docs/TECHNICAL_AUDIT.md
- docs/PHASE3_ENGINEERING_WORKSPACE.md
- README.md
- GitHub issue #38 if gh is authenticated and available

Phase 0 is owned by ChatGPT + Codex. Claude is intentionally not part of Phase 0.

## Goal

FolkNettside has grown organically for almost two years. The goal is to move from accumulated scripts, patches, duplicate viewers and one-off tooling to a coherent maintainable baseline without losing useful functionality.

## Step 1 — audit before deletion

Start from current main and create:

phase0/cleanup-audit

First create/update:
docs/PHASE0_CLEANUP_PLAN.md

Before deleting runtime code:
1. build a dependency/reference map
2. establish baseline tests/export
3. classify files/subsystems
4. identify cleanup groups
5. open a draft PR with the plan

Classifications:
ACTIVE
ACTIVE-LEGACY
ORPHAN
DUPLICATE
DEV/MIGRATION
ARCHIVE
UNKNOWN

Inspect:
- root HTML/pages
- course-template.html
- SiteUpdater3.py
- navbarupdater.py
- includes/
- includes/kodeLesere/
- includes/three/
- Tools/
- assets/js/
- assets/css/
- scripts/
- .github/workflows/
- GitHub Pages export

Do not rely only on grep. Check dynamic script injection, ES imports, generated pages, extension routing, iframe routing, index.json-driven runtime behavior, generator references and build/export allowlists.

## Strong candidates to verify

These are candidates, not automatic deletions:
- includes/sidebar-loaderny.js
- includes/three/HydroStatikkGammel.js
- includes/kodeLesere/3mfhydro.reportdrawer.bak.html
- Tools/KrystallStrukturerGammel.html
- *.from_semestre.orig.html
- tmp_fusion_*.html
- duplicate JSZip bundles/loaders
- obsolete theme/mobile/flyout fix or injection scripts
- one-off migration/search-replace scripts
- superseded tool variants

## Preserve these product constraints

- Public by default.
- Login is optional.
- No login wall.
- Semester -> Course -> Resources remains the Study information model.
- Portfolio and Study are different presentations of the same site.
- Portfolio navigation should not expose internal-looking study/archive material such as kok by default.
- Do not touch NTNU/webedit production paths.
- GitHub Pages is staging/test.

## Future architecture to respect

Do not implement the full redesign in Phase 0, but avoid cleanup choices that conflict with:

- Settings > Appearance replacing the floating theme picker
- Settings > Account & Connections for optional Google/Autodesk connection
- one shared ThemeService
- one shared Auth/Connection service
- one shared ViewerShell
- course-specific metadata separated from shared UI
- eventual regeneration of all course pages from one canonical skeleton
- shared Karakterweb component with in-view + open-in-new-tab fallback
- Phase 2 viewer/tool/performance rewrite
- Phase 3 component-aware hydro/FEM/CFD workspace

## Tools/viewers

Inventory every useful current tool/viewer and mark:
- keep temporarily
- rewrite later
- merge into shared system
- developer-only
- archive
- remove

Pay particular attention to:
- code/Python/notebook/CSV/HTML/LaTeX/PDF/Office
- video
- STL/3MF/Fusion/STEP
- hydro
- CoolProp
- FluidKalkulator
- ChemDraw
- crystal structures
- periodic table
- quiz
- brewing/hydrometer/recipes

## Course pages

Do not regenerate all course pages in the initial audit.

Inventory:
- differences between course pages
- hand-edited exceptions
- common markup
- metadata needed for regeneration
- URL compatibility constraints
- active viewer/tool dependencies

Final target later:
- one canonical course skeleton
- deterministic generator
- all course pages regenerated
- existing URLs preserved where practical

## Karakterweb

Audit current implementation and plan:
- course code from canonical metadata
- https://karakterweb.no/ntnu/{course_code}
- in-view where embedding works
- always-visible open-in-new-tab fallback
- no blank iframe as only feedback
- shared implementation
- automated integration tests

Treat cross-origin embed detection as a known implementation risk.

## Security

Never copy secrets/tokens into docs or commits.

If tracked frontend/repo code contains a real secret:
- do not reproduce its value
- identify only path/type
- flag for rotation/removal

## Baseline and validation

Determine the existing commands first and record them.

Run the safest applicable:
- current automated tests
- export/build
- static/reference checks

Where practical add small audit-only tooling:
- broken internal reference checker
- duplicate/orphan inventory
- export manifest
- file-size inventory

Do not introduce a large new framework just for Phase 0.

## Phase 0 execution

After the plan has been committed to the draft PR, proceed with cleanup only where evidence is strong.

Work in small logical commits:
1. exact duplicates/backups/temp files
2. unused parallel loaders/scripts
3. obsolete migration/fix tooling
4. duplicate vendored dependencies
5. dead UI/tool variants
6. small low-risk consolidation

After each group:
- run tests
- build/export
- compare output
- check representative routes/files

UNKNOWN stays untouched.

Do not:
- redesign the whole UI
- rewrite hydro
- add FEM/CFD
- regenerate all courses yet
- deploy to NTNU
- merge to main
- force push
- rewrite history

## Final deliverables

At the end show:
1. docs/PHASE0_CLEANUP_PLAN.md
2. dependency/reference summary
3. deleted/archived files with evidence
4. ACTIVE-LEGACY list
5. tools/viewers intentionally preserved
6. test/build/export results
7. remaining risks/UNKNOWN items
8. draft PR URL

Stop with an open draft PR for review.
