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
