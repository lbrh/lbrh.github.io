# PPNYC Document Hub widget

A self-hosted, vanilla-JS widget that replaces the [PPNYC document hub prototype](https://ppnyc-document-hub.owen-church64.chatgpt.site/#links-needed). One file (`widget.js`) is embedded on all three club sites — RMYS, RYCV, and HBYC — and detects which club's domain it's running on to show the right branding and documents.

It renders as a full-width page section (hero, document-sequence walkthrough, common-documents grid, other-club expander, status note) with the same descriptive copy and section structure as the original prototype — not a small sidebar card. Point a club's "Race Documents" page at the embed snippet below and it fills the page.

## Embed on a club site

Paste this wherever the hub should appear (WordPress custom HTML block, GoDaddy HTML widget, Squarespace code block, etc.):

```html
<div id="ppnyc-document-hub"></div>
<script src="https://lbrh.space/ppnyc-hub/widget.js" defer></script>
```

**Always use `lbrh.space`, never `lbrh.github.io`.** `lbrh.github.io` is this site's raw GitHub Pages address; `lbrh.space` is the custom domain it's actually served under, and `lbrh.github.io` 301-redirects to it. That redirect response has no CORS header, so a foreign-origin page (any real club site) that fetches `documents.json` through it gets blocked by CORS and the widget silently falls back to "Coming soon" placeholders — it looks like the documents were never wired up, when actually it's just the wrong host in the `<script src>`. Loading `widget.js` itself still works either way (the browser follows the redirect for a plain script load), so this bug only shows up in the document data, which is what makes it easy to miss.

The script auto-detects the club from `window.location.hostname`:

| Club | Domain(s) matched |
|---|---|
| RMYS — Royal Melbourne Yacht Squadron | `rmys.com.au` |
| RYCV — Royal Yacht Club of Victoria | `rycv.com.au` |
| HBYC — Hobsons Bay Yacht Club | `hbyc.org.au` |

If a page is served from a domain the widget doesn't recognise (staging, a members' subdomain, etc.), it shows a small club picker instead of guessing. You can also force a club explicitly, which is useful for staging or a page that needs a specific club's documents regardless of domain:

```html
<div id="ppnyc-document-hub" data-club="rmys"></div>
<script src="https://lbrh.space/ppnyc-hub/widget.js" defer></script>
```

If you omit the `<div>` entirely, the script inserts one automatically right where the `<script>` tag sits — so the embed genuinely works as two lines.

## Document structure

There's **one** shared document group (published once, used by all three clubs) and each club has its **own** NOR annexure and its **own** Sailing Instructions — there's no separate program-wide SSI distinct from a club's SI; each club already publishes a single combined "Standard & Supplementary Sailing Instructions" document, so the widget doesn't invent a duplicate:

- **Common** (one file each, shared): PPNYC Notice of Race, Combined Race Calendar, Combined Course Book
- **Per club** (each of RMYS / RYCV / HBYC has its own): NOR Annexure, Standard & Supplementary Sailing Instructions

Nine documents total, not ten — the original prototype assumed a tenth "common SSI" that doesn't actually exist as a separate file in practice.

## Updating documents

All nine document URLs live in [`documents.json`](documents.json), not in the widget code. Edit that file and push — every club site picks up the change on next page load (the widget fetches with `cache: 'no-store'`, so there's no waiting on browser/CDN caching).

The actual PDFs are committed straight into this repo, at [`documents/`](documents/), and served from GitHub Pages — `documents.json` just points at them by stable filename (`rmys-sailing-instructions.pdf`, not a versioned name like `RMYS-SIs-2025-2026 V 3.pdf`). To publish a new version of a document each season: overwrite the file at that same path and push — the filename, and therefore every club's link, doesn't need to change.

If a URL isn't ready yet, leave it as `"#links-needed"` (or blank) and the widget renders a "Coming soon" pill instead of a dead link.

```json
{
  "updatedAt": "2026-08-27",
  "common": {
    "nor": { "label": "PPNYC Notice of Race", "url": "https://lbrh.space/ppnyc-hub/documents/ppnyc-nor.pdf" },
    "raceCalendar": { "label": "Combined Race Calendar", "url": "..." },
    "courseBook": { "label": "Combined Course Book", "url": "..." }
  },
  "clubs": {
    "rmys": { "annexure": { "label": "...", "url": "..." }, "supplement": { "label": "...", "url": "..." } },
    "rycv": { "...": "..." },
    "hbyc": { "...": "..." }
  }
}
```

### Swapping in Google Sheets / Airtable / Supabase later

`documents.json` is deliberately just a static file fetched by URL — that's the whole "API." If a club wants to manage links themselves without touching GitHub:

- **Google Sheets**: publish the sheet as JSON (via Sheets API or a tool like sheet.best) and change the one `fetch()` URL built in `fetchDocs()` in `widget.js` to point at it, keeping the same `{ updatedAt, common, clubs }` shape.
- **Airtable / Supabase**: same idea — point `fetchDocs()` at the table's REST endpoint and shape the response the same way, or add a small transform.

No other part of the widget needs to change; it doesn't care where the JSON came from, only that it matches the shape above.

## Branding

Each club gets its own accent colour, set in `CLUBS` at the top of `widget.js` (`accent` / `accentDark`). Current values are sampled from each club's own site (header/nav bar + crest):

| Club | Accent | Source |
|---|---|---|
| RMYS | `#e31b2c` (red) | Crest colour + "Racing" banner on [rmys.com.au](https://rmys.com.au/) |
| RYCV | `#1a2b5d` (navy) | Top nav bar on [rycv.com.au](https://rycv.com.au/) |
| HBYC | `#0e193e` (navy) | Site header on [hbyc.org.au](https://hbyc.org.au/) |

Each club's crest (pulled from their own site's favicon/header) is committed at [`logos/`](logos/) and shown next to that club's own documents — the NOR annexure and Sailing Instructions cards, both in the main sequence and in "Racing elsewhere." Shared documents (NOR, calendar, course book) show no logo since they aren't owned by one club. Set in `CLUBS[key].logo` in `widget.js`, as an absolute `lbrh.space` URL for the same reason document links are absolute.

Update the hex codes directly in `CLUBS` if a club rebrands — no other change needed.

## Own club first, others on demand

Each site shows its own club's document sequence by default (matching what that club's sailors actually need). Below the shared documents there's a collapsed **"Racing at another club? View their sailing instructions"** section — expanding it reveals the other two clubs' NOR annexure and Sailing Instructions, for members racing a passage or event hosted by a different club. Nothing needs configuring per site for this; `render()` always shows `CLUB_ORDER` minus whichever club is currently detected.

## Page structure

Top to bottom, `render()` builds:

1. **Hero** — club badge, "Every PPNYC race document, in one place." headline, one-line description naming the club.
2. **Document sequence** — PPNYC NOR → host NOR annexure → host Sailing Instructions, each step as a numbered card with a short description of what that document covers.
3. **Common documents** — a grid of the two other program-wide documents (race calendar, course book), same descriptive copy.
4. **Racing elsewhere** — collapsed by default; expands into the other two clubs' annexure/SI cards.
5. **Document status** — a line that counts how many of the five documents relevant to this club are still `#links-needed`, plus the `updatedAt` date from `documents.json`.

Descriptive copy for each document (the sentence under its title) lives in `COMMON_DESC` / `CLUB_DOC_DESC` near the top of `widget.js`, not in `documents.json` — it's fixed editorial copy, not per-club data.

## Preview / testing

Open [`demo.html`](demo.html) locally or on GitHub Pages to see all three club variants side by side and grab the exact embed snippet. It loads the real `widget.js` and `documents.json`, so it reflects production behaviour — not a mockup.

## Files

- `widget.js` — the embeddable widget. No dependencies, no build step.
- `documents.json` — the single source of truth for document links. Edit this to update all three club sites.
- `documents/` — the actual PDFs, at stable filenames. Overwrite in place to publish a new version.
- `logos/` — each club's crest, shown next to their own documents.
- `demo.html` — local preview harness with a club switcher.
