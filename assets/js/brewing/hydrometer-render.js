(function (global) {
  'use strict';

  const filterApi = global.BrewingHydrometerFilter;

  function fmtNumber(value, digits) {
    return Number.isFinite(value) ? value.toFixed(Number.isFinite(digits) ? digits : 2) : '--';
  }

  function fmtGravity(value) {
    return Number.isFinite(value) ? value.toFixed(2) : '--';
  }

  function fmtTemp(value) {
    return Number.isFinite(value) ? value.toFixed(1) + ' C' : '--';
  }

  function fmtPct(value) {
    return Number.isFinite(value) ? Math.round(value) + '%' : '--';
  }

  function fmtSigned(value, digits) {
    return Number.isFinite(value) ? (value > 0 ? '+' : '') + value.toFixed(Number.isFinite(digits) ? digits : 3) : '--';
  }

  function fmtAbv(value) {
    return Number.isFinite(value) ? value.toFixed(2) + '%' : '--';
  }

  function fmtSg(value) {
    return Number.isFinite(value) ? value.toFixed(3) : '--';
  }

  function fmtAttenuation(value) {
    return Number.isFinite(value) ? value.toFixed(1) + '%' : '--';
  }

  function fmtTime(value) {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return new Intl.DateTimeFormat('nb-NO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  function fmtRelative(value) {
    if (!value) return 'Ukjent aktivitet';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Ukjent aktivitet';
    const diffMs = Date.now() - date.getTime();
    const hours = Math.round(diffMs / 36e5);
    if (hours < 1) return 'Oppdatert nylig';
    if (hours < 24) return 'Oppdatert for ' + hours + ' t siden';
    const days = Math.round(hours / 24);
    return 'Oppdatert for ' + days + ' d siden';
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function average(values) {
    const valid = (Array.isArray(values) ? values : []).filter(Number.isFinite);
    if (!valid.length) return NaN;
    return valid.reduce((sum, value) => sum + value, 0) / valid.length;
  }

  function parseGravityToSpecific(value) {
    return filterApi.parseGravityToSpecific(value);
  }

  function estimateAbvFromRows(rows) {
    if (!Array.isArray(rows) || rows.length < 2) return NaN;
    const og = parseGravityToSpecific(rows[0] && rows[0].gravity);
    const fg = parseGravityToSpecific(rows[rows.length - 1] && rows[rows.length - 1].gravity);
    if (!Number.isFinite(og) || !Number.isFinite(fg) || og <= fg) return NaN;
    return (og - fg) * 131.25;
  }

  function estimateApparentAttenuation(rows) {
    if (!Array.isArray(rows) || rows.length < 2) return NaN;
    const og = parseGravityToSpecific(rows[0] && rows[0].gravity);
    const fg = parseGravityToSpecific(rows[rows.length - 1] && rows[rows.length - 1].gravity);
    if (!Number.isFinite(og) || !Number.isFinite(fg) || og <= 1 || fg > og) return NaN;
    return ((og - fg) / (og - 1)) * 100;
  }

  function calculateSlopePerHour(rows, field, lookbackCount) {
    const subset = (Array.isArray(rows) ? rows : []).slice(-Math.max(3, lookbackCount || 8));
    if (subset.length < 2) return NaN;
    const first = subset[0];
    const last = subset[subset.length - 1];
    const firstValue = Number(first && first[field]);
    const lastValue = Number(last && last[field]);
    const firstTs = new Date(first && first.createdOn || '').getTime();
    const lastTs = new Date(last && last.createdOn || '').getTime();
    if (!Number.isFinite(firstValue) || !Number.isFinite(lastValue) || !Number.isFinite(firstTs) || !Number.isFinite(lastTs) || lastTs <= firstTs) {
      return NaN;
    }
    return (lastValue - firstValue) / ((lastTs - firstTs) / 36e5);
  }

  function fermentationSummary(rows) {
    if (!Array.isArray(rows) || rows.length < 3) {
      return 'For lite filtrert data i valgt periode til å vurdere gjæringsforløpet.';
    }

    const gravities = rows.map((row) => Number(row.gravity)).filter(Number.isFinite);
    const temperatures = rows.map((row) => Number(row.temperature)).filter(Number.isFinite);
    if (gravities.length < 2 || temperatures.length < 2) {
      return 'For lite gravity- eller temperaturdata til å lage en trygg oppsummering.';
    }

    const gravityDrop = gravities[0] - gravities[gravities.length - 1];
    const tempMin = Math.min.apply(null, temperatures);
    const tempMax = Math.max.apply(null, temperatures);
    const tempSwing = tempMax - tempMin;
    const tempAvg = average(temperatures);
    const gravitySteps = [];
    const tempSteps = [];

    for (let i = 1; i < gravities.length; i += 1) gravitySteps.push(Math.abs(gravities[i] - gravities[i - 1]));
    for (let i = 1; i < temperatures.length; i += 1) tempSteps.push(Math.abs(temperatures[i] - temperatures[i - 1]));

    const avgGravityStep = average(gravitySteps);
    const avgTempStep = average(tempSteps);
    const lateStage = gravityDrop <= 1.2;
    const activeStage = gravityDrop > 6;
    const tempStable = tempSwing <= 0.6;
    const processVerySmooth = avgGravityStep <= 0.35 && avgTempStep <= 0.2;

    const phaseText = activeStage
      ? 'Kurven peker mot en tydelig aktiv hovedgjæring med markant ekstraktreduksjon.'
      : lateStage
        ? 'Datasettet peker mot sen fase eller nær ferdig utgjæring.'
        : 'Gjæringen ser ut til å være i en rolig arbeidende mellomfase.';
    const tempText = tempStable
      ? 'Temperaturen har vært svært stabil rundt ' + fmtTemp(tempAvg) + '.'
      : 'Temperaturbildet har hatt merkbare svingninger som kan ha påvirket tempoet.';
    const flowText = processVerySmooth
      ? 'Målepunktene ser glatte og konsistente ut, med jevnt prosessbilde.'
      : 'Kurvene har noen sprang, men danner fortsatt et lesbart fermenteringsforløp.';

    return phaseText + ' ' + tempText + ' ' + flowText;
  }

  function buildRiskAssessment(rows, device) {
    if (!Array.isArray(rows) || rows.length < 3) {
      return 'Datagrunnlaget er for tynt til å gjøre en faglig trygg risikovurdering.';
    }

    const temps = rows.map((row) => Number(row.temperature)).filter(Number.isFinite);
    const tempSwing = temps.length ? Math.max.apply(null, temps) - Math.min.apply(null, temps) : NaN;
    const gravitySlope = calculateSlopePerHour(rows, 'gravity', 10);
    const tempSlope = calculateSlopePerHour(rows, 'temperature', 10);
    const currentBattery = Number(device && device.battery);
    const currentGravity = parseGravityToSpecific(rows[rows.length - 1] && rows[rows.length - 1].gravity);
    const startGravity = parseGravityToSpecific(rows[0] && rows[0].gravity);
    const attenuation = estimateApparentAttenuation(rows);
    const notes = [];

    if (Number.isFinite(tempSwing) && tempSwing > 2.5) {
      notes.push('Temperatursvingningene er store nok til å kunne gi ujevn gjæraktivitet.');
    } else if (Number.isFinite(tempSwing) && tempSwing > 1.3) {
      notes.push('Det finnes moderat termisk uro i perioden.');
    }

    if (Number.isFinite(gravitySlope) && gravitySlope > -0.015 && Number.isFinite(currentGravity) && currentGravity > 1.012 && Number.isFinite(attenuation) && attenuation < 70) {
      notes.push('Gravitykurven peker mot treghet eller tidlig tendens til stall.');
    }

    if (Number.isFinite(tempSlope) && tempSlope > 0.08) {
      notes.push('Temperaturen er stigende i siste del av serien, noe som ofte samsvarer med aktiv metabolisme eller aktiv temperaturstyring.');
    } else if (Number.isFinite(tempSlope) && tempSlope < -0.08) {
      notes.push('Temperaturen faller i siste del av perioden og kan dempe videre gjærtempo.');
    }

    if (Number.isFinite(currentBattery) && currentBattery < 20) {
      notes.push('Batterinivået er lavt nok til at videre overvåking bør følges opp.');
    }

    if (Number.isFinite(device && device.filteredOutCount) && Number(device.filteredOutCount) >= 3) {
      notes.push('Flere utliggere er filtrert bort, så sensoren eller overføringen har trolig hatt støy.');
    }

    if (Number.isFinite(startGravity) && Number.isFinite(currentGravity) && (startGravity - currentGravity) > 0.020 && Number.isFinite(attenuation) && attenuation > 75) {
      notes.push('Utgjæringsbildet ser godt etablert ut, og risikoen virker nå mer knyttet til overmodning enn manglende fremdrift.');
    }

    return notes.length
      ? notes.slice(0, 3).join(' ')
      : 'Det er ingen tydelige røde flagg i den viste perioden. Måleserien ser prosessmessig sunn ut.';
  }

  function buildModelForecast(rows, device, styleMatch) {
    const intelligence = global.HydrometerIntelligence;
    if (intelligence && typeof intelligence.buildForecast === 'function') {
      return intelligence.buildForecast({
        rows: rows,
        device: device,
        styleMatch: styleMatch,
        helpers: {
          average: average,
          calculateSlopePerHour: calculateSlopePerHour,
          estimateAbvFromRows: estimateAbvFromRows,
          fmtSg: fmtSg,
          parseGravityToSpecific: parseGravityToSpecific
        }
      });
    }
    return 'Det finnes ikke nok modellstøtte til å beregne en trygg prognose akkurat nå.';
  }

  function beerMacros(styleName) {
    const style = String(styleName || '').toLowerCase();
    if (style.indexOf('stout') !== -1) return { protein: 2.6, fat: 0.1 };
    if (style.indexOf('wheat') !== -1 || style.indexOf('hvete') !== -1 || style.indexOf('wit') !== -1) return { protein: 2.1, fat: 0.1 };
    if (style.indexOf('ginger') !== -1 || style.indexOf('ingefaer') !== -1 || style.indexOf('sats') !== -1) return { protein: 0.4, fat: 0 };
    return { protein: 1.6, fat: 0 };
  }

  function numericOverride(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : NaN;
  }

  function buildBeerOverview(rows, styleMatch, nutritionOverrides) {
    const abv = estimateAbvFromRows(rows);
    const fg = rows.length ? parseGravityToSpecific(rows[rows.length - 1] && rows[rows.length - 1].gravity) : NaN;
    const residualCarbs = Number.isFinite(fg) ? Math.max(0, (fg - 1) * 1000 * 0.034) : 0;
    const alcoholGrams = Number.isFinite(abv) ? (400 * (abv / 100) * 0.789) : NaN;
    const kcal = Number.isFinite(alcoholGrams) ? (alcoholGrams * 7) + (residualCarbs * 4) : NaN;
    const macros = beerMacros(styleMatch && styleMatch.name);
    const overrides = nutritionOverrides || {};

    return {
      kcalPer400ml: Number.isFinite(numericOverride(overrides.kcalPer400ml)) ? numericOverride(overrides.kcalPer400ml) : kcal,
      carbsGPer400ml: Number.isFinite(numericOverride(overrides.carbsGPer400ml)) ? numericOverride(overrides.carbsGPer400ml) : residualCarbs,
      proteinGPer400ml: Number.isFinite(numericOverride(overrides.proteinGPer400ml)) ? numericOverride(overrides.proteinGPer400ml) : macros.protein,
      fatGPer400ml: Number.isFinite(numericOverride(overrides.fatGPer400ml)) ? numericOverride(overrides.fatGPer400ml) : macros.fat
    };
  }

  function niceTicks(min, max, count) {
    if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
    if (min === max) return [min];
    const span = max - min;
    const rawStep = span / Math.max(1, (count || 5) - 1);
    const magnitude = Math.pow(10, Math.floor(Math.log10(Math.abs(rawStep))));
    const normalized = rawStep / magnitude;
    let niceNormalized = 1;
    if (normalized > 1) niceNormalized = 2;
    if (normalized > 2) niceNormalized = 5;
    if (normalized > 5) niceNormalized = 10;
    const step = niceNormalized * magnitude;
    const start = Math.floor(min / step) * step;
    const end = Math.ceil(max / step) * step;
    const ticks = [];
    for (let value = start; value <= end + (step * 0.5); value += step) {
      ticks.push(Number(value.toFixed(8)));
    }
    return ticks;
  }

  function buildLinePath(points, width, height, paddingX, paddingTop, paddingBottom) {
    const valid = points.filter((point) => Number.isFinite(point.value));
    if (!valid.length) return { path: '', area: '', min: 0, max: 1 };
    const min = Math.min.apply(null, valid.map((point) => point.value));
    const max = Math.max.apply(null, valid.map((point) => point.value));
    const spreadValue = max - min || Math.max(1, Math.abs(max) * 0.02);
    const innerWidth = width - (paddingX * 2);
    const innerHeight = height - paddingTop - paddingBottom;
    const pathPoints = valid.map((point, index) => {
      const x = paddingX + ((valid.length === 1 ? 0.5 : index / (valid.length - 1)) * innerWidth);
      const y = paddingTop + innerHeight - (((point.value - min) / spreadValue) * innerHeight);
      return { x: x, y: y };
    });
    const path = pathPoints.map((point, index) => (index ? 'L' : 'M') + ' ' + point.x.toFixed(2) + ' ' + point.y.toFixed(2)).join(' ');
    const area = path + ' L ' + pathPoints[pathPoints.length - 1].x.toFixed(2) + ' ' + (height - paddingBottom).toFixed(2)
      + ' L ' + pathPoints[0].x.toFixed(2) + ' ' + (height - paddingBottom).toFixed(2) + ' Z';
    return { path: path, area: area, min: min, max: max };
  }

  function renderChart(title, subtitle, rows, field, color, formatter) {
    const width = 640;
    const height = 260;
    const paddingX = 52;
    const paddingTop = 18;
    const paddingBottom = 34;
    const points = rows.map((row) => ({ value: Number(row[field]), createdOn: row.createdOn }));
    const chart = buildLinePath(points, width, height, paddingX, paddingTop, paddingBottom);
    const latest = rows.length ? Number(rows[rows.length - 1][field]) : NaN;
    const first = rows.length ? Number(rows[0][field]) : NaN;
    const delta = Number.isFinite(latest) && Number.isFinite(first) ? latest - first : NaN;
    const yTicks = niceTicks(chart.min, chart.max, 5);
    const min = chart.min;
    const max = chart.max;
    const spreadValue = (max - min) || Math.max(1, Math.abs(max) * 0.02);
    const innerHeight = height - paddingTop - paddingBottom;
    const startLabel = fmtTime(rows[0] && rows[0].createdOn);
    const midLabel = fmtTime(rows[Math.floor((rows.length - 1) / 2)] && rows[Math.floor((rows.length - 1) / 2)].createdOn);
    const endLabel = fmtTime(rows[rows.length - 1] && rows[rows.length - 1].createdOn);

    return ''
      + '<article class="chart-card">'
      + '<header><strong>' + escapeHtml(title) + '</strong><span>' + escapeHtml(subtitle) + '</span></header>'
      + '<svg class="chart-svg" viewBox="0 0 ' + width + ' ' + height + '" preserveAspectRatio="none" aria-label="' + escapeHtml(title) + '">'
      + '<defs><linearGradient id="grad-' + field + '" x1="0" x2="0" y1="0" y2="1">'
      + '<stop offset="0%" stop-color="' + color + '" stop-opacity="0.26"></stop>'
      + '<stop offset="100%" stop-color="' + color + '" stop-opacity="0.03"></stop>'
      + '</linearGradient></defs>'
      + yTicks.map(function (tick) {
        const y = paddingTop + innerHeight - (((tick - min) / spreadValue) * innerHeight);
        return ''
          + '<line x1="' + paddingX + '" y1="' + y.toFixed(2) + '" x2="' + (width - paddingX) + '" y2="' + y.toFixed(2) + '" stroke="rgba(23,51,68,0.10)" />'
          + '<text x="' + (paddingX - 10) + '" y="' + (y + 4).toFixed(2) + '" text-anchor="end" font-size="12" fill="#567082">' + escapeHtml(formatter(tick)) + '</text>';
      }).join('')
      + '<line x1="' + paddingX + '" y1="' + (height - paddingBottom) + '" x2="' + (width - paddingX) + '" y2="' + (height - paddingBottom) + '" stroke="rgba(23,51,68,0.16)" />'
      + '<line x1="' + paddingX + '" y1="' + paddingTop + '" x2="' + paddingX + '" y2="' + (height - paddingBottom) + '" stroke="rgba(23,51,68,0.16)" />'
      + '<path d="' + chart.area + '" fill="url(#grad-' + field + ')"></path>'
      + '<path d="' + chart.path + '" fill="none" stroke="' + color + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>'
      + '<text x="' + paddingX + '" y="' + (height - 8) + '" text-anchor="start" font-size="12" fill="#567082">' + escapeHtml(startLabel) + '</text>'
      + '<text x="' + (width / 2) + '" y="' + (height - 8) + '" text-anchor="middle" font-size="12" fill="#567082">' + escapeHtml(midLabel) + '</text>'
      + '<text x="' + (width - paddingX) + '" y="' + (height - 8) + '" text-anchor="end" font-size="12" fill="#567082">' + escapeHtml(endLabel) + '</text>'
      + '</svg>'
      + '<div class="chart-footer">Siste: <strong>' + escapeHtml(formatter(latest)) + '</strong>. Endring i valgt periode: <strong>'
      + escapeHtml(Number.isFinite(delta) ? formatter(delta) : '--') + '</strong>. Min/maks: ' + escapeHtml(formatter(chart.min))
      + ' / ' + escapeHtml(formatter(chart.max)) + '.</div>'
      + '</article>';
  }

  function renderAlertCards(alerts) {
    if (!Array.isArray(alerts) || !alerts.length) {
      return '<div class="empty-state">Ingen aktive varsler i den viste perioden.</div>';
    }

    return alerts.map(function (alert) {
      return ''
        + '<article class="alert-card ' + escapeHtml(alert.severity || 'info') + '">'
        + '<strong>' + escapeHtml(normalizeUiText(alert.title || 'Varsel')) + '</strong>'
        + '<p>' + escapeHtml(normalizeUiText(alert.summary || '')) + '</p>'
        + (alert.actionSummary ? '<p><span class="log-label">Tiltak</span>' + escapeHtml(normalizeUiText(alert.actionSummary)) + '</p>' : '')
        + ((Array.isArray(alert.links) && alert.links.length)
          ? '<div class="alert-links">' + alert.links.map(function (link) {
            return link && link.url
              ? '<a class="alert-link" href="' + escapeHtml(link.url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(link.label || link.url) + '</a>'
              : '';
          }).join('') + '</div>'
          : '')
        + '</article>';
    }).join('');
  }

  function selectedDevice(state) {
    const devices = Array.isArray(state && state.devices) ? state.devices : [];
    return devices.find(function (device) { return device.id === state.selectedId; }) || devices[0] || null;
  }

  function selectedRecipe(state) {
    return state && state.linkedRecipe ? state.linkedRecipe : null;
  }

  function buildRecipeReference(state) {
    const recipe = selectedRecipe(state);
    if (!recipe) return null;

    return {
      id: recipe.id || '',
      slug: recipe.slug || recipe.id || '',
      source: recipe.source || 'local',
      providerLabel: recipe.providerLabel || (recipe.source === 'brewfather' ? 'Brewfather' : 'Lokal'),
      name: recipe.name || 'Oppskrift',
      style: recipe.style || '',
      batchVolume: recipe.batchVolume || null
    };
  }

  function buildAnalysis(device, state) {
    if (!device) return null;
    const windowMeta = filterApi.buildWindow(device, state);
    const windowRows = filterApi.filterRowsByWindow(device.history || [], windowMeta);
    const displayRows = filterApi.filterDisplayHistory(windowRows);
    const displayFilteredOutCount = Math.max(0, windowRows.length - displayRows.length);
    const currentRow = displayRows[displayRows.length - 1] || windowRows[windowRows.length - 1] || null;
    const currentGravity = currentRow ? Number(currentRow.gravity) : Number(device.gravity);
    const currentTemp = currentRow ? Number(currentRow.temperature) : Number(device.temperature);
    const currentBattery = currentRow ? Number(currentRow.battery) : Number(device.battery);
    const currentGravityVelocity = currentRow ? Number(currentRow.gravityVelocity) : Number(device.gravityVelocity);
    const abvEstimate = estimateAbvFromRows(displayRows);
    const attenuationEstimate = estimateApparentAttenuation(displayRows);
    const ogEstimate = displayRows.length ? parseGravityToSpecific(displayRows[0].gravity) : NaN;
    const fgEstimate = displayRows.length ? parseGravityToSpecific(displayRows[displayRows.length - 1].gravity) : NaN;
    const intelligence = global.HydrometerIntelligence;
    const styleMatch = intelligence && typeof intelligence.inferStyle === 'function'
      ? intelligence.inferStyle({
        deviceName: device.name || '',
        profileName: device.activeProfileName || '',
        batchName: state.batchName || ''
      })
      : null;
    const styleAssessment = intelligence && typeof intelligence.buildStyleAssessment === 'function'
      ? intelligence.buildStyleAssessment({
        rows: displayRows,
        device: device,
        styleMatch: styleMatch,
        abvEstimate: abvEstimate,
        helpers: {
          parseGravityToSpecific: parseGravityToSpecific,
          estimateAbvFromRows: estimateAbvFromRows
        }
      })
      : 'Ingen stilmodul tilgjengelig akkurat nå.';
    const currentRecipe = selectedRecipe(state);
    const alerts = intelligence && typeof intelligence.buildAlerts === 'function'
      ? intelligence.buildAlerts({
        rows: displayRows,
        device: device,
        styleMatch: styleMatch,
        meta: {
          deviceName: device.name || '',
          profileName: device.activeProfileName || '',
          batchName: state.batchName || ''
        },
        helpers: {
          average: average,
          calculateSlopePerHour: calculateSlopePerHour,
          estimateAbvFromRows: estimateAbvFromRows,
          estimateApparentAttenuation: estimateApparentAttenuation,
          parseGravityToSpecific: parseGravityToSpecific
        }
      })
      : [];
    const beerOverview = buildBeerOverview(displayRows, styleMatch, currentRecipe && currentRecipe.nutritionOverrides);

    return {
      device: device,
      windowMeta: windowMeta,
      windowRows: windowRows,
      rows: displayRows,
      currentRow: currentRow,
      currentGravity: currentGravity,
      currentTemp: currentTemp,
      currentBattery: currentBattery,
      currentGravityVelocity: currentGravityVelocity,
      abvEstimate: abvEstimate,
      attenuationEstimate: attenuationEstimate,
      ogEstimate: ogEstimate,
      fgEstimate: fgEstimate,
      displayFilteredOutCount: displayFilteredOutCount,
      styleMatch: styleMatch,
      styleAssessment: styleAssessment,
      alerts: alerts,
      beerOverview: beerOverview,
      summary: fermentationSummary(displayRows),
      riskAssessment: buildRiskAssessment(displayRows, device),
      forecast: buildModelForecast(displayRows, device, styleMatch)
    };
  }

  function renderTopStats(els, state, analysis) {
    const total = Array.isArray(state.devices) ? state.devices.length : 0;
    const device = analysis && analysis.device;
    els.topStats.innerHTML = ''
      + '<article class="brew-card stat-card"><strong>Hydrometere</strong><span>' + total + '</span><small>Enheter funnet i RAPT-kontoen din.</small></article>'
      + '<article class="brew-card stat-card"><strong>Aktiv enhet</strong><span>' + escapeHtml(device ? device.name : '--') + '</span><small>' + escapeHtml((device && device.activeProfileName) || 'Ingen aktiv profil registrert') + '</small></article>'
      + '<article class="brew-card stat-card"><strong>Siste gravity</strong><span>' + fmtGravity(Number(analysis && analysis.currentGravity)) + '</span><small>' + escapeHtml(fmtRelative(device && device.lastActivityTime)) + '</small></article>'
      + '<article class="brew-card stat-card"><strong>Siste temperatur</strong><span>' + fmtTemp(Number(analysis && analysis.currentTemp)) + '</span><small>Batteri ' + fmtPct(Number(analysis && analysis.currentBattery)) + '</small></article>';
  }

  function renderDeviceList(els, state) {
    if (!Array.isArray(state.devices) || !state.devices.length) {
      els.deviceList.innerHTML = '<div class="empty-state">Ingen hydrometere funnet for denne kontoen.</div>';
      return;
    }

    els.deviceList.innerHTML = state.devices.map(function (device) {
      return ''
        + '<button class="device-tab ' + (device.id === state.selectedId ? 'active' : '') + '" type="button" data-id="' + escapeHtml(device.id) + '">'
        + '<strong>' + escapeHtml(device.name || 'Uten navn') + '</strong>'
        + '<span>Gravity ' + fmtGravity(Number(device.gravity)) + ' · ' + fmtTemp(Number(device.temperature)) + '</span>'
        + '<small>' + escapeHtml(device.activeProfileName || 'Ingen aktiv profil') + '</small>'
        + '</button>';
    }).join('');
  }

  function renderBeerOverview(els, analysis) {
    const beer = analysis && analysis.beerOverview ? analysis.beerOverview : {};
    els.beerOverviewGrid.innerHTML = ''
      + '<article class="overview-card"><strong>Kcal</strong><span>' + fmtNumber(Number(beer.kcalPer400ml), 0) + '</span><small>Estimert energi per 0.4 glass.</small></article>'
      + '<article class="overview-card"><strong>Karbohydrat</strong><span>' + fmtNumber(Number(beer.carbsGPer400ml), 1) + ' g</span><small>Grovt anslag fra filtrert sluttgravity.</small></article>'
      + '<article class="overview-card"><strong>Protein</strong><span>' + fmtNumber(Number(beer.proteinGPer400ml), 1) + ' g</span><small>Stilbasert standardestimat.</small></article>'
      + '<article class="overview-card"><strong>Fett</strong><span>' + fmtNumber(Number(beer.fatGPer400ml), 1) + ' g</span><small>Nesten alltid nær null i øl og sats.</small></article>';
  }

  function renderDetails(els, state, analysis) {
    if (!analysis) {
      els.deviceTitle.textContent = 'Ingen hydrometer valgt';
      els.deviceSubtitle.textContent = 'Ingen data tilgjengelig akkurat nå.';
      els.devicePills.innerHTML = '';
      els.metricsGrid.innerHTML = '';
      els.beerOverviewGrid.innerHTML = '';
      els.alertStack.innerHTML = '<div class="empty-state">Ingen varsler å vise.</div>';
      els.chartGrid.innerHTML = '<div class="empty-state">Ingen telemetridata å vise.</div>';
      els.fermentationLog.innerHTML = '<h3>Gjæringslogg</h3><p>Ingen data tilgjengelig for å lage en oppsummering ennå.</p>';
      return;
    }

    const device = analysis.device;
    const rows = analysis.rows;
    els.deviceTitle.textContent = device.name || 'Uten navn';
    els.deviceSubtitle.textContent = rows.length
      ? 'Viser ' + rows.length + ' filtrerte av ' + analysis.windowRows.length + ' telemetripunkter i aktivt tidsvindu.'
      : 'Ingen filtrerte telemetripunkter i aktivt tidsvindu.';
    els.devicePills.innerHTML = ''
      + (analysis.styleMatch ? '<div class="info-pill subtle">Stil: ' + escapeHtml(analysis.styleMatch.name) + '</div>' : '')
      + (state.linkedRecipe ? '<div class="info-pill subtle">Oppskrift: ' + escapeHtml(state.linkedRecipe.name || 'Koblet oppskrift') + '</div>' : '')
      + ((device.activeProfileName) ? '<div class="info-pill subtle">Profil: ' + escapeHtml(device.activeProfileName) + '</div>' : '')
      + '<div class="info-pill">MAC: ' + escapeHtml(device.macAddress || '--') + '</div>'
      + '<div class="info-pill">RSSI: ' + fmtNumber(Number(device.rssi), 0) + '</div>'
      + '<div class="info-pill">' + (device.isLatestFirmware ? 'Siste firmware' : 'Firmware kan oppdateres') + '</div>'
      + '<div class="info-pill">Filtrert bort: ' + Number(device.filteredOutCount || 0) + ' + ' + Number(analysis.displayFilteredOutCount || 0) + '</div>';

    els.metricsGrid.innerHTML = ''
      + '<article class="metric-card"><strong>Gravity</strong><span>' + fmtGravity(Number(analysis.currentGravity)) + '</span><small>Siste filtrerte tetthet i valgt visning.</small></article>'
      + '<article class="metric-card"><strong>Temperatur</strong><span>' + fmtTemp(Number(analysis.currentTemp)) + '</span><small>Siste filtrerte temperatur i valgt visning.</small></article>'
      + '<article class="metric-card"><strong>Gravity Velocity</strong><span>' + fmtSigned(Number(analysis.currentGravityVelocity), 3) + '</span><small>Rapportert SG-trend fra siste punkt i visningen.</small></article>'
      + '<article class="metric-card"><strong>Batteri</strong><span>' + fmtPct(Number(analysis.currentBattery)) + '</span><small>Sist aktivitet ' + escapeHtml(fmtTime(device.lastActivityTime)) + '.</small></article>'
      + '<article class="metric-card"><strong>Estimert alkohol</strong><span>' + fmtAbv(analysis.abvEstimate) + '</span><small>Beregnet fra første og siste filtrerte gravity i valgt periode.</small></article>'
      + '<article class="metric-card"><strong>OG / FG</strong><span>' + fmtSg(analysis.ogEstimate) + ' / ' + fmtSg(analysis.fgEstimate) + '</span><small>Første og siste filtrerte gravity i perioden.</small></article>'
      + '<article class="metric-card"><strong>Attenuation</strong><span>' + fmtAttenuation(analysis.attenuationEstimate) + '</span><small>Apparent attenuation basert på filtrert kurve.</small></article>'
      + '<article class="metric-card"><strong>Stiltreff</strong><span>' + escapeHtml((analysis.styleMatch && analysis.styleMatch.name) || 'Ukjent') + '</span><small>'
      + escapeHtml(analysis.styleMatch ? ('Tolket fra navn/profil med ' + analysis.styleMatch.confidenceLabel.toLowerCase() + ' sikkerhet.') : 'Ingen tydelige stilord funnet i navn eller aktiv profil.')
      + '</small></article>';

    renderBeerOverview(els, analysis);
    els.alertStack.innerHTML = renderAlertCards(analysis.alerts);

    if (!rows.length) {
      els.chartGrid.innerHTML = '<div class="empty-state">Ingen historiske telemetripunkter i valgt periode.</div>';
      els.fermentationLog.innerHTML = ''
        + '<h3>Gjæringslogg</h3>'
        + '<p><span class="log-label">Prosessbilde</span>Det finnes foreløpig ingen filtrerte punkter i valgt periode.</p>'
        + '<p><span class="log-label">Risikobilde</span>' + escapeHtml(normalizeUiText(analysis.riskAssessment)) + '</p>'
        + '<p><span class="log-label">Stilvurdering</span>' + escapeHtml(normalizeUiText(analysis.styleAssessment)) + '</p>'
        + '<p><span class="log-label">Modellprognose</span>' + escapeHtml(normalizeUiText(analysis.forecast)) + '</p>';
      return;
    }

    els.chartGrid.innerHTML = [
      renderChart('Gravity', analysis.windowMeta.label, rows, 'gravity', 'var(--chart-gravity)', function (value) { return fmtGravity(Number(value)); }),
      renderChart('Temperatur', 'Utvikling over tid', rows, 'temperature', 'var(--chart-temp)', function (value) { return fmtTemp(Number(value)).replace(' C', ''); }),
      renderChart('Battery', 'Batterinivå', rows, 'battery', 'var(--chart-battery)', function (value) { return fmtPct(Number(value)).replace('%', ''); }),
      renderChart('Gravity Velocity', 'Fermenteringstrend', rows, 'gravityVelocity', '#8959b8', function (value) { return fmtSigned(Number(value), 3); })
    ].join('');

    els.fermentationLog.innerHTML = ''
      + '<h3>Gjæringslogg</h3>'
      + '<p><span class="log-label">Prosessbilde</span>' + escapeHtml(normalizeUiText(analysis.summary)) + '</p>'
      + '<p><span class="log-label">Risikobilde</span>' + escapeHtml(normalizeUiText(analysis.riskAssessment)) + '</p>'
      + '<p><span class="log-label">Stilvurdering</span>' + escapeHtml(normalizeUiText(analysis.styleAssessment)) + '</p>'
      + '<p><span class="log-label">Modellprognose</span>' + escapeHtml(normalizeUiText(analysis.forecast)) + '</p>'
      + (analysis.alerts.length ? '<p><span class="log-label">Aktive varsler</span>' + escapeHtml(analysis.alerts.map(function (alert) { return normalizeUiText(alert.title); }).join(', ')) + '</p>' : '');
  }

  function renderHydrometerView(els, state) {
    const analysis = buildAnalysis(selectedDevice(state), state);
    renderTopStats(els, state, analysis);
    renderDeviceList(els, state);
    renderDetails(els, state, analysis);
    return analysis;
  }

  function buildExportPayload(analysis, state) {
    if (!analysis || !analysis.device) return null;

    const recipeRef = buildRecipeReference(state);

    return {
      batchName: state.batchName || analysis.device.activeProfileName || analysis.device.name || 'Brygg',
      folderName: state.folderName || '',
      styleName: analysis.styleMatch ? analysis.styleMatch.name : '',
      deviceId: analysis.device.id || '',
      deviceName: analysis.device.name || '',
      profileName: analysis.device.activeProfileName || '',
      periodLabel: analysis.windowMeta.label,
      recipeRef: recipeRef,
      exportedAt: new Date().toISOString(),
      summary: {
        'Prosessbilde': normalizeUiText(analysis.summary),
        'Risikobilde': normalizeUiText(analysis.riskAssessment),
        'Stilvurdering': normalizeUiText(analysis.styleAssessment),
        'Modellprognose': normalizeUiText(analysis.forecast),
        'Tidsvindu': analysis.windowMeta.label + ' · ' + fmtTime(analysis.windowMeta.fromIso) + ' - ' + fmtTime(analysis.windowMeta.toIso),
        'Filtrering': 'Backend ' + Number(analysis.device.filteredOutCount || 0) + ' · Visning ' + Number(analysis.displayFilteredOutCount || 0)
      },
      metrics: {
        'Gravity': fmtGravity(Number(analysis.currentGravity)),
        'Temperatur': fmtTemp(Number(analysis.currentTemp)),
        'ABV': fmtAbv(analysis.abvEstimate),
        'OG': fmtSg(analysis.ogEstimate),
        'FG': fmtSg(analysis.fgEstimate),
        'Attenuation': fmtAttenuation(analysis.attenuationEstimate),
        'Kcal / 0.4': fmtNumber(Number(analysis.beerOverview.kcalPer400ml), 0),
        'Karbohydrat / 0.4': fmtNumber(Number(analysis.beerOverview.carbsGPer400ml), 1) + ' g'
      },
      alerts: analysis.alerts,
      history: analysis.rows,
      raptWindow: {
        deviceId: analysis.device.id || '',
        deviceName: analysis.device.name || '',
        profileName: analysis.device.activeProfileName || '',
        rangeLabel: analysis.windowMeta.label,
        windowStart: analysis.windowMeta.fromIso || null,
        windowEnd: analysis.windowMeta.toIso || null,
        historyStart: analysis.rows.length ? (analysis.rows[0].createdOn || null) : null,
        historyEnd: analysis.rows.length ? (analysis.rows[analysis.rows.length - 1].createdOn || null) : null,
        historyCount: Array.isArray(analysis.rows) ? analysis.rows.length : 0
      },
      source: {
        usedCache: !!state.usedCache,
        generatedAt: state.generatedAt || null,
        datakilde: state.usedCache ? 'lokal cache' : 'live henting'
      }
    };
  }

  global.BrewingHydrometerRender = {
    buildAnalysis: buildAnalysis,
    buildExportPayload: buildExportPayload,
    escapeHtml: escapeHtml,
    fmtTime: fmtTime,
    renderHydrometerView: renderHydrometerView
  };
}(window));
