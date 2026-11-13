import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { RADAR_ATTRIBUTION, RADAR_MAX_NATIVE_ZOOM, type RadarFrame } from '@/lib/rainRadar';

const OPACITY = 0.65;

/**
 * Draws RainViewer radar frames over the map. Every frame gets its own tile
 * layer, added up front at zero opacity so the tiles are already loaded
 * when the animation reaches them; only the current frame is made visible.
 */
export default function RainRadarLayer({ frames, index }: { frames: RadarFrame[]; index: number }) {
  const map = useMap();
  const layers = useRef(new Map<string, L.TileLayer>());

  // Add layers for new frames and drop ones that have aged out of the list.
  useEffect(() => {
    const wanted = new Set(frames.map((f) => f.url));
    layers.current.forEach((layer, url) => {
      if (!wanted.has(url)) {
        layer.remove();
        layers.current.delete(url);
      }
    });
    frames.forEach((f) => {
      if (layers.current.has(f.url)) return;
      const layer = L.tileLayer(f.url, {
        opacity: 0,
        zIndex: 10,
        maxNativeZoom: RADAR_MAX_NATIVE_ZOOM,
        maxZoom: 19,
      });
      layer.addTo(map);
      layers.current.set(f.url, layer);
    });
  }, [frames, map]);

  useEffect(() => {
    frames.forEach((f, i) => layers.current.get(f.url)?.setOpacity(i === index ? OPACITY : 0));
  }, [frames, index]);

  useEffect(() => {
    const current = layers.current;
    map.attributionControl.addAttribution(RADAR_ATTRIBUTION);
    return () => {
      map.attributionControl.removeAttribution(RADAR_ATTRIBUTION);
      current.forEach((layer) => layer.remove());
      current.clear();
    };
  }, [map]);

  return null;
}
