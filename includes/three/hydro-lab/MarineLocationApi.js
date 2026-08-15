// Kart-/lokasjonsmodul for marine data via offentlige API-er.

export async function searchLocation(query, { signal = null } = {}) {
  const q = encodeURIComponent(query);
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${q}&count=8&language=no&format=json`;
  const json = await fetchJsonWithRetry(url, { signal });
  return (json.results || []).map((r) => ({
    name: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone,
  }));
}

export async function fetchMarineSnapshot({ latitude, longitude }, { signal = null } = {}) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) throw new Error('Ugyldig lokasjon');
  const candidates = buildMarineCandidatePoints(lat, lon);
  let lastErr = null;
  for (const point of candidates) {
    try {
      return await fetchMarineSnapshotAtPoint(point, { requestedLatitude: lat, requestedLongitude: lon, signal });
    } catch (err) {
      if (err?.name === 'AbortError') throw err;
      lastErr = err;
    }
  }
  throw new Error(`Fant ikke marine data nær lokasjonen: ${lastErr?.message || 'ingen sjøcelle'}`);
}

async function fetchMarineSnapshotAtPoint({ latitude, longitude }, { requestedLatitude, requestedLongitude, signal = null } = {}) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  const hourly = [
    'wave_height',
    'wave_direction',
    'wave_period',
    'wind_wave_height',
    'wind_wave_direction',
    'wind_wave_period',
    'wind_wave_peak_period',
    'swell_wave_height',
    'swell_wave_direction',
    'swell_wave_period',
    'swell_wave_peak_period',
    'sea_level_height_msl',
    'ocean_current_velocity',
    'ocean_current_direction',
  ].join(',');
  const url = `https://marine-api.open-meteo.com/v1/marine?latitude=${lat}&longitude=${lon}&hourly=${hourly}&forecast_days=2&timezone=auto&cell_selection=sea`;
  const json = await fetchJsonWithRetry(url, { signal });
  const times = Array.isArray(json.hourly?.time) ? json.hourly.time : [];
  const i = pickHourlyIndex(times, json.hourly);
  const waveHeightM = valueAt(json.hourly?.wave_height, i);
  const wavePeriodS = valueAt(json.hourly?.wave_period, i);
  if (!Number.isFinite(waveHeightM) && !Number.isFinite(wavePeriodS)) {
    throw new Error('Marine API returnerte ingen bolgedata for nærmeste sjøcelle');
  }
  return {
    latitude: json.latitude,
    longitude: json.longitude,
    requestedLatitude,
    requestedLongitude,
    dataPointDistanceKm: haversineKm(requestedLatitude, requestedLongitude, json.latitude, json.longitude),
    timezone: json.timezone,
    sampleTime: json.hourly?.time?.[i] ?? null,
    waveHeightM,
    waveDirectionDeg: valueAt(json.hourly?.wave_direction, i),
    wavePeriodS,
    wavePeakPeriodS: valueAt(json.hourly?.wind_wave_peak_period, i) ?? valueAt(json.hourly?.swell_wave_peak_period, i),
    windWaveHeightM: valueAt(json.hourly?.wind_wave_height, i),
    windWaveDirectionDeg: valueAt(json.hourly?.wind_wave_direction, i),
    windWavePeriodS: valueAt(json.hourly?.wind_wave_period, i),
    swellWaveHeightM: valueAt(json.hourly?.swell_wave_height, i),
    swellWaveDirectionDeg: valueAt(json.hourly?.swell_wave_direction, i),
    swellWavePeriodS: valueAt(json.hourly?.swell_wave_period, i),
    seaLevelMslM: valueAt(json.hourly?.sea_level_height_msl, i),
    currentVelocityKmh: valueAt(json.hourly?.ocean_current_velocity, i),
    currentDirectionDeg: valueAt(json.hourly?.ocean_current_direction, i),
    attribution: 'Marine data fra Open-Meteo Marine API (cell_selection=sea). Ikke bruk til navigasjon.',
    raw: json,
  };
}

function valueAt(values, index) {
  if (!Array.isArray(values) || values[index] == null) return null;
  const value = Number(values[index]);
  return Number.isFinite(value) ? value : null;
}

function pickHourlyIndex(times, hourly = {}) {
  if (!times.length) return 0;
  const now = Date.now();
  const futureIndex = times.findIndex((time) => Date.parse(time) >= now);
  const preferred = futureIndex >= 0 ? futureIndex : times.length - 1;
  const series = [
    hourly.wave_height,
    hourly.wave_period,
    hourly.wind_wave_height,
    hourly.swell_wave_height,
  ].filter(Array.isArray);
  if (!series.length) return preferred;
  for (let offset = 0; offset < times.length; offset += 1) {
    const forward = preferred + offset;
    if (forward < times.length && series.some((values) => hasNumericValue(values, forward))) return forward;
    const backward = preferred - offset;
    if (backward >= 0 && series.some((values) => hasNumericValue(values, backward))) return backward;
  }
  return preferred;
}

function hasNumericValue(values, index) {
  return Array.isArray(values) && values[index] != null && Number.isFinite(Number(values[index]));
}

function buildMarineCandidatePoints(lat, lon) {
  const offsets = [
    [0, 0],
    [0.1, 0], [-0.1, 0], [0, 0.1], [0, -0.1],
    [0.2, 0], [-0.2, 0], [0, 0.2], [0, -0.2],
    [0.35, 0], [-0.35, 0], [0, 0.35], [0, -0.35],
  ];
  return offsets.map(([dLat, dLon]) => ({ latitude: lat + dLat, longitude: lon + dLon }));
}

function haversineKm(latA, lonA, latB, lonB) {
  const values = [latA, lonA, latB, lonB].map(Number);
  if (!values.every(Number.isFinite)) return 0;
  const [aLat, aLon, bLat, bLon] = values.map((value) => (value * Math.PI) / 180);
  const dLat = bLat - aLat;
  const dLon = bLon - aLon;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(aLat) * Math.cos(bLat) * (Math.sin(dLon / 2) ** 2);
  return 6371 * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

const _cache = new Map();

async function fetchJsonWithRetry(url, { retries = 2, backoffMs = 350, signal = null } = {}) {
  const now = Date.now();
  const hit = _cache.get(url);
  if (hit && now - hit.t < 5 * 60 * 1000) return hit.v;

  let lastErr;
  for (let i = 0; i <= retries; i += 1) {
    try {
      const res = await fetch(url, { signal });
      if (res.status === 429 && i < retries) {
        await new Promise((r) => setTimeout(r, backoffMs * (i + 1)));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      _cache.set(url, { v: json, t: Date.now() });
      return json;
    } catch (err) {
      lastErr = err;
      if (i < retries) await new Promise((r) => setTimeout(r, backoffMs * (i + 1)));
    }
  }
  throw new Error(`API request failed after retries: ${lastErr?.message || 'unknown error'}`);
}
