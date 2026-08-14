import type {
  Annotation,
  CanvasObject,
  CourseDoc,
  Gate,
  ID,
  Mark,
  MarkKind,
  RaceLine,
  SeqEntry,
  WindArrow,
} from './types';

let seq = 0;
export function uid(prefix = 'o'): ID {
  seq += 1;
  return `${prefix}${Date.now().toString(36)}${seq.toString(36)}`;
}

export const MARK_COLORS = [
  { name: 'Orange', value: '#f26722' },
  { name: 'Yellow', value: '#f2c230' },
  { name: 'Red', value: '#c8332b' },
  { name: 'Green', value: '#2e8b4f' },
  { name: 'Blue', value: '#2c6fb5' },
  { name: 'Black', value: '#1f2d3a' },
  { name: 'White', value: '#ffffff' },
];

export const DEFAULT_MARK_SIZE = 22;

export function emptyDoc(): CourseDoc {
  return {
    marks: [],
    gates: [],
    lines: [],
    winds: [],
    notes: [],
    sequence: [],
    settings: {
      title: 'Course 1',
      allowMultipleStart: false,
      allowMultipleFinish: false,
      showGrid: true,
      snap: true,
      gridSize: 20,
      roundingDirection: 'port',
    },
  };
}

const KIND_DEFAULTS: Record<MarkKind, { label: string; color: string }> = {
  standard: { label: '1', color: '#f26722' },
  windward: { label: '1', color: '#f26722' },
  leeward: { label: '2', color: '#f2c230' },
  offset: { label: '1a', color: '#f26722' },
  reach: { label: '3', color: '#2e8b4f' },
  gate: { label: '2', color: '#f2c230' },
};

export function makeMark(kind: MarkKind, x: number, y: number, label?: string): Mark {
  const d = KIND_DEFAULTS[kind];
  return {
    id: uid('m'),
    kind,
    x,
    y,
    label: label ?? d.label,
    color: d.color,
    size: kind === 'offset' ? DEFAULT_MARK_SIZE * 0.75 : DEFAULT_MARK_SIZE,
    rotation: 0,
    locked: false,
  };
}

export function makeGate(x: number, y: number, base: string, spread = 110): { gate: Gate; port: Mark; stbd: Mark } {
  const gateId = uid('g');
  const port = makeMark('gate', x - spread / 2, y, `${base}P`);
  const stbd = makeMark('gate', x + spread / 2, y, `${base}S`);
  port.gateId = gateId;
  port.gateRole = 'port';
  stbd.gateId = gateId;
  stbd.gateRole = 'stbd';
  return { gate: { id: gateId, portId: port.id, stbdId: stbd.id, linked: true }, port, stbd };
}

export function makeLine(kind: 'start' | 'finish', x: number, y: number, len = 200): RaceLine {
  return {
    id: uid('l'),
    kind,
    x1: x - len / 2,
    y1: y,
    x2: x + len / 2,
    y2: y,
    endA: 'pin',
    endB: 'boat',
    pinColor: '#f2c230',
    boatColor: '#f26722',
    locked: false,
  };
}

export function makeWind(x: number, y: number): WindArrow {
  return { id: uid('w'), x, y, angle: 0, length: 90, label: 'WIND', locked: false };
}

export function makeNote(x: number, y: number, text = 'Label'): Annotation {
  return { id: uid('n'), x, y, text, size: 16, color: '#1f2d3a', locked: false };
}

export function makeEntry(ref: SeqEntry['ref']): SeqEntry {
  return { id: uid('s'), ref };
}

/* ── Lookups ──────────────────────────────────────────────────── */

export function findMark(doc: CourseDoc, id: ID) {
  return doc.marks.find((m) => m.id === id);
}

export function objectsOf(doc: CourseDoc): CanvasObject[] {
  return [
    ...doc.marks.map((m) => ({ kind: 'mark' as const, id: m.id })),
    ...doc.lines.map((l) => ({ kind: 'line' as const, id: l.id })),
    ...doc.winds.map((w) => ({ kind: 'wind' as const, id: w.id })),
    ...doc.notes.map((n) => ({ kind: 'note' as const, id: n.id })),
  ];
}

export function kindOf(doc: CourseDoc, id: ID): CanvasObject['kind'] | null {
  if (doc.marks.some((m) => m.id === id)) return 'mark';
  if (doc.lines.some((l) => l.id === id)) return 'line';
  if (doc.winds.some((w) => w.id === id)) return 'wind';
  if (doc.notes.some((n) => n.id === id)) return 'note';
  return null;
}

export function isLocked(doc: CourseDoc, id: ID): boolean {
  return (
    doc.marks.find((m) => m.id === id)?.locked ??
    doc.lines.find((l) => l.id === id)?.locked ??
    doc.winds.find((w) => w.id === id)?.locked ??
    doc.notes.find((n) => n.id === id)?.locked ??
    false
  );
}

/** Anchor point the course path routes through for a given sequence entry. */
export function anchorOf(doc: CourseDoc, ref: SeqEntry['ref']): { x: number; y: number; r: number } | null {
  if (ref.type === 'mark') {
    const m = findMark(doc, ref.markId);
    return m ? { x: m.x, y: m.y, r: m.size } : null;
  }
  if (ref.type === 'gate') {
    const g = doc.gates.find((x) => x.id === ref.gateId);
    if (!g) return null;
    const p = findMark(doc, g.portId);
    const s = findMark(doc, g.stbdId);
    if (!p || !s) return null;
    // Path passes cleanly between the two gate marks.
    return { x: (p.x + s.x) / 2, y: (p.y + s.y) / 2, r: 0 };
  }
  const l = doc.lines.find((x) => x.id === ref.lineId);
  if (!l) return null;
  return { x: (l.x1 + l.x2) / 2, y: (l.y1 + l.y2) / 2, r: 0 };
}

export function labelOfRef(doc: CourseDoc, ref: SeqEntry['ref']): string {
  if (ref.type === 'mark') return findMark(doc, ref.markId)?.label ?? '?';
  if (ref.type === 'gate') {
    const g = doc.gates.find((x) => x.id === ref.gateId);
    if (!g) return '?';
    const p = findMark(doc, g.portId);
    const s = findMark(doc, g.stbdId);
    return `${p?.label ?? '?'} / ${s?.label ?? '?'}`;
  }
  const l = doc.lines.find((x) => x.id === ref.lineId);
  return l ? (l.kind === 'start' ? 'Start' : 'Finish') : '?';
}

/* ── Mutation helpers ─────────────────────────────────────────── */

/** Moves an object, carrying linked gate partners and attached offsets along. */
export function moveObjects(doc: CourseDoc, ids: ID[], dx: number, dy: number): CourseDoc {
  const moving = new Set(ids);

  // A linked gate partner follows even when only one side is selected.
  for (const g of doc.gates) {
    if (!g.linked) continue;
    if (moving.has(g.portId)) moving.add(g.stbdId);
    if (moving.has(g.stbdId)) moving.add(g.portId);
  }
  // Offsets follow their parent.
  for (const m of doc.marks) {
    if (m.parentId && moving.has(m.parentId)) moving.add(m.id);
  }

  const shift = <T extends { id: ID; locked: boolean }>(o: T, apply: (o: T) => T) =>
    moving.has(o.id) && !o.locked ? apply(o) : o;

  return {
    ...doc,
    marks: doc.marks.map((m) => shift(m, (v) => ({ ...v, x: v.x + dx, y: v.y + dy }))),
    lines: doc.lines.map((l) =>
      shift(l, (v) => ({ ...v, x1: v.x1 + dx, y1: v.y1 + dy, x2: v.x2 + dx, y2: v.y2 + dy })),
    ),
    winds: doc.winds.map((w) => shift(w, (v) => ({ ...v, x: v.x + dx, y: v.y + dy }))),
    notes: doc.notes.map((n) => shift(n, (v) => ({ ...v, x: v.x + dx, y: v.y + dy }))),
  };
}

/** Deletes objects plus everything structurally dependent on them. */
export function deleteObjects(doc: CourseDoc, ids: ID[]): CourseDoc {
  const dead = new Set(ids);

  // Removing either half of a gate removes the whole gate.
  const deadGates = new Set<ID>();
  for (const g of doc.gates) {
    if (dead.has(g.portId) || dead.has(g.stbdId)) {
      deadGates.add(g.id);
      dead.add(g.portId);
      dead.add(g.stbdId);
    }
  }

  const marks = doc.marks
    .filter((m) => !dead.has(m.id))
    // An offset whose parent went away simply becomes unattached.
    .map((m) => (m.parentId && dead.has(m.parentId) ? { ...m, parentId: undefined } : m));

  return {
    ...doc,
    marks,
    gates: doc.gates.filter((g) => !deadGates.has(g.id)),
    lines: doc.lines.filter((l) => !dead.has(l.id)),
    winds: doc.winds.filter((w) => !dead.has(w.id)),
    notes: doc.notes.filter((n) => !dead.has(n.id)),
    sequence: doc.sequence.filter((e) => {
      if (e.ref.type === 'mark') return !dead.has(e.ref.markId);
      if (e.ref.type === 'gate') return !deadGates.has(e.ref.gateId);
      return !dead.has(e.ref.lineId);
    }),
  };
}

/**
 * Duplicates objects, rebuilding internal relationships (gate pairing,
 * offset attachment) among the copies rather than pointing at the originals.
 */
export function duplicateObjects(
  doc: CourseDoc,
  ids: ID[],
  dx = 30,
  dy = 30,
): { doc: CourseDoc; newIds: ID[] } {
  const chosen = new Set(ids);
  // Duplicating half a gate duplicates both halves, or the copy would be invalid.
  for (const g of doc.gates) {
    if (chosen.has(g.portId) || chosen.has(g.stbdId)) {
      chosen.add(g.portId);
      chosen.add(g.stbdId);
    }
  }

  const idMap = new Map<ID, ID>();
  const newIds: ID[] = [];

  const newMarks = doc.marks
    .filter((m) => chosen.has(m.id))
    .map((m) => {
      const id = uid('m');
      idMap.set(m.id, id);
      newIds.push(id);
      return { ...m, id, x: m.x + dx, y: m.y + dy };
    });

  const newGates: Gate[] = [];
  for (const g of doc.gates) {
    if (!chosen.has(g.portId)) continue;
    const gid = uid('g');
    idMap.set(g.id, gid);
    newGates.push({ id: gid, portId: idMap.get(g.portId)!, stbdId: idMap.get(g.stbdId)!, linked: g.linked });
  }

  const remapped = newMarks.map((m) => ({
    ...m,
    gateId: m.gateId ? idMap.get(m.gateId) : undefined,
    // Keep the attachment only if the parent was copied too.
    parentId: m.parentId && idMap.has(m.parentId) ? idMap.get(m.parentId) : undefined,
  }));

  const newLines = doc.lines
    .filter((l) => chosen.has(l.id))
    .map((l) => {
      const id = uid('l');
      newIds.push(id);
      return { ...l, id, x1: l.x1 + dx, y1: l.y1 + dy, x2: l.x2 + dx, y2: l.y2 + dy };
    });

  const newWinds = doc.winds
    .filter((w) => chosen.has(w.id))
    .map((w) => {
      const id = uid('w');
      newIds.push(id);
      return { ...w, id, x: w.x + dx, y: w.y + dy };
    });

  const newNotes = doc.notes
    .filter((n) => chosen.has(n.id))
    .map((n) => {
      const id = uid('n');
      newIds.push(id);
      return { ...n, id, x: n.x + dx, y: n.y + dy };
    });

  return {
    doc: {
      ...doc,
      marks: [...doc.marks, ...remapped],
      gates: [...doc.gates, ...newGates],
      lines: [...doc.lines, ...newLines],
      winds: [...doc.winds, ...newWinds],
      notes: [...doc.notes, ...newNotes],
    },
    newIds,
  };
}

export function snap(v: number, grid: number, on: boolean) {
  return on ? Math.round(v / grid) * grid : v;
}
