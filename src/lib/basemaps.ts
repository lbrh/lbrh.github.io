// Shared Leaflet tile-layer config for the toolbox maps.
//
// CARTO now requires an API key on its raster basemap endpoint
// (basemaps.cartocdn.com) — unkeyed requests come back with a repeated
// "API key required" watermark. The key below is on CARTO's free tier
// (5M tile requests / calendar month) and, being a static site, is
// necessarily visible in the client bundle. Restrict it by HTTP referrer
// in the CARTO dashboard (https://carto.com/basemaps/apikey/) so it can
// only be used from this site's domains.
export const CARTO_BASEMAP_KEY = 'cb1_2rau_1_a243a52368309d43c097f580';

export const CARTO_VOYAGER_URL =
  `https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=${CARTO_BASEMAP_KEY}`;

export const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

// OpenSeaMap seamark overlay (buoys, beacons, harbour detail) — no key.
export const SEAMARK_URL = 'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png';

export const SEAMARK_ATTRIBUTION =
  'Seamarks &copy; <a href="https://www.openseamap.org">OpenSeaMap</a>';

// Australian Hydrographic Office ENC Series: a public image service (no tile
// endpoint), so it is requested with exportImage. Not for navigation.
export const AHO_ENC_EXPORT_URL =
  'https://services.hydro.gov.au/site1/rest/services/Basemaps/AHOENCSeries/ImageServer/exportImage';

export const AHO_ATTRIBUTION =
  'Chart &copy; <a href="https://www.hydro.gov.au">Australian Hydrographic Office</a> (not for navigation)';

// [south, west], [north, east] — limits chart requests to Port Phillip.
export const PORT_PHILLIP_BOUNDS: [[number, number], [number, number]] = [
  [-38.55, 144.3],
  [-37.75, 145.3],
];
