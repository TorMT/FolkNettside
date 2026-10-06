# Claude Phase 0 brief — cleanup before redesign

## Context

FolkNettside has grown organically for almost two years. Useful features were added incrementally, often with one-off patches, duplicated loaders, standalone HTML tools, mobile/theme fixes, backup copies and migration scripts.

The goal of Phase 0 is **not** to redesign the site yet.

The goal is to understand the current system, remove code that is genuinely dead/obsolete, separate active runtime code from historical/migration tooling, and leave a much cleaner baseline for the v2 redesign.

Read first:
- `docs/ROADMAP_V2.md`
- `docs/TECHNICAL_AUDIT.md`
- current `README.md`
- active templates/generators
- current navigation/sidebar/viewer code

## Required first deliverable from Claude

Before deleting or refactoring anything, create:

`docs/PHASE0_CLEANUP_PLAN.md`

The plan must be based on actual repository references and runtime paths, not filenames or age alone.

For each candidate file/subsystem record:
- path
- purpose
- evidence of active use
- direct references
- dynamic/generated references
- active navigation/tab reachability
- classification
- proposed action
- regression risk
- validation required before deletion/change

Use these classifications:
- ACTIVE
- ACTIVE-LEGACY
- ORPHAN
- DUPLICATE
- DEV/MIGRATION
- ARCHIVE
- UNKNOWN

## Phase 0 scope — Claude owns the audit and cleanup plan

### A. Build a dependency/reference map

Inspect:
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

Do not assume “not found by simple grep” means unused. Check:
- dynamic script injection
- generated HTML
- file-extension routing
- iframe/viewer routing
- template-generated references
- runtime file selection

### B. Strong cleanup candidates to verify

These are candidates, not pre-approved deletions:
- `includes/sidebar-loaderny.js`
- `includes/three/HydroStatikkGammel.js`
- `includes/kodeLesere/3mfhydro.reportdrawer.bak.html`
- `Tools/KrystallStrukturerGammel.html`
- `*.from_semestre.orig.html`
- root `tmp_fusion_*.html`
- duplicate JSZip copies
- old theme/mobile/flyout injection/fix scripts
- one-off search/replace/migration scripts no longer used
- old tool variants superseded by active versions

### C. Tools review

For every current tool/viewer answer:
1. Is it reachable from an active page/navigation/file route?
2. Is its functionality unique?
3. Is it superseded?
4. Should it survive into v2?
5. If yes, should it remain standalone or become a shared adapter/module?

Do not keep a tool merely because it exists.

### D. UI inventory for later redesign

Phase 0 should identify UI debt, but not perform the full redesign.

Record:
- duplicate controls
- floating controls that should move into Settings
- repeated toolbars
- inconsistent loading/error states
- theme-specific patches
- mobile-only patches
- duplicated navigation patterns
- elements that should disappear entirely

Explicit future moves:
- theme picker -> Settings > Appearance
- Google connection -> Settings > Account & Connections
- Autodesk connection -> Settings > Account & Connections
- common viewer actions -> shared ViewerShell
- engineering defaults -> Settings > Engineering
- per-analysis settings stay within the relevant analysis workspace

## Product constraints that must be preserved

### Public by default

Authentication is optional.

Do not design or implement a mandatory sign-in wall.

Signed-out visitors must still be able to use:
- public homepage
- portfolio
- semesters
- course pages
- public files/viewers
- public tools
- public engineering visualizations

Connected accounts only unlock capabilities that actually need them, e.g. Google Drive sync, Autodesk access, cloud state or future private integrations.

### Semester organization stays first-class

The Study side should remain organized by semester and course.

Content may move internally, but do not replace the semester/course mental model with a generic project dashboard.

### Portfolio and Study are different presentations of one site

Professional visitors should not be confronted with internal-looking academic/archive items such as `kok` in normal portfolio navigation.

This is presentation filtering, not authentication.

## Course-page end state — plan now, regenerate later

Do not regenerate every course page during Phase 0.

However, Phase 0 must inventory differences between existing course pages so we can later migrate them safely.

Final target:
- one canonical course skeleton/template
- all semester/course pages regenerated from that skeleton
- course-specific values stored as metadata/data, not copied UI markup
- common navbar/sidebar/viewer/settings shell
- deterministic generator
- existing URLs preserved where practical

### Karakterweb

Karakterweb must become one shared course capability.

Plan for:
- canonical course-code metadata
- canonical URL: `https://karakterweb.no/ntnu/{course_code}`
- in-view embed where browser/site policy permits it
- explicit open-in-new-tab fallback when embedding is blocked
- no blank/broken iframe state
- automated integration tests
- no per-course custom implementation

## Branch and PR rules

Work from a dedicated branch such as:
`phase0/cleanup-audit`

Do not commit cleanup directly to `main`.

Recommended sequence:
1. commit the audit/cleanup plan only
2. open a draft PR
3. then make cleanup commits in logical groups
4. keep deletions separate from unrelated refactors
5. preserve an easy-to-review diff
6. run tests/export after each cleanup group

Do not merge the PR yourself.

## Definition of done for Phase 0

Phase 0 is complete when:
- every major runtime/tool area has an owner/classification
- known orphan/duplicate files are removed or deliberately archived
- migration-only scripts are separated from supported runtime tooling
- active behaviour still passes representative tests
- GitHub Pages staging builds successfully
- the repo is materially smaller/simpler in maintenance surface
- v2 redesign no longer needs to understand obsolete parallel implementations
- a documented list remains of ACTIVE-LEGACY code intentionally deferred to Phase 2
