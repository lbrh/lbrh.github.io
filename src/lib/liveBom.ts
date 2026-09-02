// Refreshed every ~5 minutes by cloudflare/bom-worker.js on a Cron
// Trigger and served with CORS headers straight from the edge — no
// backend of ours involved. (BOM returns 403 to every request from
// GitHub Actions' Azure IP ranges, which is why this isn't a GitHub
// Pages / raw.githubusercontent.com file like the rest of the site.)
//
const LIVE_DATA_URL = 'https://bom-puller.lbrhounsell.workers.dev';

export type LiveHistoryPoint = {
  time: string;
  windKt: number;
  gustKt: number;
  dirDeg: number | null;
};

export type LiveStationReading = {
  windKt: number;
  gustKt: number;
  dirCompass: string;
  dirDeg: number;
  airTemp: number | null;
  observedAt: string | null;
  history: LiveHistoryPoint[];
};

export type LiveWarnings = {
  strong: boolean;
  gale: boolean;
  storm: boolean;
  rawText: string | null;
};

export type LiveShippingRow = {
  ship: string;
  datetime: string;
  from: string;
  to: string;
};

export type LiveBomData = {
  generatedAt: string;
  stations: Record<string, LiveStationReading>;
  warnings: LiveWarnings;
  forecastText: string | null;
  shipping: { arrivals: LiveShippingRow[]; departures: LiveShippingRow[] };
};

let cache: Promise<LiveBomData | null> | null = null;

async function fetchLive(): Promise<LiveBomData | null> {
  try {
    // Cache-bust so neither the browser nor an edge cache hands back a stale response.
    const res = await fetch(`${LIVE_DATA_URL}?t=${Date.now()}`);
    if (!res.ok) return null;
    return (await res.json()) as LiveBomData;
  } catch {
    return null;
  }
}

// Shared across every caller within a page load so five station cards and a
// map don't each trigger their own fetch of the same file.
export function fetchLiveBomData(): Promise<LiveBomData | null> {
  if (!cache) cache = fetchLive();
  return cache;
}

export function resetLiveBomCache(): void {
  cache = null;
}

// The worker refreshes the feed every ~5 min. If generatedAt is much older
// than that, the upstream pipeline has stalled and the "live" readings are
// really frozen — worth flagging rather than presenting as current.
export const LIVE_STALE_MINUTES = 20;

export function liveAgeMinutes(data: LiveBomData | null): number | null {
  const t = data?.generatedAt ? new Date(data.generatedAt).getTime() : NaN;
  return Number.isNaN(t) ? null : Math.max(0, Math.round((Date.now() - t) / 60000));
}
