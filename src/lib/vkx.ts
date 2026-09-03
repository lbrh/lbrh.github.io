// Parser for the Vakaros VKX binary telemetry log — https://github.com/vakaros/vkx
// A VKX file is a flat sequence of rows: one U1 key byte followed by a
// fixed-size payload defined for that key (no length prefix). Page headers
// (0xFF) and terminators (0xFE) have fixed sizes too, so we just walk rows
// linearly and pull out the 0x02 "Position, Velocity, and Orientation"
// records, which are the GPS track. All values are little-endian.

const PAYLOAD_SIZE: Record<number, number> = {
  0x01: 32, // internal
  0x02: 44, // position, velocity, orientation
  0x03: 20, // declination
  0x04: 13, // race timer event
  0x05: 17, // line position
  0x06: 18, // shift angle
  0x07: 12, // internal
  0x08: 13, // device configuration
  0x0a: 16, // wind
  0x0b: 16, // speed through water
  0x0c: 12, // depth
  0x0e: 16, // internal
  0x0f: 16, // load
  0x10: 12, // temperature
  0x20: 13, // internal
  0x21: 52, // internal
  0xfe: 2, // page terminator
  0xff: 7, // page header
};

export type TrackPoint = {
  timestamp: string; // ISO 8601 UTC
  latitude: number; // degrees
  longitude: number; // degrees
  sogKts: number; // speed over ground, knots
  cogDeg: number; // course over ground, 0–360 true
  altitudeM: number;
  headingDeg: number; // yaw from the orientation quaternion, 0–360 true
  rollDeg: number;
  pitchDeg: number;
};

function round(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}

/** Quaternion (NED frame, w,x,y,z) to aerospace yaw/pitch/roll in degrees. */
function quatToEuler(w: number, x: number, y: number, z: number) {
  const roll = Math.atan2(2 * (w * x + y * z), 1 - 2 * (x * x + y * y));
  const pitch = Math.asin(Math.max(-1, Math.min(1, 2 * (w * y - z * x))));
  const yaw = Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z));
  const deg = (r: number) => (r * 180) / Math.PI;
  return {
    headingDeg: (deg(yaw) + 360) % 360,
    pitchDeg: deg(pitch),
    rollDeg: deg(roll),
  };
}

export function parseVkxTrack(buf: ArrayBuffer): TrackPoint[] {
  const dv = new DataView(buf);
  const out: TrackPoint[] = [];
  let off = 0;

  while (off < dv.byteLength) {
    const key = dv.getUint8(off);
    const size = PAYLOAD_SIZE[key];
    if (size === undefined) {
      throw new Error(
        `Unknown record 0x${key.toString(16).padStart(2, '0')} at byte ${off} — ` +
          `this doesn't look like a VKX file, or it uses a newer format version.`,
      );
    }
    const p = off + 1;
    if (p + size > dv.byteLength) break; // trailing partial row — stop cleanly

    if (key === 0x02) {
      const ms = Number(dv.getBigUint64(p, true));
      const { headingDeg, pitchDeg, rollDeg } = quatToEuler(
        dv.getFloat32(p + 28, true),
        dv.getFloat32(p + 32, true),
        dv.getFloat32(p + 36, true),
        dv.getFloat32(p + 40, true),
      );
      out.push({
        timestamp: new Date(ms).toISOString(),
        latitude: round(dv.getInt32(p + 8, true) / 1e7, 7),
        longitude: round(dv.getInt32(p + 12, true) / 1e7, 7),
        sogKts: round(dv.getFloat32(p + 16, true) * 1.9438445, 3),
        cogDeg: round(((dv.getFloat32(p + 20, true) * 180) / Math.PI + 360) % 360, 2),
        altitudeM: round(dv.getFloat32(p + 24, true), 2),
        headingDeg: round(headingDeg, 2),
        rollDeg: round(rollDeg, 2),
        pitchDeg: round(pitchDeg, 2),
      });
    }
    off = p + size;
  }
  return out;
}

const CSV_COLUMNS = [
  'timestamp_utc',
  'latitude',
  'longitude',
  'sog_kts',
  'cog_deg',
  'altitude_m',
  'heading_deg',
  'roll_deg',
  'pitch_deg',
] as const;

export function trackToCsv(points: TrackPoint[]): string {
  // Every field is a number or an ISO timestamp — nothing needs quoting.
  const rows = points.map((p) =>
    [
      p.timestamp,
      p.latitude,
      p.longitude,
      p.sogKts,
      p.cogDeg,
      p.altitudeM,
      p.headingDeg,
      p.rollDeg,
      p.pitchDeg,
    ].join(','),
  );
  return [CSV_COLUMNS.join(','), ...rows].join('\r\n') + '\r\n';
}
