import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Mark } from '@/data/portPhillipMarks';
import { MARK_CATEGORY_COLOUR } from '@/data/portPhillipMarks';

export default function BayMarksMap({ marks, nautical = false }: { marks: Mark[]; nautical?: boolean }) {
  return (
    <MapContainer
      center={[-37.93, 144.93]}
      zoom={11}
      scrollWheelZoom
      style={{ height: '100%', width: '100%', background: '#eef1f4' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      {nautical && (
        <TileLayer
          attribution='Seamarks &copy; <a href="https://www.openseamap.org">OpenSeaMap</a>'
          url="https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png"
        />
      )}
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
