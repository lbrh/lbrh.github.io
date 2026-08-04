import { MARK_COLORS } from '@/lib/courseMaker/doc';
import type { CourseDoc, ID } from '@/lib/courseMaker/types';

interface Props {
  doc: CourseDoc;
  selection: ID[];
  edit: (fn: (d: CourseDoc) => CourseDoc) => void;
  onAlign: (how: 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom') => void;
  onDistribute: (axis: 'h' | 'v') => void;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-3 py-1.5">
      <span className="tb-eyebrow shrink-0">{label}</span>
      <span className="min-w-0 flex-1 text-right">{children}</span>
    </label>
  );
}

const inputCls = 'tb-input w-full px-2 py-1 text-[12.5px]';

export default function Inspector({ doc, selection, edit, onAlign, onDistribute }: Props) {
  if (selection.length === 0) {
    return (
      <p className="px-1 py-3 text-[12.5px] leading-relaxed text-[var(--tb-text-muted)]">
        Nothing selected. Click an object, drag a box to select several, or shift-click to add to the selection.
      </p>
    );
  }

  if (selection.length > 1) {
    return (
      <div className="space-y-3">
        <p className="text-[12.5px] text-[var(--tb-text-muted)]">{selection.length} objects selected</p>
        <div>
          <p className="tb-eyebrow block pb-1.5">Align</p>
          <div className="grid grid-cols-3 gap-1">
            {(
              [
                ['left', 'Left'],
                ['hcenter', 'Centre'],
                ['right', 'Right'],
                ['top', 'Top'],
                ['vcenter', 'Middle'],
                ['bottom', 'Bottom'],
              ] as const
            ).map(([how, lbl]) => (
              <button key={how} onClick={() => onAlign(how)} className="tb-btn-ghost px-1.5 py-1 text-[11px]">
                {lbl}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="tb-eyebrow block pb-1.5">Distribute</p>
          <div className="grid grid-cols-2 gap-1">
            <button onClick={() => onDistribute('h')} className="tb-btn-ghost px-1.5 py-1 text-[11px]" disabled={selection.length < 3}>
              Horizontally
            </button>
            <button onClick={() => onDistribute('v')} className="tb-btn-ghost px-1.5 py-1 text-[11px]" disabled={selection.length < 3}>
              Vertically
            </button>
          </div>
          {selection.length < 3 && (
            <p className="pt-1 text-[10.5px] text-[var(--tb-text-muted)]">Select 3+ objects to distribute.</p>
          )}
        </div>
      </div>
    );
  }

  const id = selection[0];
  const mark = doc.marks.find((m) => m.id === id);
  const line = doc.lines.find((l) => l.id === id);
  const wind = doc.winds.find((w) => w.id === id);
  const note = doc.notes.find((n) => n.id === id);

  if (mark) {
    const gate = mark.gateId ? doc.gates.find((g) => g.id === mark.gateId) : undefined;
    const parents = doc.marks.filter((m) => m.id !== mark.id && !m.parentId);
    return (
      <div className="divide-y divide-[var(--tb-border)]/60">
        <Row label="Label">
          <input
            className={inputCls}
            value={mark.label}
            onChange={(e) =>
              edit((d) => ({ ...d, marks: d.marks.map((m) => (m.id === id ? { ...m, label: e.target.value } : m)) }))
            }
          />
        </Row>
        <Row label="Colour">
          <select
            className={inputCls}
            value={mark.color}
            onChange={(e) =>
              edit((d) => ({ ...d, marks: d.marks.map((m) => (m.id === id ? { ...m, color: e.target.value } : m)) }))
            }
          >
            {MARK_COLORS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.name}
              </option>
            ))}
          </select>
        </Row>
        <Row label={`Size ${mark.size}`}>
          <input
            type="range"
            min={10}
            max={48}
            value={mark.size}
            className="w-full accent-[#1a56a8]"
            onChange={(e) =>
              edit((d) => ({
                ...d,
                marks: d.marks.map((m) => (m.id === id ? { ...m, size: Number(e.target.value) } : m)),
              }))
            }
          />
        </Row>
        <Row label="X">
          <input
            type="number"
            className={inputCls}
            value={Math.round(mark.x)}
            onChange={(e) =>
              edit((d) => ({ ...d, marks: d.marks.map((m) => (m.id === id ? { ...m, x: Number(e.target.value) } : m)) }))
            }
          />
        </Row>
        <Row label="Y">
          <input
            type="number"
            className={inputCls}
            value={Math.round(mark.y)}
            onChange={(e) =>
              edit((d) => ({ ...d, marks: d.marks.map((m) => (m.id === id ? { ...m, y: Number(e.target.value) } : m)) }))
            }
          />
        </Row>

        {gate && (
          <Row label="Gate link">
            <button
              className="tb-btn-ghost px-2 py-1 text-[11px]"
              onClick={() =>
                edit((d) => ({
                  ...d,
                  gates: d.gates.map((g) => (g.id === gate.id ? { ...g, linked: !g.linked } : g)),
                }))
              }
            >
              {gate.linked ? 'Linked — sides move together' : 'Unlinked — sides move alone'}
            </button>
          </Row>
        )}

        {mark.kind === 'offset' && (
          <Row label="Attached to">
            <select
              className={inputCls}
              value={mark.parentId ?? ''}
              onChange={(e) =>
                edit((d) => ({
                  ...d,
                  marks: d.marks.map((m) => (m.id === id ? { ...m, parentId: e.target.value || undefined } : m)),
                }))
              }
            >
              <option value="">Not attached</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </Row>
        )}

        <Row label="Locked">
          <input
            type="checkbox"
            checked={mark.locked}
            onChange={(e) =>
              edit((d) => ({
                ...d,
                marks: d.marks.map((m) => (m.id === id ? { ...m, locked: e.target.checked } : m)),
              }))
            }
          />
        </Row>
      </div>
    );
  }

  if (line) {
    return (
      <div className="divide-y divide-[var(--tb-border)]/60">
        <Row label="Type">
          <select
            className={inputCls}
            value={line.kind}
            onChange={(e) =>
              edit((d) => ({
                ...d,
                lines: d.lines.map((l) => (l.id === id ? { ...l, kind: e.target.value as 'start' | 'finish' } : l)),
              }))
            }
          >
            <option value="start">Start line</option>
            <option value="finish">Finish line</option>
          </select>
        </Row>
        {(['endA', 'endB'] as const).map((end) => (
          <Row key={end} label={end === 'endA' ? 'End 1' : 'End 2'}>
            <select
              className={inputCls}
              value={line[end]}
              onChange={(e) =>
                edit((d) => ({
                  ...d,
                  lines: d.lines.map((l) =>
                    l.id === id ? { ...l, [end]: e.target.value as 'boat' | 'pin' | 'plain' } : l,
                  ),
                }))
              }
            >
              <option value="boat">Committee boat</option>
              <option value="pin">Pin buoy</option>
              <option value="plain">Plain</option>
            </select>
          </Row>
        ))}
        <Row label="Locked">
          <input
            type="checkbox"
            checked={line.locked}
            onChange={(e) =>
              edit((d) => ({
                ...d,
                lines: d.lines.map((l) => (l.id === id ? { ...l, locked: e.target.checked } : l)),
              }))
            }
          />
        </Row>
        <p className="pt-2 text-[10.5px] leading-relaxed text-[var(--tb-text-muted)]">
          Drag either round handle on the canvas to reposition the ends.
        </p>
      </div>
    );
  }

  if (wind) {
    return (
      <div className="divide-y divide-[var(--tb-border)]/60">
        <Row label="Label">
          <input
            className={inputCls}
            value={wind.label}
            onChange={(e) =>
              edit((d) => ({ ...d, winds: d.winds.map((w) => (w.id === id ? { ...w, label: e.target.value } : w)) }))
            }
          />
        </Row>
        <Row label={`Angle ${wind.angle}°`}>
          <input
            type="range"
            min={0}
            max={359}
            value={wind.angle}
            className="w-full accent-[#1a56a8]"
            onChange={(e) =>
              edit((d) => ({
                ...d,
                winds: d.winds.map((w) => (w.id === id ? { ...w, angle: Number(e.target.value) } : w)),
              }))
            }
          />
        </Row>
        <Row label={`Length ${wind.length}`}>
          <input
            type="range"
            min={40}
            max={220}
            value={wind.length}
            className="w-full accent-[#1a56a8]"
            onChange={(e) =>
              edit((d) => ({
                ...d,
                winds: d.winds.map((w) => (w.id === id ? { ...w, length: Number(e.target.value) } : w)),
              }))
            }
          />
        </Row>
        <Row label="Locked">
          <input
            type="checkbox"
            checked={wind.locked}
            onChange={(e) =>
              edit((d) => ({
                ...d,
                winds: d.winds.map((w) => (w.id === id ? { ...w, locked: e.target.checked } : w)),
              }))
            }
          />
        </Row>
      </div>
    );
  }

  if (note) {
    return (
      <div className="divide-y divide-[var(--tb-border)]/60">
        <div className="py-1.5">
          <p className="tb-eyebrow block pb-1">Text</p>
          <textarea
            className={`${inputCls} min-h-[70px] resize-y text-left`}
            value={note.text}
            onChange={(e) =>
              edit((d) => ({ ...d, notes: d.notes.map((n) => (n.id === id ? { ...n, text: e.target.value } : n)) }))
            }
          />
        </div>
        <Row label={`Size ${note.size}`}>
          <input
            type="range"
            min={10}
            max={40}
            value={note.size}
            className="w-full accent-[#1a56a8]"
            onChange={(e) =>
              edit((d) => ({
                ...d,
                notes: d.notes.map((n) => (n.id === id ? { ...n, size: Number(e.target.value) } : n)),
              }))
            }
          />
        </Row>
        <Row label="Locked">
          <input
            type="checkbox"
            checked={note.locked}
            onChange={(e) =>
              edit((d) => ({
                ...d,
                notes: d.notes.map((n) => (n.id === id ? { ...n, locked: e.target.checked } : n)),
              }))
            }
          />
        </Row>
      </div>
    );
  }

  return null;
}
