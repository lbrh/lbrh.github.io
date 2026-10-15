# RYCV Racing Calendar widget

A racing calendar for the RYCV WordPress site that reads the club's public Google Calendars (OTB and Keelboat) live. It replaces the Teamup iframe on `/sailing/racing-calendar/`.

## Embed

Add a **Custom HTML** block to the WordPress page:

```html
<div id="rycv-racing-calendar"></div>
<script src="https://lbrh.space/rycv-calendar/widget.js" defer></script>
```

Optional attributes (on the div or the script tag):

| Attribute | Meaning |
| --- | --- |
| `data-api` | URL of the deployed Worker's `/events.json`. Overrides `DEFAULT_API` in `widget.js`. |
| `data-theme` | `light` (default), `dark` or `auto`. |

Styles live in a shadow root, so the WordPress theme can't change the widget's look.

## How it works

```
Google Calendars (public)  ->  Cloudflare Worker  ->  widget.js in the browser
 OTB + Keelboat                cloudflare/rycv-        merges with curated data,
                               calendar-worker.js      adds filters
```

- Google's `.ics` feeds don't allow browsers to read them directly (no CORS), so the Worker fetches and parses them and serves `events.json`. It caches for 5 minutes. No API key or secrets are needed.
- `widget.js` tags each event with divisions. Events found in the 2026/27 race documents (matched by date and name) get **Confirmed** tags and their notes from the curated data inside `widget.js`. Other events are tagged from keywords in the name (**Inferred from name**).
- Warning signal times come from a `Warning Signal: 10:55` line in the Google event description. Other lines in the description show as the event note.
- If the Worker can't be reached, the widget shows the curated snapshot of the 4 Sep 2026 calendar and says so.

## Going live

1. Deploy `cloudflare/rycv-calendar-worker.js` (Cloudflare dashboard: Workers & Pages -> Create Worker -> paste -> Deploy).
2. Set `DEFAULT_API` near the top of `widget.js` to the Worker URL plus `/events.json`, or use `data-api`. Until then the widget shows the curated snapshot.
3. Push to `main` so GitHub Pages publishes `widget.js`.
4. On the WordPress page, replace the Teamup iframe with the embed above.

## Day-to-day

- Add or change events in the Google Calendars. The website updates within about 5 minutes.
- Put `Warning Signal: HH:MM` (or `TBC`) on its own line in the event description.
- To add a calendar, add its ID to `CALENDARS` in the Worker.

## Known limits

- Recurring Google events (`RRULE`) are not expanded. All current recurring series ended before this season. Add new events individually.
- The curated data (division tags, "Confirmed" labels, the "calendar differs from the notice of race" note) is a snapshot from 4 Sep 2026. Update `CURATED_*` in `widget.js` when new race documents are issued.

`demo.html` shows the widget on a blank page.
