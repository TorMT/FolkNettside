# FolkNettside technical audit

Baseline: `main@5bc83467cdcb7a26955082a4ed68d66249bd2856`
Audit branch: `audit/performance-review`

## Goal

Create a complete inventory of runtime features and maintenance tooling, document what each area does, identify duplicated/obsolete code, and benchmark performance-sensitive code before any redesign/rewrite.

Status legend:
- **Inventory**: files/features identified
- **Reviewed**: code structure inspected
- **Bench needed**: performance must be measured before changing
- **Rewrite candidate**: architecture should probably change
- **Keep**: implementation is small/adequate unless testing finds a defect

## 1. Functional inventory

| Area | Main files | What it does | Status |
|---|---|---|---|
| Site shell | `index.html`, `course-template.html`, navbar/sidebar includes | Main page shell, course shell, navigation | Inventory |
| Sidebar / file routing | `includes/sidebar-loader.js` | Loads course index, groups files, routes every file type into viewers, quiz/video/Fusion handling, badges, flyouts | Reviewed / rewrite candidate |
| Sidebar DOM loader | `includes/sidebar-html-loader.js` | Loads shared sidebar HTML | Reviewed |
| Sidebar search | `includes/sidebar-search-module.js` | Search, fuzzy matching, history, filtering | Reviewed |
| Sidebar notifications | `includes/sidebar-notifications-module.js` | Tracks new files in localStorage and periodically checks course contents | Reviewed |
| Mobile layer | `includes/mobile-enhancer.js` | Mobile navigation, sidebar, quiz, accessibility and viewport patches | Reviewed / rewrite candidate |
| Theme system | `assets/js/theme-switcher.js`, theme CSS, flyout theme updater | Theme persistence and propagation | Reviewed / consolidation candidate |
| Quiz | `includes/quiz-lite.js`, `Quiz/` | Quiz rendering, wrong-answer bank, chapter filters, leaderboard integration | Reviewed |
| Code viewer | `includes/kodeLesere/codeview.html` | Fetches source, regex syntax highlighting, line numbers, copy/open raw/VS Code | Reviewed / keep then modularize |
| Python/notebook runner | `run-lite.js`, `run-lite_worker.js`, `pyview.html`, `nbview.html` | Pyodide worker execution and notebook/Python viewing | Reviewed / keep |
| CSV viewer | `csvview.html` | Delimiter detection, parsing, table/raw display, filtering | Reviewed / keep then modularize |
| HTML viewer | `htmlview.html` | Safe-ish iframe embedding and theme propagation | Reviewed / simplify |
| LaTeX viewer | `latexview.html` | Fetch/render LaTeX source with MathJax | Reviewed / package review |
| Office viewer | `officeview.html` | Office document embed/fallback | Reviewed |
| PDF viewer | `pdfview.html` | Browser PDF wrapper | Reviewed |
| Video viewer | `video-embed-list.html` | Grouping, search, sort, watched/resume state, YouTube/Panopto/Drive/native playback | Reviewed / rewrite candidate |
| STL/3D viewer | `stlview.html`, `STLViewerCore.js`, controllers | Three.js model viewing, controls, measures, clipping, component UI | Reviewed / performance bench needed |
| 3MF/Fusion/STEP loading | `ModelLoader.js`, `ThreeMFLoader.js`, `FusionArchiveLoader.js`, `StepLoader.js` | Parse/load supported CAD/mesh formats and normalize geometry | Reviewed / package consolidation |
| Fusion analyzer | `assets/js/fusion-file-analyzer.js` | Fusion archive inspection, preview resolution, materials, component selection, hydro controls/reports | Reviewed / strong rewrite candidate |
| Hydrostatics core | `includes/three/HydroStatikk.js` | Displaced volume, CB, waterplane, GM, GZ, draft search, equilibrium, SAK, section curves/reports | Deep reviewed / P0 performance |
| Hydro model/mass props | `ModelLoader.js`, `HydroModelEstimator.js` | Exact full-mesh volume/centroid/inertia and empirical estimates | Reviewed |
| Hydro lab | `includes/three/hydro-lab/` | Experimental wave/resistance/data-contract helpers | Inventory/reviewed |
| Hydro report viewer | `hydrostaticsview.html` | Reads JSON/CSV reports and charts them | Reviewed |
| CoolProp tools | `Tools/Coolprop/` | Thermophysical property calculations, diagrams and process calculations | Reviewed / consolidate variants |
| Fluid calculator | `Tools/FluidKalkulator.html` | Polynomial/property calculator | Reviewed / keep |
| ChemDraw/Kekule | `Tools/ChemDraw.html` | Chemistry structure drawing via dynamically loaded Kekule | Reviewed / keep |
| Crystal viewer | `Tools/KrystallStrukturer/` | Interactive crystal structures, planes, bonds, measurements | Reviewed / performance bench |
| Periodic table | `Tools/PeriodicTable/` | Search/filter/inspect element data | Reviewed / keep |
| Brewing app | `assets/js/brewing-*.js`, recipe/hydrometer modules | Recipes, logs, hydrometer analysis, forecasting, rendering | Reviewed / modularization candidate |
| Google Drive sync | `assets/js/google-drive-sync.js` | OAuth/script load, Drive folders/files and sync | Reviewed |
| Portfolio template | `diverse/portfolio-template/` | Separate portfolio rendering/data template | Inventory |
| Index generation | `SiteUpdater3.py` | Recursively builds index metadata, backups, sidecars, enrichment hooks | Reviewed / retain but split responsibilities |
| Course/navbar generator | `navbarupdater.py` | Creates semester/course pages and nav entries | Reviewed / overlaps SiteUpdater |
| Deployment | `scripts/export_repo.py`, GitHub Actions | Builds GitHub Pages export | Reviewed / will change for v2 |
| Migration/fix scripts | `scripts/*fix*.py`, injection scripts, bulk update | Historical mass-edit tooling | Inventory / archive candidates |

## 2. Immediate duplication / maintenance findings

### 2.1 Sidebar loader duplication
`includes/sidebar-loader.js` and `includes/sidebar-loaderny.js` share about 70 named functions. The current file has only a few extra named helpers (`getCourseCode`, `getKarakterwebUrl`, `isLockedSection`).

**Action:** retire the parallel copy after verifying which one is actually referenced. New v2 should expose file routing, video routing and sidebar presentation as separate modules.

### 2.2 Theme propagation is reimplemented
Theme propagation exists independently in CSV, Office, video, HTML, STL, 3MF hydro, Fusion analyzer and supporting scripts. Several viewers use both observers/events and periodic polling.

**Action:** one theme bridge module using an initial state + `postMessage`/event + `MutationObserver`; no permanent 500 ms/1000 ms/1500 ms polling fallback unless a measured compatibility case requires it.

### 2.3 JSZip loading is duplicated
Separate `ensureJsZip` implementations exist in Fusion archive loading, 3MF loading, Fusion analyzer and F3D viewer. Two copies of `jszip.min.js` are tracked.

**Action:** one archive adapter. Benchmark JSZip against `fflate` for the actual 3MF/F3D files before replacing it.

### 2.4 Viewer shell duplication
Loading/error UI, locked/fullscreen state, theme sync, file URL resolution and toolbar behavior are repeated across viewers.

**Action:** build one ViewerShell and small adapters instead of maintaining complete independent HTML apps.

### 2.5 Large monoliths
Current large first-party runtime files include:
- `fusion-file-analyzer.js` ~209 kB / ~195 named functions
- `mobile-enhancer.js` ~136 kB
- `sidebar-loader.js` ~93 kB / ~73 named functions
- `video-embed-list.html` ~53 kB / ~60 named functions
- `HydroStatikk.js` ~71 kB

These are not automatically slow, but they are high-risk maintenance units and inhibit lazy loading/tree-shaking.

## 3. P0: Hydrostatics performance

### Current volume / CB algorithm

`HydroStatikk._recomputeInternal()` samples the submerged body on a Y/Z grid and casts an X-directed Three.js ray for every sample cell.

Grid sizes:
- low: 22 x 22 = **484 raycasts/recompute**
- medium: 50 x 50 = **2,500 raycasts/recompute**
- high: 90 x 90 = **8,100 raycasts/recompute**

Each ray currently calls normal Three.js mesh raycasting and asks for all intersections.

This compounds rapidly:
- target displacement: up to 22 low-quality iterations = **10,648 raycasts** before the final recompute
- GZ report, -60..60 deg in 2 deg increments: 61 low-quality states = **29,524 raycasts**, plus full triangle traversal for SAK when enabled
- equilibrium scan/bisection can evaluate dozens of states; worst-case scan + fallback rescan + bisection is roughly **40k low-quality raycasts**
- draft scans repeat the same hydro core per draft and may also compute waterplane rays

The main thread is kept responsive by yielding with `await new Promise(requestAnimationFrame)`, but that reduces blocking rather than reducing the amount of work.

### Easy improvements before algorithm replacement

1. Build a BVH once per normalized mesh and use `three-mesh-bvh` accelerated raycasting.
2. Hoist `_getRaycastTarget()` outside inner loops.
3. Reuse a single intersection array using Three.js `Raycaster.intersectObject(..., targetArray)` and clear it between rays instead of allocating an array for every ray.
4. Reuse ray direction vectors; `computeSectionAreaCurve()` currently constructs `new THREE.Vector3(0,1,0)` in its inner loop.
5. Move hydro computation to a Web Worker so interaction/rendering remains independent.
6. Keep geometry/BVH/cache data alive between draft changes.
7. Express the water plane in local mesh coordinates where possible rather than transforming every triangle vertex to world coordinates repeatedly.

### Recommended algorithm experiment

The current method is an approximate voxel/ray integration even when the input is a closed triangle solid. The repo already contains an exact signed-tetrahedron implementation for full-mesh volume, centroid and second moments in `ModelLoader.computeGeometryMassProps()`.

Prototype two alternative hydro engines behind the same interface:

**Engine A: accelerated current solver**
- current sampling math
- `three-mesh-bvh`
- worker
- reused typed arrays / hit arrays
- serves as compatibility baseline

**Engine B: clipped-solid solver**
- clip/split the closed mesh at the water plane
- compute submerged volume/centroid from the clipped closed mesh using tetrahedral integration
- derive waterline polygon and exact/near-exact waterplane properties
- worker/WASM
- benchmark robustness and transfer overhead

Candidate library for Engine B: `manifold-3d` (WASM), because it provides robust manifold mesh operations including `splitByPlane` / `trimByPlane` and volume/surface-area properties. Do not adopt it before benchmark: JS<->WASM mesh conversion and non-manifold input repair may dominate on some files.

### SAK optimization

`computeWetSurfaceArea()` walks every triangle for every requested state and applies the full world matrix to each vertex.

Improve by:
- evaluating a transformed plane equation against local-space vertices
- caching per-triangle geometry data
- worker execution
- if Engine B is successful, use clipped submerged mesh surface data and separate/remove the waterplane cap contribution

## 4. 3D viewer performance

`STLViewerCore.start()` currently keeps a permanent `requestAnimationFrame` loop, calls `controls.update()`, frame listeners and a full render every frame. With damping this is simple but consumes GPU/CPU while idle.

Benchmark an invalidation/event-driven renderer:
- render on controls change while damping is active
- continue frames only until damping settles
- render on resize/model/material/clipping/selection changes
- stop completely while static
- pause when document/iframe is hidden

If bbox helper is enabled, `Box3.setFromObject()` is currently updated every frame and should instead update only after model transforms.

## 5. Viewer/package review notes

- **Code viewer:** current regex highlighter is lightweight but language-limited and can become expensive on large source files. Keep it for small files initially; benchmark lazy Prism/highlight.js or build-time Shiki before replacing.
- **LaTeX:** current viewer uses MathJax 3. MathJax 4 exists; KaTeX is a candidate when speed matters, but feature compatibility with course material must be tested.
- **Archive parsing:** benchmark `fflate` against JSZip. `fflate` is much smaller and supports async/multithreaded ZIP APIs.
- **Charting:** Chart.js is appropriate; for large curves use prepared/sorted data, `parsing:false`, disabled animations and decimation as applicable.
- **Three.js:** the repo vendors its own Three.js build. Before upgrading, identify its exact revision and run the Three migration guide incrementally.

## 6. Accuracy/performance benchmark suite required before hydro rewrite

Add deterministic models with known answers:

### Rectangular barge
Known analytically for any draft inside the box:
- submerged volume = L B T
- CB = geometric center of submerged prism
- waterplane area = L B
- transverse waterplane second moment = L B^3 / 12
- longitudinal waterplane second moment = B L^3 / 12

Test:
- several drafts
- heel = 0 first
- later small heel/trim cases against an independent reference

### Additional cases
- triangular/wedge prism
- symmetric closed mesh with known total volume
- non-indexed and indexed versions of the same geometry
- reversed winding
- multiple components
- small/large coordinate magnitudes
- intentionally non-manifold input (must fail clearly or be repaired explicitly)

Record per test:
- triangle count
- load/normalization time
- preprocessing/BVH/WASM build time
- first hydro result latency
- subsequent draft-change latency
- GZ curve total time
- max UI main-thread blocking
- numerical error vs analytic/reference result
- memory peak where practical

## 7. Existing tests

Current automated tests are useful but do not cover the performance-critical hydro core:
- `scripts/test_hydro_modules.mjs`: estimator/data-contract checks
- `scripts/test_viewer_integrations.mjs`: integration/security string checks

Add numerical hydro regression tests before changing the solver.

## 8. Cleanup candidates already identified

Do not delete until references are checked:
- `includes/sidebar-loaderny.js`
- `includes/three/HydroStatikkGammel.js`
- `includes/kodeLesere/3mfhydro.reportdrawer.bak.html`
- `Tools/KrystallStrukturerGammel.html`
- identical `*.from_semestre.orig.html` copies
- root `tmp_fusion_*.html` files
- duplicate JSZip bundle
- old mass-edit/fix scripts that are no longer part of normal maintenance

## 9. Audit order

1. Hydrostatics + 3D core
2. Fusion/model/archive loaders
3. Viewer shell and file routing
4. Video viewer
5. Sidebar/mobile/theme
6. CoolProp/fluid/crystal/periodic/chemistry tools
7. Quiz
8. Brewing/hydrometer/recipe tools
9. Build/index/deploy scripts
10. Dead-code and legacy cleanup

No rewrite is considered successful until behavior and benchmark results are recorded here.
