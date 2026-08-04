import { anchorOf, findMark } from './doc';
import type { Bounds, CourseDoc, Prim } from './types';

const INK = '#111111';
const LEG_W = 3;

/** Rough Helvetica advance widths (per 1000 units) — good enough to centre and to box labels. */
function charWidth(c: string): number {
  if (c >= '0' && c <= '9') return 556;
  if (c === ' ') return 278;
  if (c >= 'A' && c <= 'Z') return 667;
  if (c >= 'a' && c <= 'z') return 546;
  if ('.,:;\'!|'.includes(c)) return 278;
  return 500;
}

export function textWidth(text: string, size: number, bold = false): number {
  let w = 0;
  for (const c of text) w += charWidth(c);
  return (w / 1000) * size * (bold ? 1.06 : 1);
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function overlaps(a: Box, b: Box) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function arrowHead(x: number, y: number, angle: number, size: number, fill: string): Prim {
  const p = (ang: number, d: number): [number, number] => [
    x + Math.cos(ang) * d,
    y + Math.sin(ang) * d,
  ];
  return {
    k: 'poly',
    pts: [p(angle, size), p(angle + 2.5, size * 0.9), p(angle - 2.5, size * 0.9)],
    fill,
    close: true,
  };
}

/**
 * Compiles a document into an ordered primitive list.
 * Order is deliberate: legs → race lines → marks → wind → labels,
 * so course lines always sit beneath marks and labels above everything.
 */
export function buildScene(doc: CourseDoc): { prims: Prim[]; bounds: Bounds } {
  const under: Prim[] = [];
  const mid: Prim[] = [];
  const labels: Prim[] = [];
  const taken: Box[] = [];

  /* ── Course legs ─────────────────────────────────────────────── */
  for (let i = 0; i < doc.sequence.length - 1; i++) {
    const a = anchorOf(doc, doc.sequence[i].ref);
    const b = anchorOf(doc, doc.sequence[i + 1].ref);
    if (!a || !b) continue;

    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) continue;
    const ux = dx / len;
    const uy = dy / len;

    // Trim each end back to the edge of the mark so lines never run under a buoy.
    const startPad = a.r + 6;
    const endPad = b.r + 6;
    if (startPad + endPad >= len) continue;

    const x1 = a.x + ux * startPad;
    const y1 = a.y + uy * startPad;
    const x2 = b.x - ux * endPad;
    const y2 = b.y - uy * endPad;

    under.push({ k: 'line', x1, y1, x2, y2, stroke: INK, w: LEG_W, cap: 'round' });

    // Stagger the arrowhead along the leg. On a windward/leeward the beat and
    // run lie on top of each other, so a fixed position would stack them.
    const t = 0.42 + ((i % 3) * 0.13);
    const ang = Math.atan2(dy, dx);
    under.push(arrowHead(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, ang, 13, INK));
  }

  /* ── Gate rules ──────────────────────────────────────────────── */
  for (const g of doc.gates) {
    const p = findMark(doc, g.portId);
    const s = findMark(doc, g.stbdId);
    if (!p || !s) continue;
    under.push({
      k: 'line',
      x1: p.x,
      y1: p.y,
      x2: s.x,
      y2: s.y,
      stroke: '#8a8a8a',
      w: 1.5,
      dash: [7, 6],
    });
  }

  /* ── Start / finish lines ────────────────────────────────────── */
  for (const l of doc.lines) {
    mid.push({
      k: 'line',
      x1: l.x1,
      y1: l.y1,
      x2: l.x2,
      y2: l.y2,
      stroke: INK,
      w: 2.5,
      dash: l.kind === 'finish' ? [10, 7] : undefined,
    });

    const ang = Math.atan2(l.y2 - l.y1, l.x2 - l.x1);
    const ends: [number, number, typeof l.endA][] = [
      [l.x1, l.y1, l.endA],
      [l.x2, l.y2, l.endB],
    ];
    for (const [ex, ey, style] of ends) {
      if (style === 'pin') {
        mid.push({ k: 'circle', cx: ex, cy: ey, r: 8, fill: '#ffffff', stroke: INK, w: 2.5 });
      } else if (style === 'boat') {
        // Simple committee-boat hull, aligned across the line.
        const perp = ang + Math.PI / 2;
        const hw = 26;
        const hh = 11;
        const cx = Math.cos(ang);
        const cy = Math.sin(ang);
        const px = Math.cos(perp);
        const py = Math.sin(perp);
        const corner = (a: number, b: number): [number, number] => [
          ex + cx * a + px * b,
          ey + cy * a + py * b,
        ];
        mid.push({
          k: 'poly',
          pts: [
            corner(-hw * 0.75, -hh),
            corner(hw * 0.45, -hh),
            corner(hw * 0.75, 0),
            corner(hw * 0.45, hh),
            corner(-hw * 0.75, hh),
          ],
          fill: '#ffffff',
          stroke: INK,
          w: 2.5,
          close: true,
        });
      }
    }

    const lx = (l.x1 + l.x2) / 2;
    const ly = (l.y1 + l.y2) / 2;
    const tag = l.kind === 'start' ? 'START' : 'FINISH';
    const box: Box = { x: lx - textWidth(tag, 13, true) / 2, y: ly + 14, w: textWidth(tag, 13, true), h: 15 };
    taken.push(box);
    labels.push({ k: 'text', x: lx, y: ly + 26, text: tag, size: 13, fill: INK, anchor: 'middle', bold: true });
  }

  /* ── Marks ───────────────────────────────────────────────────── */
  for (const m of doc.marks) {
    // Offset marks get a light tether to their parent so the pairing reads.
    if (m.parentId) {
      const parent = findMark(doc, m.parentId);
      if (parent) {
        under.push({
          k: 'line',
          x1: parent.x,
          y1: parent.y,
          x2: m.x,
          y2: m.y,
          stroke: '#b9b9b9',
          w: 1.25,
          dash: [4, 5],
        });
      }
    }

    mid.push({ k: 'circle', cx: m.x, cy: m.y, r: m.size, fill: m.color, stroke: INK, w: 2.5 });
    taken.push({ x: m.x - m.size, y: m.y - m.size, w: m.size * 2, h: m.size * 2 });
  }

  /* ── Mark labels ─────────────────────────────────────────────── */
  for (const m of doc.marks) {
    const size = Math.max(12, m.size * 0.85);
    const w = textWidth(m.label, size, true);
    const fitsInside = w <= m.size * 1.5;

    if (fitsInside) {
      // Numbers sit inside the buoy, as on a real course diagram.
      const light = m.color === '#ffffff' || m.color === '#f2c230';
      labels.push({
        k: 'text',
        x: m.x,
        y: m.y + size * 0.35,
        text: m.label,
        size,
        fill: light ? INK : '#ffffff',
        anchor: 'middle',
        bold: true,
      });
      continue;
    }

    // Otherwise place it outside, trying 8 positions until one is clear.
    const d = m.size + 12;
    const cands: [number, number][] = [
      [0, -d],
      [d, 0],
      [0, d],
      [-d, 0],
      [d * 0.72, -d * 0.72],
      [d * 0.72, d * 0.72],
      [-d * 0.72, d * 0.72],
      [-d * 0.72, -d * 0.72],
    ];
    let placed = false;
    for (const [ox, oy] of cands) {
      const bx = m.x + ox - w / 2;
      const by = m.y + oy - size * 0.6;
      const box: Box = { x: bx, y: by, w, h: size * 1.2 };
      if (taken.some((t) => overlaps(box, t))) continue;
      taken.push(box);
      labels.push({
        k: 'text',
        x: m.x + ox,
        y: m.y + oy + size * 0.35,
        text: m.label,
        size,
        fill: INK,
        anchor: 'middle',
        bold: true,
      });
      placed = true;
      break;
    }
    if (!placed) {
      // Every candidate was crowded — fall back to directly above.
      labels.push({
        k: 'text',
        x: m.x,
        y: m.y - d,
        text: m.label,
        size,
        fill: INK,
        anchor: 'middle',
        bold: true,
      });
    }
  }

  /* ── Wind arrows ─────────────────────────────────────────────── */
  for (const w of doc.winds) {
    // angle 0 = wind blowing down the page, i.e. windward mark at the top.
    const rad = ((w.angle + 90) * Math.PI) / 180;
    const ex = w.x + Math.cos(rad) * w.length;
    const ey = w.y + Math.sin(rad) * w.length;
    mid.push({ k: 'line', x1: w.x, y1: w.y, x2: ex, y2: ey, stroke: INK, w: 3, cap: 'round' });
    mid.push(arrowHead(ex, ey, rad, 16, INK));
    if (w.label.trim()) {
      labels.push({
        k: 'text',
        x: w.x,
        y: w.y - 10,
        text: w.label,
        size: 14,
        fill: INK,
        anchor: 'middle',
        bold: true,
      });
    }
  }

  /* ── Free text ───────────────────────────────────────────────── */
  for (const n of doc.notes) {
    const lines = n.text.split('\n');
    lines.forEach((ln, i) => {
      labels.push({
        k: 'text',
        x: n.x,
        y: n.y + i * n.size * 1.35,
        text: ln,
        size: n.size,
        fill: n.color,
        anchor: 'start',
      });
    });
  }

  const prims = roundPrims([...under, ...mid, ...labels]);
  return { prims, bounds: boundsOf(prims) };
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Canonicalises every coordinate to 3dp.
 *
 * Trig on the server and in the browser can disagree in the last bits of a
 * double, which is enough for React to report a hydration mismatch and throw
 * the client tree away. Rounding here also keeps the screen, SVG, PNG and PDF
 * outputs byte-consistent with each other.
 */
function roundPrims(prims: Prim[]): Prim[] {
  return prims.map((p): Prim => {
    switch (p.k) {
      case 'line':
        return { ...p, x1: r3(p.x1), y1: r3(p.y1), x2: r3(p.x2), y2: r3(p.y2) };
      case 'circle':
        return { ...p, cx: r3(p.cx), cy: r3(p.cy), r: r3(p.r) };
      case 'poly':
        return { ...p, pts: p.pts.map(([x, y]) => [r3(x), r3(y)] as [number, number]) };
      case 'rect':
        return { ...p, x: r3(p.x), y: r3(p.y), w: r3(p.w), h: r3(p.h) };
      case 'text':
        return { ...p, x: r3(p.x), y: r3(p.y), size: r3(p.size) };
    }
  });
}

export function boundsOf(prims: Prim[]): Bounds {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const hit = (x: number, y: number) => {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  };

  for (const p of prims) {
    switch (p.k) {
      case 'line':
        hit(p.x1, p.y1);
        hit(p.x2, p.y2);
        break;
      case 'circle':
        hit(p.cx - p.r, p.cy - p.r);
        hit(p.cx + p.r, p.cy + p.r);
        break;
      case 'poly':
        for (const [x, y] of p.pts) hit(x, y);
        break;
      case 'rect':
        hit(p.x, p.y);
        hit(p.x + p.w, p.y + p.h);
        break;
      case 'text': {
        const w = textWidth(p.text, p.size, p.bold);
        const x0 = p.anchor === 'middle' ? p.x - w / 2 : p.anchor === 'end' ? p.x - w : p.x;
        hit(x0, p.y - p.size);
        hit(x0 + w, p.y + p.size * 0.3);
        break;
      }
    }
  }

  if (!Number.isFinite(minX)) return { minX: 0, minY: 0, maxX: 800, maxY: 600 };
  return { minX, minY, maxX, maxY };
}
