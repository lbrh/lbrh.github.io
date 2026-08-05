import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import ToolboxShell from '@/components/toolbox/ToolboxShell';
import { WIND_STATIONS } from '@/data/windStations';
import { BAND_COLOUR, BAND_LABEL, bandForGust } from '@/lib/windBands';
import { formatDirection } from '@/lib/compass';
import { fetchStationWind, withLiveReading, type StationData } from '@/lib/windStationsApi';
import { fetchLiveBomData, resetLiveBomCache } from '@/lib/liveBom';
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

function DetailChart({ hourly, fromIndex }: { hourly: StationData['hourly']; fromIndex: number }) {
  const times = hourly.time.slice(fromIndex, fromIndex + 24);
  const wind = hourly.wind.slice(fromIndex, fromIndex + 24);
  const gusts = hourly.gust.slice(fromIndex, fromIndex + 24);
  if (times.length === 0) return null;

  const W = 720;
  const H = 260;
  const pad = { top: 16, right: 16, bottom: 42, left: 34 };
  const maxY = Math.max(...gusts, ...wind, 10) * 1.1;
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const x = (i: number) => pad.left + (i / (times.length - 1 || 1)) * innerW;
  const y = (v: number) => pad.top + innerH - (v / maxY) * innerH;
  const path = (vals: number[]) => vals.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}`).join(' ');

  const yTicks = 4;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const v = (maxY / yTicks) * i;
        return (
          <g key={i}>
            <line x1={pad.left} x2={W - pad.right} y1={y(v)} y2={y(v)} stroke="#e3e6ea" />
            <text x={pad.left - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#5b6470">
              {Math.round(v)}
            </text>
          </g>
        );
      })}
      {times.map((t, i) =>
        i % 3 === 0 ? (
          <text
            key={i}
            x={x(i)}
            y={H - pad.bottom + 16}
            textAnchor="end"
            fontSize="9"
            fill="#5b6470"
            transform={`rotate(-45 ${x(i)} ${H - pad.bottom + 16})`}
          >
            {t.slice(11, 16)}
          </text>
        ) : null,
      )}
      <path d={path(wind)} fill="none" stroke="#1a56a8" strokeWidth="2" />
      <path d={path(gusts)} fill="none" stroke="#b42318" strokeWidth="2" />
      <g fontSize="11">
        <rect x={pad.left + 4} y={pad.top} width="12" height="3" fill="#1a56a8" />
        <text x={pad.left + 22} y={pad.top + 4} fill="#1b1f24">Wind (kt)</text>
        <rect x={pad.left + 104} y={pad.top} width="12" height="3" fill="#b42318" />
        <text x={pad.left + 122} y={pad.top + 4} fill="#1b1f24">Gusts (kt)</text>
      </g>
    </svg>
  );
}

export default function WindStations() {
  const router = useRouter();
  const [states, setStates] = useState<Record<string, StationState>>({});
  const [selected, setSelected] = useState<string>(WIND_STATIONS[0].id);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const loadAll = () => {
    const initial: Record<string, StationState> = {};
    WIND_STATIONS.forEach((s) => {
      initial[s.id] = { status: 'loading' };
    });
    setStates(initial);

    resetLiveBomCache();
    const live = fetchLiveBomData();

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

  return (
    <ToolboxShell
      title="Wind Stations"
      description="Current wind speed, gusts and direction at six reference points around Port Phillip, with a detailed 24-hour view for each."
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="tb-display tb-anim-rise text-[26px] leading-tight">Wind Stations</h1>
          <p
            className="tb-anim-rise mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--tb-text-muted)]"
            style={{ animationDelay: '0.04s' }}
          >
            Wind speed, gusts and direction at six points spread across Port Phillip, colour-coded by
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
        </div>
      </div>

      <div
        className="tb-anim-rise mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
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

            <h3 className="tb-display mb-2 mt-6 text-[14px]">Next 24 Hours</h3>
            <DetailChart hourly={selectedState.data.hourly} fromIndex={selectedFromIndex} />

            <p className="tb-mono mt-3 text-[11px] text-[var(--tb-text-faint)]">
              Last updated {selectedState.data.current.time.replace('T', ' ')} ·{' '}
              {selectedState.data.current.source === 'bom'
                ? 'live reading from a BOM automatic weather station'
                : 'modelled estimate, not a direct BOM station feed'}
              . 24-hour outlook is always modelled.
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
