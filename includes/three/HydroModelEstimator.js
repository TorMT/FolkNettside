// /includes/three/HydroModelEstimator.js
//
// Lettvekts-modul for hydrostatiske estimater fra STL/STEP/3MF-mesh-data.
// Fokus: tidlig konseptestimat når full hydrostatisk integrasjon ikke er kjørt ennå.

/**
 * @typedef {Object} HydroInput
 * @property {number} volumeM3 - Fortrengt volum [m^3]
 * @property {number} lwlM - Lengde i vannlinje [m]
 * @property {number} bwlM - Bredde i vannlinje [m]
 * @property {number} draftM - Dypgang [m]
 * @property {number} waterplaneAreaM2 - Vannlinjeareal [m^2]
 * @property {number} wettedAreaM2 - Våt overflate [m^2]
 * @property {number} displacementKg - Masse/deplasement [kg]
 * @property {number} waterDensityKgM3 - Tetthet vann [kg/m^3]
 */

const DEFAULT_WATER_DENSITY = 1025;

function safeDiv(n, d) {
  if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return null;
  return n / d;
}

function finite(v) {
  return Number.isFinite(v) ? v : null;
}

/**
 * Klassiske formfaktorer + stabilitetsnære nøkkeltall.
 *
 * @param {Partial<HydroInput>} input
 * @returns {Object}
 */
export function estimateHydroCoefficients(input = {}) {
  const volumeM3 = finite(Number(input.volumeM3));
  const lwlM = finite(Number(input.lwlM));
  const bwlM = finite(Number(input.bwlM));
  const draftM = finite(Number(input.draftM));
  const waterplaneAreaM2 = finite(Number(input.waterplaneAreaM2));
  const wettedAreaM2 = finite(Number(input.wettedAreaM2));
  const displacementKg = finite(Number(input.displacementKg));
  const rho = finite(Number(input.waterDensityKgM3)) || DEFAULT_WATER_DENSITY;

  const displacementFromVolumeKg = volumeM3 ? volumeM3 * rho : null;

  // Cb = ∇ / (Lwl * Bwl * T)
  const Cb = safeDiv(volumeM3, (lwlM ?? 0) * (bwlM ?? 0) * (draftM ?? 0));

  // Cwp = Awp / (Lwl * Bwl)
  const Cwp = safeDiv(waterplaneAreaM2, (lwlM ?? 0) * (bwlM ?? 0));

  // Cm = Cb / Cp og Cp = ∇ / (Am * Lwl), bruker Am≈B*T*Cm => Cp≈Cb/Cm
  // Uten eksakt midtskipsareal estimerer vi Cm fra empirisk intervall via Cwp.
  const CmEstimate = Cwp != null ? Math.min(0.99, Math.max(0.65, 0.58 + 0.45 * Cwp)) : null;
  const Cp = safeDiv(Cb, CmEstimate);

  // Wetted surface coefficient (Grovt): Cs = S / (L * (2T + B))
  const Cs = safeDiv(wettedAreaM2, (lwlM ?? 0) * (2 * (draftM ?? 0) + (bwlM ?? 0)));

  // Slankhet + fyldeindikator
  const slendernessLByB = safeDiv(lwlM, bwlM);
  const slendernessBByT = safeDiv(bwlM, draftM);

  // Froude-basis hastighetsestimat (for referanse): Fn=0.25 * sqrt(gL)
  const g = 9.81;
  const vRefMs = lwlM ? 0.25 * Math.sqrt(g * lwlM) : null;

  return {
    inputs: {
      volumeM3,
      lwlM,
      bwlM,
      draftM,
      waterplaneAreaM2,
      wettedAreaM2,
      displacementKg,
      waterDensityKgM3: rho,
    },
    displacementFromVolumeKg,
    displacementDeltaKg: (displacementKg != null && displacementFromVolumeKg != null)
      ? displacementKg - displacementFromVolumeKg
      : null,
    coefficients: {
      Cb,
      Cwp,
      CmEstimate,
      Cp,
      Cs,
    },
    geometryRatios: {
      slendernessLByB,
      slendernessBByT,
    },
    reference: {
      vRefMs,
      vRefKnots: vRefMs != null ? vRefMs * 1.94384 : null,
    },
  };
}

/**
 * Henter grunnlagsdata fra mesh-bounds/hydroresultater.
 * Kan brukes for STL/STEP/3MF så lenge loader leverer samme felter.
 */
export function buildHydroInputFromModel(modelMetrics = {}, hydroMetrics = {}) {
  const bounds = modelMetrics.bounds || {};
  const hydro = hydroMetrics || {};

  return {
    volumeM3: Number(hydro.submergedVolumeM3 ?? hydro.volumeM3),
    lwlM: Number(hydro.lwlM ?? bounds.lengthM),
    bwlM: Number(hydro.bwlM ?? bounds.beamM),
    draftM: Number(hydro.draftM ?? bounds.draftM),
    waterplaneAreaM2: Number(hydro.waterplaneAreaM2 ?? hydro.awpM2),
    wettedAreaM2: Number(hydro.wettedAreaM2 ?? hydro.sakM2),
    displacementKg: Number(hydro.displacementKg ?? hydro.deltaKg),
    waterDensityKgM3: Number(hydro.waterDensityKgM3 ?? 1025),
  };
}


/**
 * Prohaska-formfaktor fra slepeforsøk (lav-Fn serie).
 * ITTC-praksis: lineær fit av y = Ct/Cf mot x = Fn^4/Cf, der intercept = (1+k).
 */
export function estimateProhaskaFormFactor(samples = []) {
  const clean = samples
    .map((row) => ({
      fn: Number(row.fn),
      ct: Number(row.ct),
      cf: Number(row.cf),
    }))
    .filter((r) => Number.isFinite(r.fn) && Number.isFinite(r.ct) && Number.isFinite(r.cf) && r.cf > 0);

  if (clean.length < 3) {
    return { k: null, intercept: null, slope: null, pointsUsed: clean.length, warning: 'Need >=3 valid samples' };
  }

  const pts = clean.map((r) => ({ x: (r.fn ** 4) / r.cf, y: r.ct / r.cf }));
  const n = pts.length;
  const sx = pts.reduce((a, p) => a + p.x, 0);
  const sy = pts.reduce((a, p) => a + p.y, 0);
  const sxx = pts.reduce((a, p) => a + p.x * p.x, 0);
  const sxy = pts.reduce((a, p) => a + p.x * p.y, 0);
  const denom = n * sxx - sx * sx;
  if (!Number.isFinite(denom) || Math.abs(denom) < 1e-12) {
    return { k: null, intercept: null, slope: null, pointsUsed: n, warning: 'Degenerate regression' };
  }

  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  const k = intercept - 1;
  return { k, intercept, slope, pointsUsed: n, points: pts };
}

/**
 * Enkel ITTC-liknende motstandseksrapolasjon fra modell til fullskala.
 */
export function estimateResistanceFromTowing({
  modelScaleLambda,
  speedModelMs,
  lengthModelM,
  wettedAreaModelM2,
  wettedAreaShipM2,
  ctm,
  waterKinematicViscosity = 1e-6,
}) {
  const lambda = Number(modelScaleLambda);
  const vm = Number(speedModelMs);
  const lm = Number(lengthModelM);
  const sm = Number(wettedAreaModelM2);
  const ss = Number(wettedAreaShipM2);
  const ctmVal = Number(ctm);
  if (![lambda, vm, lm, sm, ss, ctmVal].every(Number.isFinite) || lambda <= 1) {
    return { error: 'Invalid towing input' };
  }

  const ls = lm * lambda;
  const vs = vm * Math.sqrt(lambda);
  const rem = vm * lm / waterKinematicViscosity;
  const res = vs * ls / waterKinematicViscosity;
  const cfm = 0.075 / ((Math.log10(rem) - 2) ** 2);
  const cfs = 0.075 / ((Math.log10(res) - 2) ** 2);

  return {
    speedShipMs: vs,
    reynoldsModel: rem,
    reynoldsShip: res,
    cfModel: cfm,
    cfShip: cfs,
    ctModel: ctmVal,
    rfScaleFactor: (cfs * ss) / (cfm * sm),
  };
}

/**
 * Standard propell-/thruster-koeffisienter i open-water format.
 */
export function estimatePropulsorCoefficients({ thrustN, torqueNm, rpm, diameterM, waterDensityKgM3 = 1025, shipSpeedMs = 0 }) {
  const T = Number(thrustN);
  const Q = Number(torqueNm);
  const nRps = Number(rpm) / 60;
  const D = Number(diameterM);
  const rho = Number(waterDensityKgM3);
  const Va = Number(shipSpeedMs);

  if (![T, Q, nRps, D, rho, Va].every(Number.isFinite) || nRps <= 0 || D <= 0 || rho <= 0) {
    return { error: 'Invalid propulsor input' };
  }

  const J = Va / (nRps * D);
  const KT = T / (rho * (nRps ** 2) * (D ** 4));
  const KQ = Q / (rho * (nRps ** 2) * (D ** 5));
  const eta0 = (2 * Math.PI) > 0 && KQ !== 0 ? (J * KT) / (2 * Math.PI * KQ) : null;

  return { J, KT, KQ, eta0, nRps };
}
