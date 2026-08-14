import { anchorOf, findMark } from './doc';
import type { Bounds, CourseDoc, Prim } from './types';

const INK = '#111111';
const LEG_BLUE = '#1a56a8';
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

/** Fat, outlined "block" arrow — shaft plus a wide triangular head — for the wind indicator. */
function blockArrow(
  x: number,
  y: number,
  angle: number,
  length: number,
  shaftHw = length * 0.16,
  headHw = length * 0.3,
): Prim {
  const headLen = length * 0.42;
  const shaftLen = length - headLen;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const px = Math.cos(angle + Math.PI / 2);
  const py = Math.sin(angle + Math.PI / 2);
  const at = (t: number, s: number): [number, number] => [x + dx * t + px * s, y + dy * t + py * s];
  return {
    k: 'poly',
    pts: [
      at(0, -shaftHw),
      at(0, shaftHw),
      at(shaftLen, shaftHw),
      at(shaftLen, headHw),
      at(length, 0),
      at(shaftLen, -headHw),
      at(shaftLen, -shaftHw),
    ],
    fill: '#ffffff',
    stroke: INK,
    w: 2.5,
    close: true,
  };
}

/** Samples an arc of radius r starting at aStart and sweeping by `sweep` radians (signed — negative goes the other way). */
function sweepArc(cx: number, cy: number, r: number, aStart: number, sweep: number, stroke: string, w: number): Prim {
  const steps = Math.max(2, Math.round(Math.abs(sweep) / (Math.PI / 10)));
  const pts: [number, number][] = [];
  for (let s = 0; s <= steps; s++) {
    const a = aStart + (sweep * s) / steps;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return { k: 'poly', pts, stroke, w, close: false };
}

/** Short way round from a1 to a2 on a circle of radius r, as a sampled polyline. */
function arcPrim(cx: number, cy: number, r: number, a1: number, a2: number, stroke: string, w: number): Prim {
  let delta = a2 - a1;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  while (delta < -Math.PI) delta += 2 * Math.PI;
  return sweepArc(cx, cy, r, a1, delta, stroke, w);
}

/**
 * Splits a "come back the way you went" rounding into an entry angle and an
 * exit angle either side of `backAngle` (the direction the boat arrived
 * from), biased toward `towardAngle` — the side the loop should bulge out
 * on — plus the signed sweep that gets from one to the other the long way
 * round (through `towardAngle`), since the short way collapses into the
 * approach line itself instead of going round the mark.
 */
function roundingSplay(backAngle: number, towardAngle: number, halfGap: number) {
  let diff = towardAngle - backAngle;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  const sign = diff >= 0 ? 1 : -1;
  const entryAngle = backAngle - sign * halfGap;
  const exitAngle = backAngle + sign * halfGap;
  const sweep = -sign * (Math.PI * 2 - halfGap * 2);
  return { entryAngle, exitAngle, sweep };
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
  // Course diagrams don't trace the whole leg — just a short arrow near
  // each mark showing where the boat came from and where it's headed, with
  // the space between left blank. Direction of each leg is computed up
  // front so a leg can check whether its neighbour on either end doubles
  // straight back on it (e.g. the beat and run of a windward/leeward course
  // share a bearing), which needs special rounding treatment below.
  const anchors = doc.sequence.map((s) => anchorOf(doc, s.ref));
  const legDirs: ({ ux: number; uy: number } | null)[] = [];
  const ANGLE_STEP = Math.PI / 4;
  for (let i = 0; i < doc.sequence.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    if (!a || !b) {
      legDirs.push(null);
      continue;
    }
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) {
      legDirs.push(null);
      continue;
    }
    // Snap to the nearest 45° — a windward mark a few degrees off dead
    // ahead should still read as a straight beat, and a mark stays looking
    // square-on right up until it's decisively enough off to one side to
    // earn a genuine 45° notch, rather than drawing every tiny wobble in
    // mark placement as its own slightly-off angle.
    const snapped = Math.round(Math.atan2(dy, dx) / ANGLE_STEP) * ANGLE_STEP;
    legDirs.push({ ux: Math.cos(snapped), uy: Math.sin(snapped) });
  }
  const REVERSAL_DOT = -0.9;
  const ROUNDING_HALF_GAP = 0.8; // ~46°: how close a splayed entry/exit sit either side of the approach line

  // Which side marks are left on when a straight beat/run leaves the
  // rounding direction otherwise ambiguous (see isMarkReversal below).
  const port = doc.settings.roundingDirection !== 'starboard';

  // A gate that a boat rounds and doubles back through (the common leeward
  // gate case) gets its own two-mark rendering below instead of the generic
  // single-arc rounding, so mark it here to skip in the loops that follow.
  const isGateReversal = doc.sequence.map((s, idx) => {
    if (s.ref.type !== 'gate') return false;
    const inD = legDirs[idx - 1];
    const outD = legDirs[idx];
    return !!inD && !!outD && inD.ux * outD.ux + inD.uy * outD.uy < REVERSAL_DOT;
  });
  // Any other waypoint where the incoming and outgoing legs double back on
  // each other — a windward or leeward mark on a straight beat/run being
  // the classic case — is just as ambiguous as a gate reversal, but rounds
  // a single mark rather than choosing between two, so which side it loops
  // round is decided by the rounding-direction setting instead.
  const isMarkReversal = doc.sequence.map((s, idx) => {
    if (s.ref.type === 'gate') return false;
    const inD = legDirs[idx - 1];
    const outD = legDirs[idx];
    return !!inD && !!outD && inD.ux * outD.ux + inD.uy * outD.uy < REVERSAL_DOT;
  });

  interface MarkGeom {
    entryX: number;
    entryY: number;
    exitX: number;
    exitY: number;
    entryAngle: number;
    sweep: number;
    pad: number;
  }
  // Rounding geometry for each mark-reversal waypoint, precomputed once so
  // both the leg loop (which needs the entry/exit points to touch down at)
  // and the rounding loop (which needs the angle and sweep) can use it.
  const markGeom: (MarkGeom | null)[] = doc.sequence.map((s, idx) => {
    if (!isMarkReversal[idx]) return null;
    const center = anchors[idx];
    const inDir = legDirs[idx - 1];
    if (!center || !inDir) return null;
    const pad = center.r + 6;
    const backAngle = Math.atan2(-inDir.uy, -inDir.ux);
    // Leaving a mark to port means it stays on the boat's left as it's
    // rounded — an anti-clockwise turn. Starboard is the mirror, clockwise.
    const bulge = port ? { x: inDir.uy, y: -inDir.ux } : { x: -inDir.uy, y: inDir.ux };
    const bulgeAngle = Math.atan2(bulge.y, bulge.x);
    const { entryAngle, exitAngle, sweep } = roundingSplay(backAngle, bulgeAngle, ROUNDING_HALF_GAP);
    return {
      entryX: center.x + Math.cos(entryAngle) * pad,
      entryY: center.y + Math.sin(entryAngle) * pad,
      exitX: center.x + Math.cos(exitAngle) * pad,
      exitY: center.y + Math.sin(exitAngle) * pad,
      entryAngle,
      sweep,
      pad,
    };
  });

  const STUB = 28;

  // Touch points on either side of a waypoint (null where the leg was
  // skipped) — the plain pad edge for a normal rounding, or the splayed
  // entry/exit point above for a reversal — kept so the rounding pass below
  // can arc between them and a gate's fan-out can find its approach point.
  const legTrim: ({ x1: number; y1: number; x2: number; y2: number } | null)[] = [];
  for (let i = 0; i < doc.sequence.length - 1; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    const dir = legDirs[i];
    if (!a || !b || !dir) {
      legTrim.push(null);
      continue;
    }
    const { ux, uy } = dir;
    const ang = Math.atan2(uy, ux);

    const startPad = a.r + 6;
    const endPad = b.r + 6;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (startPad + endPad >= len) {
      legTrim.push(null);
      continue;
    }

    const exitGeom = markGeom[i];
    const x1 = exitGeom ? exitGeom.exitX : a.x + ux * startPad;
    const y1 = exitGeom ? exitGeom.exitY : a.y + uy * startPad;
    const entryGeom = markGeom[i + 1];
    const x2 = entryGeom ? entryGeom.entryX : b.x - ux * endPad;
    const y2 = entryGeom ? entryGeom.entryY : b.y - uy * endPad;

    // A leg leaving a gate that gets the two-mark rendering below is drawn
    // entirely by that block instead — skip the arrows here.
    if (!isGateReversal[i]) {
      const gap = Math.hypot(x2 - x1, y2 - y1);
      if (gap < STUB * 2 + 16) {
        // Too short for two separate stubs — just join them with one arrow.
        under.push({ k: 'line', x1, y1, x2, y2, stroke: LEG_BLUE, w: LEG_W, cap: 'round' });
        under.push(arrowHead((x1 + x2) / 2, (y1 + y2) / 2, ang, 13, LEG_BLUE));
      } else {
        const exitEndX = x1 + ux * STUB;
        const exitEndY = y1 + uy * STUB;
        under.push({ k: 'line', x1, y1, x2: exitEndX, y2: exitEndY, stroke: LEG_BLUE, w: LEG_W, cap: 'round' });
        under.push(arrowHead(exitEndX, exitEndY, ang, 13, LEG_BLUE));

        const entryStartX = x2 - ux * STUB;
        const entryStartY = y2 - uy * STUB;
        under.push({
          k: 'line',
          x1: entryStartX,
          y1: entryStartY,
          x2,
          y2,
          stroke: LEG_BLUE,
          w: LEG_W,
          cap: 'round',
        });
        under.push(arrowHead(x2 - ux * 13, y2 - uy * 13, ang, 13, LEG_BLUE));
      }
    }

    legTrim.push({ x1, y1, x2, y2 });
  }

  // Round each waypoint the course passes through: swing an arc between the
  // touch points above instead of letting both legs point straight at the mark.
  for (let i = 1; i < doc.sequence.length - 1; i++) {
    const prevLeg = legTrim[i - 1];
    const nextLeg = legTrim[i];
    if (!prevLeg || !nextLeg) continue;
    const ref = doc.sequence[i].ref;

    // A gate you round and double back through (the standard leeward gate)
    // is drawn as one arrow in and two mirrored arrows out — one hooking
    // round each mark — rather than a single arc at the gate's midpoint,
    // since either mark can be the one actually rounded.
    if (ref.type === 'gate' && isGateReversal[i]) {
      const g = doc.gates.find((x) => x.id === ref.gateId);
      const p = g && findMark(doc, g.portId);
      const s = g && findMark(doc, g.stbdId);
      const center = anchors[i];
      const inDir = legDirs[i - 1];
      const outDir = legDirs[i];
      if (p && s && center && inDir && outDir) {
        const backAngle = Math.atan2(-inDir.uy, -inDir.ux);
        const outAngle = Math.atan2(outDir.uy, outDir.ux);

        for (const M of [p, s]) {
          const pad = M.size + 6;
          const outwardAngle = Math.atan2(M.y - center.y, M.x - center.x);
          const { entryAngle, exitAngle, sweep } = roundingSplay(backAngle, outwardAngle, ROUNDING_HALF_GAP);
          under.push(sweepArc(M.x, M.y, pad, entryAngle, sweep, LEG_BLUE, LEG_W));

          const entryX = M.x + Math.cos(entryAngle) * pad;
          const entryY = M.y + Math.sin(entryAngle) * pad;
          under.push({
            k: 'line',
            x1: prevLeg.x2,
            y1: prevLeg.y2,
            x2: entryX,
            y2: entryY,
            stroke: LEG_BLUE,
            w: LEG_W,
            cap: 'round',
          });

          const exitX = M.x + Math.cos(exitAngle) * pad;
          const exitY = M.y + Math.sin(exitAngle) * pad;
          under.push(arrowHead(exitX, exitY, outAngle, 13, LEG_BLUE));
        }
      }
      continue;
    }

    // A mark rounded off a straight beat/run: the entry and exit points
    // were already splayed to the configured rounding side above, so sweep
    // the long way between them instead of taking the (degenerate) short one.
    const reversalGeom = markGeom[i];
    if (reversalGeom) {
      const m = anchors[i];
      if (!m) continue;
      under.push(sweepArc(m.x, m.y, reversalGeom.pad, reversalGeom.entryAngle, reversalGeom.sweep, LEG_BLUE, LEG_W));
      continue;
    }

    const m = anchors[i];
    if (!m) continue;
    const r = Math.hypot(prevLeg.x2 - m.x, prevLeg.y2 - m.y);
    const a1 = Math.atan2(prevLeg.y2 - m.y, prevLeg.x2 - m.x);
    const a2 = Math.atan2(nextLeg.y1 - m.y, nextLeg.x1 - m.x);
    under.push(arcPrim(m.x, m.y, r, a1, a2, LEG_BLUE, LEG_W));
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
    // A committee boat lies bow-into-wind, not along the line, so it needs the
    // wind's heading rather than the line's. Falls back to the line's own
    // angle when the course has no wind arrow to take a bearing from.
    const firstWind = doc.winds[0];
    const boatAng = firstWind
      ? ((firstWind.angle + 90) * Math.PI) / 180 + Math.PI
      : ang;
    const ends: [number, number, typeof l.endA][] = [
      [l.x1, l.y1, l.endA],
      [l.x2, l.y2, l.endB],
    ];
    for (const [ex, ey, style] of ends) {
      if (style === 'pin') {
        mid.push({
          k: 'circle',
          cx: ex,
          cy: ey,
          r: 8,
          fill: l.pinColor ?? '#f2c230',
          stroke: INK,
          w: 2.5,
        });
      } else if (style === 'boat') {
        // Simple committee-boat hull, bow pointed into the wind.
        const perp = boatAng + Math.PI / 2;
        const hw = 26;
        const hh = 11;
        const cx = Math.cos(boatAng);
        const cy = Math.sin(boatAng);
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
          fill: l.boatColor ?? '#f26722',
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
    const label = w.label.trim();

    // The shaft needs to be at least as wide as the label, so it doesn't
    // spill out the sides. Widen it to fit, up to a cap (so short arrows
    // with long labels don't turn into a fat rectangle), shrinking the
    // font as a last resort if it still won't fit at that cap.
    const minShaftHw = w.length * 0.16;
    const maxShaftHw = w.length * 0.42;
    let shaftHw = minShaftHw;
    let labelSize = 14;
    const padding = 8;
    if (label) {
      const desiredHw = textWidth(label, labelSize, true) / 2 + padding;
      shaftHw = Math.min(Math.max(minShaftHw, desiredHw), maxShaftHw);
      if (desiredHw > maxShaftHw) {
        const unitWidth = textWidth(label, 1, true);
        labelSize = Math.max(8, ((maxShaftHw - padding) * 2) / unitWidth);
      }
    }
    const headHw = Math.max(w.length * 0.3, shaftHw + 6);

    mid.push(blockArrow(w.x, w.y, rad, w.length, shaftHw, headHw));
    if (label) {
      // Centred in the shaft, roughly clear of the head.
      const shaftMid = (w.length - w.length * 0.42) / 2;
      labels.push({
        k: 'text',
        x: w.x + Math.cos(rad) * shaftMid,
        y: w.y + Math.sin(rad) * shaftMid + 5,
        text: label,
        size: labelSize,
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
