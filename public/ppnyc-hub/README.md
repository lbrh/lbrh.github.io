# PPNYC Document Hub widget

A self-hosted, vanilla-JS widget that replaces the [PPNYC document hub prototype](https://ppnyc-document-hub.owen-church64.chatgpt.site/#links-needed). One file (`widget.js`) is embedded on all three club sites — RMYS, RYCV, and HBYC — and detects which club's domain it's running on to show the right branding and documents.

It renders as a full-width page section (hero, document-sequence walkthrough, common-documents grid, other-club expander, last-updated note) with the same descriptive copy and section structure as the original prototype — not a small sidebar card. Point a club's "Race Documents" page at the embed snippet below and it fills the page.

> **Not a developer?** See [HOWTO.md](HOWTO.md) instead — plain-language steps for updating a document or adding the hub to a club website. This file is the technical reference.

## Embed on a club site

Paste this wherever the hub should appear (WordPress custom HTML block, GoDaddy HTML widget, Squarespace code block, etc.):

```html
<div id="ppnyc-document-hub"></div>
<script src="https://lbrh.space/ppnyc-hub/widget.js" defer></script>
```

**Always use `lbrh.space`, never `lbrh.github.io`.** `lbrh.github.io` is this site's raw GitHub Pages address; `lbrh.space` is the custom domain it's actually served under, and `lbrh.github.io` 301-redirects to it. That redirect response has no CORS header, so a foreign-origin page (any real club site) that fetches something through it — the fallback documents, the club logos — gets blocked by CORS. Loading `widget.js` itself still works either way (the browser follows the redirect for a plain script load), so this kind of bug only shows up in the data/images, which is what makes it easy to miss.

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

Nobody needs to touch this repo to update a document. A trusted staff member fills out a Google Form — picks which of the 9 documents from a dropdown, uploads the replacement PDF — and the live link updates within seconds. No GitHub, no git push, no code.

The pipeline behind that (all in [`../../cloudflare/`](../../cloudflare/), alongside the existing `bom-worker.js`):

1. **Google Form + Sheet** — the form's file-upload question saves the PDF to Drive and logs the submission (which document, a link to the file) as a row in a response sheet.
2. **`apps-script-on-form-submit.js`** — an Apps Script trigger bound to that sheet fires the instant a response comes in and POSTs it straight to the worker below. Push, not poll, so updates land in seconds.
3. **`ppnyc-docs-worker.js`** — a Cloudflare Worker (`DOCS_API_URL` in `widget.js`) that receives that webhook, stores which Drive file now backs each of the 9 slots, and serves `/documents.json` in the same `{ updatedAt, common, clubs }` shape the widget has always expected. It also serves each document at a stable `/documents/<slug>.pdf` URL that proxies the current Drive file — so the public link never changes even though the file behind it does. A slot nobody's ever submitted through the form just keeps pointing at the static fallback file below.

`widget.js` fetches `DOCS_API_URL` with `cache: 'no-store'` — no browser/CDN caching to wait out. If that worker is ever unreachable, the widget falls back to [`documents/`](documents/), the PDFs committed straight into this repo at stable filenames (`rmys-sailing-instructions.pdf`, not a versioned name like `RMYS-SIs-2025-2026 V 3.pdf`). Overwriting one of those files and pushing is still a valid way to update a document manually — the form pipeline is the no-GitHub path, not the only path.

See the setup instructions and full architecture notes in the header comments of `ppnyc-docs-worker.js` and `apps-script-on-form-submit.js`.

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

1. **Hero** — "Every PPNYC race document, in one place." headline, one-line description naming the club.
2. **Document sequence** — PPNYC NOR → host NOR annexure → host Sailing Instructions, each step as a numbered card with a short description of what that document covers.
3. **Common documents** — a grid of the two other program-wide documents (race calendar, course book), same descriptive copy.
4. **Racing elsewhere** — collapsed by default; expands into the other two clubs' annexure/SI cards.
5. **Last updated** — the `updatedAt` date from the live data source.

Descriptive copy for each document (the sentence under its title) lives in `COMMON_DESC` / `CLUB_DOC_DESC` near the top of `widget.js` — it's fixed editorial copy, not data that comes from the form or the worker.

## Preview / testing

Open [`demo.html`](demo.html) locally or on GitHub Pages to see all three club variants side by side and grab the exact embed snippet. It loads the real `widget.js`, so it reflects production behaviour — not a mockup.

## Files

- `HOWTO.md` — plain-language instructions for club staff/website admins. Link this to non-technical people, not this file.
- `widget.js` — the embeddable widget. No dependencies, no build step. Fetches live document data from `DOCS_API_URL` (the Cloudflare Worker); falls back to `documents/` if that's unreachable.
- `documents.json` — a static snapshot of the same shape the worker serves, kept for reference/history. Not read by the widget directly.
- `documents/` — the actual PDFs, at stable filenames, used as the offline fallback. Overwrite in place and push to update a document manually, bypassing the form.
- `logos/` — each club's crest, shown next to their own documents.
- `demo.html` — local preview harness with a club switcher.
