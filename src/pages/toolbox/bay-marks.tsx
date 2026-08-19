import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import ToolboxShell from '@/components/toolbox/ToolboxShell';
import { PORT_PHILLIP_MARKS, MARK_CATEGORY_COLOUR, type Mark } from '@/data/portPhillipMarks';

const BayMarksMap = dynamic(() => import('@/components/toolbox/BayMarksMap'), { ssr: false });

const CATEGORIES = Object.keys(MARK_CATEGORY_COLOUR) as Mark['category'][];

export default function BayMarks() {
  const [search, setSearch] = useState('');
  const [active, setActive] = useState<Set<Mark['category']>>(new Set());
  const [nautical, setNautical] = useState(false);

  const filtered = useMemo(() => {
    return PORT_PHILLIP_MARKS.filter((m) => {
      if (search && !`${m.name} ${m.description}`.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      if (active.size > 0 && !active.has(m.category)) return false;
      return true;
    });
  }, [search, active]);

  const toggleCategory = (c: Mark['category']) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  };

  return (
    <ToolboxShell
      eyebrow="Tool 04"
      title="Bay Marks"
      description="A searchable reference chart of Port Phillip Bay's navigation marks, buoys and piles."
    >
      <h1 className="tb-display tb-anim-rise text-[26px] leading-tight">
        Bay Marks
      </h1>
      <p className="tb-anim-rise mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--tb-text-muted)]" style={{ animationDelay: '0.04s' }}>
        {PORT_PHILLIP_MARKS.length} navigation marks from the Port Phillip course book — searchable
        and colour-coded by type.
      </p>

      <div className="tb-anim-rise mt-8 grid gap-6 lg:grid-cols-[280px_1fr]" style={{ animationDelay: '0.08s' }}>
        {/* Sidebar */}
        <div className="tb-card p-4">
          <input
            type="text"
            placeholder="Search by name or type…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="tb-input w-full px-3 py-2 text-sm"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => toggleCategory(c)}
                className="tb-mono flex items-center gap-1.5 border px-2 py-1 text-[10px] uppercase tracking-wide transition"
                style={{
                  borderColor: active.has(c) ? MARK_CATEGORY_COLOUR[c] : 'var(--tb-border)',
                  background: active.has(c) ? MARK_CATEGORY_COLOUR[c] : 'transparent',
                  color: active.has(c) ? '#ffffff' : 'var(--tb-text-muted)',
                }}
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: MARK_CATEGORY_COLOUR[c] }}
                />
                {c}
              </button>
            ))}
          </div>

          <p className="tb-mono mt-4 text-[11px] text-[var(--tb-text-muted)]">
            Showing {filtered.length} of {PORT_PHILLIP_MARKS.length} marks
          </p>

          <div className="tb-rule my-4" />

          <div className="max-h-80 overflow-y-auto pr-1">
            {filtered.map((m) => (
              <div key={m.name} className="border-b border-[var(--tb-border)]/60 py-2 text-[13px]">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-[var(--tb-text)]/30"
                    style={{ background: MARK_CATEGORY_COLOUR[m.category] }}
                  />
                  <span className="font-semibold">{m.name}</span>
                </div>
                <span className="mt-0.5 block pl-4 text-[11px] text-[var(--tb-text-muted)]">
                  {m.description}
                </span>
              </div>
            ))}
          </div>
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
          <div className="h-[420px] sm:h-[520px]">
            <BayMarksMap marks={filtered} nautical={nautical} />
          </div>
        </div>
      </div>
    </ToolboxShell>
  );
}
