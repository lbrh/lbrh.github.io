const COMPASS = [
  'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW',
];

export function toCompass(deg: number): string {
  return COMPASS[Math.round(deg / 22.5) % 16];
}

export function formatDirection(deg: number): string {
  return `${Math.round(deg)}° ${toCompass(deg)}`;
}
