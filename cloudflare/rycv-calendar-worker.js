/**
 * Live feed for the RYCV Racing Calendar widget (public/rycv-calendar/widget.js).
 *
 * Google's public .ics feeds don't send CORS headers, so a browser on
 * rycv.com.au can't read them directly. This Worker fetches the club's
 * public Google Calendars server-side, parses them, and serves one tidy JSON
 * document with CORS enabled. No API key and no secrets are needed because
 * the calendars are public.
 *
 * Route:
 * - GET /events.json   { updated, events: [{ id, cal, title, date, endDate,
 *                      time, allDay, location, desc }] }
 *                      Optional ?from=YYYY-MM-DD&to=YYYY-MM-DD (defaults to the
 *                      current sailing season, 1 Aug to 31 Jul).
 *
 * Responses are cached at the edge for 5 minutes, so Google sees at most one
 * request per calendar per 5 minutes however many people load the page.
 *
 * Recurring events (RRULE) are not expanded. Every recurring series in the
 * calendars today ended before this season, and new events are added as
 * individual entries.
 *
 * Deploy via the Cloudflare dashboard: Workers & Pages -> Create Worker, paste
 * this file in, Deploy. See wrangler-rycv-calendar.toml for CLI deploys.
 */

// To add a calendar, append its Google Calendar ID (Settings -> Integrate
// calendar) and the label the widget should use for it.
const CALENDARS = [
  { cal: 'otb', id: '604b25a5cb02f22c91841841b80e2cef18a4e99b7433743b2984cbf7484f5b1e@group.calendar.google.com' },
  { cal: 'keelboat', id: '3qrugkeol1o9i21g8mepl5a128@group.calendar.google.com' }
];

const TZ = 'Australia/Melbourne';
const CACHE_SECONDS = 300;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: CORS });

    const url = new URL(request.url);
    if (url.pathname !== '/events.json') return new Response('Not found', { status: 404, headers: CORS });

    const cache = caches.default;
    const cacheKey = new Request(url.toString(), { method: 'GET' });
    const hit = await cache.match(cacheKey);
    if (hit) return hit;

    const season = currentSeason();
    const from = validDate(url.searchParams.get('from')) || season.from;
    const to = validDate(url.searchParams.get('to')) || season.to;

    try {
      const results = await Promise.all(CALENDARS.map(c => loadCalendar(c, from, to)));
      const events = results.flat().sort(byStart);
      const response = new Response(JSON.stringify({ updated: new Date().toISOString(), events }), {
        headers: {
          ...CORS,
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=' + CACHE_SECONDS
        }
      });
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
      return response;
    } catch (err) {
      return new Response(JSON.stringify({ error: 'Calendar temporarily unavailable' }), {
        status: 502,
        headers: { ...CORS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      });
    }
  }
};

function validDate(s) {
  return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

function currentSeason() {
  const now = localParts(new Date());
  const startYear = now.month >= 8 ? now.year : now.year - 1;
  return { from: startYear + '-08-01', to: startYear + 1 + '-07-31' };
}

function byStart(a, b) {
  return (a.date + (a.time || '00:00')).localeCompare(b.date + (b.time || '00:00'));
}

async function loadCalendar(c, from, to) {
  const icsUrl = 'https://calendar.google.com/calendar/ical/' + encodeURIComponent(c.id) + '/public/basic.ics';
  const res = await fetch(icsUrl, { cf: { cacheTtl: CACHE_SECONDS, cacheEverything: true } });
  if (!res.ok) throw new Error('Google returned ' + res.status);
  return parseIcs(await res.text(), c.cal)
    .filter(e => e.date <= to && (e.endDate || e.date) >= from);
}

// ---------- iCalendar parsing ----------

function unfold(text) {
  return text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
}

function unescapeText(s) {
  return s.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
}

function parseIcs(text, cal) {
  const events = [];
  let cur = null;
  for (const line of unfold(text)) {
    if (line === 'BEGIN:VEVENT') { cur = {}; continue; }
    if (line === 'END:VEVENT') {
      if (cur) {
        const e = toEvent(cur, cal);
        if (e) events.push(e);
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const head = line.slice(0, colon).split(';');
    const name = head[0].toUpperCase();
    const params = {};
    head.slice(1).forEach(p => {
      const eq = p.indexOf('=');
      if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1);
    });
    if (!(name in cur)) cur[name] = { value: line.slice(colon + 1), params };
  }
  return events;
}

function toEvent(raw, cal) {
  if (raw.STATUS && raw.STATUS.value === 'CANCELLED') return null;
  if (!raw.DTSTART) return null;
  const start = parseDateTime(raw.DTSTART);
  if (!start) return null;
  const end = raw.DTEND ? parseDateTime(raw.DTEND) : null;

  const out = {
    id: cal + ':' + (raw.UID ? raw.UID.value : start.date + (raw.SUMMARY ? raw.SUMMARY.value : '')),
    cal: cal,
    title: raw.SUMMARY ? unescapeText(raw.SUMMARY.value).trim() : '',
    date: start.date,
    // Google exports an event with no time set as midnight; treat it as untimed.
    time: start.allDay || start.time === '00:00' ? '' : start.time,
    allDay: start.allDay,
    location: raw.LOCATION ? unescapeText(raw.LOCATION.value).trim() : '',
    desc: raw.DESCRIPTION ? unescapeText(raw.DESCRIPTION.value).trim() : ''
  };
  if (end) {
    // An all-day DTEND is exclusive, so a one-day event ends the next day.
    const endDate = start.allDay ? addDays(end.date, -1) : end.date;
    if (endDate > start.date) out.endDate = endDate;
  }
  return out.title ? out : null;
}

function parseDateTime(prop) {
  const v = prop.value;
  if (prop.params.VALUE === 'DATE' || /^\d{8}$/.test(v)) {
    return { date: v.slice(0, 4) + '-' + v.slice(4, 6) + '-' + v.slice(6, 8), time: '', allDay: true };
  }
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!m) return null;
  if (m[7] === 'Z') {
    const p = localParts(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])));
    return { date: p.date, time: p.time, allDay: false };
  }
  // Floating or TZID times are already wall-clock times; the club's calendars
  // use Australia/Sydney, which matches Melbourne's wall clock all year.
  return { date: m[1] + '-' + m[2] + '-' + m[3], time: m[4] + ':' + m[5], allDay: false };
}

function localParts(d) {
  const f = new Intl.DateTimeFormat('en-AU', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const p = {};
  f.formatToParts(d).forEach(x => { p[x.type] = x.value; });
  return {
    year: +p.year,
    month: +p.month,
    date: p.year + '-' + p.month + '-' + p.day,
    time: p.hour + ':' + p.minute
  };
}

function addDays(date, n) {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
