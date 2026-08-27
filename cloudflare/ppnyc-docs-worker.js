/**
 * Bridges the PPNYC Document Hub Google Form to the live widget.
 *
 * A trusted staff member fills out a Google Form (pick a document, upload
 * the PDF). An Apps Script trigger bound to the Form's response sheet
 * (see apps-script-on-form-submit.js) fires the instant that happens and
 * POSTs the submission straight to this Worker — no polling, so the
 * update is live within a couple of seconds. A slow cron trigger here is
 * just a safety net in case that push ever fails to arrive.
 *
 * Routes:
 * - GET  /documents.json        Same shape as public/ppnyc-hub/documents.json.
 *                                Any slot nobody has ever submitted through
 *                                the form still points at the static file on
 *                                lbrh.space, so this rolls out gradually.
 * - GET  /documents/<slug>.pdf  Stable per-document URL. Proxies the current
 *                                Drive file's bytes if the form has updated
 *                                this slot, otherwise 302s to the static
 *                                fallback. The public URL never changes even
 *                                though the Drive file behind it does.
 * - POST /update                Webhook target for the Apps Script trigger.
 *                                Body: { "label": "<one of the 9 document
 *                                names>", "driveUrl": "<drive share link>" }.
 *                                Requires header X-Update-Secret matching
 *                                the UPDATE_SECRET binding.
 *
 * Deploy via the Cloudflare dashboard: Workers & Pages -> Create Worker,
 * paste this file in, bind a KV namespace to PPNYC_DOCS, add the
 * UPDATE_SECRET encrypted variable, and (optionally) a Cron Trigger under
 * Settings -> Triggers. See wrangler-ppnyc-docs.toml if deploying with the
 * CLI instead. SHEET_ID is only needed for the cron reconciliation pass —
 * everything else works without it.
 */

const FALLBACK_BASE = 'https://lbrh.space/ppnyc-hub/documents/';
const UPDATED_AT_KEY = 'ppnycDocsState';

// The 9 document slots. `label` must exactly match the corresponding
// option text in the Google Form's "Which document?" dropdown. `path`
// says where this slot lives in the documents.json shape the widget
// expects (see public/ppnyc-hub/documents.json / widget.js FALLBACK_DOCS).
const DOC_SLOTS = [
  { slug: 'ppnyc-nor', label: 'PPNYC Notice of Race', path: ['common', 'nor'] },
  { slug: 'ppnyc-race-calendar', label: 'Combined Race Calendar', path: ['common', 'raceCalendar'] },
  { slug: 'ppnyc-course-book', label: 'Combined Course Book', path: ['common', 'courseBook'] },
  { slug: 'rmys-nor-annexure', label: 'RMYS NOR Annexure', path: ['clubs', 'rmys', 'annexure'] },
  {
    slug: 'rmys-sailing-instructions',
    label: 'RMYS Standard & Supplementary Sailing Instructions',
    path: ['clubs', 'rmys', 'supplement'],
  },
  { slug: 'rycv-nor-annexure', label: 'RYCV NOR Annexure', path: ['clubs', 'rycv', 'annexure'] },
  {
    slug: 'rycv-sailing-instructions',
    label: 'RYCV Standard & Supplementary Sailing Instructions',
    path: ['clubs', 'rycv', 'supplement'],
  },
  { slug: 'hbyc-nor-annexure', label: 'HBYC NOR Annexure', path: ['clubs', 'hbyc', 'annexure'] },
  {
    slug: 'hbyc-sailing-instructions',
    label: 'HBYC Standard & Supplementary Sailing Instructions',
    path: ['clubs', 'hbyc', 'supplement'],
  },
];

const SLOT_BY_SLUG = Object.fromEntries(DOC_SLOTS.map((s) => [s.slug, s]));
const SLOT_BY_LABEL = Object.fromEntries(DOC_SLOTS.map((s) => [s.label.toLowerCase(), s]));

function findSlotByLabel(label) {
  if (!label) return null;
  return SLOT_BY_LABEL[String(label).trim().toLowerCase()] || null;
}

// Accepts the common shapes a Drive "share" link comes in and pulls out
// the file ID: .../file/d/ID/view, ?id=ID, open?id=ID.
function extractDriveId(url) {
  if (!url) return null;
  var m = url.match(/\/d\/([\w-]{10,})/) || url.match(/[?&]id=([\w-]{10,})/);
  return m ? m[1] : null;
}

function setAtPath(obj, path, value) {
  var node = obj;
  for (var i = 0; i < path.length - 1; i++) {
    if (!node[path[i]]) node[path[i]] = {};
    node = node[path[i]];
  }
  node[path[path.length - 1]] = value;
}

// state: { updatedAt: string, driveIds: { [slug]: string } }
async function loadState(env) {
  var raw = await env.PPNYC_DOCS.get(UPDATED_AT_KEY);
  if (!raw) return { updatedAt: '', driveIds: {} };
  try {
    return JSON.parse(raw);
  } catch (e) {
    return { updatedAt: '', driveIds: {} };
  }
}

async function saveState(env, state) {
  await env.PPNYC_DOCS.put(UPDATED_AT_KEY, JSON.stringify(state));
}

// Builds the public documents.json payload. Slots with a stored Drive ID
// point at this Worker's own stable /documents/<slug>.pdf route; anything
// else falls back to the static file already committed to the repo.
function buildDocumentsJson(state, workerOrigin) {
  var out = { updatedAt: state.updatedAt || '', common: {}, clubs: {} };
  DOC_SLOTS.forEach(function (slot) {
    var hasDriveFile = !!state.driveIds[slot.slug];
    var url = hasDriveFile
      ? workerOrigin + '/documents/' + slot.slug + '.pdf'
      : FALLBACK_BASE + slot.slug + '.pdf';
    setAtPath(out, slot.path, { label: slot.label, url: url });
  });
  return out;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Update-Secret',
};

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

// Drive returns an HTML page instead of the file in two cases: a "can't
// virus-scan this large file" interstitial (has a confirm=XXXX token we
// can retry with) or, far more commonly here, the file simply isn't
// shared "Anyone with the link" — Drive serves a sign-in/request-access
// page instead, with no confirm token at all. Returns null for that
// second case so the caller falls back cleanly instead of trying to
// serve an HTML page as a PDF.
async function fetchDriveFile(driveId) {
  var directUrl = 'https://drive.google.com/uc?export=download&id=' + driveId;
  var res = await fetch(directUrl);
  var contentType = res.headers.get('content-type') || '';

  if (contentType.indexOf('text/html') !== -1) {
    var html = await res.text();
    var confirmMatch = html.match(/confirm=([0-9A-Za-z_-]+)/);
    if (!confirmMatch) return null;
    res = await fetch(directUrl + '&confirm=' + confirmMatch[1]);
  }
  return res;
}

async function handleUpdate(request, env) {
  var secret = request.headers.get('X-Update-Secret');
  if (!env.UPDATE_SECRET || secret !== env.UPDATE_SECRET) {
    return json({ error: 'unauthorized' }, 401);
  }

  var body;
  try {
    body = await request.json();
  } catch (e) {
    return json({ error: 'invalid JSON body' }, 400);
  }

  var slot = findSlotByLabel(body.label);
  if (!slot) {
    return json({ error: 'unknown document label: ' + body.label }, 400);
  }

  var driveId = extractDriveId(body.driveUrl);
  if (!driveId) {
    return json({ error: 'could not find a Drive file ID in driveUrl' }, 400);
  }

  var state = await loadState(env);
  state.driveIds[slot.slug] = driveId;
  state.updatedAt = new Date().toISOString().slice(0, 10);
  await saveState(env, state);

  return json({ ok: true, slug: slot.slug, driveId: driveId });
}

async function handleDocumentsJson(request, env) {
  var state = await loadState(env);
  var origin = new URL(request.url).origin;
  return new Response(JSON.stringify(buildDocumentsJson(state, origin)), {
    headers: {
      'Content-Type': 'application/json',
      // Short cache — the whole point of the webhook is that updates
      // should show up quickly, so don't let a CDN edge sit on this long.
      'Cache-Control': 'public, max-age=30',
      ...CORS_HEADERS,
    },
  });
}

async function handleDocumentPdf(slug, env) {
  var slot = SLOT_BY_SLUG[slug];
  if (!slot) return new Response('Not found', { status: 404, headers: CORS_HEADERS });

  var state = await loadState(env);
  var driveId = state.driveIds[slug];

  if (!driveId) {
    // Never updated through the form — send the browser straight to the
    // static file already committed to the repo.
    return Response.redirect(FALLBACK_BASE + slug + '.pdf', 302);
  }

  try {
    var driveRes = await fetchDriveFile(driveId);
    if (!driveRes || !driveRes.ok) {
      // Drive fetch failed, or returned something that wasn't the file
      // (most likely: not shared "Anyone with the link") — fall back
      // rather than serving an error or the wrong content as a "PDF".
      return Response.redirect(FALLBACK_BASE + slug + '.pdf', 302);
    }

    return new Response(driveRes.body, {
      headers: {
        'Content-Type': 'application/pdf',
        'Cache-Control': 'public, max-age=300',
        'Content-Disposition': 'inline; filename="' + slug + '.pdf"',
        ...CORS_HEADERS,
      },
    });
  } catch (e) {
    // Belt and suspenders — any unexpected failure here should degrade
    // to the static file, never a raw 500 to whoever clicked the link.
    console.error('drive proxy failed for', slug, e);
    return Response.redirect(FALLBACK_BASE + slug + '.pdf', 302);
  }
}

// ---------------------------------------------------------------------
// Cron fallback: re-reads the published Google Sheet and reconciles any
// slot the webhook might have missed. Only runs if SHEET_ID is set —
// entirely optional, the webhook path above works without it.
// ---------------------------------------------------------------------

function parseGvizJson(text) {
  var start = text.indexOf('(');
  var end = text.lastIndexOf(')');
  return JSON.parse(text.slice(start + 1, end));
}

async function reconcileFromSheet(env) {
  if (!env.SHEET_ID) return;

  var url = 'https://docs.google.com/spreadsheets/d/' + env.SHEET_ID + '/gviz/tq?tqx=out:json';
  var res = await fetch(url);
  if (!res.ok) {
    console.error('sheet fetch failed', res.status);
    return;
  }
  var gviz = parseGvizJson(await res.text());

  var cols = gviz.table.cols.map(function (c) {
    return (c.label || '').toLowerCase();
  });
  var docCol = cols.findIndex(function (c) {
    return c.indexOf('which document') !== -1;
  });
  var fileCol = cols.findIndex(function (c) {
    return c.indexOf('upload') !== -1;
  });
  var timeCol = cols.findIndex(function (c) {
    return c.indexOf('timestamp') !== -1;
  });
  if (docCol === -1 || fileCol === -1) {
    console.error('sheet reconcile: expected columns not found', cols);
    return;
  }

  // Keep only the latest row per document label.
  var latestBySlug = {};
  (gviz.table.rows || []).forEach(function (row) {
    var cells = row.c || [];
    var label = cells[docCol] && cells[docCol].v;
    var fileLink = cells[fileCol] && cells[fileCol].v;
    var timeRaw = timeCol !== -1 && cells[timeCol] ? cells[timeCol].v : null;
    var slot = findSlotByLabel(label);
    var driveId = extractDriveId(fileLink);
    if (!slot || !driveId) return;

    var time = timeRaw ? Date.parse(timeRaw) || 0 : 0;
    if (!latestBySlug[slot.slug] || time >= latestBySlug[slot.slug].time) {
      latestBySlug[slot.slug] = { driveId: driveId, time: time };
    }
  });

  var state = await loadState(env);
  var changed = false;
  Object.keys(latestBySlug).forEach(function (slug) {
    var driveId = latestBySlug[slug].driveId;
    if (state.driveIds[slug] !== driveId) {
      state.driveIds[slug] = driveId;
      changed = true;
    }
  });

  if (changed) {
    state.updatedAt = new Date().toISOString().slice(0, 10);
    await saveState(env, state);
  }
}

export default {
  async fetch(request, env) {
    var url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method === 'POST' && url.pathname === '/update') {
      return handleUpdate(request, env);
    }

    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/documents.json')) {
      return handleDocumentsJson(request, env);
    }

    var pdfMatch = url.pathname.match(/^\/documents\/([a-z0-9-]+)\.pdf$/);
    if (request.method === 'GET' && pdfMatch) {
      return handleDocumentPdf(pdfMatch[1], env);
    }

    return new Response('Not found', { status: 404, headers: CORS_HEADERS });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(reconcileFromSheet(env));
  },
};
