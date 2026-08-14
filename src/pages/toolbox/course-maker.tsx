import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Canvas, { type Viewport } from '@/components/toolbox/coursemaker/Canvas';
import Palette, { type PaletteKind } from '@/components/toolbox/coursemaker/Palette';
import Inspector from '@/components/toolbox/coursemaker/Inspector';
import SequencePanel from '@/components/toolbox/coursemaker/SequencePanel';
import { useCourseDoc } from '@/lib/courseMaker/useCourseDoc';
import { buildScene } from '@/lib/courseMaker/scene';
import { validate } from '@/lib/courseMaker/validate';
import {
  deleteObjects,
  duplicateObjects,
  emptyDoc,
  makeEntry,
  makeGate,
  makeLine,
  makeMark,
  makeNote,
  makeWind,
  moveObjects,
} from '@/lib/courseMaker/doc';
import { exportJson, exportPdf, exportPng, exportSvgFile } from '@/lib/courseMaker/exporters';
import type { CourseDoc, ID, MarkKind, SeqRef } from '@/lib/courseMaker/types';

/* A windward/leeward to open on, so the canvas is never a blank stare. */
function starterDoc(): CourseDoc {
  const d = emptyDoc();
  const windward = makeMark('windward', 420, 120, '1');
  const { gate, port, stbd } = makeGate(420, 520, '2');
  const line = makeLine('start', 420, 620, 220);
  const wind = makeWind(140, 90);

  d.marks = [windward, port, stbd];
  d.gates = [gate];
  d.lines = [line];
  d.winds = [wind];
  d.sequence = [
    makeEntry({ type: 'line', lineId: line.id }),
    makeEntry({ type: 'mark', markId: windward.id }),
    makeEntry({ type: 'gate', gateId: gate.id }),
    makeEntry({ type: 'mark', markId: windward.id }),
    makeEntry({ type: 'line', lineId: line.id }),
  ];
  d.settings.title = 'Windward / Leeward';
  return d;
}

const PANEL = 'tb-panel p-3';

export default function CourseMakerPage() {
  const { doc, docRef, begin, live, commit, replace, undo, redo, canUndo, canRedo } = useCourseDoc(starterDoc());
  const [selection, setSelection] = useState<ID[]>([]);
  const [tool, setTool] = useState<'select' | 'pan'>('select');
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [fitToken, setFitToken] = useState(0);
  const [scale, setScale] = useState(2);
  const [busy, setBusy] = useState('');
  const clipboard = useRef<{ doc: CourseDoc; ids: ID[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { prims } = useMemo(() => buildScene(doc), [doc]);
  const issues = useMemo(() => validate(doc), [doc]);

  /* ── Creation ────────────────────────────────────────────────── */
  const addItem = useCallback(
    (kind: PaletteKind, x: number, y: number) => {
      commit((d) => {
        if (kind === 'gate') {
          const base = String(d.gates.length + 2);
          const { gate, port, stbd } = makeGate(x, y, base);
          return { ...d, gates: [...d.gates, gate], marks: [...d.marks, port, stbd] };
        }
        if (kind === 'start' || kind === 'finish') {
          return { ...d, lines: [...d.lines, makeLine(kind, x, y)] };
        }
        if (kind === 'wind') return { ...d, winds: [...d.winds, makeWind(x, y)] };
        if (kind === 'note') return { ...d, notes: [...d.notes, makeNote(x, y)] };

        const mark = makeMark(kind as MarkKind, x, y);
        if (kind === 'offset') {
          // Attach to the nearest plain mark so the pairing is immediate.
          let best: { id: ID; dist: number } | null = null;
          for (const m of d.marks) {
            if (m.kind === 'offset' || m.gateId) continue;
            const dist = Math.hypot(m.x - x, m.y - y);
            if (dist < 260 && (!best || dist < best.dist)) best = { id: m.id, dist };
          }
          if (best) mark.parentId = best.id;
        } else {
          mark.label = String(d.marks.filter((m) => !m.gateId && m.kind !== 'offset').length + 1);
        }
        return { ...d, marks: [...d.marks, mark] };
      });
    },
    [commit],
  );

  const addAtCentre = useCallback(
    (kind: PaletteKind) => {
      // Drop into the middle of whatever the user is currently looking at.
      const x = Math.round((400 - viewport.x) / viewport.zoom);
      const y = Math.round((300 - viewport.y) / viewport.zoom);
      addItem(kind, x, y);
    },
    [addItem, viewport],
  );

  /* ── Clipboard ───────────────────────────────────────────────── */
  const doCopy = useCallback(() => {
    if (!selection.length) return;
    clipboard.current = { doc: docRef.current, ids: [...selection] };
  }, [selection, docRef]);

  const doPaste = useCallback(() => {
    const clip = clipboard.current;
    if (!clip) return;
    // Rebuild from the snapshot so gates and offsets keep their relationships.
    const { doc: expanded, newIds } = duplicateObjects(clip.doc, clip.ids, 30, 30);
    const fresh = new Set(newIds);
    const marks = expanded.marks.filter((m) => fresh.has(m.id));
    const gateIds = new Set(marks.map((m) => m.gateId).filter(Boolean) as ID[]);
    commit((d) => ({
      ...d,
      marks: [...d.marks, ...marks],
      gates: [...d.gates, ...expanded.gates.filter((g) => gateIds.has(g.id))],
      lines: [...d.lines, ...expanded.lines.filter((l) => fresh.has(l.id))],
      winds: [...d.winds, ...expanded.winds.filter((w) => fresh.has(w.id))],
      notes: [...d.notes, ...expanded.notes.filter((n) => fresh.has(n.id))],
    }));
    setSelection(newIds);
  }, [commit]);

  const doDuplicate = useCallback(() => {
    if (!selection.length) return;
    let created: ID[] = [];
    commit((d) => {
      const { doc: next, newIds } = duplicateObjects(d, selection, 30, 30);
      created = newIds;
      return next;
    });
    if (created.length) setSelection(created);
  }, [commit, selection]);

  const doDelete = useCallback(() => {
    if (!selection.length) return;
    commit((d) => deleteObjects(d, selection));
    setSelection([]);
  }, [commit, selection]);

  /* ── Align / distribute ──────────────────────────────────────── */
  const posOf = useCallback((d: CourseDoc, id: ID) => {
    const m = d.marks.find((x) => x.id === id);
    if (m) return { x: m.x, y: m.y };
    const l = d.lines.find((x) => x.id === id);
    if (l) return { x: (l.x1 + l.x2) / 2, y: (l.y1 + l.y2) / 2 };
    const w = d.winds.find((x) => x.id === id);
    if (w) return { x: w.x, y: w.y };
    const n = d.notes.find((x) => x.id === id);
    return n ? { x: n.x, y: n.y } : null;
  }, []);

  const onAlign = useCallback(
    (how: 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom') => {
      commit((d) => {
        const pts = selection.map((id) => ({ id, p: posOf(d, id) })).filter((v) => v.p) as {
          id: ID;
          p: { x: number; y: number };
        }[];
        if (pts.length < 2) return d;
        const xs = pts.map((v) => v.p.x);
        const ys = pts.map((v) => v.p.y);
        const target = {
          left: Math.min(...xs),
          right: Math.max(...xs),
          hcenter: (Math.min(...xs) + Math.max(...xs)) / 2,
          top: Math.min(...ys),
          bottom: Math.max(...ys),
          vcenter: (Math.min(...ys) + Math.max(...ys)) / 2,
        }[how];
        const horizontal = how === 'left' || how === 'right' || how === 'hcenter';
        let out = d;
        for (const v of pts) {
          const dx = horizontal ? target - v.p.x : 0;
          const dy = horizontal ? 0 : target - v.p.y;
          if (dx || dy) out = moveObjects(out, [v.id], dx, dy);
        }
        return out;
      });
    },
    [commit, selection, posOf],
  );

  const onDistribute = useCallback(
    (axis: 'h' | 'v') => {
      commit((d) => {
        const pts = selection.map((id) => ({ id, p: posOf(d, id) })).filter((v) => v.p) as {
          id: ID;
          p: { x: number; y: number };
        }[];
        if (pts.length < 3) return d;
        pts.sort((a, b) => (axis === 'h' ? a.p.x - b.p.x : a.p.y - b.p.y));
        const first = axis === 'h' ? pts[0].p.x : pts[0].p.y;
        const last = axis === 'h' ? pts[pts.length - 1].p.x : pts[pts.length - 1].p.y;
        const step = (last - first) / (pts.length - 1);
        let out = d;
        pts.forEach((v, i) => {
          const want = first + step * i;
          const delta = want - (axis === 'h' ? v.p.x : v.p.y);
          if (delta) out = moveObjects(out, [v.id], axis === 'h' ? delta : 0, axis === 'h' ? 0 : delta);
        });
        return out;
      });
    },
    [commit, selection, posOf],
  );

  /* ── Double-click adds to the rounding order ─────────────────── */
  const onDoubleClickObject = useCallback(
    (id: ID) => {
      commit((d) => {
        const mark = d.marks.find((m) => m.id === id);
        const gate = mark?.gateId ? d.gates.find((g) => g.id === mark.gateId) : undefined;
        const ref: SeqRef | null = gate
          ? { type: 'gate', gateId: gate.id }
          : mark
            ? { type: 'mark', markId: mark.id }
            : d.lines.some((l) => l.id === id)
              ? { type: 'line', lineId: id }
              : null;
        if (!ref) return d;
        const last = d.sequence[d.sequence.length - 1]?.ref;
        if (
          last &&
          ((last.type === 'mark' && ref.type === 'mark' && last.markId === ref.markId) ||
            (last.type === 'gate' && ref.type === 'gate' && last.gateId === ref.gateId) ||
            (last.type === 'line' && ref.type === 'line' && last.lineId === ref.lineId))
        ) {
          return d;
        }
        return { ...d, sequence: [...d.sequence, makeEntry(ref)] };
      });
    },
    [commit],
  );

  /* ── Keyboard ────────────────────────────────────────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const d = docRef.current;
        setSelection([
          ...d.marks.map((m) => m.id),
          ...d.lines.map((l) => l.id),
          ...d.winds.map((w) => w.id),
          ...d.notes.map((n) => n.id),
        ]);
        return;
      }
      if (mod && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        doCopy();
        return;
      }
      if (mod && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        doPaste();
        return;
      }
      if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        doDuplicate();
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        doDelete();
        return;
      }
      if (e.key === 'Escape') {
        setSelection([]);
        return;
      }
      if (e.key.startsWith('Arrow') && selection.length) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        commit((d) => moveObjects(d, selection, dx, dy));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, doCopy, doPaste, doDuplicate, doDelete, selection, commit, docRef]);

  /* ── Save / load ─────────────────────────────────────────────── */
  const fileName = (doc.settings.title || 'course').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'course';

  const onImport = (file: File) => {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const parsed = JSON.parse(String(fr.result));
        if (!parsed || !Array.isArray(parsed.marks) || !parsed.settings) {
          throw new Error('Not a course file.');
        }
        replace({ ...emptyDoc(), ...parsed });
        setSelection([]);
        setFitToken((t) => t + 1);
      } catch (err) {
        setBusy(`Could not open that file: ${err instanceof Error ? err.message : String(err)}`);
        setTimeout(() => setBusy(''), 4000);
      }
    };
    fr.readAsText(file);
  };

  const doExportPng = async () => {
    setBusy('Rendering PNG…');
    try {
      await exportPng(prims, fileName, scale);
    } catch (err) {
      setBusy(err instanceof Error ? err.message : String(err));
      setTimeout(() => setBusy(''), 4000);
      return;
    }
    setBusy('');
  };

  const errors = issues.filter((i) => i.level === 'error');

  return (
    <div className="toolbox flex h-screen flex-col overflow-hidden">
      <Head>
        <title>Course Maker · Toolbox</title>
        <meta
          name="description"
          content="Build professional laid-mark sailing course diagrams and export them to PNG, SVG or PDF."
        />
        <meta name="theme-color" content="#ffffff" />
      </Head>

      {/* ── Top bar ─────────────────────────────────────────────── */}
      <header className="relative z-10 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-2 border-b border-[var(--tb-border)] bg-[var(--tb-bg)] px-4 py-2">
        <nav className="flex shrink-0 items-center gap-2 text-[12.5px]">
          <Link href="/toolbox" className="text-[var(--tb-text-muted)] hover:text-[var(--tb-accent)] hover:underline">
            Toolbox
          </Link>
          <span className="text-[var(--tb-text-faint)]">/</span>
          <span className="font-medium">Course Maker</span>
        </nav>

        <input
          value={doc.settings.title}
          onChange={(e) => commit((d) => ({ ...d, settings: { ...d.settings, title: e.target.value } }))}
          className="tb-input w-44 px-2 py-1 text-[12.5px]"
          aria-label="Course title"
        />

        <div className="flex items-center gap-1">
          <button onClick={undo} disabled={!canUndo} className="tb-btn-ghost px-2 py-1 text-[11px]" title="Undo (⌘Z)">
            Undo
          </button>
          <button onClick={redo} disabled={!canRedo} className="tb-btn-ghost px-2 py-1 text-[11px]" title="Redo (⇧⌘Z)">
            Redo
          </button>
        </div>

        <div className="flex items-center gap-1">
          {(['select', 'pan'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTool(t)}
              className={`px-2 py-1 text-[11px] capitalize ${tool === t ? 'tb-btn' : 'tb-btn-ghost'}`}
              title={t === 'select' ? 'Select / marquee' : 'Pan (or hold space)'}
            >
              {t}
            </button>
          ))}
          <button onClick={() => setFitToken((t) => t + 1)} className="tb-btn-ghost px-2 py-1 text-[11px]">
            Fit
          </button>
          <span className="tb-mono w-12 text-center text-[11.5px] text-[var(--tb-text-muted)]">
            {Math.round(viewport.zoom * 100)}%
          </span>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-[11px]">
            <input
              type="checkbox"
              checked={doc.settings.showGrid}
              onChange={(e) => commit((d) => ({ ...d, settings: { ...d.settings, showGrid: e.target.checked } }))}
            />
            Grid
          </label>
          <label className="flex items-center gap-1.5 text-[11px]">
            <input
              type="checkbox"
              checked={doc.settings.snap}
              onChange={(e) => commit((d) => ({ ...d, settings: { ...d.settings, snap: e.target.checked } }))}
            />
            Snap
          </label>
        </div>

        <div className="ml-auto flex items-center gap-1">
          <select
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            className="tb-input px-1.5 py-1 text-[11px]"
            title="PNG export scale"
          >
            <option value={1}>1×</option>
            <option value={2}>2×</option>
            <option value={4}>4×</option>
          </select>
          <button onClick={doExportPng} className="tb-btn-ghost px-2 py-1 text-[11px]">
            PNG
          </button>
          <button onClick={() => exportSvgFile(prims, fileName)} className="tb-btn-ghost px-2 py-1 text-[11px]">
            SVG
          </button>
          <button onClick={() => exportPdf(prims, fileName)} className="tb-btn-ghost px-2 py-1 text-[11px]">
            PDF
          </button>
          <span className="mx-1 h-4 w-px bg-[var(--tb-border)]" />
          <button onClick={() => exportJson(doc, fileName)} className="tb-btn-ghost px-2 py-1 text-[11px]">
            Save
          </button>
          <button onClick={() => fileRef.current?.click()} className="tb-btn-ghost px-2 py-1 text-[11px]">
            Open
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImport(f);
              e.target.value = '';
            }}
          />
        </div>
      </header>

      {busy && (
        <div className="relative z-10 shrink-0 border-b border-[var(--tb-border)] bg-[var(--tb-accent-soft)] px-4 py-1.5 text-[12px]">
          {busy}
        </div>
      )}

      {/* ── Workspace ───────────────────────────────────────────── */}
      <div className="relative z-10 flex min-h-0 flex-1">
        <aside className="w-56 shrink-0 overflow-y-auto border-r border-[var(--tb-border)] bg-[var(--tb-surface)] p-2">
          <Palette onAdd={addAtCentre} />
          <div className="mt-4 border-t border-[var(--tb-border)] pt-3">
            <p className="tb-eyebrow block pb-1.5">Shortcuts</p>
            <ul className="space-y-0.5 text-[10.5px] leading-relaxed text-[var(--tb-text-muted)]">
              <li>⌘Z / ⇧⌘Z — undo, redo</li>
              <li>⌘C / ⌘V / ⌘D — copy, paste, duplicate</li>
              <li>⌘A — select all · Del — delete</li>
              <li>Arrows nudge · ⇧ = 10×</li>
              <li>⇧-drag constrains to an axis</li>
              <li>Space-drag or Alt-drag pans</li>
              <li>Double-click adds to the order</li>
            </ul>
          </div>
        </aside>

        <main className="relative min-w-0 flex-1">
          <Canvas
            doc={doc}
            prims={prims}
            selection={selection}
            setSelection={setSelection}
            tool={tool}
            viewport={viewport}
            setViewport={setViewport}
            onBeginEdit={begin}
            onLiveEdit={live}
            onDropItem={(kind, x, y) => addItem(kind as PaletteKind, x, y)}
            onDoubleClickObject={onDoubleClickObject}
            fitToken={fitToken}
          />
        </main>

        <aside className="w-72 shrink-0 space-y-3 overflow-y-auto border-l border-[var(--tb-border)] bg-[var(--tb-surface)] p-3">
          <div className={PANEL}>
            <p className="tb-eyebrow block pb-1.5">Properties</p>
            <Inspector doc={doc} selection={selection} edit={commit} onAlign={onAlign} onDistribute={onDistribute} />
          </div>

          <div className={PANEL}>
            <SequencePanel doc={doc} edit={commit} onSelect={setSelection} />
          </div>

          <div className={PANEL}>
            <p className="tb-eyebrow block pb-1.5">
              Checks {errors.length > 0 && <span className="text-[var(--tb-danger)]">· {errors.length} to fix</span>}
            </p>
            {issues.length === 0 ? (
              <p className="text-[12px] text-[var(--tb-text-muted)]">No problems found.</p>
            ) : (
              <ul className="space-y-1.5">
                {issues.map((iss, i) => (
                  <li key={i}>
                    <button
                      onClick={() => iss.ids && setSelection(iss.ids)}
                      className={`block w-full border-l-2 pl-2 text-left text-[11.5px] leading-snug ${
                        iss.level === 'error'
                          ? 'border-[var(--tb-danger)] text-[var(--tb-danger)]'
                          : 'border-[var(--tb-accent)] text-[var(--tb-text-muted)]'
                      } ${iss.ids ? 'hover:underline' : 'cursor-default'}`}
                    >
                      {iss.message}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={PANEL}>
            <p className="tb-eyebrow block pb-1.5">Settings</p>
            <label className="flex items-center gap-2 py-1 text-[12px]">
              <input
                type="checkbox"
                checked={doc.settings.allowMultipleStart}
                onChange={(e) =>
                  commit((d) => ({ ...d, settings: { ...d.settings, allowMultipleStart: e.target.checked } }))
                }
              />
              Allow multiple start lines
            </label>
            <label className="flex items-center gap-2 py-1 text-[12px]">
              <input
                type="checkbox"
                checked={doc.settings.allowMultipleFinish}
                onChange={(e) =>
                  commit((d) => ({ ...d, settings: { ...d.settings, allowMultipleFinish: e.target.checked } }))
                }
              />
              Allow multiple finish lines
            </label>
            <label className="flex items-center justify-between gap-2 py-1 text-[12px]">
              Grid size
              <input
                type="number"
                min={5}
                max={100}
                value={doc.settings.gridSize}
                onChange={(e) =>
                  commit((d) => ({
                    ...d,
                    settings: { ...d.settings, gridSize: Math.max(5, Number(e.target.value) || 20) },
                  }))
                }
                className="tb-input w-16 px-2 py-1 text-[12px]"
              />
            </label>
            <label className="flex items-center justify-between gap-2 py-1 text-[12px]">
              Round marks to
              <select
                value={doc.settings.roundingDirection ?? 'port'}
                onChange={(e) =>
                  commit((d) => ({
                    ...d,
                    settings: { ...d.settings, roundingDirection: e.target.value as 'port' | 'starboard' },
                  }))
                }
                className="tb-input px-2 py-1 text-[12px]"
              >
                <option value="port">Port</option>
                <option value="starboard">Starboard</option>
              </select>
            </label>
          </div>
        </aside>
      </div>
    </div>
  );
}
