/**
 * Cloudflare Worker that proxies photographed race finish sheets to the
 * Anthropic API for extraction, so the API key never has to sit in
 * browser-visible code. Used by src/pages/toolbox/finish-sheet-reader.tsx
 * — the site is a static GitHub Pages export with no server of its own,
 * so this Worker is the closest thing it has to a backend (same reason
 * bom-worker.js exists for the live wind data).
 *
 * This one calls a metered, billed API with a secret that's reachable by
 * anyone who finds the Worker URL (it's visible in the site's compiled
 * JS), so unlike bom-worker.js it needs abuse controls: an origin
 * allow-list, per-IP + sitewide rate limits, and a payload size cap.
 * None of this is bulletproof — Origin headers can be spoofed by a
 * non-browser client, and KV-based counters are only eventually
 * consistent — but it raises the bar well past casual abuse. Also set a
 * spend/usage limit on the Anthropic account itself as a hard backstop:
 * https://console.anthropic.com/settings/limits
 *
 * Deploy via the Cloudflare dashboard: Workers & Pages -> Create Worker,
 * paste this file in, then:
 *   - Settings -> Variables and Secrets -> add ANTHROPIC_API_KEY (Secret)
 *   - Settings -> Bindings -> add a KV namespace, binding name RATE_LIMIT
 *     (create a new namespace if you don't have one to reuse)
 *   - Click Deploy again after adding either — the dashboard's "add
 *     variable" flow creates a new version that isn't live until deployed.
 * See wrangler-finish-sheet.toml in this folder if deploying with the
 * CLI instead.
 */

// Update this if the site is ever served from a different domain — only
// requests whose browser-sent Origin header matches one of these get a
// CORS response that the browser will actually accept.
const ALLOWED_ORIGINS = ['https://lbrh.space', 'https://lbrh.github.io', 'http://localhost:3000'];

const ALLOWED_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Anthropic base64-encodes the image, so this is roughly 3/4 of the
// actual byte budget — comfortably above what the frontend's own
// client-side resize (finishSheet normalizeImage, capped ~1600px/JPEG
// 0.85) produces, while still bounding worst-case request cost.
const MAX_BASE64_LENGTH = 12_000_000;

const RATE_LIMIT_PER_MINUTE = 5;
const RATE_LIMIT_PER_HOUR = 20;
const GLOBAL_DAILY_LIMIT = 150;

const EXTRACTION_PROMPT = `You are reading a handwritten or printed yacht race finish sheet.

For every row on the sheet, extract:
- place: the finishing place/rank as written (integer)
- sailNum: the sail number exactly as written, no spaces. Sail numbers usually start with a letter (e.g. R or H) followed by digits, e.g. H1, R23, R281 or H1234.
- hr, min, sec: the finish time, each as a zero padded two digit string (24 hour clock). If only minutes and seconds are written, infer the hour from context (e.g. the race start time written elsewhere on the sheet) and set "hourGuessed": true
- note: any extra annotation such as DNF, DNC, DSQ, RET, OCS - empty string if there is none

Return ONLY a raw JSON array, no markdown code fences, no commentary before or after. Example shape:
[{"place": 1, "sailNum": "R281", "hr": "16", "min": "09", "sec": "21", "note": "", "hourGuessed": false}]`;

function corsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
  return headers;
}

function jsonResponse(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function extractJsonArray(text) {
  let cleaned = text.trim().replace(/^`+|`+$/g, '').trim();
  if (cleaned.toLowerCase().startsWith('json')) cleaned = cleaned.slice(4).trim();
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) throw new Error('Model response was not a JSON array.');
  return parsed;
}

/**
 * Soft rate limiter backed by KV. Not perfectly race-free (KV reads/writes
 * aren't atomic, so a handful of concurrent requests can slip through the
 * count), but that's fine here — the goal is capping runaway API spend,
 * not enforcing an exact quota. Returns an error message if the request
 * should be blocked, or null if it's within limits (and records it).
 */
async function checkRateLimit(env, ip) {
  if (!env.RATE_LIMIT) return null; // binding not configured yet — fail open rather than break the tool

  const now = Date.now();
  const minuteKey = `min:${ip}:${Math.floor(now / 60000)}`;
  const hourKey = `hr:${ip}:${Math.floor(now / 3600000)}`;
  const dayKey = `day:${new Date(now).toISOString().slice(0, 10)}`;

  const [minuteCount, hourCount, dayCount] = await Promise.all([
    env.RATE_LIMIT.get(minuteKey),
    env.RATE_LIMIT.get(hourKey),
    env.RATE_LIMIT.get(dayKey),
  ]);

  if (Number(dayCount) >= GLOBAL_DAILY_LIMIT) {
    return 'This tool has hit its daily usage limit across all users. Please try again tomorrow.';
  }
  if (Number(hourCount) >= RATE_LIMIT_PER_HOUR) {
    return 'Too many requests from this connection in the last hour. Please wait and try again.';
  }
  if (Number(minuteCount) >= RATE_LIMIT_PER_MINUTE) {
    return 'Too many requests — please wait a minute and try again.';
  }

  await Promise.all([
    env.RATE_LIMIT.put(minuteKey, String(Number(minuteCount || 0) + 1), { expirationTtl: 90 }),
    env.RATE_LIMIT.put(hourKey, String(Number(hourCount || 0) + 1), { expirationTtl: 3660 }),
    env.RATE_LIMIT.put(dayKey, String(Number(dayCount || 0) + 1), { expirationTtl: 90000 }),
  ]);

  return null;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const headers = corsHeaders(origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }
    // A browser sends Origin on every cross-origin fetch, so a present-but-unlisted
    // Origin means some other site's script is calling this Worker. Requests with no
    // Origin at all (curl, server-to-server) fall through to the rate limiter below —
    // Origin is trivially spoofable outside a real browser, so it's not worth trusting
    // as a hard gate either way.
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return jsonResponse({ error: 'Origin not allowed.' }, 403, headers);
    }
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed, use POST.' }, 405, headers);
    }
    if (!env.ANTHROPIC_API_KEY) {
      return jsonResponse({ error: 'Worker is missing its ANTHROPIC_API_KEY secret.' }, 500, headers);
    }

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimitError = await checkRateLimit(env, ip);
    if (rateLimitError) {
      return jsonResponse({ error: rateLimitError }, 429, headers);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse({ error: 'Request body must be JSON.' }, 400, headers);
    }

    const imageBase64 = typeof payload?.imageBase64 === 'string' ? payload.imageBase64 : '';
    const mediaType = typeof payload?.mediaType === 'string' ? payload.mediaType : '';
    if (!imageBase64 || !ALLOWED_MEDIA_TYPES.includes(mediaType)) {
      return jsonResponse(
        { error: 'Expected JSON body { imageBase64, mediaType }, mediaType one of jpeg/png/webp.' },
        400,
        headers,
      );
    }
    if (imageBase64.length > MAX_BASE64_LENGTH) {
      return jsonResponse({ error: 'Image is too large. Try a smaller photo.' }, 413, headers);
    }

    let anthropicRes;
    try {
      anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 4000,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageBase64 } },
                { type: 'text', text: EXTRACTION_PROMPT },
              ],
            },
          ],
        }),
      });
    } catch (e) {
      return jsonResponse({ error: `Could not reach Anthropic: ${e.message}` }, 502, headers);
    }

    if (!anthropicRes.ok) {
      const detail = await anthropicRes.text();
      return jsonResponse({ error: `Anthropic API error (${anthropicRes.status}): ${detail}` }, 502, headers);
    }

    const data = await anthropicRes.json();
    const text = (data.content || [])
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();

    let rows;
    try {
      rows = extractJsonArray(text);
    } catch {
      return jsonResponse({ error: 'Could not parse a JSON array from the model response.', raw: text }, 502, headers);
    }

    return jsonResponse({ rows }, 200, headers);
  },
};
