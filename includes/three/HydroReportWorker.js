self.onmessage = (event) => {
  const data = event?.data || {};
  const { id, type, payload } = data;
  try {
    let result = null;
    if (type === "derive-report") {
      result = deriveReportPayload(payload || {});
    } else {
      throw new Error(`Unsupported worker task: ${type}`);
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

function fmtNum(value, digits = 3) {
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(digits) : "?";
}

function fmtVec(value) {
  if (!value || !Number.isFinite(value.x) || !Number.isFinite(value.y) || !Number.isFinite(value.z)) return "?";
  return `${value.x.toFixed(3)}, ${value.y.toFixed(3)}, ${value.z.toFixed(3)}`;
}

function computeStabilityMetrics(angles, gz) {
  if (!Array.isArray(angles) || !Array.isArray(gz) || !angles.length || !gz.length) return null;

  let maxGZ = -Infinity;
  let angleAtMaxGZ = null;
  for (let index = 0; index < gz.length; index += 1) {
    const value = Number(gz[index]);
    if (!Number.isFinite(value)) continue;
    if (value > maxGZ) {
      maxGZ = value;
      angleAtMaxGZ = Number.isFinite(Number(angles[index])) ? Number(angles[index]) : null;
    }
  }

  let avs = null;
  for (let index = 0; index < gz.length; index += 1) {
    const angle = Number(angles[index]);
    const value = Number(gz[index]);
    if (Number.isFinite(angle) && angle > 0 && Number.isFinite(value) && value < 0) {
      avs = angle;
      break;
    }
  }

  const area = (fromAngle, toAngle) => {
    let total = 0;
    for (let index = 0; index < angles.length - 1; index += 1) {
      const x0 = Number(angles[index]);
      const x1 = Number(angles[index + 1]);
      const y0 = Number(gz[index]);
      const y1 = Number(gz[index + 1]);
      if (!Number.isFinite(x0) || !Number.isFinite(x1) || !Number.isFinite(y0) || !Number.isFinite(y1)) continue;
      if (x0 < fromAngle || x1 > toAngle) continue;
      total += 0.5 * (y0 + y1) * (x1 - x0);
    }
    return total;
  };

  let maxAngle = -Infinity;
  for (const angle of angles) {
    const num = Number(angle);
    if (Number.isFinite(num) && num > maxAngle) maxAngle = num;
  }

  return {
    maxGZ: Number.isFinite(maxGZ) ? maxGZ : null,
    angleAtMaxGZ,
    avs,
    area_0_30: area(0, 30),
    area_0_40: area(0, 40),
    area_0_max: Number.isFinite(maxAngle) ? area(0, maxAngle) : null,
  };
}

function buildCurveCsv(report, waterDensity) {
  if (!report?.curve) return "";
  const curve = report.curve;
  const lines = ["Angle,GZ,Volume,DisplacementTonnes,SAK"];
  for (let index = 0; index < (curve.anglesDeg?.length || 0); index += 1) {
    const volume = curve.displacedVolume?.[index];
    const displacement = typeof volume === "number" ? (volume * waterDensity) / 1000 : "";
    lines.push([
      curve.anglesDeg?.[index] ?? "",
      curve.gz?.[index] ?? "",
      volume ?? "",
      displacement,
      curve.sak?.[index] ?? "",
    ].join(","));
  }
  return lines.join("\n");
}

function deriveReportPayload(payload) {
  const waterDensity = Number(payload.waterDensity) || 1025;
  const rollReport = payload.rollReport || null;
  const pitchReport = payload.pitchReport || null;
  const currentHydro = payload.currentHydro || null;

  if (rollReport && !rollReport.stability) {
    rollReport.stability = computeStabilityMetrics(rollReport.curve?.anglesDeg || [], rollReport.curve?.gz || []);
  }
  if (pitchReport && !pitchReport.stability) {
    pitchReport.stability = computeStabilityMetrics(pitchReport.curve?.anglesDeg || [], pitchReport.curve?.gz || []);
  }

  const currentNow = rollReport?.now || pitchReport?.now || {};
  const draftFromReport = rollReport?.meta?.draftZWorld ?? pitchReport?.meta?.draftZWorld;
  const overview = {
    "rep-vol": fmtNum(currentNow.subV),
    "rep-disp": currentNow.subV ? fmtNum((currentNow.subV * waterDensity) / 1000) : "?",
    "rep-cb": fmtVec(currentNow.cbW),
    "rep-cg": fmtVec(currentNow.cgW),
    "rep-draft": fmtNum(draftFromReport),
    "rep-trim": fmtNum(currentHydro?.trimDeg, 2),
    "rep-heel": fmtNum(currentHydro?.heelDeg, 2),
    "rep-kb": fmtNum(currentNow.kb),
    "rep-kg": fmtNum(currentNow.kg),
    "rep-bm-roll": fmtNum(currentNow.bm?.roll),
    "rep-bm-pitch": fmtNum(currentNow.bm?.pitch),
    "rep-gm-roll": fmtNum(currentNow.gm?.roll),
    "rep-gm-pitch": fmtNum(currentNow.gm?.pitch),
    "rep-gz-roll": fmtNum(currentNow.gz_now?.roll),
    "rep-gz-pitch": fmtNum(currentNow.gz_now?.pitch),
    "rep-wp-area": fmtNum(currentNow.wp?.A),
    "rep-wp-lcf": fmtNum(currentNow.wp?.xF),
    "rep-wp-tcf": fmtNum(currentNow.wp?.yF),
    "rep-sak": fmtNum(currentNow.sak),
    "rep-max-gz-roll": fmtNum(rollReport?.stability?.maxGZ),
    "rep-max-gz-pitch": fmtNum(pitchReport?.stability?.maxGZ),
    "rep-angle-max-gz-roll": fmtNum(rollReport?.stability?.angleAtMaxGZ, 1),
    "rep-angle-max-gz-pitch": fmtNum(pitchReport?.stability?.angleAtMaxGZ, 1),
  };

  const reportPayload = {
    generatedAt: payload.generatedAt || new Date().toISOString(),
    fileName: payload.fileName || "Hydro-modell",
    sourceLabel: payload.sourceLabel || "3MF viewer",
    quality: payload.quality || "low",
    performanceMode: payload.performanceMode === true,
    units: payload.units || "m",
    sourceUnits: payload.sourceUnits || "m",
    unitNote: payload.unitNote || "",
    currentHydro,
    rollReport,
    pitchReport,
    draftScan: payload.draftScan || null,
    sectionCurve: payload.sectionCurve || null,
    equilibriumState: payload.equilibriumState || null,
  };

  return {
    overview,
    stability: {
      roll: rollReport?.stability || null,
      pitch: pitchReport?.stability || null,
    },
    csvByMode: {
      roll: buildCurveCsv(rollReport, waterDensity),
      pitch: buildCurveCsv(pitchReport, waterDensity),
    },
    rawJson: JSON.stringify(reportPayload, null, 2),
  };
}
