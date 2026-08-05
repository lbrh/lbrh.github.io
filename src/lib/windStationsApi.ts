import type { WindStation } from '@/data/windStations';
import type { LiveStationReading } from '@/lib/liveBom';

export type StationReading = {
  time: string;
  wind: number;
  gust: number;
  dir: number;
  source: 'bom' | 'model';
};

export type StationData = {
  current: StationReading;
  hourly: { time: string[]; wind: number[]; gust: number[]; dir: number[]; wave: number[] };
};

export async function fetchStationWind(station: WindStation): Promise<StationData> {
  const forecastUrl =
    `https://api.open-meteo.com/v1/forecast?latitude=${station.lat}&longitude=${station.lng}` +
    `&current=wind_speed_10m,wind_gusts_10m,wind_direction_10m` +
    `&hourly=wind_speed_10m,wind_gusts_10m,wind_direction_10m` +
    `&wind_speed_unit=kn&timezone=Australia%2FSydney&forecast_days=2`;
  const marineUrl =
    `https://marine-api.open-meteo.com/v1/marine?latitude=${station.lat}&longitude=${station.lng}` +
    `&hourly=wave_height&timezone=Australia%2FSydney&forecast_days=2`;

  const [fRes, mRes] = await Promise.all([fetch(forecastUrl), fetch(marineUrl).catch(() => null)]);
  if (!fRes.ok) throw new Error(`HTTP ${fRes.status}`);
  const weather = await fRes.json();

  let wave: number[] = [];
  if (mRes && mRes.ok) {
    const marine = await mRes.json();
    wave = marine?.hourly?.wave_height ?? [];
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
      time: weather.hourly.time,
      wind: weather.hourly.wind_speed_10m,
      gust: weather.hourly.wind_gusts_10m,
      dir: weather.hourly.wind_direction_10m,
      wave,
    },
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
  };
}
