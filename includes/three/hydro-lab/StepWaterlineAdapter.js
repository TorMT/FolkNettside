// Adapter for å hente vannlinje-/hydro-innstillinger fra STEP-tekst.

function parseNumber(value) {
  const n = Number(String(value).replace(',', '.').trim());
  return Number.isFinite(n) ? n : null;
}


function detectStepLengthUnitScale(stepText = '') {
  const t = String(stepText || '');
  if (/\.MILLI\./i.test(t)) return 0.001;
  if (/\.CENTI\./i.test(t)) return 0.01;
  if (/\.METRE\.|\.METER\./i.test(t)) return 1;
  return 1;
}

export function parseStepHydroMetadata(stepText = '') {
  const text = String(stepText || '');
  // Støtter metadata i kommentarer / navn, f.eks:
  // WATERLINE_Z=1.25; DRAFT_M=2.1; HEEL_DEG=3; TRIM_DEG=0.5;
  const patterns = {
    waterlineZ: /WATERLINE[_\s-]*Z\s*=\s*([-+]?\d+(?:[\.,]\d+)?)/i,
    draftM: /DRAFT[_\s-]*M\s*=\s*([-+]?\d+(?:[\.,]\d+)?)/i,
    heelDeg: /HEEL[_\s-]*DEG\s*=\s*([-+]?\d+(?:[\.,]\d+)?)/i,
    trimDeg: /TRIM[_\s-]*DEG\s*=\s*([-+]?\d+(?:[\.,]\d+)?)/i,
    waterDensity: /WATER[_\s-]*DENSITY[_\s-]*(?:KG\/?M3)?\s*=\s*([-+]?\d+(?:[\.,]\d+)?)/i,
  };

  const out = {};
  for (const [key, rx] of Object.entries(patterns)) {
    const m = text.match(rx);
    out[key] = m ? parseNumber(m[1]) : null;
  }
  return out;
}

export function resolveWaterlineFromStep({ stepText = '', bounds = null, fallbackDraftRatio = 0.5 }) {
  const meta = parseStepHydroMetadata(stepText);
  const unitScale = detectStepLengthUnitScale(stepText);
  const minZ = bounds?.minZ;
  const maxZ = bounds?.maxZ;
  const height = Number.isFinite(minZ) && Number.isFinite(maxZ) ? (maxZ - minZ) : null;

  let waterlineZ = meta.waterlineZ;
  let draftM = meta.draftM;

  if (waterlineZ == null && draftM != null && Number.isFinite(maxZ)) {
    waterlineZ = maxZ - (draftM * unitScale);
  }
  if (waterlineZ == null && height != null && Number.isFinite(minZ)) {
    waterlineZ = minZ + height * fallbackDraftRatio;
    draftM = (height * fallbackDraftRatio) / unitScale;
  }

  return {
    waterlineZ,
    unitScale,
    draftM,
    heelDeg: meta.heelDeg ?? 0,
    trimDeg: meta.trimDeg ?? 0,
    waterDensityKgM3: meta.waterDensity ?? 1025,
    source: meta.waterlineZ != null || meta.draftM != null ? 'step-metadata' : 'fallback-from-bounds',
  };
}

export function buildExampleStepWithHydroTags() {
  return `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('Example with hydro tags'),'2;1');
ENDSEC;
DATA;
/* WATERLINE_Z=1.20; DRAFT_M=0.80; HEEL_DEG=2.5; TRIM_DEG=0.4; WATER_DENSITY_KG/M3=1027 */
#10=PRODUCT('Hull-Example','WATERLINE_Z=1.20;DRAFT_M=0.80','',(#20));
ENDSEC;
END-ISO-10303-21;`;
}
