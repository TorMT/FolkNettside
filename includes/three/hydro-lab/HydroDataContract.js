// Felles data-kontrakt for modellmål og hydro input på tvers av loadere.

export const HydroDataContractVersion = '1.0.0';

function n(v) {
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

export function normalizeModelMetrics(payload = {}) {
  const b = payload.bounds || {};
  const h = payload.hydro || payload.hydrostatikk || {};
  return {
    version: HydroDataContractVersion,
    lengthM: n(payload.lengthM ?? b.lengthM ?? b.x ?? b.lwlM),
    beamM: n(payload.beamM ?? b.beamM ?? b.y ?? b.bwlM),
    draftM: n(payload.draftM ?? b.draftM ?? b.z ?? h.draftM),
    volumeM3: n(payload.volumeM3 ?? h.subV ?? h.volumeM3),
    awpM2: n(payload.awpM2 ?? h.wp?.A ?? h.awpM2),
    wettedAreaM2: n(payload.wettedAreaM2 ?? h.sak ?? h.wettedAreaM2),
    displacementKg: n(payload.displacementKg ?? h.displacementKg ?? h.deltaKg),
    waterDensityKgM3: n(payload.waterDensityKgM3 ?? h.waterDensity ?? 1025) ?? 1025,
    source: payload.source || 'unknown-loader',
    raw: payload,
  };
}

// Direkte kobling til HydroStatikk med fallback til estimator-input.
export function fromHydroStatikkLive(hydroStatikkInstance = null, fallback = {}) {
  const h = hydroStatikkInstance?.lastHydro || {};
  const density = hydroStatikkInstance?.waterDensity ?? 1025;
  const payload = {
    source: 'HydroStatikk.live',
    hydro: {
      subV: h.subV,
      draftM: hydroStatikkInstance?.draftZWorld,
      wp: h.wp,
      sak: h.sak,
      displacementKg: h.subV != null ? h.subV * density : null,
      waterDensity: density,
    },
    bounds: fallback.bounds || {},
  };
  return normalizeModelMetrics(payload);
}


export function validateUnitScale({ lengthM, beamM, draftM, volumeM3 }) {
  const L = Number(lengthM), B = Number(beamM), T = Number(draftM), V = Number(volumeM3);
  const flags = [];
  if (![L, B, T].every(Number.isFinite)) flags.push('Missing principal dimensions');
  if (Number.isFinite(L) && (L < 0.05 || L > 500)) flags.push('Length out of expected range (m)');
  if (Number.isFinite(B) && (B < 0.01 || B > 120)) flags.push('Beam out of expected range (m)');
  if (Number.isFinite(T) && (T <= 0 || T > 40)) flags.push('Draft out of expected range (m)');
  if (Number.isFinite(V) && V <= 0) flags.push('Volume must be positive');
  const unitsConfirmed = flags.length === 0;
  return { unitsConfirmed, flags };
}

export function buildMassCase({ lightshipKg, payloadKg = 0, ballastKg = 0, kgLightshipM = null, kgPayloadM = null, kgBallastM = null }) {
  const mL = Number(lightshipKg), mP = Number(payloadKg), mB = Number(ballastKg);
  const totalMassKg = [mL,mP,mB].filter(Number.isFinite).reduce((a,b)=>a+b,0);
  const nullableNumber = (value) => value == null || value === '' ? null : n(value);
  const massPositions = [[mL,nullableNumber(kgLightshipM)],[mP,nullableNumber(kgPayloadM)],[mB,nullableNumber(kgBallastM)]];
  const missingKg = massPositions.some(([m,kg])=>Number.isFinite(m)&&m>0&&!Number.isFinite(kg));
  const kgNum = massPositions
    .filter(([m,kg])=>Number.isFinite(m)&&m>0&&Number.isFinite(kg))
    .reduce((a,[m,kg])=>a+m*kg,0);
  // An unknown vertical position must not silently be interpreted as KG=0.
  const kgM = totalMassKg > 0 && !missingKg ? kgNum / totalMassKg : null;
  return { totalMassKg, kgM, components: { lightshipKg:mL, payloadKg:mP, ballastKg:mB } };
}
