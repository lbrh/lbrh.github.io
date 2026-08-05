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
 * - Cron Trigger (every ~10 min): runs the fetch pipeline, stores the
 *   result in KV under the key "live".
 * - HTTP GET: returns the last stored KV value as JSON with CORS headers
 *   so the browser can read it directly (see src/lib/liveBom.ts).
 *
 * Deploy via the Cloudflare dashboard: Workers & Pages -> Create Worker,
 * paste this file in, bind a KV namespace to the binding name BOM_DATA,
 * and add a Cron Trigger under Settings -> Triggers (e.g. "*​/10 * * * *").
 * See wrangler.toml in this folder if deploying with the CLI instead.
 */

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-AU,en;q=0.9',
  Referer: 'https://www.bom.gov.au/',
};

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
};

const COMPASS_DEG = {
  N: 0, NNE: 22.5, NE: 45, ENE: 67.5,
  E: 90, ESE: 112.5, SE: 135, SSE: 157.5,
  S: 180, SSW: 202.5, SW: 225, WSW: 247.5,
  W: 270, WNW: 292.5, NW: 315, NNW: 337.5,
};

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

// Formats "now" as Melbourne local time with its current UTC offset.
function nowInMelbourne() {
  const offsetMin = melbourneOffsetMinutes(new Date());
  const local = new Date(Date.now() + offsetMin * 60000);
  return (
    `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}` +
    `T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())}` +
    offsetSuffix(offsetMin)
  );
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

async function fetchStation(product, wmo) {
  const url = `https://www.bom.gov.au/fwo/${product}/${product}.${wmo}.json`;
  try {
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return null;
    const json = await res.json();
    const latest = json?.observations?.data?.[0];
    if (!latest) return null;

    const windKt = latest.wind_spd_kt;
    const gustKt = latest.gust_kt;
    const compass = (latest.wind_dir || '').toUpperCase();
    const dirDeg = COMPASS_DEG[compass];

    if (windKt == null || dirDeg == null) return null;

    return {
      windKt,
      gustKt: gustKt != null ? gustKt : windKt,
      dirCompass: compass,
      dirDeg,
      airTemp: latest.air_temp ?? null,
      observedAt: parseBomLocalTime(latest.local_date_time_full),
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

async function fetchWarnings() {
  const result = { strong: false, gale: false, storm: false, rawText: null };
  try {
    const res = await fetch('https://www.bom.gov.au/fwo/IDV20600.txt', { headers: HEADERS });
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
    const res = await fetch('http://www.bom.gov.au/fwo/IDV10460.txt', { headers: HEADERS });
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

// Parses "DD/MM/YYYY HH:MM" (and close variants) as Melbourne local time.
// Ports Victoria's table format is simple enough that a small manual
// parser is more predictable here than a general date-parsing library.
function parseShipDateTime(text) {
  const m = text.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})[,\s]+(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const [, dd, mm, yyRaw, hh, min] = m;
  const yyyy = yyRaw.length === 2 ? 2000 + Number(yyRaw) : Number(yyRaw);
  const guess = new Date(Date.UTC(yyyy, Number(mm) - 1, Number(dd), Number(hh), Number(min)));
  const offsetMin = melbourneOffsetMinutes(guess);
  return new Date(guess.getTime() - offsetMin * 60000);
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

    rows.push({
      ship: cells[0],
      datetime: `${pad(dt.getUTCDate())}/${pad(dt.getUTCMonth() + 1)}/${dt.getUTCFullYear()} ` +
        `${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}`,
      from: cells[2],
      to: cells[3],
    });
  }

  return rows;
}

async function fetchShipping() {
  const result = { arrivals: [], departures: [] };
  try {
    const res = await fetch('https://ports.vic.gov.au/marine-operations/ship-movements/', { headers: HEADERS });
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
  const [stations, warnings, forecastText, shipping] = await Promise.all([
    fetchStations(),
    fetchWarnings(),
    fetchForecastText(),
    fetchShipping(),
  ]);

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
    ctx.waitUntil(
      buildPayload().then((payload) => env.BOM_DATA.put('live', JSON.stringify(payload))),
    );
  },
};
