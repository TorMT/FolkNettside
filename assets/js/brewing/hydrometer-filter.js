(function (global) {
  'use strict';

  const WINDOW_MS = 5 * 60 * 60 * 1000;

  function parseGravityToSpecific(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return NaN;
    return numeric >= 10 ? numeric / 1000 : numeric;
  }

  function toTimestamp(value) {
    const ts = new Date(value || '').getTime();
    return Number.isFinite(ts) ? ts : NaN;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function median(values) {
    const valid = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
    if (!valid.length) return NaN;
    const mid = Math.floor(valid.length / 2);
    if (valid.length % 2) return valid[mid];
    return (valid[mid - 1] + valid[mid]) / 2;
  }

  function average(values) {
    const valid = values.filter(Number.isFinite);
    if (!valid.length) return NaN;
    return valid.reduce((sum, value) => sum + value, 0) / valid.length;
  }

  function spread(values) {
    const valid = values.filter(Number.isFinite);
    if (!valid.length) return NaN;
    return Math.max.apply(null, valid) - Math.min.apply(null, valid);
  }

  function nearestNeighbor(rows, index, direction, maxMs) {
    const currentTs = toTimestamp(rows[index] && rows[index].createdOn);
    if (!Number.isFinite(currentTs)) return null;

    for (let i = index + direction; i >= 0 && i < rows.length; i += direction) {
      const ts = toTimestamp(rows[i] && rows[i].createdOn);
      if (!Number.isFinite(ts)) continue;
      if (Math.abs(ts - currentTs) > maxMs) break;
      return rows[i];
    }

    return null;
  }

  function collectNeighbors(rows, index, maxMs) {
    const currentTs = toTimestamp(rows[index] && rows[index].createdOn);
    if (!Number.isFinite(currentTs)) return [];
    return rows.filter((row, rowIndex) => {
      if (rowIndex === index) return false;
      const ts = toTimestamp(row && row.createdOn);
      return Number.isFinite(ts) && Math.abs(ts - currentTs) <= maxMs;
    }).slice(0, 6);
  }

  function gravityValue(row) {
    return parseGravityToSpecific(row && row.gravity);
  }

  function temperatureValue(row) {
    const numeric = Number(row && row.temperature);
    return Number.isFinite(numeric) ? numeric : NaN;
  }

  function normalizeHistory(rows) {
    return (Array.isArray(rows) ? rows : [])
      .filter((row) => row && row.createdOn)
      .slice()
      .sort((a, b) => String(a.createdOn || '').localeCompare(String(b.createdOn || '')));
  }

  function summarizeRows(rows) {
    const safeRows = Array.isArray(rows) ? rows : [];
    const gravities = safeRows.map(gravityValue).filter(Number.isFinite);
    const temps = safeRows.map(temperatureValue).filter(Number.isFinite);
    const firstTs = safeRows.length ? toTimestamp(safeRows[0].createdOn) : NaN;
    const lastTs = safeRows.length ? toTimestamp(safeRows[safeRows.length - 1].createdOn) : NaN;

    return {
      count: safeRows.length,
      gravityMedian: median(gravities),
      gravityAverage: average(gravities),
      gravitySpread: spread(gravities),
      tempMedian: median(temps),
      tempAverage: average(temps),
      tempSpread: spread(temps),
      durationMs: Number.isFinite(firstTs) && Number.isFinite(lastTs) ? Math.max(0, lastTs - firstTs) : NaN,
    };
  }

  function removeIndexes(rows, indexes) {
    if (!Array.isArray(indexes) || !indexes.length) return rows.slice();
    const blocked = new Set(indexes);
    return rows.filter(function (row, index) {
      return !blocked.has(index);
    });
  }

  function buildIndexRange(start, count) {
    return Array.from({ length: count }, function (_, offset) {
      return start + offset;
    });
  }

  function detectShortEdgeCluster(rows, direction) {
    const safeRows = normalizeHistory(rows);
    if (safeRows.length < 8) return [];

    const maxClusterSize = Math.min(10, Math.max(3, Math.floor(safeRows.length / 4)));
    for (let clusterSize = maxClusterSize; clusterSize >= 2; clusterSize -= 1) {
      const clusterStart = direction === 'start' ? 0 : safeRows.length - clusterSize;
      const baselineStart = direction === 'start' ? clusterSize : Math.max(0, safeRows.length - clusterSize - 8);
      const baselineEnd = direction === 'start' ? Math.min(safeRows.length, clusterSize + 8) : safeRows.length - clusterSize;
      const clusterRows = safeRows.slice(clusterStart, clusterStart + clusterSize);
      const baselineRows = safeRows.slice(baselineStart, baselineEnd);
      if (baselineRows.length < 4) continue;

      const clusterSummary = summarizeRows(clusterRows);
      const baselineSummary = summarizeRows(baselineRows);
      const gravityGap = Math.abs(clusterSummary.gravityMedian - baselineSummary.gravityMedian);
      const baselineStable = Number.isFinite(baselineSummary.gravitySpread) && baselineSummary.gravitySpread <= 0.024;
      const clusterShort = Number.isFinite(clusterSummary.durationMs) && clusterSummary.durationMs <= (12 * 60 * 60 * 1000);
      const tempGap = Math.abs(clusterSummary.tempMedian - baselineSummary.tempMedian);
      const tempChanged = Number.isFinite(tempGap) && tempGap >= 1.2;
      const largeGravityGap = Number.isFinite(gravityGap) && gravityGap >= 0.12;
      const extremeGravityGap = Number.isFinite(gravityGap) && gravityGap >= 0.18;
      const clusterCompact = Number.isFinite(clusterSummary.gravitySpread) && clusterSummary.gravitySpread <= 0.06;

      if (baselineStable && clusterShort && Number.isFinite(gravityGap) && gravityGap >= 0.08) {
        if (
          tempChanged
          || clusterSummary.count <= 3
          || (Number.isFinite(clusterSummary.gravitySpread) && clusterSummary.gravitySpread <= 0.03)
          || (largeGravityGap && clusterSummary.count <= 4 && clusterCompact)
          || extremeGravityGap
          || (largeGravityGap && clusterCompact && clusterSummary.count <= 8)
        ) {
          return buildIndexRange(clusterStart, clusterSize);
        }
      }
    }

    return [];
  }

  function detectShortTransientClusters(rows) {
    const safeRows = normalizeHistory(rows);
    if (safeRows.length < 12) return [];

    const drops = [];
    for (let start = 2; start < safeRows.length - 4; start += 1) {
      for (let clusterSize = 2; clusterSize <= 4; clusterSize += 1) {
        const end = start + clusterSize;
        if (end >= safeRows.length - 2) break;

        const clusterRows = safeRows.slice(start, end);
        const leftRows = safeRows.slice(Math.max(0, start - 5), start);
        const rightRows = safeRows.slice(end, Math.min(safeRows.length, end + 5));
        if (leftRows.length < 3 || rightRows.length < 3) continue;

        const clusterSummary = summarizeRows(clusterRows);
        const leftSummary = summarizeRows(leftRows);
        const rightSummary = summarizeRows(rightRows);
        const baselineGap = Math.abs(leftSummary.gravityMedian - rightSummary.gravityMedian);
        const clusterGap = Math.min(
          Math.abs(clusterSummary.gravityMedian - leftSummary.gravityMedian),
          Math.abs(clusterSummary.gravityMedian - rightSummary.gravityMedian)
        );
        const baselineStable = Number.isFinite(leftSummary.gravitySpread) && leftSummary.gravitySpread <= 0.022
          && Number.isFinite(rightSummary.gravitySpread) && rightSummary.gravitySpread <= 0.022;
        const clusterShort = Number.isFinite(clusterSummary.durationMs) && clusterSummary.durationMs <= (4 * 60 * 60 * 1000);
        const edgeTemps = leftRows.concat(rightRows).map(temperatureValue).filter(Number.isFinite);
        const edgeTempSpread = spread(edgeTemps);
        const tempStable = !Number.isFinite(edgeTempSpread) || edgeTempSpread <= 2.4;

        if (baselineStable && clusterShort && tempStable && Number.isFinite(baselineGap) && baselineGap <= 0.03 && Number.isFinite(clusterGap) && clusterGap >= 0.05) {
          buildIndexRange(start, clusterSize).forEach(function (index) {
            drops.push(index);
          });
        }
      }
    }

    return Array.from(new Set(drops)).sort(function (a, b) { return a - b; });
  }

  function detectExtendedEdgePlateau(rows, direction) {
    const safeRows = normalizeHistory(rows);
    if (safeRows.length < 14) return [];

    for (let clusterSize = Math.min(10, Math.max(4, Math.floor(safeRows.length / 5))); clusterSize >= 4; clusterSize -= 1) {
      const clusterStart = direction === 'start' ? 0 : safeRows.length - clusterSize;
      const clusterRows = safeRows.slice(clusterStart, clusterStart + clusterSize);
      const baselineRows = direction === 'start'
        ? safeRows.slice(clusterSize, Math.min(safeRows.length, clusterSize + 12))
        : safeRows.slice(Math.max(0, safeRows.length - clusterSize - 12), safeRows.length - clusterSize);
      if (baselineRows.length < 6) continue;

      const clusterSummary = summarizeRows(clusterRows);
      const baselineSummary = summarizeRows(baselineRows);
      const gravityGap = Math.abs(clusterSummary.gravityMedian - baselineSummary.gravityMedian);
      const tempGap = Math.abs(clusterSummary.tempMedian - baselineSummary.tempMedian);
      const baselineStable = Number.isFinite(baselineSummary.gravitySpread) && baselineSummary.gravitySpread <= 0.028;
      const clusterStable = Number.isFinite(clusterSummary.gravitySpread) && clusterSummary.gravitySpread <= 0.08;
      const clusterShort = Number.isFinite(clusterSummary.durationMs) && clusterSummary.durationMs <= (12 * 60 * 60 * 1000);
      const tempCompatible = !Number.isFinite(tempGap) || tempGap <= 1.5;

      if (baselineStable && clusterStable && clusterShort && tempCompatible && Number.isFinite(gravityGap) && gravityGap >= 0.12) {
        return buildIndexRange(clusterStart, clusterSize);
      }
    }

    return [];
  }

  function shouldDropGravitySpike(rows, index) {
    const row = rows[index] || {};
    const sg = parseGravityToSpecific(row.gravity);
    if (!Number.isFinite(sg)) return false;
    if (sg < 0.85 || sg > 1.35) return true;

    const prev = nearestNeighbor(rows, index, -1, WINDOW_MS);
    const next = nearestNeighbor(rows, index, 1, WINDOW_MS);
    const neighbors = collectNeighbors(rows, index, WINDOW_MS);
    const neighborSg = neighbors.map((neighbor) => parseGravityToSpecific(neighbor.gravity)).filter(Number.isFinite);
    const neighborTemps = neighbors.map((neighbor) => Number(neighbor.temperature)).filter(Number.isFinite);
    const medianSg = median(neighborSg);
    const sgSpread = spread(neighborSg);
    const tempSpread = spread(neighborTemps);
    const tempStable = !Number.isFinite(tempSpread) || tempSpread <= 2.5;

    if (Number.isFinite(medianSg) && Math.abs(sg - medianSg) >= 0.12) {
      return true;
    }

    if (prev && next) {
      const prevSg = parseGravityToSpecific(prev.gravity);
      const nextSg = parseGravityToSpecific(next.gravity);
      const bridgeSpread = Math.abs(prevSg - nextSg);
      const bridgeMid = (prevSg + nextSg) / 2;
      const candidateJump = Math.abs(sg - bridgeMid);
      if (bridgeSpread <= 0.025 && tempStable && candidateJump >= 0.03) return true;
      if (bridgeSpread <= 0.04 && candidateJump >= 0.05) return true;
      if (candidateJump >= 0.09) return true;
    }

    if (Number.isFinite(medianSg) && Number.isFinite(sgSpread) && sgSpread <= 0.02 && tempStable && Math.abs(sg - medianSg) >= 0.035) {
      return true;
    }

    return false;
  }

  function filterDisplayHistory(rows) {
    let working = normalizeHistory(rows);
    if (working.length < 3) return working;

    for (let pass = 0; pass < 4; pass += 1) {
      const filtered = working.filter((row, index) => !shouldDropGravitySpike(working, index));
      if (filtered.length === working.length) break;
      working = filtered;
      if (working.length < 3) break;
    }

    const transientDrops = detectShortTransientClusters(working);
    if (transientDrops.length) {
      working = removeIndexes(working, transientDrops);
    }

    const leadingPlateauDrops = detectExtendedEdgePlateau(working, 'start');
    if (leadingPlateauDrops.length) {
      working = removeIndexes(working, leadingPlateauDrops);
    }

    const leadingDrops = detectShortEdgeCluster(working, 'start');
    if (leadingDrops.length) {
      working = removeIndexes(working, leadingDrops);
    }

    const trailingPlateauDrops = detectExtendedEdgePlateau(working, 'end');
    if (trailingPlateauDrops.length) {
      working = removeIndexes(working, trailingPlateauDrops);
    }

    const trailingDrops = detectShortEdgeCluster(working, 'end');
    if (trailingDrops.length) {
      working = removeIndexes(working, trailingDrops);
    }

    return working;
  }

  function formatDateInputValue(value) {
    const date = new Date(value || '');
    if (Number.isNaN(date.getTime())) return '';
    const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
    return localDate.toISOString().slice(0, 10);
  }

  function startOfDayIso(value) {
    if (!value) return '';
    const date = new Date(value + 'T00:00:00');
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
  }

  function endOfDayIso(value) {
    if (!value) return '';
    const date = new Date(value + 'T23:59:59');
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
  }

  function buildWindow(device, viewState) {
    const history = normalizeHistory(device && device.history);
    const firstHistoryAt = device && device.firstHistoryAt ? device.firstHistoryAt : (history[0] && history[0].createdOn) || null;
    const profileStart = device && device.activeProfileSessionStartDate ? device.activeProfileSessionStartDate : null;
    const effectiveStart = profileStart || firstHistoryAt;
    const effectiveEnd = (history[history.length - 1] && history[history.length - 1].createdOn) || null;

    let fromIso = '';
    let toIso = '';
    let label = 'Hele historikken';

    if (viewState && viewState.fromDate) {
      fromIso = startOfDayIso(viewState.fromDate);
      label = viewState.toDate ? 'Valgt datointervall' : 'Fra valgt dato';
    } else if (String(viewState && viewState.days) === 'max') {
      fromIso = effectiveStart || '';
      label = profileStart ? 'Fra profilstart' : 'Hele historikken';
    } else {
      const days = Number(viewState && viewState.days);
      const anchor = effectiveEnd ? new Date(effectiveEnd).getTime() : Date.now();
      fromIso = new Date(anchor - (clamp(days, 1, 3650) * 24 * 60 * 60 * 1000)).toISOString();
      label = 'Siste ' + days + ' dager';
    }

    if (viewState && viewState.toDate) {
      toIso = endOfDayIso(viewState.toDate);
      if (viewState.fromDate) label = 'Valgt datointervall';
    } else {
      toIso = effectiveEnd || '';
    }

    return {
      fromIso,
      toIso,
      firstHistoryAt,
      profileStart,
      effectiveStart,
      effectiveEnd,
      label,
      fromDateValue: viewState && viewState.fromDate ? viewState.fromDate : formatDateInputValue(effectiveStart),
      toDateValue: viewState && viewState.toDate ? viewState.toDate : formatDateInputValue(effectiveEnd),
    };
  }

  function filterRowsByWindow(rows, windowMeta) {
    const startTs = toTimestamp(windowMeta && windowMeta.fromIso);
    const endTs = toTimestamp(windowMeta && windowMeta.toIso);
    return normalizeHistory(rows).filter((row) => {
      const ts = toTimestamp(row && row.createdOn);
      if (!Number.isFinite(ts)) return false;
      if (Number.isFinite(startTs) && ts < startTs) return false;
      if (Number.isFinite(endTs) && ts > endTs) return false;
      return true;
    });
  }

  global.BrewingHydrometerFilter = {
    buildWindow,
    endOfDayIso,
    filterDisplayHistory,
    filterRowsByWindow,
    formatDateInputValue,
    parseGravityToSpecific,
    startOfDayIso,
  };
}(window));
