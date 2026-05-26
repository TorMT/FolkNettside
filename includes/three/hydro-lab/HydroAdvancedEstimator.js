// Advanced standalone hydro estimator pack (ikke koblet til eksisterende viewer)

const G = 9.81;
const NU_SEAWATER = 1.19e-6;

const MATERIAL_STRENGTH = {
  steel: { label: 'Stal', allowableStressPa: 155e6, elasticModulusPa: 210e9, safetyFactor: 1.6 },
  aluminum: { label: 'Aluminium', allowableStressPa: 85e6, elasticModulusPa: 69e9, safetyFactor: 1.8 },
  grfp: { label: 'GRP / kompositt', allowableStressPa: 55e6, elasticModulusPa: 18e9, safetyFactor: 2.4 },
  wood: { label: 'Tre', allowableStressPa: 18e6, elasticModulusPa: 10e9, safetyFactor: 2.8 },
  pla: { label: 'PLA', allowableStressPa: 20e6, elasticModulusPa: 3.2e9, safetyFactor: 3.0 },
  petg: { label: 'PETG', allowableStressPa: 18e6, elasticModulusPa: 2.1e9, safetyFactor: 3.0 },
  abs: { label: 'ABS', allowableStressPa: 16e6, elasticModulusPa: 2.0e9, safetyFactor: 3.0 },
  nylon: { label: 'Nylon', allowableStressPa: 14e6, elasticModulusPa: 1.7e9, safetyFactor: 3.0 },
  titanium: { label: 'Titan', allowableStressPa: 220e6, elasticModulusPa: 116e9, safetyFactor: 1.6 },
  brass: { label: 'Messing', allowableStressPa: 70e6, elasticModulusPa: 100e9, safetyFactor: 2.0 },
  custom: { label: 'Custom', allowableStressPa: 35e6, elasticModulusPa: 20e9, safetyFactor: 2.5 },
};

function finiteNumber(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function materialProfile(slug = 'custom', overrides = {}) {
  const base = MATERIAL_STRENGTH[String(slug || '').toLowerCase()] || MATERIAL_STRENGTH.custom;
  return {
    ...base,
    ...overrides,
    slug: String(slug || 'custom').toLowerCase(),
  };
}

export function estimateWaveKinematics({ waveHeightM, wavePeriodS, waterDepthM = Infinity }) {
  const H = Number(waveHeightM);
  const T = Number(wavePeriodS);
  if (!Number.isFinite(H) || !Number.isFinite(T) || H <= 0 || T <= 0) return { error: 'Invalid wave input' };
  const omega = (2 * Math.PI) / T;
  const kDeep = (omega ** 2) / G;
  const depth = finiteNumber(waterDepthM, Infinity);
  let k = kDeep;
  if (Number.isFinite(depth) && depth > 0) {
    for (let i = 0; i < 8; i += 1) {
      const kh = Math.max(1e-6, k * depth);
      k = (omega ** 2) / (G * Math.tanh(kh));
    }
  }
  const wavelengthM = (2 * Math.PI) / k;
  const phaseSpeedMs = wavelengthM / T;
  return { H, T, omega, k, wavelengthM, phaseSpeedMs, waterDepthM: depth };
}

export function estimateAddedResistanceInWaves({ displacementKg, lwlM, bwlM, shipSpeedMs, waveHeightM, waveHeadingDeg = 180, cAdded = 0.12, waterDensityKgM3 = 1025 }) {
  const m = Number(displacementKg);
  const L = Number(lwlM);
  const B = Number(bwlM);
  const V = Number(shipSpeedMs);
  const H = Number(waveHeightM);
  const beta = Number(waveHeadingDeg) * (Math.PI / 180);
  const rho = Number(waterDensityKgM3);
  const ca = Number(cAdded);
  if (![m, L, B, V, H, beta, rho, ca].every(Number.isFinite) || L <= 0 || B <= 0 || H < 0) return { error: 'Invalid added resistance input' };

  const A = B * (H / 2);
  const q = 0.5 * rho * (V ** 2);
  const headingGain = Math.max(0, Math.cos(beta)) ** 2; // størst i motsjø (180°)
  const froude = V / Math.sqrt(G * L);
  const speedGain = 0.6 + 1.4 * Math.min(1.2, Math.max(0, froude));
  const raw = ca * q * A * (((1 - Math.cos(beta)) / 2) ** 2) * speedGain;

  return {
    addedResistanceN: raw,
    headingGain: ((1 - Math.cos(beta)) / 2) ** 2,
    froude,
    speedGain,
    assumptions: 'Semi-empirical simplified estimate for concept stage only',
  };
}

export function estimateWaveExcitationForceMorison({ waveHeightM, wavePeriodS, headingDeg = 180, projectedAreaM2, volumeM3, dragCoefficient = 0.8, inertiaCoefficient = 1.8, waterDensityKgM3 = 1025 }) {
  const H = Number(waveHeightM);
  const T = Number(wavePeriodS);
  const beta = Number(headingDeg) * (Math.PI / 180);
  const Ap = Number(projectedAreaM2);
  const Vol = Number(volumeM3);
  const Cd = Number(dragCoefficient);
  const Cm = Number(inertiaCoefficient);
  const rho = Number(waterDensityKgM3);
  if (![H, T, beta, Ap, Vol, Cd, Cm, rho].every(Number.isFinite) || T <= 0 || Ap <= 0 || Vol <= 0) return { error: 'Invalid Morison input' };

  const a = H / 2;
  const omega = (2 * Math.PI) / T;
  const uMax = a * omega;
  const duMax = a * (omega ** 2);
  const dir = Math.abs(Math.cos(beta));

  const dragN = 0.5 * rho * Cd * Ap * (uMax ** 2) * dir;
  const inertiaN = rho * Cm * Vol * duMax * dir;
  return {
    dragN,
    inertiaN,
    forcePeakN: dragN + inertiaN,
    uMax,
    duMax,
  };
}

export function estimateTotalResistance({ calmWaterResistanceN, addedResistanceN, waveForceN = 0 }) {
  const rc = Number(calmWaterResistanceN);
  const ra = Number(addedResistanceN);
  const wf = Number(waveForceN);
  if (![rc, ra, wf].every(Number.isFinite)) return { error: 'Invalid total resistance input' };
  return {
    totalResistanceN: Math.max(0, rc + ra + wf),
    increments: { calmWaterResistanceN: rc, addedResistanceN: ra, waveForceN: wf },
  };
}

export function estimateCalmWaterResistance({
  lwlM,
  wettedAreaM2,
  shipSpeedMs,
  waterDensityKgM3 = 1025,
  formFactor = 1.18,
}) {
  const L = finiteNumber(lwlM);
  const S = finiteNumber(wettedAreaM2);
  const V = finiteNumber(shipSpeedMs);
  const rho = finiteNumber(waterDensityKgM3, 1025);
  if (![L, S, V, rho].every(Number.isFinite) || L <= 0 || S <= 0 || V < 0) return { error: 'Invalid calm-water input' };
  const reynolds = Math.max(1, (V * L) / NU_SEAWATER);
  const cf = V > 0 ? 0.075 / ((Math.log10(reynolds) - 2) ** 2) : 0;
  const frictionResistanceN = 0.5 * rho * V * V * S * cf;
  const calmWaterResistanceN = frictionResistanceN * Math.max(1, Number(formFactor) || 1.18);
  return {
    calmWaterResistanceN,
    frictionResistanceN,
    cf,
    reynolds,
    formFactor,
  };
}

export function estimateWaveResponse({
  objectMode = 'vessel',
  lwlM,
  bwlM,
  draftM,
  waveHeightM,
  wavePeriodS,
  waveHeadingDeg = 180,
  waterDepthM = Infinity,
}) {
  const L = Math.max(0.01, finiteNumber(lwlM, 1));
  const B = Math.max(0.01, finiteNumber(bwlM, L * 0.25));
  const T = Math.max(0.01, finiteNumber(draftM, B * 0.2));
  const H = Math.max(0, finiteNumber(waveHeightM, 0));
  const wave = estimateWaveKinematics({ waveHeightM: Math.max(0.01, H || 0.01), wavePeriodS: finiteNumber(wavePeriodS, 6), waterDepthM });
  const heading = Math.abs(Math.cos((finiteNumber(waveHeadingDeg, 180) * Math.PI) / 180));
  const steepness = wave.wavelengthM > 0 ? H / wave.wavelengthM : 0;
  const relativeHeight = H / Math.max(0.01, Math.min(L, B * 3));
  const lengthRatio = wave.wavelengthM / L;
  const encounter = clamp(1 - Math.abs(Math.log(Math.max(0.08, lengthRatio))) / 3.2, 0.08, 1);
  const heaveM = objectMode === 'fixed' ? 0 : (H / 2) * clamp(0.18 + encounter * 0.62, 0.08, 0.85);
  const rollDeg = objectMode === 'fixed' ? 0 : clamp(relativeHeight * heading * 18, 0, 28);
  const pitchDeg = objectMode === 'fixed' ? 0 : clamp((H / Math.max(0.01, L)) * (1 - heading * 0.45) * 28, 0, 18);
  const warnings = [];
  if (H > T) warnings.push('Bølgehoeyden er stoerre enn draft; visualisering og estimat boer leses konservativt.');
  if (relativeHeight > 0.18) warnings.push('Bølgene er store relativt til modellen og vil dominere visualiseringen.');
  if (steepness > 0.08) warnings.push('Bølgen er bratt; enkel lineær respons er usikker.');
  return {
    wave,
    response: { heaveM, rollDeg, pitchDeg, encounter, relativeHeight, steepness },
    warnings,
  };
}

export function estimateScantlingCase(input = {}) {
  const objectMode = input.objectMode === 'fixed' ? 'fixed' : 'vessel';
  const L = Math.max(0.1, finiteNumber(input.lwlM, 1));
  const B = Math.max(0.05, finiteNumber(input.bwlM, L * 0.25));
  const T = Math.max(0.01, finiteNumber(input.draftM, B * 0.18));
  const H = Math.max(0, finiteNumber(input.waveHeightM, 0));
  const rho = finiteNumber(input.waterDensityKgM3, 1025);
  const depth = finiteNumber(input.waterDepthM, Math.max(T * 4, H * 2, 10));
  const currentVelocityMs = Math.max(0, finiteNumber(input.currentVelocityMs, 0));
  const material = materialProfile(input.materialSlug, input.material || {});
  const panelSpan = Math.max(0.12, finiteNumber(input.panelSpanM, clamp(B / 8, 0.25, 1.2)));
  const stiffenerSpacing = Math.max(0.12, finiteNumber(input.stiffenerSpacingM, panelSpan));
  const hydroPressurePa = rho * G * Math.max(T, H * 0.65);
  const slamFactor = objectMode === 'fixed' ? 1.35 : 1.15 + clamp(H / Math.max(T, 0.1), 0, 3) * 0.28;
  const currentPressurePa = 0.5 * rho * currentVelocityMs * currentVelocityMs;
  const designPressurePa = Math.max(500, hydroPressurePa * slamFactor + currentPressurePa);
  const allowable = Math.max(1e6, material.allowableStressPa / Math.max(1, material.safetyFactor));
  const plateThicknessM = clamp(panelSpan * Math.sqrt((designPressurePa * 0.75) / allowable), 0.0015, 0.08);
  const stiffenerSectionModulusM3 = (designPressurePa * stiffenerSpacing * panelSpan * panelSpan) / (8 * allowable);
  const projectedAreaM2 = Math.max(B * Math.max(T, H * 0.5), finiteNumber(input.projectedAreaM2, 0));
  const baseShearN = objectMode === 'fixed' ? designPressurePa * projectedAreaM2 * 0.72 : null;
  const overturningMomentNm = objectMode === 'fixed' ? (baseShearN || 0) * Math.max(T + H * 0.5, depth * 0.35) : null;
  const warnings = [];
  if (!Number.isFinite(input.wettedAreaM2)) warnings.push('Våt flate mangler; dimensjonering bruker grov geometri-fallback.');
  if (plateThicknessM >= 0.079) warnings.push('Foreslått platetykkelse traff øvre estimatgrense; sjekk lastcase og materialvalg.');
  if (objectMode === 'fixed') warnings.push('Bunnlåst modus inkluderer ikke fundament, peler, anker eller jordrespons i v1.');
  return {
    objectMode,
    designPressurePa,
    panelSpanM: panelSpan,
    plateThicknessM,
    plateThicknessMm: plateThicknessM * 1000,
    stiffenerSpacingM: stiffenerSpacing,
    stiffenerSectionModulusM3,
    baseShearN,
    overturningMomentNm,
    material,
    safetyFactor: material.safetyFactor,
    warnings,
    assumptions: [
      'Forenklet panel-/stiverestimat for konseptfase.',
      'Ikke klassegodkjenning, CE, ISO eller DNV-beregning.',
    ],
  };
}

export function estimateResistanceCase(input = {}) {
  const objectMode = input.objectMode === 'fixed' ? 'fixed' : 'vessel';
  const L = Math.max(0.1, finiteNumber(input.lwlM, input.lengthM || 1));
  const B = Math.max(0.05, finiteNumber(input.bwlM, input.beamM || L * 0.25));
  const T = Math.max(0.01, finiteNumber(input.draftM, input.depthM || B * 0.18));
  const rho = finiteNumber(input.waterDensityKgM3, 1025);
  const speed = Math.max(0, finiteNumber(input.shipSpeedMs, 0));
  const waveHeightM = Math.max(0, finiteNumber(input.waveHeightM, 0));
  const wavePeriodS = Math.max(0.5, finiteNumber(input.wavePeriodS, 6));
  const heading = finiteNumber(input.waveHeadingDeg ?? input.headingDeg, 180);
  const wettedAreaM2 = Math.max(0.1, finiteNumber(input.wettedAreaM2, 0) || (2 * (L * T + B * T) + L * B * 0.55));
  const displacementKg = Math.max(1, finiteNumber(input.displacementKg, 0) || finiteNumber(input.displacementTonnes, 0) * 1000 || rho * L * B * T * 0.55);
  const wavePreview = estimateWaveResponse({
    objectMode,
    lwlM: L,
    bwlM: B,
    draftM: T,
    waveHeightM,
    wavePeriodS,
    waveHeadingDeg: heading,
    waterDepthM: input.waterDepthM,
  });
  const morison = estimateWaveExcitationForceMorison({
    waveHeightM: Math.max(0.01, waveHeightM || 0.01),
    wavePeriodS,
    headingDeg: heading,
    projectedAreaM2: Math.max(B * T, finiteNumber(input.projectedAreaM2, 0)),
    volumeM3: Math.max(0.1, finiteNumber(input.volumeM3, displacementKg / rho)),
    waterDensityKgM3: rho,
  });
  let resistance = null;
  if (objectMode === 'vessel') {
    const calmWater = estimateCalmWaterResistance({ lwlM: L, wettedAreaM2, shipSpeedMs: speed, waterDensityKgM3: rho });
    const added = estimateAddedResistanceInWaves({
      displacementKg,
      lwlM: L,
      bwlM: B,
      shipSpeedMs: speed,
      waveHeightM,
      waveHeadingDeg: heading,
      waterDensityKgM3: rho,
    });
    const total = estimateTotalResistance({
      calmWaterResistanceN: calmWater.calmWaterResistanceN || 0,
      addedResistanceN: added.addedResistanceN || 0,
      waveForceN: 0,
    });
    resistance = {
      objectMode,
      calmWater,
      added,
      totalResistanceN: total.totalResistanceN,
      effectivePowerW: total.totalResistanceN * speed,
      effectivePowerKw: (total.totalResistanceN * speed) / 1000,
      morison,
    };
  } else {
    resistance = {
      objectMode,
      waveForceN: morison.forcePeakN || 0,
      baseShearN: morison.forcePeakN || 0,
      currentVelocityMs: finiteNumber(input.currentVelocityMs, 0),
      morison,
    };
  }
  const scantling = estimateScantlingCase({ ...input, lwlM: L, bwlM: B, draftM: T, waterDensityKgM3: rho, waveHeightM, wavePeriodS });
  const warnings = [
    ...(wavePreview.warnings || []),
    ...(scantling.warnings || []),
  ];
  const missing = [];
  if (!Number.isFinite(input.wettedAreaM2)) missing.push('våt flate');
  if (!Number.isFinite(input.displacementKg)) missing.push('deplasement');
  const qualityScore = clamp(86 - missing.length * 12 - (warnings.length ? 8 : 0), 35, 92);
  return {
    resistance,
    scantling,
    wavePreview,
    quality: {
      score: qualityScore,
      grade: qualityScore >= 80 ? 'B' : qualityScore >= 65 ? 'C' : 'D',
      missing,
    },
    assumptions: [
      'Motstand og dimensjonering er grove konseptestimat.',
      'Hydro-rapporten skal bare vise dette hvis brukeren har kjørt Motstand-modulen først.',
      'Ikke egnet som navigasjon, klassing eller endelig konstruksjonsgrunnlag.',
    ],
    warnings,
  };
}

export function estimateComputeTimeMs({ triangleCount = 0, sampleCount = 1, waveCaseCount = 1, cpuFactor = 1 }) {
  const tris = Math.max(0, Number(triangleCount) || 0);
  const samples = Math.max(1, Number(sampleCount) || 1);
  const waves = Math.max(1, Number(waveCaseCount) || 1);
  const cpu = Math.max(0.1, Number(cpuFactor) || 1);
  const base = 120;
  const triCost = tris * 0.0025;
  const sampleCost = samples * 0.6;
  const waveCost = waves * 4.5;
  const estimateMs = (base + triCost + sampleCost + waveCost) / cpu;
  return { estimateMs, breakdown: { base, triCost, sampleCost, waveCost, cpu } };
}

export async function runWithProgress(tasks = [], onProgress = () => {}) {
  const start = performance.now();
  const total = Math.max(1, tasks.length);
  const results = [];
  for (let i = 0; i < tasks.length; i += 1) {
    const result = await tasks[i]();
    results.push(result);
    const pct = ((i + 1) / total) * 100;
    const elapsedMs = performance.now() - start;
    const etaMs = pct > 0 ? (elapsedMs * (100 - pct)) / pct : null;
    onProgress({ pct, elapsedMs, etaMs, completed: i + 1, total });
  }
  return { results, elapsedMs: performance.now() - start };
}


const _memo = new Map();
export function memoizedEstimate(key, producer) {
  if (_memo.has(key)) return _memo.get(key);
  const v = producer();
  _memo.set(key, v);
  return v;
}

export function clearEstimateCache() { _memo.clear(); }
