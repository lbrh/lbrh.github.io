export type CourseMark = {
  name: string;
  description: string;
  light: string;
  lat: number;
  lng: number;
  /** True for marks added by the user during a Course Planner session. */
  custom?: boolean;
};

// Wider bay / long-distance course marks, incl. Western Port approaches.
// Source: club mark register. Approximate — reference only, not for navigation.
export const LONG_DISTANCE_MARKS: CourseMark[] = [
  { name: 'Prince George', description: 'Pile (Port Lateral)', light: 'R Fl R 4s 8M', lat: -38.105, lng: 144.735 },
  { name: 'X-Ray', description: 'Orange Buoy', light: 'No lights', lat: -37.856, lng: 144.919 },
  { name: 'Point Richards Entrance', description: 'North Cardinal', light: 'BY Q 9M', lat: -38.08166667, lng: 144.665 },
  { name: 'Point Richards No.18', description: 'Pile (N Cardinal)', light: 'BY Q', lat: -38.13166667, lng: 144.5333333 },
  { name: 'MMYC1', description: 'Special Mark', light: 'Fl Y 5s', lat: -38.0266, lng: 145.053 },
  { name: 'R1', description: 'Yellow Pyramid', light: 'Y Fl (3) Y 10s', lat: -38.27333333, lng: 144.9716667 },
  { name: 'SB 2', description: 'Yellow Buoy', light: 'Y Fl (2) Y 15s', lat: -38.33333333, lng: 144.9183333 },
  { name: 'SB 1', description: 'Yellow Buoy', light: 'Y Fl (2) Y 15s', lat: -38.29833333, lng: 144.9433333 },
  { name: 'SBSC Start', description: "Pile (S'bd Lateral)", light: 'G BN Fl(4) 10s', lat: -38.305, lng: 144.9883333 },
  { name: 'V 2', description: 'Yellow Pillar-X', light: 'Y Fl Y 4s', lat: -38.03833333, lng: 144.79 },
  { name: 'V 3', description: 'Yellow Pillar-X', light: 'Y Fl Y 4s', lat: -38.055, lng: 144.795 },
  { name: 'V 4', description: 'Yellow Pillar-X', light: 'Y Fl Y 4s', lat: -38.04333333, lng: 144.825 },
  { name: 'SB 3', description: 'Yellow Pyramid-X', light: '—', lat: -37.87333333, lng: 144.9383333 },
  { name: 'Spoil Ground', description: 'Yellow Can-X', light: 'Fl Y 5s', lat: -37.98333333, lng: 144.8833333 },
  { name: 'SYC 2', description: 'Yellow Pyramid', light: 'Y Fl(4) Y 10s', lat: -37.94166667, lng: 144.965 },
  { name: 'SYC 7', description: 'Yellow Pyramid', light: 'Y Fl(4) Y 10s', lat: -37.93, lng: 144.9833333 },
  { name: 'RBYC 2', description: 'Yellow Pyramid-X', light: 'Y Fl(4) Y 12s', lat: -37.92166667, lng: 144.955 },
  { name: 'RBYC 5', description: 'Yellow Pyramid-X', light: 'Y Fl(4) Y 12s', lat: -37.89666667, lng: 144.9733333 },
  { name: 'RMYS B', description: 'Yellow Pillar', light: '—', lat: -37.885, lng: 144.9533333 },
  { name: 'RMYS E', description: 'Yellow Pillar', light: 'Y Fl(4) Y 10s', lat: -37.86833333, lng: 144.9633333 },
  { name: 'RMYS G', description: 'Yellow Pillar', light: 'Y Fl(4) Y 10s', lat: -37.84833333, lng: 144.935 },
  { name: 'R3', description: 'Yellow Pillar', light: 'Y Fl(4) Y 10s', lat: -37.885807, lng: 144.939808 },
  { name: 'P 2', description: 'Yellow Pyramid', light: '—', lat: -37.92166667, lng: 144.8866667 },
  { name: 'P 3', description: 'Black Pillar', light: '—', lat: -37.88833333, lng: 144.88 },
  { name: 'Centre Mark', description: 'Yellow Pyramid-X', light: 'Y Fl Y 2.5s', lat: -38.05833333, lng: 144.87 },
  { name: 'R 2', description: 'Yellow Pillar', light: 'Y Fl(3) Y 10s', lat: -37.90833333, lng: 144.9383333 },
  { name: 'R 4', description: 'Yellow Pillar', light: 'Y Fl(3) Y 10s', lat: -37.845, lng: 144.9216667 },
  { name: 'Outer Anchorage', description: 'Yellow Pillar-X', light: 'Y BN Fl(4) Y 12s 3M', lat: -37.94833333, lng: 144.8583333 },
  { name: 'Mornington VM', description: 'Virtual Mark', light: '—', lat: -38.21, lng: 145.0316667 },
  { name: "St. Leonards Finish", description: 'Laid Mark', light: '—', lat: -38.17, lng: 144.7233333 },
  { name: 'SYC 1', description: 'Yellow Pyramid', light: 'Y Fl(4) Y 10s', lat: -37.96166667, lng: 144.98 },
  { name: 'Gellibrand Shoal Mark', description: 'An East Cardinal Mark', light: '—', lat: -37.876, lng: 144.915 },
  { name: 'Pt Cook East Cardinal Mark', description: 'An East Cardinal Mark', light: '—', lat: -37.9263, lng: 144.8149 },
  { name: 'Pt Cook Sanctuary Limit Mark', description: 'Yellow special purpose beacon', light: '—', lat: -37.929, lng: 144.8115 },
  { name: 'RMYS A', description: 'Yellow Special Purpose Buoy', light: '—', lat: -37.865, lng: 144.9578 },
  { name: 'RMYS C', description: 'Yellow Special Purpose Buoy', light: '—', lat: -37.8698, lng: 144.9402 },
  { name: 'RMYS D', description: 'Yellow Special Purpose Buoy', light: '—', lat: -37.858, lng: 144.9578 },
  { name: 'RMYS F', description: 'Yellow Special Purpose Buoy', light: '—', lat: -37.8932, lng: 144.9383 },
  { name: 'RMYS H', description: 'Yellow Special Purpose Buoy', light: '—', lat: -37.8641, lng: 144.9615 },
  { name: 'SYC 5', description: 'Special Purpose Buoy – X top mark', light: '—', lat: -37.9803, lng: 144.873 },
  { name: 'Uniform', description: 'RYCV laid mark', light: '—', lat: -37.9274, lng: 144.9161 },
  { name: 'V Mark', description: 'Volvo Finish mark', light: '—', lat: -37.8633, lng: 144.925 },
  { name: 'Zulu', description: 'RYCV laid mark', light: '—', lat: -37.9033, lng: 144.8544 },
];
