import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { WindStation } from '@/data/windStations';
import { BAND_COLOUR, type WindBand } from '@/lib/windBands';
import { formatDirection } from '@/lib/compass';

export type StationMapReading = {
  wind: number;
  gust: number;
  dir: number;
  band: WindBand;
};

function arrowIcon(dir: number, colour: string, active: boolean) {
  const size = active ? 45 : 35;
  const html = `
    <div style="width:${size}px;height:${size}px;transform:rotate(${(dir + 180) % 360}deg);filter:drop-shadow(0 1px 1px rgba(0,0,0,0.4));">
      <svg viewBox="0 0 24 24" width="${size}" height="${size}">
        <path d="M12 2 L18 14 L12 10.5 L6 14 Z" fill="${colour}" stroke="#1b1f24" stroke-width="${active ? 1.4 : 1}" />
      </svg>
    </div>`;
  return L.divIcon({ html, className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
}

export default function WindStationsMap({
  stations,
  readings,
  selected,
  onSelect,
}: {
  stations: WindStation[];
  readings: Record<string, StationMapReading | undefined>;
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <MapContainer
      center={[-38.05, 144.85]}
      zoom={9}
      scrollWheelZoom
      style={{ height: '100%', width: '100%', background: '#eef1f4' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      {stations.map((s) => {
        const r = readings[s.id];
        const colour = r ? BAND_COLOUR[r.band] : '#8a929c';
        const active = s.id === selected;
        return (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            icon={arrowIcon(r?.dir ?? 0, colour, active)}
            eventHandlers={{ click: () => onSelect(s.id) }}
          >
            <Tooltip direction="top" offset={[0, -10]}>
              <span style={{ fontFamily: 'monospace', fontSize: 11 }}>
                {s.name}
                {r
                  ? ` — ${Math.round(r.wind)} kt, gusting ${Math.round(r.gust)} kt, ${formatDirection(r.dir)}`
                  : ' — loading…'}
              </span>
            </Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
