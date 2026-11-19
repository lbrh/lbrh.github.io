/**
 * In-browser speech-to-text with word-level timestamps, using Whisper via
 * transformers.js loaded from a CDN on first use (so it adds nothing to
 * other pages). Runs entirely on the user's device: the recording is never
 * uploaded, only the resulting text goes to the Worker.
 */
import type { TranscriptWord } from '@/lib/finishVoice';

const TRANSFORMERS_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.1/+esm';

export const WHISPER_MODELS = [
  { id: 'Xenova/whisper-tiny.en', label: 'Tiny — fastest, ~40 MB download', },
  { id: 'Xenova/whisper-base.en', label: 'Base — good balance, ~75 MB (recommended)' },
  { id: 'Xenova/whisper-small.en', label: 'Small — most accurate, slow, ~250 MB' },
] as const;

// Whisper wants 16 kHz mono float samples.
const SAMPLE_RATE = 16000;
// Decoding holds the whole file in memory; beyond this, extract the audio first.
export const MAX_MEDIA_BYTES = 1024 * 1024 * 1024;

export type Progress = { stage: 'decode' | 'model' | 'transcribe'; message: string; fraction?: number };

/** Decodes any audio/video file the browser can play into 16 kHz mono samples. */
export async function decodeToMono16k(file: File): Promise<{ samples: Float32Array; duration: number }> {
  if (file.size > MAX_MEDIA_BYTES) {
    throw new Error('That file is over 1 GB — extract just the audio (or trim it) and try again.');
  }
  const buf = await file.arrayBuffer();
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) throw new Error('This browser has no Web Audio support.');
  const ctx = new Ctx();
  let decoded: AudioBuffer;
  try {
    decoded = await ctx.decodeAudioData(buf);
  } catch {
    throw new Error(
      "The browser couldn't read audio from that file. Try mp3, m4a, wav or an mp4/mov with AAC audio.",
    );
  } finally {
    void ctx.close();
  }
  const length = Math.ceil(decoded.duration * SAMPLE_RATE);
  const offline = new OfflineAudioContext(1, length, SAMPLE_RATE);
  const src = offline.createBufferSource();
  src.buffer = decoded;
  src.connect(offline.destination);
  src.start();
  const rendered = await offline.startRendering();
  return { samples: rendered.getChannelData(0), duration: decoded.duration };
}

type AsrOutput = { chunks?: { text: string; timestamp: [number, number | null] }[]; text?: string };
type AsrPipeline = (audio: Float32Array, opts: Record<string, unknown>) => Promise<AsrOutput>;

export async function transcribeSamples(
  samples: Float32Array,
  modelId: string,
  onProgress: (p: Progress) => void,
): Promise<TranscriptWord[]> {
  onProgress({ stage: 'model', message: 'Loading speech model…' });
  // webpackIgnore: this is a runtime CDN import, not something to bundle.
  const mod = await import(/* webpackIgnore: true */ TRANSFORMERS_URL);
  const asr: AsrPipeline = await mod.pipeline('automatic-speech-recognition', modelId, {
    progress_callback: (p: { status?: string; progress?: number; file?: string }) => {
      if (p.status === 'progress' && typeof p.progress === 'number') {
        onProgress({
          stage: 'model',
          message: `Downloading speech model (first use only)… ${Math.round(p.progress)}%`,
          fraction: p.progress / 100,
        });
      }
    },
  });

  onProgress({ stage: 'transcribe', message: 'Transcribing — this can take a few minutes…' });
  const out = await asr(samples, {
    return_timestamps: 'word',
    chunk_length_s: 30,
    stride_length_s: 5,
  });

  const words: TranscriptWord[] = [];
  for (const c of out.chunks ?? []) {
    const start = c.timestamp?.[0];
    if (typeof start !== 'number') continue;
    const end = typeof c.timestamp[1] === 'number' ? c.timestamp[1] : start;
    words.push({ text: c.text, start, end });
  }
  return words;
}
