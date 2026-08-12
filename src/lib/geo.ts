export function haversineNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R_km = 6371;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return (R_km * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))) / 1.852;
}

/** Initial true-north bearing (0–360°) of the great-circle path from point 1 to point 2. */
export function trueBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dLambda = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  const deg = (Math.atan2(y, x) * 180) / Math.PI;
  return (deg + 360) % 360;
}

/** Magnetic declination for Port Phillip Bay / Western Port, °E (WMM, ~2025). Marks in
 *  this data set don't span enough distance for it to vary meaningfully across the course. */
export const MAGNETIC_DECLINATION_DEG = 11.5;

export function toMagnetic(trueDeg: number, declinationDeg = MAGNETIC_DECLINATION_DEG): number {
  return (trueDeg - declinationDeg + 360) % 360;
}
