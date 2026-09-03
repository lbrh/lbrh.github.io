// Round-trip check for the VKX parser. No test runner is wired up in this
// repo, so run it directly:  npx tsx src/lib/vkx.selftest.ts
import assert from 'node:assert';
import { parseVkxTrack, trackToCsv } from './vkx';

// Build a synthetic file: page header, two 0x02 rows, a wind row, terminator.
const buf = new ArrayBuffer(1 + 7 + (1 + 44) * 2 + (1 + 16) + (1 + 2));
const dv = new DataView(buf);
let o = 0;
const u8 = (v: number) => {
  dv.setUint8(o, v);
  o += 1;
};

u8(0xff);
o += 7; // page header payload
for (const [ms, latE7, lonE7, sog, cog] of [
  [1_600_000_000_000, -379_000_000, 1_449_000_000, 5.0, 0],
  [1_600_000_001_000, -379_000_100, 1_449_000_100, 0, Math.PI],
] as const) {
  u8(0x02);
  dv.setBigUint64(o, BigInt(ms), true);
  dv.setInt32(o + 8, latE7, true);
  dv.setInt32(o + 12, lonE7, true);
  dv.setFloat32(o + 16, sog, true);
  dv.setFloat32(o + 20, cog, true);
  dv.setFloat32(o + 24, 0, true); // altitude
  dv.setFloat32(o + 28, 1, true); // quaternion w=1 → heading 0
  o += 44;
}
u8(0x0a);
o += 16; // wind row, ignored
u8(0xfe);
o += 2;

const pts = parseVkxTrack(buf);
assert.equal(pts.length, 2, 'should extract exactly the two 0x02 rows');
assert.equal(pts[0].timestamp, '2020-09-13T12:26:40.000Z');
assert.equal(pts[0].latitude, -37.9);
assert.equal(pts[0].longitude, 144.9);
assert.equal(pts[0].sogKts, round(5.0 * 1.9438445, 3));
assert.equal(pts[0].cogDeg, 0);
assert.equal(pts[0].headingDeg, 0);
assert.equal(pts[1].cogDeg, 180);

const csv = trackToCsv(pts);
assert.equal(csv.split('\r\n')[0], 'timestamp_utc,latitude,longitude,sog_kts,cog_deg,altitude_m,heading_deg,roll_deg,pitch_deg');
assert.equal(csv.trim().split('\r\n').length, 3, 'header + 2 rows');

// Unknown key must fail loudly.
assert.throws(() => parseVkxTrack(new Uint8Array([0x99]).buffer), /Unknown record 0x99/);

console.log('vkx.selftest: OK');

function round(n: number, dp: number) {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
