// Published every ~10 minutes by .github/workflows/fetch-bom-data.yml to the
// 'data' branch (never main) and read here straight from GitHub's raw content
// host, which serves CORS-enabled responses — no backend required.
const LIVE_DATA_URL = 'https://raw.githubusercontent.com/lbrh/lbrh.github.io/data/live.json';

export type LiveStationReading = {
  windKt: number;
  gustKt: number;
  dirCompass: string;
  dirDeg: number;
  airTemp: number | null;
  observedAt: string | null;
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
    // Cache-bust so GitHub's CDN doesn't hand back a stale cached response.
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
