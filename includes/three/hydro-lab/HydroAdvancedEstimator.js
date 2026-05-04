// Advanced standalone hydro estimator pack (ikke koblet til eksisterende viewer)

const G = 9.81;

export function estimateWaveKinematics({ waveHeightM, wavePeriodS, waterDepthM = Infinity }) {
  const H = Number(waveHeightM);
  const T = Number(wavePeriodS);
  if (!Number.isFinite(H) || !Number.isFinite(T) || H <= 0 || T <= 0) return { error: 'Invalid wave input' };
  const omega = (2 * Math.PI) / T;
  const kDeep = (omega ** 2) / G;
  const Ldeep = (2 * Math.PI) / kDeep;
  const cDeep = Ldeep / T;
  return { H, T, omega, k: kDeep, wavelengthM: Ldeep, phaseSpeedMs: cDeep, waterDepthM };
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
  const raw = ca * q * A * headingGain * speedGain;

  return {
    addedResistanceN: raw,
    headingGain,
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
