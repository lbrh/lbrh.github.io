export type WindStation = {
  id: string;
  name: string;
  description: string;
  lat: number;
  lng: number;
};

// Approximate positions of BOM automatic weather stations spread around
// Port Phillip, chosen to give a spread of readings across the bay.
// Reference only — coordinates are indicative, not surveyed.
export const WIND_STATIONS: WindStation[] = [
  {
    id: 'fawkner',
    name: 'Fawkner Beacon',
    description: 'Entrance to the Port of Melbourne shipping channel, central bay.',
    lat: -37.9483,
    lng: 144.927,
  },
  {
    id: 'frankston',
    name: 'Frankston',
    description: 'Eastern shore, off the Frankston foreshore.',
    lat: -38.141,
    lng: 145.1215,
  },
  {
    id: 'point-wilson',
    name: 'Point Wilson',
    description: 'Western shore, north-west of Avalon.',
    lat: -38.1,
    lng: 144.54,
  },
  {
    id: 'south-channel',
    name: 'South Channel',
    description: 'South Channel Island Fort, near the bay entrance (the Heads).',
    lat: -38.305,
    lng: 144.7567,
  },
  {
    id: 'melbourne-airport',
    name: 'Melbourne Airport',
    description: 'Tullamarine, used as an inland comparison point.',
    lat: -37.669,
    lng: 144.841,
  },
  {
    id: 'st-kilda',
    name: 'St Kilda Harbour (RMYS)',
    description: 'Royal Melbourne Yacht Squadron, St Kilda Harbour, northern bay.',
    lat: -37.8634,
    lng: 144.9715,
  },
  {
    id: 'kilmore-gap',
    name: 'Kilmore Gap',
    description: 'Gap in the Great Dividing Range north of Melbourne — an early indicator of a wind change reaching the bay.',
    lat: -37.3807,
    lng: 144.9654,
  },
  {
    id: 'webb-dock',
    name: 'Webb Dock',
    description: 'Container terminal at the mouth of the Yarra, Port of Melbourne (OMC International sensor).',
    lat: -37.85,
    lng: 144.9,
  },
];
