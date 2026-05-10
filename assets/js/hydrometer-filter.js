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

  function normalizeHistory(rows) {
    return (Array.isArray(rows) ? rows : [])
      .filter((row) => row && row.createdOn)
      .slice()
      .sort((a, b) => String(a.createdOn || '').localeCompare(String(b.createdOn || '')));
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

    for (let pass = 0; pass < 2; pass += 1) {
      const filtered = working.filter((row, index) => !shouldDropGravitySpike(working, index));
      if (filtered.length === working.length) break;
      working = filtered;
      if (working.length < 3) break;
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
