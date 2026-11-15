/**
 * Builds the vector PDF page(s) for a Notice to Competitors in the RYCV
 * house format: bordered page, club crest top-left, race signal flag(s)
 * top-right, centred title block, left-aligned body, a bold "Rationale:"
 * section and a name / role / date-time signature. Kept out of the
 * component so notices can be generated and checked without a browser.
 */
import { FLAG_BY_ID, flagOutline, type FlagId } from "./raceFlags";
import type { NoticeType, NoticeVariant } from "./noticeTypes";
import { wrapText, type PdfPrim } from "./pdfWriter";

export const PAGE_W = 595;
export const PAGE_H = 842;
export const CREST_URL = "/rycv-crest.jpg";
export const CREST_ID = "Crest";

// The page border, and the content area inside it.
export const BORDER = { x: 50, y: 60, w: 495, h: 722 };
const PAD = 28;
export const LEFT = BORDER.x + PAD;
export const BODY_W = BORDER.w - PAD * 2;
const BOTTOM = BORDER.y + BORDER.h;
const BODY_SIZE = 11;
const LINE_H = 15;

export interface NoticeForm {
  eventName: string;
  noticeNumber: string;
  postedDate: string;
  postedTime: string;
  classesAffected: string;
  typeId: string;
  variantId: string;
  extra: Record<string, string>;
  body: string;
  rationale: string;
  officerName: string;
  officerRole: string;
}

export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "2026-07-29" -> "29 July 2026". Falls back to the raw text if it isn't ISO. */
export function longDate(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

/** "17:00 9 October 2026", or just the date when no time is set. */
export function signoffStamp(form: NoticeForm) {
  return [form.postedTime, longDate(form.postedDate)].filter(Boolean).join(" ");
}

/** Heading above the body; a plain general notice needs none. */
export function typeHeading(type: NoticeType) {
  return type.id === "general-notice" ? "" : type.title;
}

/** "Applies to" line, only when the notice isn't for everyone. */
export function appliesTo(form: NoticeForm) {
  const c = form.classesAffected.trim();
  return c && !/^all$/i.test(c) ? `Applies to: ${c}` : "";
}

export function safeFilePart(s: string) {
  return s.trim().replace(/[\\/:*?"<>|]+/g, "-");
}

export function filenameFor(form: NoticeForm) {
  return `NTC#${safeFilePart(form.noticeNumber) || "0"} - ${form.postedDate} - ${safeFilePart(form.eventName) || "notice"}.pdf`;
}

// Flags stack down the top-right corner, small, like the Word template.
function flagPrims(ids: FlagId[], rightX: number, topY: number): PdfPrim[] {
  const prims: PdfPrim[] = [];
  const flagH = 40;
  const gap = 4;
  let y = topY;
  for (const id of ids) {
    const def = FLAG_BY_ID[id];
    const w = (flagH * def.width) / 100;
    const x = rightX - w;
    const sx = w / def.width;
    const sy = flagH / 100;
    for (const layer of def.layers) {
      if (layer.k === "rect") {
        prims.push({
          k: "rect",
          x: x + layer.x * sx,
          y: y + layer.y * sy,
          w: layer.w * sx,
          h: layer.h * sy,
          fill: layer.fill,
        });
      } else if (layer.k === "circle") {
        prims.push({
          k: "circle",
          cx: x + layer.cx * sx,
          cy: y + layer.cy * sy,
          r: layer.r * Math.min(sx, sy),
          fill: layer.fill,
        });
      } else {
        prims.push({
          k: "poly",
          pts: layer.pts.map(
            ([px, py]) => [x + px * sx, y + py * sy] as [number, number],
          ),
          fill: layer.fill,
        });
      }
    }
    prims.push({
      k: "poly",
      pts: flagOutline(def).map(
        ([px, py]) => [x + px * sx, y + py * sy] as [number, number],
      ),
      stroke: "#00000033",
      sw: 0.75,
    });
    y += flagH + gap;
  }
  return prims;
}

function frame(): PdfPrim {
  return {
    k: "rect",
    x: BORDER.x,
    y: BORDER.y,
    w: BORDER.w,
    h: BORDER.h,
    stroke: "#000000",
    sw: 1,
  };
}

export function buildNoticePdfPages(
  form: NoticeForm,
  type: NoticeType,
  variant: NoticeVariant,
  hasCrest = true,
): PdfPrim[][] {
  const flagIds = variant.flags(form.extra);
  const pages: PdfPrim[][] = [];
  let page: PdfPrim[] = [frame()];
  const center = BORDER.x + BORDER.w / 2;
  const ink = "#1a1a1a";

  // Header block: crest left, title centred, flags right.
  if (hasCrest) {
    page.push({
      k: "image",
      id: CREST_ID,
      x: LEFT - 8,
      y: BORDER.y + 14,
      w: 60,
      h: 84,
    });
  }
  page.push(
    ...flagPrims(flagIds, BORDER.x + BORDER.w - PAD + 8, BORDER.y + 16),
  );
  let y = BORDER.y + 50;
  page.push({
    k: "text",
    x: center,
    y,
    text: "Notice to Competitors",
    size: 24,
    fill: ink,
    anchor: "middle",
    bold: true,
  });
  y += 26;
  if (form.eventName.trim()) {
    page.push({
      k: "text",
      x: center,
      y,
      text: form.eventName.trim(),
      size: 15,
      fill: ink,
      anchor: "middle",
      bold: true,
    });
    y += 22;
  }
  page.push({
    k: "text",
    x: center,
    y,
    text: longDate(form.postedDate),
    size: 15,
    fill: ink,
    anchor: "middle",
    bold: true,
  });
  y = Math.max(y + 50, BORDER.y + 150);

  const newPage = () => {
    pages.push(page);
    page = [frame()];
    y = BORDER.y + 36;
    page.push({
      k: "text",
      x: LEFT,
      y,
      text: "Notice to Competitors (continued)",
      size: 10,
      fill: "#666666",
      italic: true,
    });
    y += 28;
  };

  const block = (text: string, bold = false) => {
    for (const line of wrapText(text, BODY_W, BODY_SIZE, bold)) {
      if (y > BOTTOM - 40) newPage();
      if (line)
        page.push({
          k: "text",
          x: LEFT,
          y,
          text: line,
          size: BODY_SIZE,
          fill: ink,
          bold,
        });
      y += LINE_H;
    }
    y += 10;
  };

  const heading = typeHeading(type);
  if (heading) block(heading, true);
  const applies = appliesTo(form);
  if (applies) block(applies);
  if (form.body.trim()) block(form.body);
  if (form.rationale.trim()) {
    block("Rationale:", true);
    block(form.rationale);
  }

  // Signature block: pinned toward the bottom of the last page.
  const sigY = Math.max(y + 24, BOTTOM - 70);
  if (sigY + 2 * LINE_H > BOTTOM - 12) newPage();
  const sy = Math.max(y + 24, BOTTOM - 70);
  page.push({
    k: "text",
    x: LEFT,
    y: sy,
    text: form.officerName || "[race officer]",
    size: BODY_SIZE,
    fill: ink,
  });
  page.push({
    k: "text",
    x: LEFT,
    y: sy + LINE_H,
    text: form.officerRole || "Race Officer",
    size: BODY_SIZE,
    fill: ink,
    italic: true,
  });
  page.push({
    k: "text",
    x: LEFT,
    y: sy + 2 * LINE_H,
    text: signoffStamp(form),
    size: BODY_SIZE,
    fill: ink,
    italic: true,
  });

  pages.push(page);
  return pages;
}
