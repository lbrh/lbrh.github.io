import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { AHO_ATTRIBUTION, AHO_ENC_EXPORT_URL, PORT_PHILLIP_BOUNDS } from '@/lib/basemaps';

const R = 6378137;
const MAX_PX = 2000;

/** Lat/lng to Web Mercator metres (EPSG:3857). */
function toMercator(lat: number, lng: number): [number, number] {
  const x = (R * lng * Math.PI) / 180;
  const y = R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  return [x, y];
}

/**
 * AHO ENC Series is an image service with no plain tile endpoint, so this
 * requests one chart image for the visible part of Port Phillip and stretches
 * it over the map, refreshing after each pan or zoom.
 */
export default function AhoChartLayer() {
  const map = useMap();

  useEffect(() => {
    let current: L.ImageOverlay | null = null;
    let seq = 0;
    const limit = L.latLngBounds(PORT_PHILLIP_BOUNDS);

    const refresh = () => {
      const view = map.getBounds();
      if (!view.intersects(limit)) {
        current?.remove();
        current = null;
        return;
      }
      const south = Math.max(view.getSouth(), limit.getSouth());
      const north = Math.min(view.getNorth(), limit.getNorth());
      const west = Math.max(view.getWest(), limit.getWest());
      const east = Math.min(view.getEast(), limit.getEast());
      const bounds = L.latLngBounds([south, west], [north, east]);

      const nw = map.latLngToContainerPoint(bounds.getNorthWest());
      const se = map.latLngToContainerPoint(bounds.getSouthEast());
      const scale = Math.min(window.devicePixelRatio || 1, 2);
      let w = Math.max(1, Math.round((se.x - nw.x) * scale));
      let h = Math.max(1, Math.round((se.y - nw.y) * scale));
      const over = Math.max(w, h) / MAX_PX;
      if (over > 1) {
        w = Math.round(w / over);
        h = Math.round(h / over);
      }

      const [xmin, ymin] = toMercator(south, west);
      const [xmax, ymax] = toMercator(north, east);
      const url =
        `${AHO_ENC_EXPORT_URL}?bbox=${xmin},${ymin},${xmax},${ymax}` +
        `&bboxSR=3857&imageSR=3857&size=${w},${h}&format=png&f=image`;

      const mine = ++seq;
      const next = L.imageOverlay(url, bounds, { pane: 'tilePane', crossOrigin: 'anonymous', zIndex: 5 });
      next.once('load', () => {
        // Swap only once the new image is ready, and ignore stale responses.
        if (mine !== seq) {
          next.remove();
          return;
        }
        current?.remove();
        current = next;
      });
      next.addTo(map);
    };

    map.attributionControl.addAttribution(AHO_ATTRIBUTION);
    refresh();
    map.on('moveend', refresh);
    return () => {
      map.attributionControl.removeAttribution(AHO_ATTRIBUTION);
      map.off('moveend', refresh);
      seq++;
      current?.remove();
    };
  }, [map]);

  return null;
}
