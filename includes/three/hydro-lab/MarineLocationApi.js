// Kart-/lokasjonsmodul for marine data via offentlige API-er.

export async function searchLocation(query) {
  const q = encodeURIComponent(query);
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${q}&count=8&language=no&format=json`;
  const json = await fetchJsonWithRetry(url);
  return (json.results || []).map((r) => ({
    name: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
    latitude: r.latitude,
    longitude: r.longitude,
    timezone: r.timezone,
  }));
}

export async function fetchMarineSnapshot({ latitude, longitude }) {
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
  const json = await fetchJsonWithRetry(url);
  const now = Date.now();
  const times = Array.isArray(json.hourly?.time) ? json.hourly.time : [];
  const i = Math.max(0, times.findIndex((time) => Date.parse(time) >= now));
  return {
    latitude: json.latitude,
    longitude: json.longitude,
    timezone: json.timezone,
    sampleTime: json.hourly?.time?.[i] ?? null,
    waveHeightM: json.hourly?.wave_height?.[i] ?? null,
    waveDirectionDeg: json.hourly?.wave_direction?.[i] ?? null,
    wavePeriodS: json.hourly?.wave_period?.[i] ?? null,
    wavePeakPeriodS: json.hourly?.wind_wave_peak_period?.[i] ?? json.hourly?.swell_wave_peak_period?.[i] ?? null,
    windWaveHeightM: json.hourly?.wind_wave_height?.[i] ?? null,
    windWaveDirectionDeg: json.hourly?.wind_wave_direction?.[i] ?? null,
    windWavePeriodS: json.hourly?.wind_wave_period?.[i] ?? null,
    swellWaveHeightM: json.hourly?.swell_wave_height?.[i] ?? null,
    swellWaveDirectionDeg: json.hourly?.swell_wave_direction?.[i] ?? null,
    swellWavePeriodS: json.hourly?.swell_wave_period?.[i] ?? null,
    seaLevelMslM: json.hourly?.sea_level_height_msl?.[i] ?? null,
    currentVelocityKmh: json.hourly?.ocean_current_velocity?.[i] ?? null,
    currentDirectionDeg: json.hourly?.ocean_current_direction?.[i] ?? null,
    attribution: 'Marine data fra Open-Meteo Marine API (cell_selection=sea). Ikke bruk til navigasjon.',
    raw: json,
  };
}


const _cache = new Map();

async function fetchJsonWithRetry(url, { retries = 2, backoffMs = 350 } = {}) {
  const now = Date.now();
  const hit = _cache.get(url);
  if (hit && now - hit.t < 5 * 60 * 1000) return hit.v;

  let lastErr;
  for (let i = 0; i <= retries; i += 1) {
    try {
      const res = await fetch(url);
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
