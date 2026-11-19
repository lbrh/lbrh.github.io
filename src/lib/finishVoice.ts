/**
 * Pure helpers for the Voice Finish Logger: formatting a timestamped
 * transcript for Claude, turning the finish events Claude returns into
 * ExtractedRow[] for the shared finishSheet.ts matching/CSV code, and the
 * recording-time -> wall-clock-time maths.
 */
import type { ExtractedRow } from '@/lib/finishSheet';

export type TranscriptWord = { text: string; start: number; end: number };

/** One finish as returned by the Worker: t is seconds into the recording at the spoken "now". */
export type VoiceEvent = { sailNum: string; t: number | null; note: string };

/** Defensive coercion of the Worker/model JSON — a bad row is dropped, not fatal. */
export function parseVoiceEvents(input: unknown): VoiceEvent[] {
  if (!Array.isArray(input)) return [];
  const out: VoiceEvent[] = [];
  for (const item of input) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const sailNum = String(rec.sailNum ?? '').trim();
    if (!sailNum) continue;
    const t = typeof rec.t === 'number' && Number.isFinite(rec.t) ? rec.t : null;
    out.push({ sailNum, t, note: String(rec.note ?? '').trim() });
  }
  return out;
}

function fmt(t: number): string {
  return t.toFixed(1);
}

/**
 * Compact text for the model: every word carries its start time in
 * seconds, e.g. "[12.4]R815, [13.1]now." — the model needs word-level
 * precision to timestamp each "now".
 */
export function transcriptForPrompt(words: TranscriptWord[]): string {
  const lines: string[] = [];
  let line: string[] = [];
  let lastEnd = 0;
  for (const w of words) {
    const text = w.text.trim();
    if (!text) continue;
    if (line.length && (w.start - lastEnd > 2 || line.length >= 25)) {
      lines.push(line.join(' '));
      line = [];
    }
    line.push(`[${fmt(w.start)}]${text}`);
    lastEnd = w.end;
  }
  if (line.length) lines.push(line.join(' '));
  return lines.join('\n');
}

export type TranscriptLine = { start: number; text: string };

/** Readable lines for display: break on pauses over 1.5 s or after ~14 words. */
export function transcriptLines(words: TranscriptWord[]): TranscriptLine[] {
  const lines: TranscriptLine[] = [];
  let cur: TranscriptLine | null = null;
  let count = 0;
  let lastEnd = 0;
  for (const w of words) {
    const text = w.text.trim();
    if (!text) continue;
    if (!cur || w.start - lastEnd > 1.5 || count >= 14) {
      cur = { start: w.start, text: '' };
      lines.push(cur);
      count = 0;
    }
    cur.text += (cur.text ? ' ' : '') + text;
    count += 1;
    lastEnd = w.end;
  }
  return lines;
}

export function formatRecTime(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${p(m)}:${p(sec)}` : `${m}:${p(sec)}`;
}

/** Parses "HH:MM:SS" or "HH:MM" into seconds since midnight, or null. */
export function parseClock(value: string): number | null {
  const m = value.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  const s = m[3] ? Number(m[3]) : 0;
  if (h > 23 || min > 59 || s > 59) return null;
  return h * 3600 + min * 60 + s;
}

export function clockString(secondsSinceMidnight: number): string {
  const total = ((Math.round(secondsSinceMidnight) % 86400) + 86400) % 86400;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(Math.floor(total / 3600))}:${p(Math.floor((total % 3600) / 60))}:${p(total % 60)}`;
}

/** Wall-clock hr/min/sec (zero padded) for a recording offset, given the clock time at 0:00 of the recording. */
export function clockAt(startClockSeconds: number, t: number): { hr: string; min: string; sec: string } {
  const total = (((Math.round(startClockSeconds + t) % 86400) + 86400) % 86400) as number;
  const p = (n: number) => String(n).padStart(2, '0');
  return { hr: p(Math.floor(total / 3600)), min: p(Math.floor((total % 3600) / 60)), sec: p(total % 60) };
}

/** Events -> ExtractedRow[] in finish order; a missing time (no "now" heard) is left blank so it shows as invalid. */
export function eventsToExtracted(events: VoiceEvent[], startClockSeconds: number | null): ExtractedRow[] {
  return events.map((e, i) => {
    const time =
      e.t !== null && startClockSeconds !== null ? clockAt(startClockSeconds, e.t) : { hr: '', min: '', sec: '' };
    return {
      place: i + 1,
      sailNum: e.sailNum,
      hr: time.hr,
      min: time.min,
      sec: time.sec,
      note: e.note,
      hourGuessed: false,
    };
  });
}
