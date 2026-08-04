import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import SceneLayer from './SceneLayer';
import { boundsOf } from '@/lib/courseMaker/scene';
import { isLocked, moveObjects, snap } from '@/lib/courseMaker/doc';
import type { CourseDoc, ID, Prim } from '@/lib/courseMaker/types';

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

interface Props {
  doc: CourseDoc;
  prims: Prim[];
  selection: ID[];
  setSelection: (ids: ID[]) => void;
  tool: 'select' | 'pan';
  viewport: Viewport;
  setViewport: (v: Viewport | ((v: Viewport) => Viewport)) => void;
  onBeginEdit: () => void;
  onLiveEdit: (fn: (d: CourseDoc) => CourseDoc) => void;
  onDropItem: (kind: string, x: number, y: number) => void;
  onDoubleClickObject: (id: ID) => void;
  /** Bump to re-fit the diagram to the viewport. */
  fitToken: number;
}

type Drag =
  | { mode: 'none' }
  | { mode: 'pan'; sx: number; sy: number; ox: number; oy: number }
  | { mode: 'move'; sx: number; sy: number; moved: boolean; axis: 'free' | 'x' | 'y' }
  | { mode: 'marquee'; sx: number; sy: number; cx: number; cy: number; additive: boolean }
  | { mode: 'lineEnd'; id: ID; end: 1 | 2 };

export default function Canvas({
  doc,
  prims,
  selection,
  setSelection,
  tool,
  viewport,
  setViewport,
  onBeginEdit,
  onLiveEdit,
  onDropItem,
  onDoubleClickObject,
  fitToken,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const [drag, setDrag] = useState<Drag>({ mode: 'none' });
  const [spaceDown, setSpaceDown] = useState(false);
  const dragRef = useRef(drag);
  dragRef.current = drag;

  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      setSize({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* Space held = temporary pan, like Figma. */
  useEffect(() => {
    const target = () => document.activeElement?.tagName;
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && target() !== 'INPUT' && target() !== 'TEXTAREA') {
        e.preventDefault();
        setSpaceDown(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceDown(false);
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  /* Fit the whole diagram into view. Runs on mount and whenever the
     Fit button bumps the token — never mid-edit, so it can't fight the user. */
  const primsRef = useRef(prims);
  primsRef.current = prims;
  useEffect(() => {
    if (size.w < 20 || size.h < 20) return;
    const b = boundsOf(primsRef.current);
    const bw = Math.max(1, b.maxX - b.minX);
    const bh = Math.max(1, b.maxY - b.minY);
    const pad = 60;
    const zoom = Math.min(3, Math.max(0.08, Math.min((size.w - pad * 2) / bw, (size.h - pad * 2) / bh)));
    setViewport({
      zoom,
      x: size.w / 2 - ((b.minX + b.maxX) / 2) * zoom,
      y: size.h / 2 - ((b.minY + b.maxY) / 2) * zoom,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitToken, size.w, size.h]);

  const toWorld = useCallback(
    (clientX: number, clientY: number) => {
      const r = svgRef.current!.getBoundingClientRect();
      return {
        x: (clientX - r.left - viewport.x) / viewport.zoom,
        y: (clientY - r.top - viewport.y) / viewport.zoom,
      };
    },
    [viewport],
  );

  /* ── Zoom at cursor ──────────────────────────────────────────── */
  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.stopPropagation();
      const r = svgRef.current!.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      setViewport((v) => {
        const factor = Math.exp(-e.deltaY * 0.0015);
        const zoom = Math.min(6, Math.max(0.08, v.zoom * factor));
        const k = zoom / v.zoom;
        return { zoom, x: mx - (mx - v.x) * k, y: my - (my - v.y) * k };
      });
    },
    [setViewport],
  );

  // React attaches wheel passively; a native non-passive listener lets us
  // preventDefault so the page (and Lenis) never scrolls under the canvas.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const block = (e: WheelEvent) => e.preventDefault();
    el.addEventListener('wheel', block, { passive: false });
    return () => el.removeEventListener('wheel', block);
  }, []);

  /* ── Pointer handling ────────────────────────────────────────── */
  const startMove = (id: ID, e: React.PointerEvent, additive: boolean) => {
    const already = selection.includes(id);
    const next = additive ? (already ? selection.filter((s) => s !== id) : [...selection, id]) : already ? selection : [id];
    setSelection(next);
    if (next.length === 0) return;
    onBeginEdit();
    setDrag({ mode: 'move', sx: e.clientX, sy: e.clientY, moved: false, axis: 'free' });
  };

  const onPointerDownBackground = (e: React.PointerEvent) => {
    if (e.button === 1 || tool === 'pan' || spaceDown || e.altKey) {
      setDrag({ mode: 'pan', sx: e.clientX, sy: e.clientY, ox: viewport.x, oy: viewport.y });
      (e.target as Element).setPointerCapture?.(e.pointerId);
      return;
    }
    const w = toWorld(e.clientX, e.clientY);
    if (!e.shiftKey) setSelection([]);
    setDrag({ mode: 'marquee', sx: w.x, sy: w.y, cx: w.x, cy: w.y, additive: e.shiftKey });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (d.mode === 'none') return;

    if (d.mode === 'pan') {
      setViewport({ ...viewport, x: d.ox + (e.clientX - d.sx), y: d.oy + (e.clientY - d.sy) });
      return;
    }

    if (d.mode === 'marquee') {
      const w = toWorld(e.clientX, e.clientY);
      setDrag({ ...d, cx: w.x, cy: w.y });
      return;
    }

    if (d.mode === 'lineEnd') {
      const w = toWorld(e.clientX, e.clientY);
      const gx = snap(w.x, doc.settings.gridSize, doc.settings.snap);
      const gy = snap(w.y, doc.settings.gridSize, doc.settings.snap);
      onLiveEdit((cur) => ({
        ...cur,
        lines: cur.lines.map((l) =>
          l.id === d.id ? (d.end === 1 ? { ...l, x1: gx, y1: gy } : { ...l, x2: gx, y2: gy }) : l,
        ),
      }));
      return;
    }

    // mode === 'move'
    let dx = (e.clientX - d.sx) / viewport.zoom;
    let dy = (e.clientY - d.sy) / viewport.zoom;

    // Shift constrains to the dominant axis.
    let axis = d.axis;
    if (e.shiftKey) {
      if (axis === 'free') axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (axis === 'x') dy = 0;
      else dx = 0;
    } else {
      axis = 'free';
    }

    if (dx === 0 && dy === 0 && !d.moved) return;
    setDrag({ ...d, sx: e.clientX, sy: e.clientY, moved: true, axis });

    if (doc.settings.snap) {
      const g = doc.settings.gridSize;
      dx = Math.round(dx / g) * g;
      dy = Math.round(dy / g) * g;
      if (dx === 0 && dy === 0) {
        // Hold the origin until the pointer crosses a grid step.
        setDrag({ ...d, moved: true, axis });
        return;
      }
      setDrag({ ...d, sx: e.clientX, sy: e.clientY, moved: true, axis });
    }

    onLiveEdit((cur) => moveObjects(cur, selection, dx, dy));
  };

  const endDrag = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (d.mode === 'marquee') {
      const x0 = Math.min(d.sx, d.cx);
      const x1 = Math.max(d.sx, d.cx);
      const y0 = Math.min(d.sy, d.cy);
      const y1 = Math.max(d.sy, d.cy);
      const inside = (x: number, y: number) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
      const hits: ID[] = [];
      for (const m of doc.marks) if (inside(m.x, m.y)) hits.push(m.id);
      for (const l of doc.lines) if (inside((l.x1 + l.x2) / 2, (l.y1 + l.y2) / 2)) hits.push(l.id);
      for (const w of doc.winds) if (inside(w.x, w.y)) hits.push(w.id);
      for (const n of doc.notes) if (inside(n.x, n.y)) hits.push(n.id);
      setSelection(d.additive ? Array.from(new Set([...selection, ...hits])) : hits);
    }
    (e.target as Element).releasePointerCapture?.(e.pointerId);
    setDrag({ mode: 'none' });
  };

  /* ── Drag & drop from the palette ────────────────────────────── */
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const kind = e.dataTransfer.getData('application/x-course-item');
    if (!kind) return;
    const w = toWorld(e.clientX, e.clientY);
    onDropItem(kind, snap(w.x, doc.settings.gridSize, doc.settings.snap), snap(w.y, doc.settings.gridSize, doc.settings.snap));
  };

  const grid = doc.settings.gridSize;
  const cursor = drag.mode === 'pan' ? 'grabbing' : tool === 'pan' || spaceDown ? 'grab' : 'default';

  const marquee =
    drag.mode === 'marquee'
      ? {
          x: Math.min(drag.sx, drag.cx),
          y: Math.min(drag.sy, drag.cy),
          w: Math.abs(drag.cx - drag.sx),
          h: Math.abs(drag.cy - drag.sy),
        }
      : null;

  return (
    <div ref={hostRef} className="relative h-full w-full overflow-hidden bg-white" data-lenis-prevent>
      <svg
        ref={svgRef}
        width={size.w}
        height={size.h}
        onWheel={onWheel}
        onPointerDown={onPointerDownBackground}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        style={{ cursor, display: 'block', touchAction: 'none' }}
      >
        <defs>
          <pattern
            id="cm-grid"
            width={grid * viewport.zoom}
            height={grid * viewport.zoom}
            patternUnits="userSpaceOnUse"
            x={viewport.x}
            y={viewport.y}
          >
            <path
              d={`M ${grid * viewport.zoom} 0 L 0 0 0 ${grid * viewport.zoom}`}
              fill="none"
              stroke="#e3e6ea"
              strokeWidth="1"
            />
          </pattern>
        </defs>

        {doc.settings.showGrid && <rect width={size.w} height={size.h} fill="url(#cm-grid)" />}

        <g transform={`translate(${viewport.x} ${viewport.y}) scale(${viewport.zoom})`}>
          {/* Diagram — identical primitives to every export path. */}
          <SceneLayer prims={prims} />

          {/* Interaction layer: hit targets + selection affordances, never exported. */}
          <g>
            {doc.lines.map((l) => {
              const sel = selection.includes(l.id);
              return (
                <g key={l.id}>
                  <line
                    x1={l.x1}
                    y1={l.y1}
                    x2={l.x2}
                    y2={l.y2}
                    stroke="transparent"
                    strokeWidth={18 / viewport.zoom + 10}
                    style={{ cursor: isLocked(doc, l.id) ? 'not-allowed' : 'move' }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      startMove(l.id, e, e.shiftKey);
                    }}
                    onDoubleClick={() => onDoubleClickObject(l.id)}
                  />
                  {sel &&
                    ([1, 2] as const).map((end) => (
                      <circle
                        key={end}
                        cx={end === 1 ? l.x1 : l.x2}
                        cy={end === 1 ? l.y1 : l.y2}
                        r={6 / viewport.zoom}
                        fill="#ffffff"
                        stroke="#2c6fb5"
                        strokeWidth={2 / viewport.zoom}
                        style={{ cursor: 'crosshair' }}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          onBeginEdit();
                          setDrag({ mode: 'lineEnd', id: l.id, end });
                        }}
                      />
                    ))}
                </g>
              );
            })}

            {doc.marks.map((m) => (
              <circle
                key={m.id}
                cx={m.x}
                cy={m.y}
                r={m.size + 4}
                fill="transparent"
                style={{ cursor: m.locked ? 'not-allowed' : 'move' }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  startMove(m.id, e, e.shiftKey);
                }}
                onDoubleClick={() => onDoubleClickObject(m.id)}
              />
            ))}

            {doc.winds.map((w) => (
              <circle
                key={w.id}
                cx={w.x}
                cy={w.y}
                r={22}
                fill="transparent"
                style={{ cursor: w.locked ? 'not-allowed' : 'move' }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  startMove(w.id, e, e.shiftKey);
                }}
              />
            ))}

            {doc.notes.map((n) => (
              <rect
                key={n.id}
                x={n.x - 4}
                y={n.y - n.size}
                width={Math.max(40, n.text.length * n.size * 0.55)}
                height={n.size * 1.4 * n.text.split('\n').length}
                fill="transparent"
                style={{ cursor: n.locked ? 'not-allowed' : 'move' }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  startMove(n.id, e, e.shiftKey);
                }}
                onDoubleClick={() => onDoubleClickObject(n.id)}
              />
            ))}

            {/* Selection rings */}
            {selection.map((id) => {
              const m = doc.marks.find((x) => x.id === id);
              if (m) {
                return (
                  <circle
                    key={id}
                    cx={m.x}
                    cy={m.y}
                    r={m.size + 7}
                    fill="none"
                    stroke="#2c6fb5"
                    strokeWidth={2 / viewport.zoom}
                    pointerEvents="none"
                  />
                );
              }
              const w = doc.winds.find((x) => x.id === id);
              if (w) {
                return (
                  <circle
                    key={id}
                    cx={w.x}
                    cy={w.y}
                    r={24}
                    fill="none"
                    stroke="#2c6fb5"
                    strokeWidth={2 / viewport.zoom}
                    pointerEvents="none"
                  />
                );
              }
              const n = doc.notes.find((x) => x.id === id);
              if (n) {
                return (
                  <rect
                    key={id}
                    x={n.x - 6}
                    y={n.y - n.size - 2}
                    width={Math.max(44, n.text.length * n.size * 0.55)}
                    height={n.size * 1.4 * n.text.split('\n').length + 4}
                    fill="none"
                    stroke="#2c6fb5"
                    strokeWidth={2 / viewport.zoom}
                    pointerEvents="none"
                  />
                );
              }
              return null;
            })}
          </g>

          {marquee && (
            <rect
              x={marquee.x}
              y={marquee.y}
              width={marquee.w}
              height={marquee.h}
              fill="rgba(44,111,181,0.10)"
              stroke="#2c6fb5"
              strokeWidth={1 / viewport.zoom}
              pointerEvents="none"
            />
          )}
        </g>
      </svg>
    </div>
  );
}
