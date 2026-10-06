# Phase 3 — Engineering Analysis Workspace

Status: design target / future phase
Branch: `audit/performance-review`

## Vision

Turn the existing model/hydro viewer into one integrated marine engineering analysis workspace.

The same 3D model and component IDs shall be reused across:
- component inspection
- hydrostatics and stability
- structural / FEM analysis
- resistance / CFD
- propulsion / thruster flow analysis
- result visualization

Do not build these as unrelated standalone pages.

## 1. Semantic component model — prerequisite for everything

Every imported component should receive a stable ID and user-editable engineering metadata.

Example:

```json
{
  "id": "thruster-port-aft",
  "name": "Port aft thruster",
  "role": "thruster",
  "material": "aluminium-5083",
  "structural": {
    "included": true,
    "thickness": 0.006
  },
  "propulsion": {
    "type": "rim-drive",
    "axis": [1, 0, 0],
    "diameter": 0.32,
    "maxThrustN": 1200
  }
}
```

Initial roles:
- hull
- deck
- bulkhead
- frame / beam
- plate / shell
- equipment
- battery
- payload
- thruster
- tunnel-thruster
- appendage
- fixed/support
- ignored/reference

UI behaviour:
- selected component = highlighted
- related components = normal
- unrelated components = muted/translucent
- hide/isolate/show-all
- searchable component tree
- saved named selections / sets

The selection system must be shared by hydro, FEM and CFD.

## 2. Structural / FEM workspace

### 2.1 First useful level: beam / frame FEM

Support:
- create beam/frame elements between picked points
- assign section:
  - A
  - Iy / Iz
  - J
  - material E, nu, rho
- supports:
  - fixed
  - pinned
  - roller / constrained DOF
- loads:
  - point force
  - point moment
  - distributed line load
  - gravity
- solve linear static response
- show:
  - reactions
  - deflection
  - axial force
  - shear
  - bending moment
  - stress estimate

Small beam/frame cases can be solved directly in browser with a sparse linear system.

### 2.2 Shell / solid FEM

Workflow:

```
CAD / selected components
        ↓
geometry cleanup
        ↓
surface/volume meshing
        ↓
material + BC + load sets
        ↓
FEM solver
        ↓
results mapped back onto original viewer
```

Meshing candidate:
- Gmsh
- browser/WASM only where practical
- otherwise server/local compute worker

Solver candidate:
- CalculiX for structural FEM

Analysis types, in order:
1. linear static
2. modal/eigenfrequency
3. buckling
4. pressure loading
5. optional nonlinear work later

Loads:
- picked point load
- face pressure
- line load
- distributed mass/gravity
- hydrostatic pressure generated directly from the hydro module
- CFD pressure field mapped from CFD mesh to structure

Results:
- displacement
- deformed shape with scale factor
- von Mises stress
- principal stresses
- strain
- reaction forces
- modal shapes
- factor-of-safety view

Every result field should be rendered as a scalar field on the 3D model.

## 3. Hydro → structural coupling

Hydro should be able to create FEM load cases automatically.

Example:
- select waterline / draft / heel / trim
- compute local hydrostatic pressure
- map pressure to hull faces
- send pressure field to FEM case

This makes the existing hydro module part of the structural workflow instead of a separate viewer.

## 4. Resistance / CFD workspace

Use multiple fidelity levels rather than forcing every question through full CFD.

### Quick
Instant browser estimates:
- Reynolds number
- ITTC frictional resistance
- residual/form-factor based estimates
- power vs speed
- basic propulsive power requirements

### CFD case
Primary backend target: OpenFOAM.

Inputs in UI:
- speed
- water density / viscosity
- draft / trim
- turbulence model
- domain size
- mesh quality
- symmetry
- free surface on/off
- steady/transient mode

Generated case should retain links to component IDs.

Outputs:
- total resistance
- pressure resistance
- viscous resistance
- force coefficients
- pressure coefficient on hull
- wall shear
- free-surface elevation
- velocity field
- wake field

Result UI:
- hull pressure heatmap
- free-surface surface/contours
- cut planes
- streamlines
- vector glyphs
- resistance-vs-speed curves

## 5. Thruster / propulsion flow

A component tagged as `thruster` gets a propulsion definition:
- axis/direction
- diameter
- center
- thrust
- power
- RPM where applicable
- Ct/Cp curves where available

### Fast visualization
Without CFD:
- visualize axis
- disk/duct
- nominal inflow region
- thrust vector
- simple induced-velocity estimate

Clearly label this as an estimate.

### CFD
Use an actuator-disk/body-force representation first.

This allows:
- intake/inflow pattern ahead of thruster
- accelerated jet downstream
- interaction between hull and thruster
- interference between multiple thrusters
- local velocity non-uniformity

Later, optional resolved-rotor simulations can be added for high-fidelity cases, but should not be the default.

Results:
- streamlines seeded upstream of selected thruster
- velocity magnitude
- axial velocity
- inflow angle
- disk-average velocity
- wake fraction / non-uniformity metrics where meaningful
- thrust/power summary

## 6. Unified analysis UI

Suggested layout:

```
┌────────────────────────────────────────────────────────────┐
│ Model     Hydro     Structure     Resistance     Propulsion │
├──────────────┬───────────────────────────────┬─────────────┤
│ Components   │                               │ Properties  │
│              │          3D MODEL             │ / Case      │
│ Hull         │                               │             │
│ Frames       │                               │ Material    │
│ Thrusters    │                               │ Load / BC   │
│ Batteries    │                               │ Solver      │
│ ...          │                               │             │
├──────────────┴───────────────────────────────┴─────────────┤
│ Results: V / CB / GM | Stress | Displacement | R | Flow   │
└────────────────────────────────────────────────────────────┘
```

Selection model:
- chosen: bright/accent
- muted: low-opacity neutral
- hidden: not rendered
- result mode: scalar colormap overrides normal material while preserving selection outline

## 7. Compute architecture

Do not try to force all engineering solves into the browser.

### Browser
Good for:
- model selection/tagging
- visualization
- hydro when optimized
- small beam/frame FEM
- quick resistance estimates
- case setup
- result post-processing
- lightweight mesh inspection

### Worker / WASM
Good for:
- geometry clipping
- BVH building
- selected meshing tasks
- moderate numerical kernels

### Compute service / local solver
Use for:
- large Gmsh meshes
- CalculiX shell/solid FEM
- OpenFOAM free-surface RANS
- long speed sweeps
- multi-thruster CFD
- resolved propeller simulations

The web UI should submit a versioned analysis case and later load deterministic result artifacts. Solver choice must remain replaceable.

## 8. Analysis case contract

All analysis modules should use one saved case format.

```json
{
  "modelRevision": "...",
  "selectionSets": {},
  "materials": {},
  "hydro": {},
  "structure": {},
  "cfd": {},
  "thrusters": {},
  "solver": {},
  "results": {}
}
```

This allows:
- reproduce case
- compare runs
- link result to model revision
- expose a read-only portfolio result
- keep heavy result data outside Git

## 9. Portfolio mode

Engineering analyses can be selectively published.

Example:
- recruiter sees model
- can click Hull / Thrusters / Structure
- can enable Hydro result
- can view a stress case
- can view resistance curve
- can inspect thruster inflow streamlines

Student/private tools and raw course content do not appear in portfolio navigation.

## 10. Implementation order

1. semantic component IDs + selected/muted/isolate UI
2. shared result-field renderer
3. optimized hydro core
4. beam/frame FEM
5. Gmsh + CalculiX structural pipeline
6. quick resistance module
7. OpenFOAM resistance pipeline
8. thruster actuator-disk cases
9. CFD/FEM coupling and richer post-processing
10. published portfolio analysis scenes

## 11. Validation rule

Every numerical module needs benchmark cases before it is presented as an engineering result.

Examples:
- beam: simply supported beam / cantilever closed-form cases
- solid FEM: standard patch tests / known stress cases
- hydro: analytic barge/wedge cases
- CFD: benchmark drag/resistance cases
- thruster: actuator-disk canonical case

UI must distinguish:
- analytic / exact
- numerical high fidelity
- numerical approximate
- empirical estimate
- visualization only
