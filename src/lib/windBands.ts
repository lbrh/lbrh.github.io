export type WindBand = 'calm' | 'moderate' | 'strong';

export const BAND_COLOUR: Record<WindBand, string> = {
  calm: '#1f7a44',
  moderate: '#b54708',
  strong: '#b42318',
};

export const BAND_LABEL: Record<WindBand, string> = {
  calm: 'Calm',
  moderate: 'Moderate',
  strong: 'Strong',
};

// Banded on gust strength — thresholds chosen for club dinghy/keelboat racing,
// not a general marine forecast scale.
export function bandForGust(gustKt: number): WindBand {
  if (gustKt >= 25) return 'strong';
  if (gustKt >= 16) return 'moderate';
  return 'calm';
}
