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

Important: assume the boats are listed in chronological order, so the finish times should increase (or stay equal) from one row to the next, and place numbers should run 1, 2, 3 and so on. Only treat the order as wrong if it is blatantly obvious that it is (for example a time that is clearly far earlier than the rows around it, with no plausible misreading). When a digit in a time or sail number is hard to read, use the neighbouring rows' times to pick the reading that keeps the sequence in order, and prefer the reading that fits the order over one that breaks it. Do not reorder rows: keep them in the order written on the sheet.

Return ONLY a raw JSON array, no markdown code fences, no commentary before or after. Example shape:
[{"place": 1, "sailNum": "R281", "hr": "16", "min": "09", "sec": "21", "note": "", "hourGuessed": false}]`;

// Second mode: a timestamped transcript of a race officer calling boats over
// the finish line (Voice Finish Logger, src/pages/toolbox/finish-voice.tsx).
const MAX_TRANSCRIPT_CHARS = 250_000;
const MAX_SAILS = 600;

const VOICE_PROMPT = `You are processing a speech-to-text transcript of a race officer on the finish boat calling yachts across the finish line. Every word is prefixed with its start time in seconds from the start of the recording, like [12.4]R815, [13.1]now.

How the officer works: they "load" a boat by calling its sail number (a letter or letters followed by digits, e.g. R815, S47, H1020), and call "now" at the instant it finishes. Rules:
- Boats are queued in the order they are first called. Each "now" finishes the EARLIEST boat still waiting. So "S1020, R7158, now, now" means S1020 finished at the first now and R7158 at the second now.
- The officer often repeats a sail number to be sure it was heard ("S47 S47, now"). A repeat of the same boat while it is still waiting is ONE boat, not two.
- A boat's finish time is the timestamp of the "now" that finishes it, in seconds from the start of the recording, to one decimal place.
- Speech-to-text mistakes are common: sail numbers may be spelled out ("R eight one five", "Romeo 815", "R-8-1-5") and "now" may appear as "no", "know", "now." or similar. Use context: a short word right after one or more sail calls, where a finish call is expected, is a "now". Ignore all other chatter (conversation, radio calls, counting, etc.).
- The officer sometimes withdraws a boat they loaded too early. "Scratch that", "ignore that", "cancel that", "disregard", "forget that", "not that one" or similar removes the MOST RECENTLY loaded boat that is still waiting from the queue, as if it was never called. It is not a finish and must not appear in the output. Example: "S47, scratch that, S19, now" means only S19 finished. If several boats are waiting and the wording names one ("scratch S47", "ignore S47"), remove that boat instead. If the same boat is then called again later, treat it as a fresh load. Only drop boats that have not yet had a "now"; a withdrawal after a boat's "now" does not undo that finish unless the officer clearly says so about that boat. Whisper may garble these phrases ("scratch it", "scrap that", "ignore it"), so judge by context.
- If a list of valid sail numbers is supplied, snap each heard sail number to the single closest valid one when it is plausibly a mishearing (e.g. a dropped or swapped digit, "R 815" heard as "R 80 15"). If nothing plausible matches, keep what was heard and set note to "not in boat list".
- A boat that was loaded but never got a matching "now" is still included, with "t": null and note "no now heard". Extra "now" calls with no boat waiting are ignored.
- Return boats in the order they finished.

Report your answer by calling the record_finishes tool. Use its "working" field for brief queue notes if you need them, then list the finished boats in "events" (sail numbers uppercase, no spaces).`;

// Forced tool call so the answer always comes back as structured JSON, never prose.
const VOICE_TOOL = {
  name: 'record_finishes',
  description: 'Record the boats that finished, in finishing order.',
  input_schema: {
    type: 'object',
    properties: {
      working: { type: 'string', description: 'Brief queue notes, optional.' },
      events: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            sailNum: { type: 'string' },
            t: { type: ['number', 'null'], description: 'Seconds at the finishing "now", or null if none heard.' },
            note: { type: 'string' },
          },
          required: ['sailNum', 't', 'note'],
        },
      },
    },
    required: ['events'],
  },
};

async function callClaude(env, content, maxTokens, extra = {}) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      messages: [{ role: 'user', content }],
      ...extra,
    }),
  });
  return res;
}

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
  // The model sometimes wraps the array in fences or adds a sentence before/after it,
  // so take everything from the first "[" to the last "]".
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end <= start) throw new Error('No JSON array found.');
  const parsed = JSON.parse(text.slice(start, end + 1));
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

    if (typeof payload?.transcript === 'string') {
      const transcript = payload.transcript;
      if (!transcript.trim()) {
        return jsonResponse({ error: 'Transcript is empty.' }, 400, headers);
      }
      if (transcript.length > MAX_TRANSCRIPT_CHARS) {
        return jsonResponse({ error: 'Transcript is too long. Try a shorter recording.' }, 413, headers);
      }
      const sails = Array.isArray(payload.sails)
        ? payload.sails.filter((s) => typeof s === 'string').slice(0, MAX_SAILS)
        : [];
      const text =
        VOICE_PROMPT +
        (sails.length ? `\n\nValid sail numbers: ${sails.join(', ')}` : '') +
        `\n\nTranscript:\n${transcript}`;

      let res;
      try {
        res = await callClaude(env, text, 16000, {
          tools: [VOICE_TOOL],
          tool_choice: { type: 'tool', name: 'record_finishes' },
        });
      } catch (e) {
        return jsonResponse({ error: `Could not reach Anthropic: ${e.message}` }, 502, headers);
      }
      if (!res.ok) {
        const detail = await res.text();
        return jsonResponse({ error: `Anthropic API error (${res.status}): ${detail}` }, 502, headers);
      }
      const data = await res.json();
      const toolUse = (data.content || []).find((b) => b.type === 'tool_use');
      if (!toolUse || !Array.isArray(toolUse.input?.events)) {
        const raw = (data.content || []).map((b) => b.text || '').join('').trim();
        return jsonResponse(
          {
            error: `Claude did not return a finishes list (stop reason: ${data.stop_reason || 'unknown'}).`,
            raw,
          },
          502,
          headers,
        );
      }
      return jsonResponse({ events: toolUse.input.events }, 200, headers);
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
      return jsonResponse({ error: 'The model did not return finish data. This may not be a finish sheet photo, or it could not be read.', raw: text }, 502, headers);
    }

    return jsonResponse({ rows }, 200, headers);
  },
};
