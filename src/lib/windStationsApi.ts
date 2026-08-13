import type { WindStation } from '@/data/windStations';
import type { LiveHistoryPoint, LiveStationReading } from '@/lib/liveBom';

export type StationReading = {
  time: string;
  wind: number;
  gust: number;
  dir: number;
  source: 'bom' | 'model';
};

export type StationData = {
  current: StationReading;
  // Named `hourly` for its role (the forecast timeseries feeding the
  // predicted chart), but wind/dir are Open-Meteo's minutely_15 data —
  // 15-minute steps, not hourly. wave is still hourly (no finer variable
  // exists for it) and step-filled to match the finer time array.
  hourly: { time: string[]; wind: number[]; gust: number[]; dir: number[]; wave: number[] };
  // Real BOM observations for the last ~24h, oldest first. Null when no live
  // BOM feed is available for this station (falls back to modelled-only).
  bomHistory: LiveHistoryPoint[] | null;
};

export async function fetchStationWind(station: WindStation): Promise<StationData> {
  // Wind is requested at Open-Meteo's minutely_15 resolution (still model
  // data, just resampled finer) rather than hourly — a real ~4x jump in
  // detail. Wave height has no minutely_15 variable (ocean current/sea
  // level only, per Open-Meteo's docs), so the marine call stays hourly.
  const forecastUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${station.lat}&longitude=${station.lng}` +
    `&current=wind_speed_10m,wind_gusts_10m,wind_direction_10m` +
    `&minutely_15=wind_speed_10m,wind_gusts_10m,wind_direction_10m` +
    `&wind_speed_unit=kn&timezone=Australia%2FSydney&forecast_days=2`;
  const marineUrl =
    `https://marine-api.open-meteo.com/v1/marine?latitude=${station.lat}&longitude=${station.lng}` +
    `&hourly=wave_height&timezone=Australia%2FSydney&forecast_days=2`;

  const [fRes, mRes] = await Promise.all([fetch(forecastUrl), fetch(marineUrl).catch(() => null)]);
  if (!fRes.ok) throw new Error(`HTTP ${fRes.status}`);
  const weather = await fRes.json();

  const time: string[] = weather.minutely_15.time;

  // wave_height only exists hourly, so each 15-minute slot borrows its
  // parent hour's value (a flat step every 4 slots) to stay index-aligned
  // with the wind arrays above.
  let wave: number[] = time.map(() => NaN);
  if (mRes && mRes.ok) {
    const marine = await mRes.json();
    const marineTimes: string[] = marine?.hourly?.time ?? [];
    const marineWave: number[] = marine?.hourly?.wave_height ?? [];
    wave = time.map((t) => {
      const idx = marineTimes.indexOf(`${t.slice(0, 13)}:00`);
      return idx >= 0 ? marineWave[idx] : NaN;
    });
  }

  return {
    current: {
      time: weather.current.time,
      wind: weather.current.wind_speed_10m,
      gust: weather.current.wind_gusts_10m,
      dir: weather.current.wind_direction_10m,
      source: 'model',
    },
    hourly: {
      time,
      wind: weather.minutely_15.wind_speed_10m,
      gust: weather.minutely_15.wind_gusts_10m,
      dir: weather.minutely_15.wind_direction_10m,
      wave,
    },
    bomHistory: null,
  };
}

// Overlays a real BOM reading onto the current conditions when one is
// available for the station, while keeping the Open-Meteo hourly array for
// the 24-hour outlook chart (BOM's feed only carries a short recent history,
// not a forecast).
export function withLiveReading(data: StationData, live: LiveStationReading | undefined): StationData {
  if (!live || !live.observedAt) return data;
  return {
    ...data,
    current: {
      time: live.observedAt,
      wind: live.windKt,
      gust: live.gustKt,
      dir: live.dirDeg,
      source: 'bom',
    },
    bomHistory: live.history ?? null,
  };
}
