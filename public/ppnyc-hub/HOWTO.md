# PPNYC Document Hub — How To

This page is for club staff and website admins — no technical knowledge needed. If you're a developer looking for how the whole thing is built, see [README.md](README.md) instead.

There are two separate jobs covered here:

1. **Updating a document** (NOR, Sailing Instructions, etc.) — for whoever manages race documents.
2. **Adding the hub to a club website** — for whoever manages the RMYS / RYCV / HBYC website.

You probably only need one of these, not both.

---

## 1. Updating a document

Every race document on the hub — the shared documents and each club's own — is updated the same way: through one Google Form. You don't need a website login, GitHub, or anything technical.

**Form link:** *[PASTE THE GOOGLE FORM LINK HERE — replace this line once the form exists]*

### Steps

1. Open the form link above.
2. Under **"Which document?"**, choose the one you're replacing from the dropdown. Pick carefully — this decides which link on the website gets replaced. The 9 options are:
   - PPNYC Notice of Race
   - Combined Race Calendar
   - Combined Course Book
   - RMYS NOR Annexure
   - RMYS Standard & Supplementary Sailing Instructions
   - RYCV NOR Annexure
   - RYCV Standard & Supplementary Sailing Instructions
   - HBYC NOR Annexure
   - HBYC Standard & Supplementary Sailing Instructions
3. Under **"Upload the PDF"**, attach the new file. It must be a PDF.
4. Click **Submit**.

That's it. The website updates itself — **within about a minute**, the new document is live on all three clubs' sites (or the relevant one, for a club-specific document like an annexure). You don't need to tell anyone or do anything else.

### How to check it worked

- Open the club's website, find the document hub section, and click the document you just updated — it should open your new PDF.
- If you're not sure it updated, wait a minute and refresh the page (the site sometimes keeps yesterday's version cached for a few seconds).

### If something looks wrong

- **The old document is still showing after a few minutes** — double check you picked the right option in the "Which document?" dropdown. It's easy to pick a similar-sounding option by mistake (e.g. RMYS annexure vs. RMYS Sailing Instructions).
- **You uploaded the wrong file** — just submit the form again with the correct one; the newest submission always wins.
- **Nothing seems to work at all** — contact Liam (this hub's maintainer). Don't try to fix it yourself through the website — there's nothing to fix there; the issue would be in the form pipeline behind it.

### Who to ask about *content* (not the website)

If you're unsure which document needs updating or who's responsible for a given one, the sailing administrators are:

| Club | Contact |
|---|---|
| RMYS | Ann Rogers — boating@rmys.com.au |
| RYCV | Owen Church — sailing@rycv.asn.au |
| HBYC | Stephen Cheney — racing@hbyc.org.au |

---

## 2. Adding the hub to a club website

This is a one-time setup per club site — once it's added, updating documents (Part 1 above) never requires touching the website again.

### The snippet

Paste this exactly, with nothing changed, wherever the document hub should appear on the page:

```html
<div id="ppnyc-document-hub"></div>
<script src="https://lbrh.space/ppnyc-hub/widget.js" defer></script>
```

It automatically works out which club's site it's on and shows the right branding, colours, and documents — there's nothing to configure per club.

### Where to paste it, by platform

- **WordPress**: edit the page, add a "Custom HTML" block (search for "HTML" when adding a new block), and paste the snippet into it.
- **GoDaddy Website Builder**: add an "Embed" or "HTML" section/widget to the page, and paste the snippet into it.
- **Squarespace**: add a "Code" block to the page, and paste the snippet into it.

If your platform isn't listed, look for a block/widget called "Custom HTML", "Embed", or "Code" — every major website builder has one.

### How to check it worked

After publishing the page, it should show a full-width section with a red/navy/dark-blue header (matching that club's colours), a "Every PPNYC race document, in one place" heading, and a list of that club's documents below it.

If it instead shows nothing, or a small box asking you to "Select your club" — that means the site's web address wasn't recognised. Contact Liam; this needs a small code change (adding the domain to the widget), not anything fixable from the website editor.

### Important: don't edit the snippet

- Don't change the web address in it — it must be exactly `lbrh.space`, not any other address, or it will silently stop showing documents.
- Don't add anything else inside the `<div id="ppnyc-document-hub">...</div>` — leave it empty, exactly as shown above.

---

## Who maintains this

Liam Robinson-Hounsell built and hosts this hub. For anything not covered above — the site showing wrong information, a club's branding needing to change, or a new club joining PPNYC — contact him directly rather than guessing at a fix.
