import { labelOfRef, makeEntry } from '@/lib/courseMaker/doc';
import type { CourseDoc, ID, SeqRef } from '@/lib/courseMaker/types';

interface Props {
  doc: CourseDoc;
  edit: (fn: (d: CourseDoc) => CourseDoc) => void;
  onSelect: (ids: ID[]) => void;
}

/** Every physical thing that can be added to the rounding order. */
function addableRefs(doc: CourseDoc): { key: string; label: string; ref: SeqRef }[] {
  const gateMarks = new Set(doc.gates.flatMap((g) => [g.portId, g.stbdId]));
  return [
    ...doc.lines.map((l) => ({
      key: l.id,
      label: l.kind === 'start' ? 'Start' : 'Finish',
      ref: { type: 'line', lineId: l.id } as SeqRef,
    })),
    ...doc.marks
      .filter((m) => !gateMarks.has(m.id))
      .map((m) => ({ key: m.id, label: m.label, ref: { type: 'mark', markId: m.id } as SeqRef })),
    ...doc.gates.map((g) => ({
      key: g.id,
      label: labelOfRef(doc, { type: 'gate', gateId: g.id }),
      ref: { type: 'gate', gateId: g.id } as SeqRef,
    })),
  ];
}

function refIds(doc: CourseDoc, ref: SeqRef): ID[] {
  if (ref.type === 'mark') return [ref.markId];
  if (ref.type === 'line') return [ref.lineId];
  const g = doc.gates.find((x) => x.id === ref.gateId);
  return g ? [g.portId, g.stbdId] : [];
}

function sameRef(a: SeqRef, b: SeqRef) {
  if (a.type !== b.type) return false;
  if (a.type === 'mark' && b.type === 'mark') return a.markId === b.markId;
  if (a.type === 'gate' && b.type === 'gate') return a.gateId === b.gateId;
  if (a.type === 'line' && b.type === 'line') return a.lineId === b.lineId;
  return false;
}

export default function SequencePanel({ doc, edit, onSelect }: Props) {
  const options = addableRefs(doc);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= doc.sequence.length) return;
    edit((d) => {
      const next = [...d.sequence];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return { ...d, sequence: next };
    });
  };

  const add = (key: string) => {
    const opt = options.find((o) => o.key === key);
    if (!opt) return;
    edit((d) => {
      const last = d.sequence[d.sequence.length - 1];
      // A mark cannot follow itself — that would be a zero-length leg.
      if (last && sameRef(last.ref, opt.ref)) return d;
      return { ...d, sequence: [...d.sequence, makeEntry(opt.ref)] };
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between pb-2">
        <p className="tb-eyebrow">Rounding order</p>
        {doc.sequence.length > 0 && (
          <button
            className="text-[10.5px] uppercase tracking-wide text-[var(--tb-danger)] hover:underline"
            onClick={() => edit((d) => ({ ...d, sequence: [] }))}
          >
            Clear
          </button>
        )}
      </div>

      {doc.sequence.length === 0 ? (
        <p className="pb-2 text-[12px] leading-relaxed text-[var(--tb-text-muted)]">
          Empty. Add points below — the course lines and arrows draw themselves.
        </p>
      ) : (
        <ol className="space-y-1 pb-2">
          {doc.sequence.map((e, i) => (
            <li
              key={e.id}
              className="flex items-center gap-1.5 border border-[var(--tb-border)] bg-[var(--tb-bg)] px-1.5 py-1"
            >
              {/* Position is editable: type a new number to move this entry. */}
              <input
                type="number"
                min={1}
                max={doc.sequence.length}
                value={i + 1}
                onChange={(ev) => {
                  const to = Number(ev.target.value) - 1;
                  if (!Number.isNaN(to)) move(i, to);
                }}
                className="tb-input w-11 shrink-0 px-1 py-0.5 text-center text-[11px]"
                title="Order — type a number to move this entry"
              />
              <button
                className="min-w-0 flex-1 truncate text-left text-[12.5px] hover:text-[var(--tb-accent)]"
                onClick={() => onSelect(refIds(doc, e.ref))}
                title="Select on canvas"
              >
                {labelOfRef(doc, e.ref)}
              </button>
              <button
                onClick={() => move(i, i - 1)}
                disabled={i === 0}
                className="px-1 text-[11px] text-[var(--tb-text-muted)] disabled:opacity-30"
                title="Move up"
              >
                ↑
              </button>
              <button
                onClick={() => move(i, i + 1)}
                disabled={i === doc.sequence.length - 1}
                className="px-1 text-[11px] text-[var(--tb-text-muted)] disabled:opacity-30"
                title="Move down"
              >
                ↓
              </button>
              <button
                onClick={() => edit((d) => ({ ...d, sequence: d.sequence.filter((s) => s.id !== e.id) }))}
                className="px-1 text-[12px] text-[var(--tb-danger)]"
                title="Remove from order"
              >
                ×
              </button>
            </li>
          ))}
        </ol>
      )}

      <select
        className="tb-input w-full px-2 py-1.5 text-[12px]"
        value=""
        onChange={(e) => {
          add(e.target.value);
          e.currentTarget.value = '';
        }}
        disabled={options.length === 0}
      >
        <option value="">{options.length ? '+ Add to order…' : 'Add marks to the canvas first'}</option>
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
      <p className="pt-1.5 text-[10.5px] leading-relaxed text-[var(--tb-text-muted)]">
        The same mark can be added more than once — a lap repeats without duplicating the buoy.
      </p>
    </div>
  );
}
