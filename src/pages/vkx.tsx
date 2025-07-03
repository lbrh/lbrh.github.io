import React, { useState, useEffect, useRef, ChangeEvent } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false },
);
const Polyline = dynamic(
  () => import("react-leaflet").then((mod) => mod.Polyline),
  { ssr: false },
);
const Marker = dynamic(
  () => import("react-leaflet").then((mod) => mod.Marker),
  { ssr: false },
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((mod) => mod.CircleMarker),
  { ssr: false },
);
const Popup = dynamic(() => import("react-leaflet").then((mod) => mod.Popup), {
  ssr: false,
});

interface PositionRecord {
  timestamp: number;
  lat: number;
  lon: number;
  sog: number;
  cog: number;
}
interface LineRecord {
  timestamp: number;
  type: 0 | 1;
  lat: number;
  lon: number;
}
interface ShiftRecord {
  timestamp: number;
  tackId: 0 | 1;
  heading: number;
  sogKnots: number;
}
interface TimerRecord {
  timestamp: number;
  eventType: number;
  timer: number;
}
interface Track {
  id: number;
  color: string;
  positionRecords: PositionRecord[];
  pathPoints: [number, number][];
  lineMarkers: LineRecord[];
  shiftAngles: ShiftRecord[];
  timerEvents: TimerRecord[];
}

function parseVKX(buffer: ArrayBuffer) {
  const dv = new DataView(buffer);
  const pos: PositionRecord[] = [];
  const lines: LineRecord[] = [];
  const shifts: ShiftRecord[] = [];
  const timers: TimerRecord[] = [];
  let offset = 0;

  while (offset < dv.byteLength) {
    const key = dv.getUint8(offset++);
    if (key === 0x02 && offset + 44 <= dv.byteLength) {
      const ts = Number(dv.getBigUint64(offset, true));
      const lat = dv.getInt32(offset + 8, true) * 1e-7;
      const lon = dv.getInt32(offset + 12, true) * 1e-7;
      const sog = dv.getFloat32(offset + 16, true);
      const cog = dv.getFloat32(offset + 20, true);
      pos.push({ timestamp: ts, lat, lon, sog, cog });
      offset += 44;
    } else if (key === 0x05 && offset + 17 <= dv.byteLength) {
      const ts = Number(dv.getBigUint64(offset, true));
      const type = dv.getUint8(offset + 8) as 0 | 1;
      const lat = dv.getFloat32(offset + 9, true);
      const lon = dv.getFloat32(offset + 13, true);
      lines.push({ timestamp: ts, type, lat, lon });
      offset += 17;
    } else if (key === 0x04 && offset + 13 <= dv.byteLength) {
      const ts = Number(dv.getBigUint64(offset, true));
      const ev = dv.getUint8(offset + 8);
      const timer = dv.getInt32(offset + 9, true);
      timers.push({ timestamp: ts, eventType: ev, timer });
      offset += 13;
    } else if (key === 0x06 && offset + 18 <= dv.byteLength) {
      const ts = Number(dv.getBigUint64(offset, true));
      const tackId = dv.getUint8(offset + 8) as 0 | 1;
      const heading = dv.getFloat32(offset + 10, true);
      const sogKnots = dv.getFloat32(offset + 14, true);
      shifts.push({ timestamp: ts, tackId, heading, sogKnots });
      offset += 18;
    } else if (key === 0xff) offset += 7;
    else if (key === 0xfe) offset += 2;
    else offset += 52;
  }

  return { positions: pos, lines, shifts, timers };
}

export default function VKXViewer() {
  const [isClient, setIsClient] = useState(false);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [playing, setPlaying] = useState(false);
  const [currentIndices, setCurrentIndices] = useState<number[]>([]);
  const [sliderIndex, setSliderIndex] = useState<number>(0);
  const [selectedRace, setSelectedRace] = useState<number>(0);
  const playStartRef = useRef<number>(0);
  const dataStartRef = useRef<number>(0);
  const tickerRef = useRef<number | null>(null);
  const colors = ["red", "blue", "green", "orange", "purple", "brown"];

  useEffect(() => {
    setIsClient(typeof window !== "undefined");
  }, []);
  useEffect(() => {
    if (isClient) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const L = require("leaflet");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const iconUrl = require("leaflet/dist/images/marker-icon.png");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const iconRetinaUrl = require("leaflet/dist/images/marker-icon-2x.png");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const shadowUrl = require("leaflet/dist/images/marker-shadow.png");
      L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });
    }
  }, [isClient]);

  useEffect(() => {
    if (playing && tracks.length) {
      const filtered = getFilteredTrackData(tracks[0], selectedRace);
      dataStartRef.current =
        filtered.filteredPositions[currentIndices[0]]?.timestamp || 0;
      playStartRef.current = Date.now();
      tickerRef.current = window.setInterval(() => {
        const elapsed = Date.now() - playStartRef.current;
        const targetTs = dataStartRef.current + elapsed;
        const newIdx = filtered.filteredPositions.findIndex(
          (p) => p.timestamp > targetTs,
        );
        const idx =
          newIdx === -1 ? filtered.filteredPositions.length - 1 : newIdx;
        setSliderIndex(idx);
        setCurrentIndices([idx]);

        if (idx >= filtered.filteredPositions.length - 1) {
          clearInterval(tickerRef.current!);
          tickerRef.current = null;
          setPlaying(false);
        }
      }, 50);
    } else if (tickerRef.current) {
      clearInterval(tickerRef.current);
      tickerRef.current = null;
    }

    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
    };
  }, [playing, tracks, selectedRace]);

  const handleFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newTracks: Track[] = [];
    for (let i = 0; i < files.length; i++) {
      const buffer = await files[i].arrayBuffer();
      const { positions, lines, shifts, timers } = parseVKX(buffer);
      const ps = positions.filter(
        (r, j, a) =>
          j === 0 ||
          (Math.abs(a[j - 1].lat - r.lat) < 0.1 &&
            Math.abs(a[j - 1].lon - r.lon) < 0.1),
      );
      newTracks.push({
        id: i,
        color: colors[i % colors.length],
        positionRecords: ps,
        pathPoints: ps.map((r) => [r.lat, r.lon]),
        lineMarkers: lines,
        shiftAngles: shifts,
        timerEvents: timers,
      });
    }
    setTracks(newTracks);
    setCurrentIndices(newTracks.map(() => 0));
    setSliderIndex(0);
    setPlaying(false);
    setSelectedRace(0);
  };

  const handleSliderChange = (e: ChangeEvent<HTMLInputElement>) => {
    const idx = Number(e.target.value);
    setSliderIndex(idx);
    setCurrentIndices([idx]);
    setPlaying(false);
  };

  const getRaceTimestamps = (
    track: Track,
    raceNum: number,
  ): [number, number] => {
    const startEvents = track.timerEvents.filter((e) => e.eventType === 4);
    const firstTimestamp = track.positionRecords[0]?.timestamp || 0;

    const start =
      raceNum === 0 ? firstTimestamp : startEvents[raceNum - 1]?.timestamp;
    const end = startEvents[raceNum]?.timestamp ?? Infinity;

    if (start === undefined || end === undefined || start >= end) return [0, 0]; // fallback if bad data

    return [start, end];
  };

  const getFilteredTrackData = (track: Track, raceNum: number) => {
    const [start, end] = getRaceTimestamps(track, raceNum);
    const filteredPositions = track.positionRecords.filter(
      (p) => p.timestamp >= start && p.timestamp < end,
    );
    const filteredPath = filteredPositions.map(
      (p) => [p.lat, p.lon] as [number, number],
    );
    return { filteredPositions, filteredPath };
  };

  const primaryTrack = tracks[0];
  const { filteredPositions, filteredPath } = primaryTrack
    ? getFilteredTrackData(primaryTrack, selectedRace)
    : { filteredPositions: [], filteredPath: [] };
  const currentPos = filteredPositions[sliderIndex];
  const shift =
    primaryTrack?.shiftAngles
      .filter((s) => s.timestamp <= currentPos?.timestamp)
      .pop() || null;
  const raceEvents =
    primaryTrack?.timerEvents.filter((e) => e.eventType === 4) || [];
  const MS_TO_KNOTS = 1.94384;
  const RAD_TO_DEG = 180 / Math.PI;

  return (
    <div style={{ background: "lightblue", height: "100vh", width: "100%" }}>
      <div
        style={{
          position: "absolute",
          zIndex: 1000,
          padding: 10,
          background: "rgba(255,255,255,0.9)",
        }}
      >
        <input type="file" accept=".vkx" onChange={handleFiles} multiple />
        <button onClick={() => setPlaying((p) => !p)}>
          {playing ? "Pause" : "Play"}
        </button>
        {raceEvents.length > 0 && (
          <select
            value={selectedRace}
            onChange={(e) => {
              setSelectedRace(Number(e.target.value));
              setSliderIndex(0);
            }}
          >
            {Array.from(
              {
                length:
                  (primaryTrack?.timerEvents.filter((e) => e.eventType === 4)
                    .length || 0) + 1,
              },
              (_, idx) => (
                <option key={idx} value={idx}>
                  Race {idx + 1}
                </option>
              ),
            )}
          </select>
        )}
        {filteredPositions.length > 0 && (
          <>
            <input
              type="range"
              min={0}
              max={filteredPositions.length - 1}
              value={sliderIndex}
              onChange={handleSliderChange}
              style={{ width: 200, marginLeft: 10 }}
            />
            <div style={{ marginTop: 8 }}>
              <div>
                <strong>SOG (knots):</strong>{" "}
                {(currentPos?.sog * MS_TO_KNOTS).toFixed(1)}
              </div>
              <div>
                <strong>COG (°):</strong>{" "}
                {(currentPos?.cog * RAD_TO_DEG).toFixed(1)}
              </div>
              {shift && (
                <>
                  <div>
                    <strong>Tack ID:</strong>{" "}
                    {shift.tackId === 0 ? "Starboard" : "Port"}
                  </div>
                  <div>
                    <strong>Heading (°):</strong>{" "}
                    {(shift.heading * RAD_TO_DEG).toFixed(1)}
                  </div>
                  <div>
                    <strong>SOG (knots):</strong> {shift.sogKnots.toFixed(1)}
                  </div>
                </>
              )}
              <div>
                <strong>Race #:</strong> {selectedRace + 1}
              </div>
            </div>
          </>
        )}
      </div>

      {isClient && filteredPath.length > 0 && (
        // @ts-expect-error for some reason, it doesnt expect map container props
        <MapContainer
          zoomControl={false}
          center={filteredPath[sliderIndex]}
          zoom={15}
          style={{ height: "100%", width: "100%" }}
        >
          {
            // @ts-expect-error same issue here
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />
          }
          <Polyline
            positions={filteredPath}
            pathOptions={{ color: primaryTrack.color }}
          />
          {filteredPath[sliderIndex] && (
            <Marker position={filteredPath[sliderIndex]}>
              <Popup>
                Point {sliderIndex + 1}/{filteredPath.length}
              </Popup>
            </Marker>
          )}

          {(() => {
            const lm = primaryTrack.lineMarkers;
            const pins = lm.filter((l) => l.type === 0);
            const boats = lm.filter((l) => l.type === 1);
            const lastPin = pins[pins.length - 1];
            const lastBoat = boats[boats.length - 1];
            return (
              <>
                {lastPin && (
                  <CircleMarker
                    center={[lastPin.lat, lastPin.lon]}
                    pathOptions={{ color: "yellow", fillColor: "red" }}
                  />
                )}
                {lastBoat && (
                  <CircleMarker
                    center={[lastBoat.lat, lastBoat.lon]}
                    pathOptions={{ color: "yellow", fillColor: "blue" }}
                  />
                )}
              </>
            );
          })()}
        </MapContainer>
      )}
    </div>
  );
}
