import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

async function importSource(relativePath) {
  const source = await readFile(new URL(`../${relativePath}`, import.meta.url), 'utf8');
  return import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
}

const estimator = await importSource('includes/three/hydro-lab/HydroAdvancedEstimator.js');
const stepAdapter = await importSource('includes/three/hydro-lab/StepWaterlineAdapter.js');
const dataContract = await importSource('includes/three/hydro-lab/HydroDataContract.js');

const resistanceInput = {
  displacementKg: 220000,
  lwlM: 42,
  bwlM: 9.5,
  shipSpeedMs: 6.2,
  waveHeightM: 1.3,
};
const headSea = estimator.estimateAddedResistanceInWaves({ ...resistanceInput, waveHeadingDeg: 180 });
const followingSea = estimator.estimateAddedResistanceInWaves({ ...resistanceInput, waveHeadingDeg: 0 });
assert.equal(headSea.headingGain, 1, 'head sea should have maximum heading gain');
assert.equal(followingSea.headingGain, 0, 'following sea should not use the head-sea increment');

const millimetreStep = '/* .MILLI. DRAFT_M=2 */';
const taggedDraft = stepAdapter.resolveWaterlineFromStep({
  stepText: millimetreStep,
  bounds: { minZ: 0, maxZ: 5000 },
});
assert.equal(taggedDraft.waterlineZ, 3000, 'metre draft should convert to millimetre model coordinates');

const fallbackDraft = stepAdapter.resolveWaterlineFromStep({
  stepText: '/* .MILLI. */',
  bounds: { minZ: 0, maxZ: 5000 },
  fallbackDraftRatio: 0.5,
});
assert.equal(fallbackDraft.draftM, 2.5, 'fallback model draft should convert from millimetres to metres');

const incompleteMassCase = dataContract.buildMassCase({ lightshipKg: 1000, kgLightshipM: null });
assert.equal(incompleteMassCase.kgM, null, 'missing KG must remain unknown rather than becoming zero');
const completeMassCase = dataContract.buildMassCase({
  lightshipKg: 1000,
  payloadKg: 500,
  kgLightshipM: 1,
  kgPayloadM: 2,
});
assert.equal(completeMassCase.kgM, 4 / 3);

console.log('Hydro module regression checks passed.');
