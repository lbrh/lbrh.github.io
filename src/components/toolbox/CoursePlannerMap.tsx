import { MapContainer, TileLayer, CircleMarker, Tooltip, Polyline, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { CourseMark } from '@/data/longDistanceMarks';

/** Invisible helper that reports map clicks back up while `active`. */
function ClickCapture({ active, onPick }: { active: boolean; onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (active) onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function CoursePlannerMap({
  marks,
  route,
  onMarkClick,
  nautical = false,
  placing = false,
  onPlacePick,
}: {
  marks: CourseMark[];
  route: string[];
  onMarkClick: (name: string) => void;
  nautical?: boolean;
  placing?: boolean;
  onPlacePick?: (lat: number, lng: number) => void;
}) {
  const byName = new Map(marks.map((m) => [m.name, m]));
  const routeLatLngs = route
    .map((n) => byName.get(n))
    .filter((m): m is CourseMark => !!m)
    .map((m) => [m.lat, m.lng] as [number, number]);

  return (
    <MapContainer
      center={[-38.02, 144.95]}
      zoom={9}
      scrollWheelZoom
      preferCanvas
      style={{ height: '100%', width: '100%', background: '#eef1f4', cursor: placing ? 'crosshair' : undefined }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        crossOrigin="anonymous"
      />
      {nautical && (
        <TileLayer
          attribution='Seamarks &copy; <a href="https://www.openseamap.org">OpenSeaMap</a>'
          url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
          crossOrigin="anonymous"
        />
      )}
      {onPlacePick && <ClickCapture active={placing} onPick={onPlacePick} />}

      {routeLatLngs.length > 1 && (
        <Polyline
          positions={routeLatLngs}
          pathOptions={{ color: '#b42318', weight: 2.5, dashArray: '8 6' }}
        />
      )}

      {marks.map((m) => {
        const routeIndices = route
          .map((n, i) => (n === m.name ? i + 1 : null))
          .filter((i): i is number => i !== null);
        const active = routeIndices.length > 0;
        return (
          <CircleMarker
            key={m.name}
            center={[m.lat, m.lng]}
            radius={active ? 7 : 5}
            pathOptions={{
              color: '#1b1f24',
              weight: active ? 2 : 1,
              fillColor: active ? '#1a56a8' : m.custom ? '#8b5cf6' : '#8a929c',
              fillOpacity: active ? 1 : 0.65,
            }}
            eventHandlers={{ click: () => onMarkClick(m.name) }}
          >
            <Tooltip direction="top" offset={[0, -4]}>
              <span style={{ fontFamily: 'monospace', fontSize: 11 }}>
                {active ? `#${routeIndices.join(', #')} · ` : ''}
                {m.name} — {m.description}
                {m.custom ? ` (${m.lat.toFixed(4)}, ${m.lng.toFixed(4)})` : ''}
              </span>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
