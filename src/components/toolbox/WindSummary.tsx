import { useEffect, useState } from 'react';
import Link from 'next/link';
import { WIND_STATIONS } from '@/data/windStations';
import { BAND_COLOUR, BAND_LABEL, bandForGust } from '@/lib/windBands';
import { formatDirection } from '@/lib/compass';
import { fetchStationWind, withLiveReading, type StationData } from '@/lib/windStationsApi';
import { fetchLiveBomData, resetLiveBomCache } from '@/lib/liveBom';

const REFRESH_MS = 10 * 60 * 1000;

type StationState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ok'; data: StationData };

export default function WindSummary() {
  const [states, setStates] = useState<Record<string, StationState>>({});
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
        .catch(() => setStates((prev) => ({ ...prev, [station.id]: { status: 'error' } })));
    });
    setLastRefreshed(new Date());
  };

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, REFRESH_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="tb-eyebrow">Port Phillip Wind · Right Now</span>
        <div className="flex items-baseline gap-2">
          <span className="tb-mono text-[10.5px] text-[var(--tb-text-faint)]">
            {lastRefreshed ? `Updated ${lastRefreshed.toLocaleTimeString('en-AU')}` : ''}
          </span>
          <button onClick={loadAll} className="tb-btn-ghost px-2.5 py-1 text-[11px]">
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {WIND_STATIONS.map((station) => {
          const state = states[station.id];
          const band = state?.status === 'ok' ? bandForGust(state.data.current.gust) : null;
          return (
            <Link
              key={station.id}
              href={`/toolbox/wind-stations?station=${station.id}`}
              className="tb-card tb-tool-card block p-3.5 text-left"
              style={{ borderLeftWidth: 4, borderLeftColor: band ? BAND_COLOUR[band] : 'var(--tb-border)' }}
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
                    <span className="tb-display text-[24px] leading-none">
                      {Math.round(state.data.current.wind)}
                    </span>
                    <span className="text-[11px] text-[var(--tb-text-muted)]">kt</span>
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
            </Link>
          );
        })}
      </div>
    </div>
  );
}
