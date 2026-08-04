export type Mark = {
  name: string;
  description: string;
  lat: number;
  lng: number;
  category: 'RYCV' | 'RMYS' | 'Channel' | 'Racing' | 'Cardinal' | 'Transit' | 'Other';
};

// Port Phillip Bay navigation marks, course book v9.0. Approximate — reference only.
export const PORT_PHILLIP_MARKS: Mark[] = [
  { name: 'Carrum #2', description: 'Special Purpose Buoy', lat: -38.0511, lng: 145.0814, category: 'Other' },
  { name: 'Centre Mark', description: 'Special Purpose Buoy – X top mark', lat: -38.0586, lng: 144.8725, category: 'Other' },
  { name: 'Channel 7', description: 'Port of Melbourne Channel Pile', lat: -37.8972, lng: 144.9287, category: 'Channel' },
  { name: 'Channel 9', description: 'Port of Melbourne Channel Pile', lat: -37.8865, lng: 144.9296, category: 'Channel' },
  { name: 'Channel 11', description: 'Port of Melbourne Channel Pile', lat: -37.8782, lng: 144.9293, category: 'Channel' },
  { name: 'Channel 17a', description: 'Port of Melbourne Channel Pile', lat: -37.859, lng: 144.9197, category: 'Channel' },
  { name: 'Channel 19', description: 'Port of Melbourne Channel Pile', lat: -37.858, lng: 144.9167, category: 'Channel' },
  { name: 'Channel 71', description: 'Port of Melbourne Channel Pile', lat: -37.8677, lng: 144.9293, category: 'Channel' },
  { name: 'Channel 72', description: 'Port of Melbourne Channel Pile', lat: -37.862, lng: 144.9278, category: 'Channel' },
  { name: 'Channel 73', description: 'Port of Melbourne Channel Pile', lat: -37.862, lng: 144.9295, category: 'Channel' },
  { name: 'Channel 74', description: 'Port of Melbourne Channel Pile', lat: -37.855, lng: 144.928, category: 'Channel' },
  { name: 'Channel 75', description: 'Port of Melbourne Channel Pile', lat: -37.8549, lng: 144.93, category: 'Channel' },
  { name: 'Channel 76', description: 'Port of Melbourne Channel Pile', lat: -37.8515, lng: 144.927, category: 'Channel' },
  { name: 'Gellibrand Shoal Mark', description: 'An East Cardinal Mark', lat: -37.876, lng: 144.915, category: 'Cardinal' },
  { name: 'Outer Anchorage', description: 'A pile with a light frame', lat: -37.9485, lng: 144.8582, category: 'Other' },
  { name: 'P2', description: 'A yellow buoy marked P2', lat: -37.9243, lng: 144.8865, category: 'Racing' },
  { name: 'P3', description: 'A pile with light frame', lat: -37.8897, lng: 144.8808, category: 'Racing' },
  { name: 'Pt Cook East Cardinal Mark', description: 'An East Cardinal Mark', lat: -37.9263, lng: 144.8149, category: 'Cardinal' },
  { name: 'Pt Cook Sanctuary Limit Mark', description: 'Yellow special purpose beacon', lat: -37.929, lng: 144.8115, category: 'Other' },
  { name: 'Pt Cook South Pile', description: 'Yellow Pile, top mark shape - X shape', lat: -37.929, lng: 144.8115, category: 'Other' },
  { name: 'R2', description: 'Yellow light Buoy marked R2', lat: -37.909, lng: 144.939, category: 'Racing' },
  { name: 'R3', description: 'Yellow light Buoy marked R3', lat: -37.885, lng: 144.9372, category: 'Racing' },
  { name: 'R4', description: 'Yellow Buoy located', lat: -37.8512, lng: 144.9227, category: 'Racing' },
  { name: 'RMYS A', description: 'Yellow Special Purpose Buoy', lat: -37.865, lng: 144.9578, category: 'RMYS' },
  { name: 'RMYS B', description: 'Yellow Special Purpose Buoy', lat: -37.8863, lng: 144.87, category: 'RMYS' },
  { name: 'RMYS C', description: 'Yellow Special Purpose Buoy', lat: -37.8698, lng: 144.9402, category: 'RMYS' },
  { name: 'RMYS D', description: 'Yellow Special Purpose Buoy', lat: -37.858, lng: 144.9578, category: 'RMYS' },
  { name: 'RMYS E', description: 'Yellow Special Purpose Buoy', lat: -37.8692, lng: 144.9632, category: 'RMYS' },
  { name: 'RMYS F', description: 'Yellow Special Purpose Buoy', lat: -37.8932, lng: 144.9383, category: 'RMYS' },
  { name: 'RMYS G', description: 'Yellow Special Purpose Buoy', lat: -37.85, lng: 144.9375, category: 'RMYS' },
  { name: 'RMYS H', description: 'Yellow Special Purpose Buoy', lat: -37.8641, lng: 144.9615, category: 'RMYS' },
  { name: 'SB3', description: 'Special Purpose or General Buoy', lat: -37.8747, lng: 144.9385, category: 'Other' },
  { name: 'Spoil Ground', description: 'A yellow buoy', lat: -37.9842, lng: 144.8842, category: 'Other' },
  { name: 'SYC 5', description: 'Special Purpose Buoy – X top mark', lat: -37.9803, lng: 144.873, category: 'Other' },
  { name: 'T25', description: 'Yellow Transit Lane Mark', lat: -37.8747, lng: 144.9265, category: 'Transit' },
  { name: 'T28', description: 'Yellow Transit Lane Mark', lat: -37.8719, lng: 144.92, category: 'Transit' },
  { name: 'Uniform', description: 'RYCV laid mark', lat: -37.9274, lng: 144.9161, category: 'RYCV' },
  { name: 'V Mark', description: 'Volvo Finish mark – Yellow Special Purpose Buoy', lat: -37.8633, lng: 144.925, category: 'Other' },
  { name: 'Xray', description: 'RYCV laid mark', lat: -37.8547, lng: 144.9162, category: 'RYCV' },
  { name: 'Zulu', description: 'RYCV laid mark', lat: -37.9033, lng: 144.8544, category: 'RYCV' },
];

// Categorical palette chosen for contrast against a light basemap and for
// distinguishability without relying on hue alone at small marker sizes.
export const MARK_CATEGORY_COLOUR: Record<Mark['category'], string> = {
  RYCV: '#1a56a8',
  RMYS: '#b42318',
  Channel: '#0f766e',
  Racing: '#b54708',
  Cardinal: '#3f3f46',
  Transit: '#1f7a44',
  Other: '#7a8492',
};
