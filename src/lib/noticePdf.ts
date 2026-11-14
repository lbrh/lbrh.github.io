/**
 * Builds the vector PDF page(s) for a Notice to Competitors. Kept out of
 * the component so sample notices can be generated and checked from the
 * command line (see noticePdf.sampleScript.ts) without a browser.
 */
import {
  FLAG_BY_ID,
  flagDescription,
  flagOutline,
  type FlagId,
} from "./raceFlags";
import type { NoticeType, NoticeVariant } from "./noticeTypes";
import { wrapText, type PdfPrim } from "./pdfWriter";

export const PAGE_W = 595;
export const PAGE_H = 842;
export const MARGIN = 50;
export const BODY_W = PAGE_W - MARGIN * 2;

export interface NoticeForm {
  eventName: string;
  club: string;
  noticeNumber: string;
  postedDate: string;
  postedTime: string;
  classesAffected: string;
  typeId: string;
  variantId: string;
  extra: Record<string, string>;
  body: string;
  officerName: string;
  officerRole: string;
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function safeFilePart(s: string) {
  return s.trim().replace(/[\\/:*?"<>|]+/g, "-");
}

export function filenameFor(form: NoticeForm) {
  return `NTC-${safeFilePart(form.noticeNumber) || "0"}-${safeFilePart(form.eventName) || "notice"}-${form.postedDate}.pdf`;
}

// ponytail: one straightforward top-to-bottom layout, no generic page
// engine — the live HTML preview is plain CSS and intentionally doesn't
// share code with this, since the two have little in common beyond content.
function flagPrims(
  ids: FlagId[],
  centerX: number,
  topY: number,
): { prims: PdfPrim[]; bottomY: number } {
  const prims: PdfPrim[] = [];
  let y = topY;
  const flagH = 70;
  const gap = 6;
  for (const id of ids) {
    const def = FLAG_BY_ID[id];
    const w = (flagH * def.width) / 100;
    const x = centerX - w / 2;
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
      sw: 1,
    });
    y += flagH + gap;
  }
  return { prims, bottomY: y };
}

export function buildNoticePdfPages(
  form: NoticeForm,
  type: NoticeType,
  variant: NoticeVariant,
): PdfPrim[][] {
  const flagIds = variant.flags(form.extra);
  const pages: PdfPrim[][] = [];
  let page: PdfPrim[] = [];
  let y = MARGIN;

  const text = (
    t: string,
    size: number,
    opts: Partial<Extract<PdfPrim, { k: "text" }>> = {},
  ) => {
    page.push({
      k: "text",
      x: MARGIN,
      y,
      text: t,
      size,
      fill: "#1a1a1a",
      ...opts,
    });
  };

  text("NOTICE TO COMPETITORS", 18, {
    x: PAGE_W / 2,
    anchor: "middle",
    bold: true,
  });
  y += 24;
  page.push({
    k: "line",
    x1: MARGIN,
    y1: y,
    x2: PAGE_W - MARGIN,
    y2: y,
    stroke: "#1a1a1a",
    w: 1,
  });
  y += 20;

  text(form.eventName || "[event name]", 13, { bold: true });
  page.push({
    k: "text",
    x: PAGE_W - MARGIN,
    y,
    text: `Notice No. ${form.noticeNumber || "-"}`,
    size: 11,
    fill: "#1a1a1a",
    anchor: "end",
  });
  y += 16;
  text(form.club || "[club]", 11);
  page.push({
    k: "text",
    x: PAGE_W - MARGIN,
    y,
    text: `Posted: ${form.postedDate} ${form.postedTime}`,
    size: 10,
    fill: "#444444",
    anchor: "end",
  });
  y += 16;
  text(`Race / class affected: ${form.classesAffected || "All"}`, 10, {
    fill: "#444444",
  });
  y += 20;
  page.push({
    k: "line",
    x1: MARGIN,
    y1: y,
    x2: PAGE_W - MARGIN,
    y2: y,
    stroke: "#cccccc",
    w: 1,
  });
  y += 24;

  const flags = flagPrims(flagIds, PAGE_W / 2, y);
  page.push(...flags.prims);
  y = flags.bottomY + 18;

  page.push({
    k: "text",
    x: PAGE_W / 2,
    y,
    text: flagIds.map((id) => FLAG_BY_ID[id].name).join(" over "),
    size: 15,
    fill: "#1a1a1a",
    anchor: "middle",
    bold: true,
  });
  y += 16;
  page.push({
    k: "text",
    x: PAGE_W / 2,
    y,
    text: flagDescription(flagIds),
    size: 9,
    fill: "#666666",
    anchor: "middle",
  });
  y += 28;

  page.push({
    k: "text",
    x: MARGIN,
    y,
    text: type.title.toUpperCase(),
    size: 12,
    fill: "#1a1a1a",
    bold: true,
  });
  y += 18;

  const bodyLines = wrapText(form.body, BODY_W, 11);
  for (const line of bodyLines) {
    if (y > PAGE_H - 110) {
      pages.push(page);
      page = [];
      y = MARGIN;
      page.push({
        k: "text",
        x: MARGIN,
        y,
        text: `${type.title} (continued)`,
        size: 10,
        fill: "#666666",
      });
      y += 20;
    }
    page.push({
      k: "text",
      x: MARGIN,
      y,
      text: line,
      size: 11,
      fill: "#1a1a1a",
    });
    y += 15;
  }

  // Footer, pinned near the bottom of whichever page the body ended on.
  const footerY = Math.max(y + 30, PAGE_H - 95);
  page.push({
    k: "line",
    x1: MARGIN,
    y1: footerY,
    x2: PAGE_W - MARGIN,
    y2: footerY,
    stroke: "#cccccc",
    w: 1,
  });
  page.push({
    k: "text",
    x: MARGIN,
    y: footerY + 18,
    text: `Issued by ${form.officerName || "[race officer]"}, ${form.officerRole || "Race Officer"}`,
    size: 10,
    fill: "#1a1a1a",
  });
  page.push({
    k: "text",
    x: MARGIN,
    y: footerY + 36,
    text: "Reference only. The race committee is responsible for the content of this notice and for posting it in accordance with the sailing instructions.",
    size: 8,
    fill: "#888888",
  });

  pages.push(page);
  return pages;
}
