import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Mark } from '@/data/portPhillipMarks';
import { MARK_CATEGORY_COLOUR } from '@/data/portPhillipMarks';
import {
  CARTO_ATTRIBUTION,
  CARTO_VOYAGER_URL,
  SEAMARK_ATTRIBUTION,
  SEAMARK_URL,
} from '@/lib/basemaps';

export default function BayMarksMap({ marks, nautical = false }: { marks: Mark[]; nautical?: boolean }) {
  return (
    <MapContainer
      center={[-37.93, 144.93]}
      zoom={11}
      scrollWheelZoom
      style={{ height: '100%', width: '100%', background: '#eef1f4' }}
    >
      <TileLayer attribution={CARTO_ATTRIBUTION} url={CARTO_VOYAGER_URL} />
      {nautical && <TileLayer attribution={SEAMARK_ATTRIBUTION} url={SEAMARK_URL} />}
      {marks.map((m) => (
        <CircleMarker
          key={m.name}
          center={[m.lat, m.lng]}
          radius={6}
          pathOptions={{
            color: '#1b1f24',
            weight: 1,
            fillColor: MARK_CATEGORY_COLOUR[m.category],
            fillOpacity: 0.9,
          }}
        >
          <Tooltip direction="top" offset={[0, -4]}>
            <span style={{ fontFamily: 'monospace', fontSize: 11 }}>
              {m.name} — {m.description}
            </span>
          </Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
