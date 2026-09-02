/**
 * Fetches live BOM station observations, wind warnings, the BOM wind
 * forecast bulletin and Ports Victoria shipping movements for Port
 * Phillip, and serves them as a single JSON document.
 *
 * Runs on Cloudflare's edge network rather than GitHub Actions because
 * BOM returns 403 to every request from GitHub's (Azure) datacenter IP
 * ranges regardless of headers — this is a straightforward re-host of
 * scripts/fetch_bom.py's logic for the Workers runtime.
 *
 * - Cron Trigger (every ~3 min): runs the fetch pipeline, stores the
 *   result in KV under the key "live". The OMC/Ports-sourced stations
 *   refresh every ~3 min upstream, so this tracks them about as closely
 *   as the source allows; BOM's automatic weather stations only publish
 *   every ~30 min, so those readings just re-confirm between changes. At
 *   3-minute spacing this is ~480 KV writes/day, under the free plan's
 *   1000/day.
 * - HTTP GET: returns the last stored KV value as JSON with CORS headers
 *   so the browser can read it directly (see src/lib/liveBom.ts).
 *
 * Deploy via the Cloudflare dashboard: Workers & Pages -> Create Worker,
 * paste this file in, bind a KV namespace to the binding name BOM_DATA,
 * and add a Cron Trigger under Settings -> Triggers (e.g. "*​/3 * * * *").
 * The dashboard cron is configured separately from wrangler.toml — if you
 * change the interval, update it in both places. See wrangler.toml in this
 * folder if deploying with the CLI instead.
 */

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-AU,en;q=0.9',
  Referer: 'https://www.bom.gov.au/',
};

// bom.gov.au and ports.vic.gov.au occasionally black-hole a connection
// rather than refusing it. With no timeout, one hung fetch keeps the whole
// scheduled invocation alive until the platform kills it — before the KV
// write runs — which freezes the served feed indefinitely (every station,
// not just one). Abort each fetch so a dead upstream just yields null.
const FETCH_TIMEOUT_MS = 8000;

function timedFetch(url, opts = {}) {
  return fetch(url, { ...opts, signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
}

const MELBOURNE_TZ = 'Australia/Melbourne';

// Same BOM automatic weather station numbers as scripts/fetch_bom.py,
// keyed by the product family the station is published under.
const BOM_STATIONS = {
  fawkner: ['IDV60801', 95872],
  frankston: ['IDV60801', 94871],
  'point-wilson': ['IDV60801', 94847],
  'south-channel': ['IDV60801', 94853],
  'melbourne-airport': ['IDV60801', 94866],
  'st-kilda': ['IDV60901', 95864],
  'kilmore-gap': ['IDV60801', 94860],
};

const COMPASS_DEG = {
  N: 0, NNE: 22.5, NE: 45, ENE: 67.5,
  E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
  S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
  W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
};

function degToCompass(deg) {
  const points = Object.keys(COMPASS_DEG);
  const idx = Math.round(((deg % 360) + 360) % 360 / 22.5) % 16;
  return points[idx];
}

// Webb Dock isn't a BOM station — it's a privately operated sensor whose
// readings OMC International republishes on a public Grafana instance for
// Port of Melbourne. Same query shape as the browser devtools capture of
// that dashboard, just re-hosted here for the same reason as the BOM
// fetches: keep it server-side, off the browser, behind our own CORS.
//
// Fawkner Beacon has a failover sensor on the same OMC feed, which reports
// more often than the BOM station — used as the primary source for that
// station, with the BOM fetch above (BOM_STATIONS.fawkner) kept as a
// fallback if the OMC feed is ever unreachable.
const OMC_URL = 'https://portweather-public.omcinternational.com/api/ds/query';
const WEBB_DOCK_WIND_PATH = 'AU/VIC/Melbourne/Meteo/Wind/Measured/Webb Dock Failover';
const WEBB_DOCK_METEO_PATH = 'AU/VIC/Melbourne/Meteo/Weather/Measured/Webb Dock Failover';
const FAWKNER_WIND_PATH = 'AU/VIC/Melbourne/Meteo/Wind/Measured/Fawkner Beacon Failover';
const FAWKNER_METEO_PATH = 'AU/VIC/Melbourne/Meteo/Weather/Measured/Fawkner Beacon Failover';
// Geelong and Breakwater Pier only publish a wind path on the public feed —
// no matching Meteo/Weather path was found, so these two have no temperature.
const GEELONG_WIND_PATH = 'AU/VIC/Geelong/Meteo/All_Raw/Measured/Wilson Spit Beacon 2';
const BREAKWATER_PIER_WIND_PATH = 'AU/VIC/Melbourne/Meteo/Wind/Measured/Breakwater Pier Failover';

// ---------------------------------------------------------------------
// Timezone helpers — Workers' V8 runtime bundles ICU, so Intl with an
// IANA zone name works without a timezone library.
// ---------------------------------------------------------------------

function melbourneOffsetMinutes(utcGuess) {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone: MELBOURNE_TZ,
    hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
  const parts = {};
  for (const p of dtf.formatToParts(utcGuess)) parts[p.type] = p.value;
  const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return Math.round((asUTC - utcGuess.getTime()) / 60000);
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function offsetSuffix(offsetMin) {
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  return `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`;
}

// Formats a UTC instant as Melbourne local time with its current UTC offset.
function toMelbourneISO(utcDate) {
  const offsetMin = melbourneOffsetMinutes(utcDate);
  const local = new Date(utcDate.getTime() + offsetMin * 60000);
  return (
    `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}` +
    `T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())}` +
    offsetSuffix(offsetMin)
  );
}

function nowInMelbourne() {
  return toMelbourneISO(new Date());
}

// BOM's "local_date_time_full" is a naive Melbourne-local timestamp like
// "20260805203600". Treating it as if it were UTC to look up the
// matching offset is safe here: a ~10-11h guess error essentially never
// straddles a DST transition boundary.
function parseBomLocalTime(raw) {
  if (!raw || raw.length < 14) return null;
  const y = +raw.slice(0, 4);
  const mo = +raw.slice(4, 6);
  const d = +raw.slice(6, 8);
  const h = +raw.slice(8, 10);
  const mi = +raw.slice(10, 12);
  const s = +raw.slice(12, 14);
  const guess = new Date(Date.UTC(y, mo - 1, d, h, mi, s));
  const offsetMin = melbourneOffsetMinutes(guess);
  return `${y}-${pad(mo)}-${pad(d)}T${pad(h)}:${pad(mi)}:${pad(s)}${offsetSuffix(offsetMin)}`;
}

// ---------------------------------------------------------------------
// Fetchers — each is independent and defensively wrapped so a single
// BOM/Ports Victoria outage doesn't stop the rest of the payload.
// ---------------------------------------------------------------------

const HISTORY_WINDOW_MS = 24 * 60 * 60 * 1000;

async function fetchStation(product, wmo) {
  const url = `https://www.bom.gov.au/fwo/${product}/${product}.${wmo}.json`;
  try {
    const res = await timedFetch(url, { headers: HEADERS });
    if (!res.ok) return null;
    const json = await res.json();
    const entries = json?.observations?.data;
    if (!Array.isArray(entries) || entries.length === 0) return null;

    const latest = entries[0];
    const windKt = latest.wind_spd_kt;
    const gustKt = latest.gust_kt;
    const compass = (latest.wind_dir || '').toUpperCase();
    const dirDeg = COMPASS_DEG[compass];

    if (windKt == null || dirDeg == null) return null;

    // BOM's "data" array is a short rolling history, newest first. Keep
    // whatever falls in the last 24h for the historical chart, reversed
    // to oldest-first so a chart can plot it left-to-right.
    const cutoff = Date.now() - HISTORY_WINDOW_MS;
    const history = [];
    for (const entry of entries) {
      const eWindKt = entry.wind_spd_kt;
      if (eWindKt == null) continue;
      const eTime = parseBomLocalTime(entry.local_date_time_full);
      if (!eTime || new Date(eTime).getTime() < cutoff) continue;

      const eCompass = (entry.wind_dir || '').toUpperCase();
      history.push({
        time: eTime,
        windKt: eWindKt,
        gustKt: entry.gust_kt != null ? entry.gust_kt : eWindKt,
        dirDeg: COMPASS_DEG[eCompass] ?? null,
      });
    }
    history.reverse();

    return {
      windKt,
      gustKt: gustKt != null ? gustKt : windKt,
      dirCompass: compass,
      dirDeg,
      airTemp: latest.air_temp ?? null,
      observedAt: parseBomLocalTime(latest.local_date_time_full),
      history,
    };
  } catch (e) {
    console.error('station fetch failed', product, wmo, e);
    return null;
  }
}

async function fetchStations() {
  const stations = {};
  await Promise.all(
    Object.entries(BOM_STATIONS).map(async ([id, [product, wmo]]) => {
      const reading = await fetchStation(product, wmo);
      if (reading) stations[id] = reading;
    }),
  );
  return stations;
}

function omcQuery(refId, sourcePath, sourceProperty, target) {
  return {
    sourcePath,
    transformerType: 'MeasuredGenericPlot',
    sourceProperty,
    target,
    refId,
    type: 'timeseries',
    datasourceId: 391,
    userId: -1,
  };
}

async function fetchOmcStation(label, windPath, meteoPath) {
  try {
    const to = new Date();
    const from = new Date(to.getTime() - HISTORY_WINDOW_MS);
    const queries = [
      omcQuery('gust', windPath, 'wind_speed2', 'Wind Gust'),
      omcQuery('speed', windPath, 'wind_speed1', 'Wind Speed'),
      omcQuery('dir', windPath, 'wind_dir_deg', 'Direction'),
    ];
    if (meteoPath) queries.push(omcQuery('temp', meteoPath, 'temperature', 'Temperature'));

    const res = await timedFetch(OMC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-grafana-org-id': '338' },
      body: JSON.stringify({ from: from.toISOString(), to: to.toISOString(), queries }),
    });
    if (!res.ok) return null;
    const json = await res.json();

    const seriesValues = (refId) => json?.results?.[refId]?.frames?.[0]?.data?.values;
    const speed = seriesValues('speed');
    const gust = seriesValues('gust');
    const dir = seriesValues('dir');
    const temp = meteoPath ? seriesValues('temp') : null;
    if (!speed || !speed[0]?.length) return null;

    const times = speed[0];
    const history = [];
    for (let i = 0; i < times.length; i++) {
      const windKt = speed[1][i];
      if (windKt == null) continue;
      history.push({
        time: toMelbourneISO(new Date(times[i])),
        windKt,
        gustKt: gust?.[1]?.[i] ?? windKt,
        dirDeg: dir?.[1]?.[i] ?? null,
      });
    }
    if (history.length === 0) return null;

    const latest = history[history.length - 1];
    const latestTemp = temp?.[1]?.length ? temp[1][temp[1].length - 1] : null;

    return {
      windKt: latest.windKt,
      gustKt: latest.gustKt,
      dirCompass: latest.dirDeg != null ? degToCompass(latest.dirDeg) : '',
      dirDeg: latest.dirDeg,
      airTemp: latestTemp,
      observedAt: latest.time,
      history,
    };
  } catch (e) {
    console.error(`${label} fetch failed`, e);
    return null;
  }
}

async function fetchWarnings() {
  const result = { strong: false, gale: false, storm: false, rawText: null };
  try {
    const res = await timedFetch('https://www.bom.gov.au/fwo/IDV20600.txt', { headers: HEADERS });
    if (!res.ok) return result;
    const text = await res.text();
    result.rawText = text;

    let current = null;
    for (const rawLine of text.toLowerCase().split('\n')) {
      const line = rawLine.trim();
      if (line.includes('storm force warning')) current = 'storm';
      else if (line.includes('gale warning')) current = 'gale';
      else if (line.includes('strong wind warning')) current = 'strong';

      if (line.includes('port phillip') && current) {
        result[current] = true;
      }
    }
  } catch (e) {
    console.error('warnings fetch failed', e);
  }
  return result;
}

async function fetchForecastText() {
  try {
    const res = await timedFetch('http://www.bom.gov.au/fwo/IDV10460.txt', { headers: HEADERS });
    if (!res.ok) return null;
    const lines = (await res.text()).split('\n');

    let capture = false;
    const block = [];

    for (const line of lines) {
      const l = line.trim().toLowerCase();

      if (l.includes('forecast for') && l.includes('until midnight')) {
        capture = true;
        block.push(line);
        continue;
      }

      if (capture && l.startsWith('forecast for') && !l.includes('until midnight')) {
        break;
      }

      if (capture) block.push(line);
    }

    const joined = block.join('\n').trim();
    return joined || null;
  } catch (e) {
    console.error('forecast text fetch failed', e);
    return null;
  }
}

function stripTags(html) {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

const MONTHS = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

// Ports Victoria's table format is "Aug  5 2026  7:15PM" (confirmed against
// the live page — not "DD/MM/YYYY HH:MM" as originally assumed, which
// silently matched zero rows). Also tolerates a numeric DD/MM/YYYY fallback
// in case the format ever changes back.
function parseShipDateTime(text) {
  const named = text.match(/([A-Za-z]{3,})\s+(\d{1,2})\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*([AP]M)?/i);
  if (named) {
    const [, monStr, dd, yyyy, hh12, min, ampm] = named;
    const mon = MONTHS[monStr.slice(0, 3).toLowerCase()];
    if (mon === undefined) return null;

    let hh = Number(hh12);
    if (ampm) {
      const isPM = ampm.toUpperCase() === 'PM';
      if (hh === 12) hh = isPM ? 12 : 0;
      else if (isPM) hh += 12;
    }

    const guess = new Date(Date.UTC(Number(yyyy), mon, Number(dd), hh, Number(min)));
    const offsetMin = melbourneOffsetMinutes(guess);
    return new Date(guess.getTime() - offsetMin * 60000);
  }

  const numeric = text.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})[,\s]+(\d{1,2}):(\d{2})/);
  if (numeric) {
    const [, dd, mm, yyRaw, hh, min] = numeric;
    const yyyy = yyRaw.length === 2 ? 2000 + Number(yyRaw) : Number(yyRaw);
    const guess = new Date(Date.UTC(yyyy, Number(mm) - 1, Number(dd), Number(hh), Number(min)));
    const offsetMin = melbourneOffsetMinutes(guess);
    return new Date(guess.getTime() - offsetMin * 60000);
  }

  return null;
}

function extractShippingTable(html, headingText) {
  const lower = html.toLowerCase();
  const headingIdx = lower.indexOf(headingText.toLowerCase());
  if (headingIdx === -1) return [];

  const tableStart = lower.indexOf('<table', headingIdx);
  if (tableStart === -1) return [];
  const tableEnd = lower.indexOf('</table>', tableStart);
  if (tableEnd === -1) return [];

  const tableHtml = html.slice(tableStart, tableEnd);
  const rowMatches = [...tableHtml.matchAll(/<tr[\s\S]*?<\/tr>/gi)].slice(1); // skip header row

  const cutoff = new Date(Date.now() + 12 * 60 * 60 * 1000);
  const rows = [];

  for (const [rowHtml] of rowMatches) {
    const cells = [...rowHtml.matchAll(/<td[\s\S]*?<\/td>/gi)].map((m) => stripTags(m[0]));
    if (cells.length < 4) continue;

    const dt = parseShipDateTime(cells[1]);
    if (!dt || dt > cutoff) continue;

    // dt is a real UTC instant — shift it by Melbourne's offset so the
    // UTC getters below read back the correct local wall-clock time
    // (same trick as nowInMelbourne()), instead of printing UTC time.
    const local = new Date(dt.getTime() + melbourneOffsetMinutes(dt) * 60000);

    rows.push({
      ship: cells[0],
      datetime: `${pad(local.getUTCDate())}/${pad(local.getUTCMonth() + 1)}/${local.getUTCFullYear()} ` +
        `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`,
      from: cells[2],
      to: cells[3],
    });
  }

  return rows;
}

async function fetchShipping() {
  const result = { arrivals: [], departures: [] };
  try {
    const res = await timedFetch('https://ports.vic.gov.au/marine-operations/ship-movements/', { headers: HEADERS });
    if (!res.ok) return result;
    const html = await res.text();

    result.arrivals = extractShippingTable(html, 'Expected Arrivals');
    result.departures = extractShippingTable(html, 'Expected Departures');
  } catch (e) {
    console.error('shipping fetch failed', e);
  }
  return result;
}

// ---------------------------------------------------------------------
// Entry points
// ---------------------------------------------------------------------

async function buildPayload() {
  // allSettled, not all: a single fetcher throwing (a parse bug on an
  // upstream format change, an abort) must not reject the whole payload and
  // skip the KV write — that's what freezes the served feed for hours.
  const settled = await Promise.allSettled([
    fetchStations(),
    fetchOmcStation('webb dock', WEBB_DOCK_WIND_PATH, WEBB_DOCK_METEO_PATH),
    fetchOmcStation('fawkner beacon', FAWKNER_WIND_PATH, FAWKNER_METEO_PATH),
    fetchOmcStation('geelong', GEELONG_WIND_PATH),
    fetchOmcStation('breakwater pier', BREAKWATER_PIER_WIND_PATH),
    fetchWarnings(),
    fetchForecastText(),
    fetchShipping(),
  ]);
  const val = (i, fallback) => (settled[i].status === 'fulfilled' ? settled[i].value : fallback);
  settled.forEach((r, i) => {
    if (r.status === 'rejected') console.error('fetcher rejected', i, r.reason);
  });

  const stations = val(0, {});
  const webbDock = val(1, null);
  const fawknerOmc = val(2, null);
  const geelong = val(3, null);
  const breakwaterPier = val(4, null);
  const warnings = val(5, { strong: false, gale: false, storm: false, rawText: null });
  const forecastText = val(6, null);
  const shipping = val(7, { arrivals: [], departures: [] });

  if (webbDock) stations['webb-dock'] = webbDock;
  // BOM's Fawkner reading (from fetchStations above) stays in place as a
  // fallback if the OMC feed is unreachable; otherwise the more frequent
  // OMC reading takes over.
  if (fawknerOmc) stations['fawkner'] = fawknerOmc;
  if (geelong) stations['geelong'] = geelong;
  if (breakwaterPier) stations['breakwater-pier'] = breakwaterPier;

  return {
    generatedAt: nowInMelbourne(),
    stations,
    warnings,
    forecastText,
    shipping,
  };
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const stored = await env.BOM_DATA.get('live');
    if (!stored) {
      return new Response(JSON.stringify({ error: 'No data yet — waiting for the first scheduled run.' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
      });
    }

    return new Response(stored, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
        ...CORS_HEADERS,
      },
    });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(refresh(env));
  },
};

// Rebuilds the payload and stores it — unless every station came back empty
// (a total upstream outage), in which case the last good value is left in
// place rather than overwritten with nothing. Any error is logged, not
// swallowed, so a persistent break shows up in the worker's logs.
async function refresh(env) {
  try {
    const payload = await buildPayload();
    if (Object.keys(payload.stations).length === 0) {
      console.error('refresh produced no stations; keeping last stored value');
      return;
    }
    await env.BOM_DATA.put('live', JSON.stringify(payload));
  } catch (e) {
    console.error('refresh failed', e);
  }
}
