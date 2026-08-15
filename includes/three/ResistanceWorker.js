import { estimateResistanceCase } from './hydro-lab/HydroAdvancedEstimator.js';

self.onmessage = (event) => {
  const data = event?.data || {};
  const { id, type, payload } = data;
  try {
    let result = null;
    if (type === 'estimate-resistance') {
      result = estimateResistanceCase(payload?.input || {});
    } else if (type === 'estimate-resistance-curve') {
      result = estimateResistanceCurve(payload || {});
    } else {
      throw new Error(`Unsupported resistance worker task: ${type}`);
    }
    self.postMessage({ id, ok: true, result });
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: {
        message: error?.message || String(error),
      },
    });
  }
};

function estimateResistanceCurve(payload = {}) {
  const input = payload.input || {};
  const maxKnots = Math.max(1, Number(payload.maxKnots) || 30);
  const stepKnots = Math.max(0.25, Number(payload.stepKnots) || 1);
  const points = [];
  for (let speedKn = 0; speedKn <= maxKnots + 1e-9; speedKn += stepKnots) {
    const shipSpeedMs = speedKn * 0.514444;
    const result = estimateResistanceCase({ ...input, shipSpeedMs });
    points.push({
      speedKn: Number(speedKn.toFixed(3)),
      shipSpeedMs,
      totalResistanceN: result?.resistance?.totalResistanceN ?? null,
      effectivePowerKw: result?.resistance?.effectivePowerKw ?? null,
      deliveredPowerKw: result?.resistance?.propulsion?.deliveredPowerKw ?? null,
      rpm: result?.resistance?.propulsion?.rpm ?? null,
      frictionResistanceN: result?.resistance?.calmWater?.frictionResistanceN ?? null,
      residualResistanceN: result?.resistance?.calmWater?.residualResistanceN ?? null,
      addedResistanceN: result?.resistance?.added?.addedResistanceN ?? null,
      froude: result?.resistance?.calmWater?.froude ?? null,
      quality: result?.quality || null,
      warnings: result?.warnings || [],
    });
  }
  return {
    points,
    maxKnots,
    stepKnots,
    computedAt: new Date().toISOString(),
  };
}
