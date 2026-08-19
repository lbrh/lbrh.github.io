import { useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import ToolboxShell from '@/components/toolbox/ToolboxShell';
import { LONG_DISTANCE_MARKS, type CourseMark } from '@/data/longDistanceMarks';
import { haversineNm, toMagnetic, trueBearing } from '@/lib/geo';

const CoursePlannerMap = dynamic(() => import('@/components/toolbox/CoursePlannerMap'), {
  ssr: false,
});

const HTML2CANVAS_SRC = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';

type Html2Canvas = (el: HTMLElement, opts?: Record<string, unknown>) => Promise<HTMLCanvasElement>;

/** Loaded from a CDN on first use rather than bundled, so the PNG export
 *  doesn't add weight to every page load for a rarely-used feature. */
function loadHtml2Canvas(): Promise<Html2Canvas> {
  const w = window as typeof window & { html2canvas?: Html2Canvas };
  if (w.html2canvas) return Promise.resolve(w.html2canvas);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = HTML2CANVAS_SRC;
    script.onload = () => (w.html2canvas ? resolve(w.html2canvas) : reject(new Error('html2canvas failed to load.')));
    script.onerror = () => reject(new Error('Could not load the PNG export library — check your connection.'));
    document.head.appendChild(script);
  });
}

const escXml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      (
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }) as Record<string, string>
      )[c],
  );

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function CoursePlanner() {
  const [route, setRoute] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [routeName, setRouteName] = useState('Long Distance Race');
  const [exportingPng, setExportingPng] = useState(false);
  const [exportError, setExportError] = useState('');
  const [nautical, setNautical] = useState(false);
  const [customMarks, setCustomMarks] = useState<CourseMark[]>([]);
  const [addingMark, setAddingMark] = useState(false);
  const [placingMark, setPlacingMark] = useState(false);
  const [newMarkName, setNewMarkName] = useState('');
  const [newMarkLat, setNewMarkLat] = useState('');
  const [newMarkLng, setNewMarkLng] = useState('');
  const [markError, setMarkError] = useState('');
  const mapWrapRef = useRef<HTMLDivElement>(null);

  const allMarks = useMemo(() => [...LONG_DISTANCE_MARKS, ...customMarks], [customMarks]);

  const byName = useMemo(() => new Map(allMarks.map((m) => [m.name, m])), [allMarks]);

  const legs = useMemo(() => {
    const rows: { from: string; to: string; nm: number; magHdg: number }[] = [];
    for (let i = 0; i < route.length - 1; i++) {
      const a = byName.get(route[i]);
      const b = byName.get(route[i + 1]);
      if (a && b) {
        rows.push({
          from: route[i],
          to: route[i + 1],
          nm: haversineNm(a.lat, a.lng, b.lat, b.lng),
          magHdg: toMagnetic(trueBearing(a.lat, a.lng, b.lat, b.lng)),
        });
      }
    }
    return rows;
  }, [route, byName]);

  const totalNm = legs.reduce((s, l) => s + l.nm, 0);

  const filtered = allMarks.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()),
  );

  const addMark = (name: string) => setRoute((r) => [...r, name]);
  const removeAt = (i: number) => setRoute((r) => r.filter((_, idx) => idx !== i));
  const clearRoute = () => setRoute([]);

  const startAddingMark = () => {
    setAddingMark(true);
    setPlacingMark(false);
    setNewMarkName('');
    setNewMarkLat('');
    setNewMarkLng('');
    setMarkError('');
  };

  const cancelAddingMark = () => {
    setAddingMark(false);
    setPlacingMark(false);
    setMarkError('');
  };

  const onPlacePick = (lat: number, lng: number) => {
    setNewMarkLat(lat.toFixed(5));
    setNewMarkLng(lng.toFixed(5));
    setPlacingMark(false);
  };

  const confirmNewMark = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newMarkName.trim();
    if (!name) {
      setMarkError('Enter a name for the mark.');
      return;
    }
    if (allMarks.some((m) => m.name.toLowerCase() === name.toLowerCase())) {
      setMarkError('A mark with that name already exists.');
      return;
    }
    const lat = Number(newMarkLat);
    const lng = Number(newMarkLng);
    if (!newMarkLat || !newMarkLng || Number.isNaN(lat) || Number.isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setMarkError('Enter valid coordinates, or pick a point on the map.');
      return;
    }
    setCustomMarks((prev) => [...prev, { name, description: 'Custom mark', light: '—', lat, lng, custom: true }]);
    setAddingMark(false);
    setPlacingMark(false);
    setMarkError('');
  };

  const safeName = () => routeName.trim().replace(/[\\/:*?"<>|]+/g, '-') || 'course';

  const downloadCsv = () => {
    if (legs.length === 0) return;
    const header = 'Route,From,To,NM,MagHdg\n';
    const rows = legs
      .map(
        (l) =>
          `${JSON.stringify(routeName)},${JSON.stringify(l.from)},${JSON.stringify(l.to)},${l.nm.toFixed(2)},${Math.round(l.magHdg)}`,
      )
      .join('\n');
    download(new Blob([header + rows], { type: 'text/csv' }), `${safeName()}.csv`);
  };

  const downloadGpx = () => {
    if (legs.length === 0) return;
    const points = route.map((n) => byName.get(n)).filter((m): m is CourseMark => !!m);
    const wpts = points
      .map(
        (m) => `  <wpt lat="${m.lat}" lon="${m.lng}">
    <name>${escXml(m.name)}</name>
    <desc>${escXml(m.description)}</desc>
  </wpt>`,
      )
      .join('\n');
    const rtepts = points
      .map(
        (m) => `      <rtept lat="${m.lat}" lon="${m.lng}">
        <name>${escXml(m.name)}</name>
      </rtept>`,
      )
      .join('\n');
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="LBRH Toolbox" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escXml(routeName)}</name>
    <time>${new Date().toISOString()}</time>
  </metadata>
${wpts}
  <rte>
    <name>${escXml(routeName)}</name>
${rtepts}
  </rte>
</gpx>`;
    download(new Blob([gpx], { type: 'application/gpx+xml' }), `${safeName()}.gpx`);
  };

  const exportPng = async () => {
    if (legs.length === 0 || !mapWrapRef.current) return;
    setExportingPng(true);
    setExportError('');
    try {
      const html2canvas = await loadHtml2Canvas();
      const mapCanvas = await html2canvas(mapWrapRef.current, {
        useCORS: true,
        backgroundColor: '#ffffff',
        scale: 1,
      });

      const pad = 24;
      const rowH = 22;
      const titleH = 34;
      const colHeadH = 30;
      const totalLineH = 40;
      const legsH = pad + titleH + colHeadH + route.length * rowH + totalLineH + pad;

      const out = document.createElement('canvas');
      out.width = mapCanvas.width;
      out.height = mapCanvas.height + legsH;
      const ctx = out.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D is unavailable in this browser.');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.drawImage(mapCanvas, 0, 0);

      const w = out.width;
      const colIdx = pad;
      const colMark = pad + 34;
      const colLeg = w * 0.36;
      const colHdg = w * 0.8;
      const colNm = w - pad;
      let y = mapCanvas.height + pad + titleH * 0.6;

      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#111111';
      ctx.font = 'bold 18px Arial, sans-serif';
      ctx.fillText(routeName, pad, y);

      y = mapCanvas.height + pad + titleH + colHeadH * 0.65;
      ctx.font = 'bold 12px Arial, sans-serif';
      ctx.fillStyle = '#666666';
      ctx.fillText('#', colIdx, y);
      ctx.fillText('Mark', colMark, y);
      ctx.fillText('Leg', colLeg, y);
      ctx.textAlign = 'right';
      ctx.fillText('Mag Hdg', colHdg, y);
      ctx.fillText('NM', colNm, y);
      ctx.textAlign = 'left';

      y += 10;
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(w - pad, y);
      ctx.stroke();

      ctx.font = '13px Arial, sans-serif';
      ctx.fillStyle = '#111111';
      route.forEach((name, i) => {
        y += rowH;
        ctx.fillText(String(i + 1), colIdx, y);
        ctx.fillText(name, colMark, y);
        if (i > 0) {
          ctx.fillText(`${route[i - 1]} → ${name}`, colLeg, y);
          ctx.textAlign = 'right';
          ctx.fillText(`${Math.round(legs[i - 1].magHdg)}°M`, colHdg, y);
          ctx.fillText(legs[i - 1].nm.toFixed(2), colNm, y);
          ctx.textAlign = 'left';
        }
      });

      y += 14;
      ctx.strokeStyle = '#111111';
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(w - pad, y);
      ctx.stroke();

      y += totalLineH * 0.65;
      ctx.font = 'bold 15px Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`Total course length: ${totalNm.toFixed(2)} NM`, w - pad, y);
      ctx.textAlign = 'left';

      out.toBlob((blob) => {
        if (blob) download(blob, `${safeName()}.png`);
      }, 'image/png');
    } catch (e) {
      setExportError(`Could not export the PNG: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setExportingPng(false);
    }
  };

  return (
    <ToolboxShell
      eyebrow="Tool 03"
      title="Course Planner"
      description="Plot long-distance sailing courses across the bay and calculate leg distances in nautical miles."
    >
      <h1 className="tb-display tb-anim-rise text-[26px] leading-tight">
        Course Planner
      </h1>
      <p className="tb-anim-rise mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--tb-text-muted)]" style={{ animationDelay: '0.04s' }}>
        Click marks on the chart, in order, to lay a long-distance course. Each leg&apos;s
        great-circle distance and magnetic heading (~11.5°E variation applied, reference only)
        is logged below in nautical miles.
      </p>

      <div className="tb-anim-rise mt-8 grid gap-6 lg:grid-cols-[280px_1fr]" style={{ animationDelay: '0.08s' }}>
        {/* Sidebar */}
        <div className="tb-card p-4">
          <input
            type="text"
            placeholder="Search marks…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="tb-input w-full px-3 py-2 text-sm"
          />
          <div className="mt-3 max-h-72 overflow-y-auto pr-1">
            {filtered.map((m) => (
              <button
                key={m.name}
                onClick={() => addMark(m.name)}
                className="block w-full border-b border-[var(--tb-border)]/60 py-2 text-left text-[13px] transition hover:text-[var(--tb-accent)]"
              >
                <span className="font-semibold">
                  {m.name}
                  {m.custom && <span className="ml-1.5 text-[9px] uppercase tracking-wide text-[#8b5cf6]">Custom</span>}
                </span>
                <span className="block text-[11px] text-[var(--tb-text-muted)]">
                  {m.description}
                  {m.custom && ` · ${m.lat.toFixed(5)}, ${m.lng.toFixed(5)}`}
                </span>
              </button>
            ))}
          </div>

          <div className="tb-rule my-4" />

          <label className="tb-eyebrow block">Custom mark</label>
          {!addingMark ? (
            <button onClick={startAddingMark} className="tb-btn-ghost mt-2 w-full px-3 py-2 text-xs">
              + Add mark
            </button>
          ) : (
            <form onSubmit={confirmNewMark} className="mt-2 space-y-2">
              <input
                type="text"
                placeholder="Mark name"
                value={newMarkName}
                onChange={(e) => setNewMarkName(e.target.value)}
                className="tb-input w-full px-2 py-1.5 text-xs"
                autoFocus
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Lat"
                  value={newMarkLat}
                  onChange={(e) => setNewMarkLat(e.target.value)}
                  className="tb-input w-full px-2 py-1.5 text-xs"
                />
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Lng"
                  value={newMarkLng}
                  onChange={(e) => setNewMarkLng(e.target.value)}
                  className="tb-input w-full px-2 py-1.5 text-xs"
                />
              </div>
              <button
                type="button"
                onClick={() => setPlacingMark((p) => !p)}
                className={`w-full px-2 py-1.5 text-[11px] ${placingMark ? 'tb-btn' : 'tb-btn-ghost'}`}
              >
                {placingMark ? 'Click the map to set the point…' : 'Pick point on map'}
              </button>
              {markError && <p className="text-[11px] text-[var(--tb-danger)]">{markError}</p>}
              <div className="grid grid-cols-2 gap-2">
                <button type="submit" className="tb-btn px-2 py-1.5 text-xs">
                  Add
                </button>
                <button type="button" onClick={cancelAddingMark} className="tb-btn-ghost px-2 py-1.5 text-xs">
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="tb-rule my-4" />

          <label className="tb-eyebrow block">
            Route name
          </label>
          <input
            type="text"
            value={routeName}
            onChange={(e) => setRouteName(e.target.value)}
            className="tb-input mt-1 w-full px-3 py-2 text-sm"
          />

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={clearRoute} className="tb-btn-ghost px-3 py-2 text-xs">
              Clear
            </button>
            <button
              onClick={downloadCsv}
              disabled={legs.length === 0}
              className="tb-btn px-3 py-2 text-xs"
            >
              Export CSV
            </button>
            <button
              onClick={downloadGpx}
              disabled={legs.length === 0}
              className="tb-btn-ghost px-3 py-2 text-xs"
            >
              Export GPX
            </button>
            <button
              onClick={exportPng}
              disabled={legs.length === 0 || exportingPng}
              className="tb-btn-ghost px-3 py-2 text-xs"
            >
              {exportingPng ? 'Rendering…' : 'Export PNG'}
            </button>
          </div>
          <p className="mt-2 text-[10.5px] leading-relaxed text-[var(--tb-text-muted)]">
            GPX carries waypoints and a route for import into Navionics or a chartplotter. PNG
            renders the map with the leg table and total distance beneath it.
          </p>
          {exportError && (
            <p className="mt-3 rounded-[3px] border border-[var(--tb-danger)]/40 bg-[#fef3f2] p-2 text-[11px] text-[var(--tb-danger)]">
              {exportError}
            </p>
          )}
        </div>

        {/* Map */}
        <div className="tb-card overflow-hidden">
          <div className="flex items-center justify-end border-b border-[var(--tb-border)] px-3 py-2">
            <label className="flex items-center gap-1.5 text-[11px]">
              <input
                type="checkbox"
                checked={nautical}
                onChange={(e) => setNautical(e.target.checked)}
              />
              Nautical chart overlay
            </label>
          </div>
          <div ref={mapWrapRef} className="h-[420px] sm:h-[480px]">
            <CoursePlannerMap
              marks={allMarks}
              route={route}
              onMarkClick={addMark}
              nautical={nautical}
              placing={placingMark}
              onPlacePick={onPlacePick}
            />
          </div>
        </div>
      </div>

      {/* Route table */}
      <div className="tb-anim-rise mt-8" style={{ animationDelay: '0.12s' }}>
        <div className="flex items-baseline justify-between">
          <h2 className="tb-display text-[16px]">Leg by leg</h2>
          <span className="tb-mono text-[13px] font-medium text-[var(--tb-text)]">
            {route.length === 0 ? 'No marks selected' : `${totalNm.toFixed(2)} NM total`}
          </span>
        </div>

        {route.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--tb-text-muted)]">
            Click marks on the chart to start building a route.
          </p>
        ) : (
          <div className="tb-card mt-3 overflow-hidden">
            <table className="tb-table">
              <thead>
                <tr>
                  <th className="w-10">#</th>
                  <th>Mark</th>
                  <th>Leg</th>
                  <th className="text-right">Mag Hdg</th>
                  <th className="text-right">NM</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {route.map((name, i) => (
                  <tr key={i}>
                    <td className="tb-mono text-[var(--tb-text-muted)]">{i + 1}</td>
                    <td className="font-medium">{name}</td>
                    <td className="text-[var(--tb-text-muted)]">
                      {i > 0 ? `${route[i - 1]} → ${name}` : '—'}
                    </td>
                    <td className="tb-mono text-right">
                      {i > 0 ? `${Math.round(legs[i - 1].magHdg)}°M` : '—'}
                    </td>
                    <td className="tb-mono text-right">{i > 0 ? legs[i - 1]?.nm.toFixed(2) : '—'}</td>
                    <td className="text-right">
                      <button
                        onClick={() => removeAt(i)}
                        className="text-[12px] text-[var(--tb-danger)] hover:underline"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ToolboxShell>
  );
}
