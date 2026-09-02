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
