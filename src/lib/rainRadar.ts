// Rain radar frames from RainViewer's public weather maps API, which
// mosaics the BOM radar network (among others) into ordinary XYZ tiles that
// Leaflet can draw directly. No key needed and it sends CORS headers, so the
// browser fetches it straight from the static site.
//
// The free API only serves tiles up to zoom 7 in the "Universal Blue"
// colour scheme, so the layer sets maxNativeZoom and Leaflet scales those
// tiles up when the map is zoomed in further. Radar resolution is around
// 1 km anyway, which is about what a zoom 7 tile holds at this latitude.

const WEATHER_MAPS_URL = 'https://api.rainviewer.com/public/weather-maps.json';

export const RADAR_ATTRIBUTION = 'Radar &copy; <a href="https://www.rainviewer.com/">RainViewer</a>';

export const RADAR_MAX_NATIVE_ZOOM = 7;

// Colour scheme 2 (Universal Blue), smoothed, snow shown separately.
const TILE_SUFFIX = '/256/{z}/{x}/{y}/2/1_1.png';

// Rough stops of the Universal Blue palette, light rain to heavy, for the
// legend beside the controls. Indicative only.
export const RADAR_LEGEND_GRADIENT =
  'linear-gradient(to right, #9be1ff, #3ca0f0, #0050c8, #f5e600, #ff9600, #e60000, #c800c8)';

export type RadarFrame = {
  /** Unix seconds of the radar scan. */
  time: number;
  /** Leaflet tile URL template for this frame. */
  url: string;
  /** True for extrapolated nowcast frames, when the API offers any. */
  forecast: boolean;
};

type WeatherMapsFrame = { time: number; path: string };

type WeatherMapsResponse = {
  host?: string;
  radar?: { past?: WeatherMapsFrame[]; nowcast?: WeatherMapsFrame[] };
};

/** Fetches the available radar frames, oldest first. */
export async function fetchRadarFrames(): Promise<RadarFrame[]> {
  const res = await fetch(WEATHER_MAPS_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Radar index returned ${res.status}`);
  const json = (await res.json()) as WeatherMapsResponse;
  const host = json.host ?? 'https://tilecache.rainviewer.com';
  const toFrame = (f: WeatherMapsFrame, forecast: boolean): RadarFrame => ({
    time: f.time,
    url: `${host}${f.path}${TILE_SUFFIX}`,
    forecast,
  });
  const frames = [
    ...(json.radar?.past ?? []).map((f) => toFrame(f, false)),
    ...(json.radar?.nowcast ?? []).map((f) => toFrame(f, true)),
  ];
  if (frames.length === 0) throw new Error('No radar frames available');
  return frames.sort((a, b) => a.time - b.time);
}

/** Index of the most recent observed (not forecast) frame. */
export function latestObservedIndex(frames: RadarFrame[]): number {
  for (let i = frames.length - 1; i >= 0; i--) {
    if (!frames[i].forecast) return i;
  }
  return frames.length - 1;
}
