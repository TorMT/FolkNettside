// Kvalitetsvurdering + usikkerhetsintervall for hydro-estimater.

function isFinitePos(v) { return Number.isFinite(v) && v > 0; }

export function assessHydroQuality(contract = {}, context = {}) {
  let score = 100;
  const flags = [];

  if (!isFinitePos(contract.lengthM) || !isFinitePos(contract.beamM) || !isFinitePos(contract.draftM)) {
    score -= 25; flags.push('Mangler konsistent L/B/T');
  }
  if (!isFinitePos(contract.volumeM3)) {
    score -= 20; flags.push('Volum mangler/ugyldig');
  }
  if (!isFinitePos(contract.displacementKg)) {
    score -= 20; flags.push('Deplasement mangler/ugyldig');
  }
  if (!isFinitePos(context.kgM)) {
    score -= 15; flags.push('KG ikke satt (stabilitet usikker)');
  }
  if (!context.unitsConfirmed) {
    score -= 15; flags.push('Enheter ikke bekreftet');
  }
  if (!context.liveHydroGeometry) {
    score -= 10; flags.push('Ingen live-geometriintegrasjon');
  }

  const clamped = Math.max(0, Math.min(100, score));
  const grade = clamped >= 85 ? 'A' : clamped >= 70 ? 'B' : clamped >= 55 ? 'C' : 'D';
  return { score: clamped, grade, flags };
}

export function buildUncertaintyBand(value, qualityScore, baseSpreadPct = 12) {
  const v = Number(value);
  if (!Number.isFinite(v)) return { min: null, max: null, spreadPct: null };
  const qs = Math.max(0, Math.min(100, Number(qualityScore) || 0));
  const spread = baseSpreadPct * (1 + (100 - qs) / 100);
  const f = spread / 100;
  return { min: v * (1 - f), max: v * (1 + f), spreadPct: spread };
}
