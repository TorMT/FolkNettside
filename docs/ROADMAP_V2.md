# FolkNettside v2 roadmap

Baseline branch for planning: `audit/performance-review`

This roadmap supersedes the earlier informal phase ordering.

## Phase 0 — Cleanup and legacy retirement

Goal: reduce the repository to code that is actually used before redesigning around it.

### 0.1 Build a reference graph

For every script, stylesheet, viewer and tool, record:
- direct HTML references
- dynamic imports/script injection
- references from generators such as `SiteUpdater3.py` / `navbarupdater.py`
- references from generated course pages
- references from GitHub Pages export
- references from currently active navigation entries/tabs
- runtime-only references through file routing

Classification:
- ACTIVE — required by current production pages
- ACTIVE-LEGACY — currently used but planned for replacement
- ORPHAN — no known active reference
- DEV/MIGRATION — maintenance-only script
- DUPLICATE — replaced by another implementation
- ARCHIVE — historical reference only
- UNKNOWN — must not delete until runtime verified

### 0.2 Strong cleanup candidates already identified

Do not delete until reference/runtime verification is complete:
- `includes/sidebar-loaderny.js`: repository search currently finds no references; near-duplicate of active `sidebar-loader.js`
- `includes/three/HydroStatikkGammel.js`
- `includes/kodeLesere/3mfhydro.reportdrawer.bak.html`
- `Tools/KrystallStrukturerGammel.html`
- identical `*.from_semestre.orig.html`
- root `tmp_fusion_*.html`
- duplicate JSZip bundle
- historical theme/mobile/flyout injection/fix scripts once their output is confirmed baked into active files
- one-off migration/search/replace scripts that are no longer part of the supported maintenance workflow

### 0.3 Tools cleanup

Every item under `Tools/`, `includes/kodeLesere/`, `includes/three/` and relevant `assets/js/` gets one decision:
- keep
- merge into shared subsystem
- rewrite
- move to dev/archive
- delete

A tool does not survive merely because it exists. It survives if:
1. it is actively reachable/used, or
2. it implements unique functionality we explicitly want in v2.

### 0.4 Safe deletion rule

No deletion from `main` during audit.

Before removing a candidate:
1. prove no active source/generator reference
2. build/export site
3. run viewer/integration checks
4. manually test representative semester/course pages
5. remove on cleanup branch
6. repeat tests
7. merge through PR

Phase 0 should materially reduce duplicate files and maintenance scripts before UI redesign starts.

---

## Phase 1 — New application shell, navigation, Settings and identity

Goal: establish the long-lived platform shell before redesigning individual tools.

### 1.1 Site modes

One site, shared content model, two user-facing experiences:

**Portfolio**
- professional homepage
- projects
- engineering
- CV/about/contact
- no course-only/internal-looking navigation such as `kok`

**Study**
- first-class semester structure
- semesters -> courses -> resources
- viewers, quiz, videos, tools
- academic archive remains easy to navigate

Hiding an item from portfolio navigation is presentation only; truly private material must not be published publicly.

### 1.2 Settings becomes a first-class page/panel

Create a persistent Settings surface rather than scattered floating controls.

Suggested sections:

```text
Settings
├── Appearance
│   ├── Light / Dark / System
│   ├── Accent / theme
│   ├── density / compactness
│   └── motion / accessibility
├── Account & Connections
│   ├── Google account
│   ├── Google Drive
│   ├── Autodesk APS
│   └── future services
├── Study
│   ├── default semester
│   ├── video progress behaviour
│   └── quiz preferences
├── Engineering
│   ├── default units
│   ├── water density
│   ├── viewer quality
│   └── analysis defaults
├── Privacy & Data
│   ├── local storage
│   ├── clear local state
│   └── analytics preference where applicable
└── Developer / Advanced
    ├── diagnostics
    ├── feature flags
    └── import/export settings
```

### 1.3 Replace the current theme picker

The current `theme-switcher.js` dynamically creates a floating theme picker and includes logic for duplicate cleanup, flyout restyling and mobile-specific exceptions.

Replace this with:

```text
ThemeService
├── state
├── persistence
├── system-theme listener
├── CSS token application
└── theme-change event
```

The service owns state only. The Settings UI owns the controls.

Principles:
- no standalone floating paint-palette widget
- no per-viewer permanent polling for theme changes
- one shared design-token system
- default option should include System / Light / Dark
- optional named accent palettes can remain if they improve the site
- embedded viewers receive theme state from the parent through one standard bridge

Retire `Tools/theme-creator.html` / `image-to-theme.html` from normal user navigation unless they remain useful as developer tools.

### 1.4 Site-wide Google sign-in

Current state:
- `assets/js/google-drive-sync.js` creates a Google GIS OAuth token client inside the Brewing feature
- access token is held in page-local JavaScript memory
- this is feature-scoped rather than site-scoped

Target:

```text
Settings > Account & Connections
        ↓
     Google
   Connected
        ↓
shared site session
        ↓
Drive / other permitted Google features
```

Preferred architecture for persistent site-wide access:
- backend OAuth authorization-code flow
- request only needed scopes, incrementally
- refresh token stored server-side, never in public JS/localStorage
- browser receives a secure application session cookie
- one `AuthService` exposes current connection state to the whole site
- individual features request capabilities through the central service rather than implementing login themselves

Google documents the web-server OAuth flow for applications that can securely store credentials and refresh tokens; refresh tokens are not typically used in client-side JavaScript web apps. See Google OAuth documentation.

For GitHub Pages staging:
- auth-dependent features run in disconnected/demo mode, or
- call the same externally hosted auth/API backend if CORS/origin policy is deliberately configured

Do not put client secrets or refresh tokens in the Pages build.

### 1.5 Connection model

Use a common connector state shape:

```json
{
  "google": {
    "status": "connected",
    "capabilities": ["drive.file"],
    "accountLabel": "..."
  },
  "autodesk": {
    "status": "disconnected",
    "capabilities": []
  }
}
```

UI should show connection status and allow connect/disconnect from Settings.

---

## Phase 2 — Viewer/tool consolidation and performance rewrite

Goal: modernize functionality after the shell/settings/auth layer is stable.

Includes:
- one ViewerShell
- code/CSV/HTML/LaTeX/PDF/Office/notebook adapters
- video viewer modularization
- model viewer consolidation
- archive/parser consolidation
- CoolProp/fluid/crystal/chemistry tool review
- quiz review
- brewing/tool review
- performance measurement

P0 technical target remains hydro/3D:
- numerical regression suite
- BVH experiment
- worker/WASM experiment
- clipped-solid hydro experiment
- render-on-demand 3D
- caching and allocation reduction

Every retained tool should use:
- shared Settings
- shared ThemeService
- shared Auth/Connections service where relevant
- shared ViewerShell / UI primitives
- shared error/loading/status patterns

---

## Phase 3 — Engineering analysis workspace and add-ons

Goal: turn the component-aware model viewer into a marine engineering analysis workspace.

Primary import:
- Fusion archive/design
- 3MF assembly
- STEP/IGES where useful

Preserve assembly/component identity.

Modules:
- optimized hydrostatics
- structural beam/frame FEM
- shell/solid FEM via Gmsh + solver backend
- resistance estimation
- CFD/OpenFOAM pipeline
- thruster/actuator-disk flow analysis
- shared scalar/vector result visualization
- hydro -> FEM pressure coupling
- CFD -> FEM pressure coupling
- publishable portfolio analysis scenes

See `docs/PHASE3_ENGINEERING_WORKSPACE.md`.

---

## Cross-phase rule: UI review

A redesign is not just new CSS.

For each existing UI element ask:
1. Is this still required?
2. Does it belong globally, in Settings, in a tool, or nowhere?
3. Is its current interaction still the best one?
4. Can it reuse a shared component?
5. Does it make sense in Portfolio mode, Study mode, both, or neither?

Examples:
- theme picker -> Settings
- Google login -> Settings / account status
- component visibility -> model workspace
- hydro quality -> Engineering settings + case-specific override
- viewer fullscreen/download -> shared ViewerShell
- old theme/fix utilities -> developer/archive or delete
