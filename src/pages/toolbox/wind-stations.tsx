import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import ToolboxShell from '@/components/toolbox/ToolboxShell';
import { WIND_STATIONS } from '@/data/windStations';
import { BAND_COLOUR, BAND_LABEL, bandForGust } from '@/lib/windBands';
import { formatDirection, toCompass } from '@/lib/compass';
import { fetchStationWind, withLiveReading, type StationData } from '@/lib/windStationsApi';
import { fetchLiveBomData, resetLiveBomCache, liveAgeMinutes, LIVE_STALE_MINUTES } from '@/lib/liveBom';
import type { StationMapReading } from '@/components/toolbox/WindStationsMap';

const WindStationsMap = dynamic(() => import('@/components/toolbox/WindStationsMap'), { ssr: false });

const REFRESH_MS = 10 * 60 * 1000;

type StationState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; data: StationData };

function WindArrow({ dir, size = 22 }: { dir: number; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ transform: `rotate(${(dir + 180) % 360}deg)`, transition: 'transform 0.2s ease' }}
    >
      <path d="M12 2 L18 14 L12 10.5 L6 14 Z" fill="currentColor" />
    </svg>
  );
}

function evenIndices(length: number, count: number): number[] {
  if (length <= 1) return length === 1 ? [0] : [];
  const n = Math.min(count, length);
  return Array.from({ length: n }, (_, k) => Math.round((k / (n - 1)) * (length - 1)));
}

function formatDirWithLabel(deg: number | null): string {
  if (deg == null) return '';
  return `${Math.round(deg)}° (${toCompass(deg)})`;
}

// Compact chart used for both the historical (BOM) and predicted (modelled)
// panels — plain arrays rather than the hourly/fromIndex slicing style so
// either data source can feed it directly. Direction is shown as angle and
// cardinal label (e.g., "250° (WSW)") at evenly spaced points rather than
// arrows, since a wind bearing wraps at 360° and doesn't plot sensibly as
// a continuous line.
// textAnchor for an evenly-spaced tick: hug inward at the first/last mark
// instead of centering, so the label doesn't run past the chart edge.
function edgeAnchor(idx: number, count: number): 'start' | 'middle' | 'end' {
  if (idx === 0) return 'start';
  if (idx === count - 1) return 'end';
  return 'middle';
}

function WindChart({
  times,
  wind,
  gusts,
  dirs,
  maxY: maxYProp,
}: {
  times: string[];
  wind: number[];
  gusts: number[];
  dirs: (number | null)[];
  maxY?: number;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (times.length === 0) {
    return <p className="text-[13px] text-[var(--tb-text-muted)]">No data available.</p>;
  }

  const W = 560;
  const H = 230;
  const pad = { top: 26, right: 24, bottom: 34, left: 30 };
  const maxY = maxYProp ?? Math.max(...gusts, ...wind, 10) * 1.1;
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const x = (i: number) => pad.left + (i / (times.length - 1 || 1)) * innerW;
  const y = (v: number) => pad.top + innerH - (v / maxY) * innerH;
  const path = (vals: number[]) => vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}`).join(' ');

  const markIdx = evenIndices(times.length, 6);
  const yTicks = 4;

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const idx = Math.round(((svgX - pad.left) / innerW) * (times.length - 1));
    setHoverIdx(Math.min(times.length - 1, Math.max(0, idx)));
  };

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      onMouseMove={handleMove}
      onMouseLeave={() => setHoverIdx(null)}
    >
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const v = (maxY / yTicks) * i;
        return (
          <g key={i}>
            <line x1={pad.left} x2={W - pad.right} y1={y(v)} y2={y(v)} stroke="#e3e6ea" />
            <text x={pad.left - 5} y={y(v) + 3} textAnchor="end" fontSize="9" fill="#5b6470">
              {Math.round(v)}
            </text>
          </g>
        );
      })}

      {markIdx.map((i, k) => (
        <text
          key={`t${i}`}
          x={x(i)}
          y={H - pad.bottom + 14}
          textAnchor={edgeAnchor(k, markIdx.length)}
          fontSize="8.5"
          fill="#5b6470"
        >
          {times[i].slice(11, 16)}
        </text>
      ))}

      {markIdx.map((i, k) => {
        const dir = dirs[i];
        if (dir == null) return null;
        return (
          <text
            key={`d${i}`}
            x={x(i)}
            y={pad.top - 6}
            textAnchor={edgeAnchor(k, markIdx.length)}
            fontSize="8"
            fill="#8a929c"
            fontWeight="500"
          >
            {formatDirWithLabel(dir)}
          </text>
        );
      })}

      <path d={path(wind)} fill="none" stroke="#1a56a8" strokeWidth="1.75" />
      <path d={path(gusts)} fill="none" stroke="#b42318" strokeWidth="1.75" />

      <g fontSize="9">
        <rect x={pad.left} y={3} width="10" height="3" fill="#1a56a8" />
        <text x={pad.left + 13} y={6.5} fill="#1b1f24">Wind</text>
        <rect x={pad.left + 46} y={3} width="10" height="3" fill="#b42318" />
        <text x={pad.left + 59} y={6.5} fill="#1b1f24">Gusts</text>
      </g>

      {hoverIdx != null && (
        <g pointerEvents="none">
          <line x1={x(hoverIdx)} x2={x(hoverIdx)} y1={pad.top} y2={pad.top + innerH} stroke="#8a929c" strokeWidth="1" strokeDasharray="2,2" />
          <circle cx={x(hoverIdx)} cy={y(wind[hoverIdx])} r="3" fill="#1a56a8" />
          <circle cx={x(hoverIdx)} cy={y(gusts[hoverIdx])} r="3" fill="#b42318" />
          {(() => {
            const boxW = 96;
            const boxH = 38;
            const bx = Math.min(Math.max(x(hoverIdx) + 6, pad.left), W - pad.right - boxW);
            const by = Math.max(pad.top, y(Math.max(wind[hoverIdx], gusts[hoverIdx])) - boxH - 6);
            return (
              <g>
                <rect x={bx} y={by} width={boxW} height={boxH} fill="#ffffff" stroke="#cbd1d8" rx="2" />
                <text x={bx + 7} y={by + 13} fontSize="9.5" fontWeight="600" fill="#1b1f24">
                  {times[hoverIdx].slice(11, 16)}
                </text>
                <text x={bx + 7} y={by + 25} fontSize="9" fill="#1a56a8">
                  Wind {Math.round(wind[hoverIdx])} kt
                </text>
                <text x={bx + 7} y={by + 36} fontSize="9" fill="#b42318">
                  Gusting {Math.round(gusts[hoverIdx])} kt
                </text>
              </g>
            );
          })()}
        </g>
      )}
    </svg>
  );
}

export default function WindStations() {
  const router = useRouter();
  const [states, setStates] = useState<Record<string, StationState>>({});
  const [selected, setSelected] = useState<string>(WIND_STATIONS[0].id);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [liveAge, setLiveAge] = useState<number | null>(null);

  const loadAll = () => {
    const initial: Record<string, StationState> = {};
    WIND_STATIONS.forEach((s) => {
      initial[s.id] = { status: 'loading' };
    });
    setStates(initial);

    resetLiveBomCache();
    const live = fetchLiveBomData();
    live.then((d) => setLiveAge(liveAgeMinutes(d)));

    WIND_STATIONS.forEach((station) => {
      Promise.all([fetchStationWind(station), live])
        .then(([data, liveData]) => {
          const merged = withLiveReading(data, liveData?.stations[station.id]);
          setStates((prev) => ({ ...prev, [station.id]: { status: 'ok', data: merged } }));
        })
        .catch((e) =>
          setStates((prev) => ({
            ...prev,
            [station.id]: { status: 'error', message: e instanceof Error ? e.message : String(e) },
          })),
        );
    });
    setLastRefreshed(new Date());
  };

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, REFRESH_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!router.isReady) return;
    const q = router.query.station;
    const id = typeof q === 'string' ? q : undefined;
    if (id && WIND_STATIONS.some((s) => s.id === id)) {
      setSelected(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.station]);

  const selectedStation = WIND_STATIONS.find((s) => s.id === selected)!;
  const selectedState = states[selected];

  const mapReadings = useMemo(() => {
    const readings: Record<string, StationMapReading | undefined> = {};
    WIND_STATIONS.forEach((s) => {
      const state = states[s.id];
      if (state?.status === 'ok') {
        readings[s.id] = {
          wind: state.data.current.wind,
          gust: state.data.current.gust,
          dir: state.data.current.dir,
          band: bandForGust(state.data.current.gust),
        };
      }
    });
    return readings;
  }, [states]);

  const selectedFromIndex =
    selectedState?.status === 'ok'
      ? Math.max(0, selectedState.data.hourly.time.indexOf(selectedState.data.current.time.slice(0, 13) + ':00'))
      : 0;
  const selectedWave =
    selectedState?.status === 'ok' ? selectedState.data.hourly.wave[selectedFromIndex] : undefined;

  const history = selectedState?.status === 'ok' ? selectedState.data.bomHistory ?? [] : [];
  const historicalTimes = history.map((h) => h.time);
  const historicalWind = history.map((h) => h.windKt);
  const historicalGusts = history.map((h) => h.gustKt);
  const historicalDirs = history.map((h) => h.dirDeg);

  // Wind/dir now come in at 15-minute steps (see windStationsApi.ts), so
  // "next 24h" is 96 steps, not 24.
  const PREDICTED_STEPS = 24 * 4;
  const predictedTimes =
    selectedState?.status === 'ok'
      ? selectedState.data.hourly.time.slice(selectedFromIndex, selectedFromIndex + PREDICTED_STEPS)
      : [];
  const predictedWind =
    selectedState?.status === 'ok'
      ? selectedState.data.hourly.wind.slice(selectedFromIndex, selectedFromIndex + PREDICTED_STEPS)
      : [];
  const predictedGusts =
    selectedState?.status === 'ok'
      ? selectedState.data.hourly.gust.slice(selectedFromIndex, selectedFromIndex + PREDICTED_STEPS)
      : [];
  const predictedDirs: (number | null)[] =
    selectedState?.status === 'ok'
      ? selectedState.data.hourly.dir.slice(selectedFromIndex, selectedFromIndex + PREDICTED_STEPS)
      : [];

  const chartMaxY =
    Math.max(...historicalGusts, ...historicalWind, ...predictedGusts, ...predictedWind, 10) * 1.1;

  return (
    <ToolboxShell
      title="Wind Stations"
      description="Current wind speed, gusts and direction at eight reference points around Port Phillip, with a detailed 24-hour view for each."
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="tb-display tb-anim-rise text-[26px] leading-tight">Wind Stations</h1>
          <p
            className="tb-anim-rise mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--tb-text-muted)]"
            style={{ animationDelay: '0.04s' }}
          >
            Wind speed, gusts and direction at eight points spread around Port Phillip, colour-coded by
            strength — real BOM station readings where one exists, modelled estimates elsewhere. Select a
            card or a marker on the map for its full 24-hour forecast.
          </p>
        </div>
        <div className="tb-anim-rise flex flex-col items-end gap-1" style={{ animationDelay: '0.04s' }}>
          <button onClick={loadAll} className="tb-btn-ghost px-3 py-1.5 text-xs">
            Refresh
          </button>
          <span className="tb-mono text-[10.5px] text-[var(--tb-text-faint)]">
            Auto-refreshes every 10 min
            {lastRefreshed ? ` · last ${lastRefreshed.toLocaleTimeString('en-AU')}` : ''}
          </span>
          {liveAge != null && liveAge >= LIVE_STALE_MINUTES && (
            <span className="tb-mono text-[10.5px] text-[var(--tb-warn)]">
              BOM feed stale — last updated {liveAge} min ago
            </span>
          )}
        </div>
      </div>

      <div
        className="tb-anim-rise mt-7 grid grid-cols-2 gap-3 sm:grid-cols-5"
        style={{ animationDelay: '0.08s' }}
      >
        {WIND_STATIONS.map((station) => {
          const state = states[station.id];
          const isActive = station.id === selected;
          const band = state?.status === 'ok' ? bandForGust(state.data.current.gust) : null;
          return (
            <button
              key={station.id}
              onClick={() => setSelected(station.id)}
              className="tb-card p-3.5 text-left transition"
              style={{
                borderColor: isActive ? 'var(--tb-accent)' : 'var(--tb-border)',
                background: isActive ? 'var(--tb-accent-soft)' : 'var(--tb-bg)',
                borderLeftWidth: 4,
                borderLeftColor: band ? BAND_COLOUR[band] : 'var(--tb-border)',
              }}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="tb-eyebrow truncate">{station.name}</span>
                {state?.status === 'ok' && (
                  <span
                    className="tb-mono shrink-0 text-[9px] font-medium uppercase tracking-wide"
                    style={{ color: state.data.current.source === 'bom' ? 'var(--tb-ok)' : 'var(--tb-text-faint)' }}
                  >
                    {state.data.current.source === 'bom' ? 'Live' : 'Modelled'}
                  </span>
                )}
              </div>

              {state?.status === 'ok' ? (
                <>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="tb-display text-[26px] leading-none">
                      {Math.round(state.data.current.wind)}
                    </span>
                    <span className="text-[11px] text-[var(--tb-text-muted)]">kt</span>
                    <span className="ml-1 text-[var(--tb-accent)]">
                      <WindArrow dir={state.data.current.dir} size={16} />
                    </span>
                  </div>
                  <p className="mt-1 text-[11.5px] text-[var(--tb-text-muted)]">
                    Gusting {Math.round(state.data.current.gust)} kt
                  </p>
                  <p className="tb-mono mt-0.5 text-[11px] text-[var(--tb-text-muted)]">
                    {formatDirection(state.data.current.dir)}
                  </p>
                  {band && (
                    <p
                      className="tb-mono mt-1.5 text-[10px] font-medium uppercase tracking-wide"
                      style={{ color: BAND_COLOUR[band] }}
                    >
                      {BAND_LABEL[band]}
                    </p>
                  )}
                </>
              ) : state?.status === 'error' ? (
                <p className="mt-2 text-[11.5px] text-[var(--tb-danger)]">Unavailable</p>
              ) : (
                <p className="tb-mono mt-2 text-[11.5px] text-[var(--tb-text-faint)]">Loading…</p>
              )}
            </button>
          );
        })}
      </div>

      <div className="tb-anim-rise tb-card mt-6 h-[360px] overflow-hidden sm:h-[440px]" style={{ animationDelay: '0.1s' }}>
        <WindStationsMap
          stations={WIND_STATIONS}
          readings={mapReadings}
          selected={selected}
          onSelect={setSelected}
        />
      </div>

      <div className="tb-anim-rise tb-card mt-6 p-6" style={{ animationDelay: '0.12s' }}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="tb-display text-[18px]">{selectedStation.name}</h2>
              {selectedState?.status === 'ok' && (
                <span
                  className="tb-mono text-[10px] font-medium uppercase tracking-wide"
                  style={{
                    color: selectedState.data.current.source === 'bom' ? 'var(--tb-ok)' : 'var(--tb-text-faint)',
                  }}
                >
                  {selectedState.data.current.source === 'bom' ? 'Live BOM station' : 'Modelled'}
                </span>
              )}
            </div>
            <p className="mt-1 text-[13px] text-[var(--tb-text-muted)]">{selectedStation.description}</p>
          </div>
          <span className="tb-mono text-[11px] text-[var(--tb-text-faint)]">
            {selectedStation.lat.toFixed(4)}°, {selectedStation.lng.toFixed(4)}°
          </span>
        </div>

        {selectedState?.status === 'ok' ? (
          <>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:max-w-lg">
              <div className="tb-panel p-3 text-center">
                <span className="tb-eyebrow">Wind</span>
                <p className="tb-display mt-1 text-[22px]">{Math.round(selectedState.data.current.wind)} kt</p>
              </div>
              <div className="tb-panel p-3 text-center">
                <span className="tb-eyebrow">Gusts</span>
                <p className="tb-display mt-1 text-[22px]">{Math.round(selectedState.data.current.gust)} kt</p>
              </div>
              <div className="tb-panel flex flex-col items-center justify-center p-3 text-center">
                <span className="tb-eyebrow">Direction</span>
                <div className="mt-1 flex items-center gap-1.5 text-[var(--tb-accent)]">
                  <WindArrow dir={selectedState.data.current.dir} />
                  <span className="tb-display text-[15px] text-[var(--tb-text)]">
                    {formatDirection(selectedState.data.current.dir)}
                  </span>
                </div>
              </div>
              <div className="tb-panel p-3 text-center">
                <span className="tb-eyebrow">Wave</span>
                <p className="tb-display mt-1 text-[22px]">
                  {typeof selectedWave === 'number' && !Number.isNaN(selectedWave)
                    ? `${selectedWave.toFixed(1)} m`
                    : '—'}
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div>
                <h3 className="tb-display mb-2 text-[14px]">Historical — Last 24h (BOM)</h3>
                <WindChart
                  times={historicalTimes}
                  wind={historicalWind}
                  gusts={historicalGusts}
                  dirs={historicalDirs}
                  maxY={chartMaxY}
                />
              </div>
              <div>
                <h3 className="tb-display mb-2 text-[14px]">Predicted — Next 24h (Modelled)</h3>
                <WindChart
                  times={predictedTimes}
                  wind={predictedWind}
                  gusts={predictedGusts}
                  dirs={predictedDirs}
                  maxY={chartMaxY}
                />
              </div>
            </div>

            <p className="tb-mono mt-3 text-[11px] text-[var(--tb-text-faint)]">
              Last updated {selectedState.data.current.time.replace('T', ' ')} ·{' '}
              {selectedState.data.current.source === 'bom'
                ? 'live reading from a BOM automatic weather station'
                : 'modelled estimate, not a direct BOM station feed'}
              . Historical chart is real BOM observations; predicted chart is always modelled.
            </p>
          </>
        ) : selectedState?.status === 'error' ? (
          <p className="mt-4 border border-[var(--tb-danger)]/40 p-3 text-sm text-[var(--tb-danger)]">
            Could not fetch forecast: {selectedState.message}
          </p>
        ) : (
          <p className="tb-mono mt-4 text-[12px] text-[var(--tb-text-faint)]">Loading…</p>
        )}
      </div>
    </ToolboxShell>
  );
}
