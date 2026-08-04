import { findMark, labelOfRef } from './doc';
import type { CourseDoc, ID } from './types';

export interface Issue {
  level: 'error' | 'warn';
  message: string;
  /** Objects to select when the user clicks the issue. */
  ids?: ID[];
}

export function validate(doc: CourseDoc): Issue[] {
  const issues: Issue[] = [];

  /* ── Sequence integrity ──────────────────────────────────────── */
  if (doc.sequence.length === 0) {
    if (doc.marks.length > 0) {
      issues.push({ level: 'warn', message: 'No rounding order set — add marks to the sequence to draw the course.' });
    }
  } else if (doc.sequence.length === 1) {
    issues.push({ level: 'warn', message: 'Course has only one point — add at least two to draw a leg.' });
  }

  // Consecutive repeats produce a zero-length leg.
  for (let i = 0; i < doc.sequence.length - 1; i++) {
    const a = doc.sequence[i].ref;
    const b = doc.sequence[i + 1].ref;
    const same =
      (a.type === 'mark' && b.type === 'mark' && a.markId === b.markId) ||
      (a.type === 'gate' && b.type === 'gate' && a.gateId === b.gateId) ||
      (a.type === 'line' && b.type === 'line' && a.lineId === b.lineId);
    if (same) {
      issues.push({
        level: 'error',
        message: `Position ${i + 1} and ${i + 2} are both "${labelOfRef(doc, a)}" — a mark cannot follow itself.`,
      });
    }
  }

  /* ── Marks missing from the sequence ─────────────────────────── */
  const used = new Set<ID>();
  for (const e of doc.sequence) {
    const ref = e.ref;
    if (ref.type === 'mark') {
      used.add(ref.markId);
    } else if (ref.type === 'line') {
      used.add(ref.lineId);
    } else {
      const g = doc.gates.find((x) => x.id === ref.gateId);
      if (g) {
        used.add(g.portId);
        used.add(g.stbdId);
      }
    }
  }

  const orphans = doc.marks.filter((m) => !used.has(m.id) && !m.parentId);
  if (orphans.length && doc.sequence.length > 0) {
    issues.push({
      level: 'warn',
      message:
        orphans.length === 1
          ? `Mark "${orphans[0].label}" is not in the rounding order.`
          : `${orphans.length} marks are not in the rounding order.`,
      ids: orphans.map((m) => m.id),
    });
  }

  const unusedLines = doc.lines.filter((l) => !used.has(l.id));
  if (unusedLines.length && doc.sequence.length > 0) {
    issues.push({
      level: 'warn',
      message: `${unusedLines.length === 1 ? 'A race line is' : `${unusedLines.length} race lines are`} not in the rounding order.`,
      ids: unusedLines.map((l) => l.id),
    });
  }

  /* ── Overlapping marks ───────────────────────────────────────── */
  for (let i = 0; i < doc.marks.length; i++) {
    for (let j = i + 1; j < doc.marks.length; j++) {
      const a = doc.marks[i];
      const b = doc.marks[j];
      // Gate halves and offset/parent pairs are meant to sit close together.
      if (a.gateId && a.gateId === b.gateId) continue;
      if (a.parentId === b.id || b.parentId === a.id) continue;
      if (Math.hypot(a.x - b.x, a.y - b.y) < (a.size + b.size) * 0.85) {
        issues.push({
          level: 'warn',
          message: `Marks "${a.label}" and "${b.label}" overlap.`,
          ids: [a.id, b.id],
        });
      }
    }
  }

  /* ── Gate integrity ──────────────────────────────────────────── */
  for (const g of doc.gates) {
    const p = findMark(doc, g.portId);
    const s = findMark(doc, g.stbdId);
    if (!p || !s) {
      issues.push({ level: 'error', message: 'A gate is missing one of its marks.' });
      continue;
    }
    if (Math.hypot(p.x - s.x, p.y - s.y) < (p.size + s.size) * 1.05) {
      issues.push({
        level: 'error',
        message: `Gate "${p.label}/${s.label}" is too narrow for a boat to pass between.`,
        ids: [p.id, s.id],
      });
    }
  }

  /* ── Start / finish line counts ──────────────────────────────── */
  const starts = doc.lines.filter((l) => l.kind === 'start');
  const finishes = doc.lines.filter((l) => l.kind === 'finish');
  if (starts.length > 1 && !doc.settings.allowMultipleStart) {
    issues.push({
      level: 'error',
      message: `${starts.length} start lines. Enable "Allow multiple start lines" in settings, or remove one.`,
      ids: starts.map((l) => l.id),
    });
  }
  if (finishes.length > 1 && !doc.settings.allowMultipleFinish) {
    issues.push({
      level: 'error',
      message: `${finishes.length} finish lines. Enable "Allow multiple finish lines" in settings, or remove one.`,
      ids: finishes.map((l) => l.id),
    });
  }

  return issues;
}
