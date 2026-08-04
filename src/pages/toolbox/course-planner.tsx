import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import ToolboxShell from '@/components/toolbox/ToolboxShell';
import { LONG_DISTANCE_MARKS } from '@/data/longDistanceMarks';
import { haversineNm } from '@/lib/geo';

const CoursePlannerMap = dynamic(() => import('@/components/toolbox/CoursePlannerMap'), {
  ssr: false,
});

export default function CoursePlanner() {
  const [route, setRoute] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [routeName, setRouteName] = useState('Long Distance Race');

  const byName = useMemo(() => new Map(LONG_DISTANCE_MARKS.map((m) => [m.name, m])), []);

  const legs = useMemo(() => {
    const rows: { from: string; to: string; nm: number }[] = [];
    for (let i = 0; i < route.length - 1; i++) {
      const a = byName.get(route[i]);
      const b = byName.get(route[i + 1]);
      if (a && b) rows.push({ from: route[i], to: route[i + 1], nm: haversineNm(a.lat, a.lng, b.lat, b.lng) });
    }
    return rows;
  }, [route, byName]);

  const totalNm = legs.reduce((s, l) => s + l.nm, 0);

  const filtered = LONG_DISTANCE_MARKS.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase()),
  );

  const addMark = (name: string) => setRoute((r) => [...r, name]);
  const removeAt = (i: number) => setRoute((r) => r.filter((_, idx) => idx !== i));
  const clearRoute = () => setRoute([]);

  const downloadCsv = () => {
    if (legs.length === 0) return;
    const header = 'Route,From,To,NM\n';
    const rows = legs
      .map((l) => `${JSON.stringify(routeName)},${JSON.stringify(l.from)},${JSON.stringify(l.to)},${l.nm.toFixed(2)}`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${routeName.trim().replace(/[\\/:*?"<>|]+/g, '-') || 'course'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
        great-circle distance is logged below in nautical miles.
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
                <span className="font-semibold">{m.name}</span>
                <span className="block text-[11px] text-[var(--tb-text-muted)]">{m.description}</span>
              </button>
            ))}
          </div>

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

          <div className="mt-4 flex gap-2">
            <button onClick={clearRoute} className="tb-btn-ghost flex-1 px-3 py-2 text-xs">
              Clear
            </button>
            <button
              onClick={downloadCsv}
              disabled={legs.length === 0}
              className="tb-btn flex-1 px-3 py-2 text-xs"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Map */}
        <div className="tb-card h-[420px] overflow-hidden sm:h-[520px]">
          <CoursePlannerMap
            marks={LONG_DISTANCE_MARKS}
            route={route}
            onMarkClick={addMark}
          />
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
