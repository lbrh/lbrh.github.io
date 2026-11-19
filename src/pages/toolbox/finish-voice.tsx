import { useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import ToolboxShell from '@/components/toolbox/ToolboxShell';
import {
  blankRow,
  buildBoatMap,
  findDuplicateSails,
  hasFleetColumn,
  missingBoatColumns,
  rematchRow,
  rowIsValid,
  rowsFromExtracted,
  rowsToCsv,
  validateRow,
  type BoatEntry,
  type FinishRow,
} from '@/lib/finishSheet';
import {
  clockString,
  eventsToExtracted,
  parseClock,
  parseVoiceEvents,
  transcriptForPrompt,
  transcriptLines,
  type TranscriptWord,
} from '@/lib/finishVoice';
import { readMediaCreationTime, readMediaDuration } from '@/lib/mediaTime';
import { WHISPER_MODELS, decodeToMono16k, transcribeSamples } from '@/lib/transcribe';

type ClockSource = 'metadata-local' | 'metadata' | 'file-date' | 'manual' | 'unknown';

/** One recording. Several are merged into a single timeline by their start clock times. */
type Item = {
  id: string;
  file: File;
  url: string;
  isVideo: boolean;
  duration: number;
  clockInput: string;
  clockSource: ClockSource;
  /** Word times are seconds from the start of THIS file. */
  words: TranscriptWord[] | null;
};

const CLOCK_NOTE: Record<ClockSource, string> = {
  'metadata-local': "read from the file's local-time stamp (iPhone) — no time-zone conversion",
  metadata: "read from the file's UTC recording-start metadata, shown in this computer's time zone",
  'file-date': "guessed from the file's saved time minus its length — verify",
  manual: 'entered manually',
  unknown: 'no time found in the file — enter it',
};

let itemSeq = 0;

// Same Cloudflare Worker as the Finish Sheet Reader — see cloudflare/finish-sheet-worker.js
// (it needs the transcript mode added in this repo deployed).
const WORKER_URL = 'https://spring-river-924e.lbrhounsell.workers.dev';

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function secondsOfDay(d: Date): number {
  return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
}

export default function FinishVoiceLogger() {
  const [boatFileName, setBoatFileName] = useState('');
  const [boatMap, setBoatMap] = useState<Map<string, BoatEntry> | null>(null);
  const [boatError, setBoatError] = useState('');

  const [items, setItems] = useState<Item[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [modelId, setModelId] = useState<string>(WHISPER_MODELS[1].id);

  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [rows, setRows] = useState<FinishRow[] | null>(null);
  /** Clock time (seconds since midnight) of each row's "now", keyed by row id, for the play buttons. */
  const [recTimes, setRecTimes] = useState<Record<string, number | null>>({});
  /** Clock settings when the rows were built, to warn if they're edited afterwards. */
  const [extractedSig, setExtractedSig] = useState('');

  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const pendingSeek = useRef<number | null>(null);

  const updateItem = (id: string, patch: Partial<Item>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const addFiles = async (files: FileList | File[]) => {
    setError('');
    const added: Item[] = [];
    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|m4v|webm)$/i.test(file.name);
      const url = URL.createObjectURL(file);
      added.push({
        id: `rec-${++itemSeq}`,
        file,
        url,
        isVideo,
        duration: 0,
        clockInput: '',
        clockSource: 'unknown',
        words: null,
      });
    }
    setItems((prev) => [...prev, ...added]);
    setActiveId((cur) => cur ?? added[0]?.id ?? null);

    // Recording start time: container metadata first, else saved time minus length.
    for (const it of added) {
      const [created, duration] = await Promise.all([
        readMediaCreationTime(it.file),
        readMediaDuration(it.url, it.isVideo),
      ]);
      const dur = duration ?? 0;
      if (created) {
        updateItem(it.id, {
          duration: dur,
          clockInput: clockString(created.seconds),
          clockSource: created.source === 'local' ? 'metadata-local' : 'metadata',
        });
      } else if (dur > 0) {
        const end = new Date(it.file.lastModified);
        updateItem(it.id, {
          duration: dur,
          clockInput: clockString(secondsOfDay(end) - dur),
          clockSource: 'file-date',
        });
      } else {
        updateItem(it.id, { duration: dur });
      }
    }
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const gone = prev.find((it) => it.id === id);
      if (gone) URL.revokeObjectURL(gone.url);
      return prev.filter((it) => it.id !== id);
    });
    setActiveId((cur) => (cur === id ? null : cur));
  };

  // ---- Combined timeline -------------------------------------------------
  const clocks = items.map((it) => parseClock(it.clockInput));
  const allClocksValid = items.length > 0 && clocks.every((c) => c !== null);
  const clockSig = items.map((it) => `${it.id}=${it.clockInput}`).join('|');
  const allTranscribed = items.length > 0 && items.every((it) => it.words !== null);

  /** Every word on one clock-time axis (seconds since midnight), across all files. */
  const combinedWords = useMemo(() => {
    const all: TranscriptWord[] = [];
    for (const it of items) {
      const c = parseClock(it.clockInput);
      if (c === null || !it.words) continue;
      for (const w of it.words) all.push({ text: w.text, start: w.start + c, end: w.end + c });
    }
    return all.sort((a, b) => a.start - b.start);
  }, [items]);

  const lines = useMemo(() => transcriptLines(combinedWords), [combinedWords]);

  // ---- Playback ----------------------------------------------------------
  /** Plays the file covering a clock time (seconds since midnight), at the right spot within it. */
  const seekClock = (abs: number) => {
    let best: Item | null = null;
    let bestStart = -Infinity;
    for (const it of items) {
      const c = parseClock(it.clockInput);
      if (c === null) continue;
      if (c <= abs && c > bestStart) {
        best = it;
        bestStart = c;
      }
    }
    if (!best) return;
    const local = Math.max(0, abs - bestStart);
    if (best.id === activeId && mediaRef.current) {
      mediaRef.current.currentTime = local;
      void mediaRef.current.play().catch(() => undefined);
    } else {
      pendingSeek.current = local;
      setActiveId(best.id);
    }
  };

  const active = items.find((it) => it.id === activeId) ?? null;

  // ---- Boat list ---------------------------------------------------------
  const handleBoatCsv = (file: File) => {
    setBoatError('');
    setBoatFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (res) => {
        const data = res.data;
        if (!data.length) {
          setBoatError('Boat list CSV appears to be empty.');
          setBoatMap(null);
          return;
        }
        const missing = missingBoatColumns(data[0]);
        if (missing.length) {
          setBoatError(`Boat list CSV is missing required column(s): ${missing.join(', ')}`);
          setBoatMap(null);
          return;
        }
        const map = buildBoatMap(data);
        setBoatMap(map);
        if (!hasFleetColumn(data[0])) {
          setBoatError(
            `No fleet column found in "${file.name}" — re-export the boat list with the fleet/class column, otherwise every row will show a blank fleet.`,
          );
        }
        setRows((prev) => (prev ? prev.map((r) => rematchRow(r, map)) : prev));
      },
      error: (err) => {
        setBoatError(`Failed to parse CSV: ${err.message}`);
        setBoatMap(null);
      },
    });
  };

  // ---- Transcribe + extract ---------------------------------------------
  const runTranscribe = async () => {
    setError('');
    setBusy(true);
    setRows(null);
    try {
      const todo = items.filter((it) => it.words === null);
      for (let i = 0; i < todo.length; i++) {
        const it = todo[i];
        const tag = todo.length > 1 ? `File ${i + 1} of ${todo.length}: ` : '';
        setStatus(`${tag}reading the audio…`);
        const { samples, duration } = await decodeToMono16k(it.file);
        const words = await transcribeSamples(samples, modelId, (p) => setStatus(`${tag}${p.message}`));
        updateItem(it.id, { words, duration: it.duration || duration });
      }
      setStatus('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('');
    } finally {
      setBusy(false);
    }
  };

  const runExtract = async () => {
    if (!boatMap || !allClocksValid) return;
    setError('');
    setBusy(true);
    setStatus('Claude is matching boats to "now" calls…');
    try {
      // Model sees seconds from the earliest recording's start; convert back after.
      const validClocks = clocks as number[];
      const base = Math.min(...validClocks);
      const relWords = combinedWords.map((w) => ({ text: w.text, start: w.start - base, end: w.end - base }));
      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcriptForPrompt(relWords),
          sails: [...boatMap.keys()],
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body || body.error) {
        throw new Error(body?.error || `Worker responded with status ${res.status}`);
      }
      const events = parseVoiceEvents(body.events);
      if (!events.length) throw new Error('No boat finishes were found in that transcript.');
      const built = rowsFromExtracted(eventsToExtracted(events, base), boatMap);
      const times: Record<string, number | null> = {};
      built.forEach((r, i) => {
        times[r.id] = events[i].t === null ? null : base + events[i].t!;
      });
      setRecTimes(times);
      setRows(built);
      setExtractedSig(clockSig);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setStatus('');
    }
  };

  // ---- Table -------------------------------------------------------------
  const updateRow = (id: string, patch: Partial<FinishRow>) => {
    setRows((prev) =>
      prev
        ? prev.map((r) => {
            if (r.id !== id) return r;
            const next = { ...r, ...patch };
            return 'sailNum' in patch ? rematchRow(next, boatMap) : next;
          })
        : prev,
    );
  };
  const removeRow = (id: string) => setRows((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
  const addRow = () => setRows((prev) => [...(prev ?? []), blankRow()]);

  const sortedRows = useMemo(() => {
    if (!rows) return [];
    return [...rows].sort((a, b) => {
      const pa = Number(a.place);
      const pb = Number(b.place);
      return (Number.isFinite(pa) ? pa : Infinity) - (Number.isFinite(pb) ? pb : Infinity);
    });
  }, [rows]);

  const duplicateSails = useMemo(() => (rows ? findDuplicateSails(rows) : new Set<string>()), [rows]);
  const invalidCount = rows ? rows.filter((r) => !rowIsValid(validateRow(r, duplicateSails))).length : 0;
  const canExport = !!rows && rows.length > 0 && invalidCount === 0;

  const exportCsv = () => {
    if (!canExport || !rows) return;
    const first = items[0]?.file.name ?? '';
    const safe = first.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]+/g, '-') || 'voice-finish';
    download(new Blob([rowsToCsv(rows)], { type: 'text/csv' }), `FinishTimeImport_${safe}.csv`);
  };

  const invalidStyle = { borderColor: 'var(--tb-danger)', background: '#fef3f2' };
  const untranscribed = items.filter((it) => it.words === null).length;

  return (
    <ToolboxShell
      eyebrow="Tool 11"
      title="Voice Finish Logger"
      description="Transcribe recordings of boats being called across the finish line and turn them into a TopYacht FinishTime import CSV."
    >
      <h1 className="tb-display tb-anim-rise text-[26px] leading-tight">Voice Finish Logger</h1>
      <p
        className="tb-anim-rise mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--tb-text-muted)]"
        style={{ animationDelay: '0.04s' }}
      >
        Record yourself calling each boat and &ldquo;now&rdquo; as it finishes. Add one or more
        recordings — each is transcribed on your own device (nothing is uploaded) and placed on a
        single timeline using the start time stored in the file. Only the text goes to Claude, which
        pairs each &ldquo;now&rdquo; with its boat — repeats, double-loads and &ldquo;scratch
        that&rdquo; included. Check the table, then export the CSV.
      </p>

      <div className="tb-anim-rise tb-card mt-8 p-6" style={{ animationDelay: '0.08s' }}>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <span className="tb-eyebrow">1. Boat List CSV (required)</span>
            <label
              className="mt-2 flex cursor-pointer flex-col items-center justify-center border-4 border-dashed border-[var(--tb-border)] p-6 text-center transition hover:border-[var(--tb-accent)]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) handleBoatCsv(f);
              }}
            >
              <p className="text-[var(--tb-text-muted)]">Drop the exported boat list here, or click to select</p>
              {boatFileName && (
                <p className="tb-mono mt-2 text-sm font-medium text-[var(--tb-accent)]">
                  {boatFileName}
                  {boatMap && ` — ${boatMap.size} boat${boatMap.size === 1 ? '' : 's'} loaded`}
                </p>
              )}
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleBoatCsv(f);
                }}
              />
            </label>
            {boatError && (
              <p className="mt-2 rounded-[3px] border border-[var(--tb-danger)]/40 bg-[#fef3f2] p-2 text-xs text-[var(--tb-danger)]">
                {boatError}
              </p>
            )}
          </div>

          <div>
            <span className="tb-eyebrow">2. Audio / video recordings (one or more)</span>
            <label
              className="mt-2 flex cursor-pointer flex-col items-center justify-center border-4 border-dashed border-[var(--tb-border)] p-6 text-center transition hover:border-[var(--tb-accent)]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files?.length) void addFiles(e.dataTransfer.files);
              }}
            >
              <p className="text-[var(--tb-text-muted)]">
                Drop mp3 / m4a / wav / mp4 / mov files here, or click to select — you can add more later
              </p>
              <input
                type="file"
                multiple
                accept="audio/*,video/*,.m4a,.mp3,.wav,.mp4,.mov,.m4v,.webm,.aac"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.length) void addFiles(e.target.files);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
        </div>

        {items.length > 0 && (
          <div className="mt-6">
            <span className="tb-eyebrow">Recordings</span>
            <div className="mt-2 space-y-3">
              {items.map((it, i) => {
                const c = clocks[i];
                return (
                  <div key={it.id} className="grid items-start gap-3 border border-[var(--tb-border)] p-3 sm:grid-cols-[1fr_auto]">
                    <div>
                      <p className="tb-mono text-sm font-medium">{it.file.name}</p>
                      <p className="mt-0.5 text-[12px] text-[var(--tb-text-muted)]">
                        {it.duration > 0 ? `${Math.round(it.duration)} s · ` : ''}
                        {it.words ? `${it.words.length} words transcribed` : 'not transcribed yet'}
                      </p>
                      <label className="mt-2 block text-sm">
                        <span className="tb-eyebrow">Recording start (HH:MM:SS)</span>
                        <input
                          value={it.clockInput}
                          onChange={(e) => updateItem(it.id, { clockInput: e.target.value, clockSource: 'manual' })}
                          placeholder="e.g. 15:42:10"
                          className="tb-input tb-mono mt-1 w-40 px-3 py-1.5 text-sm"
                          style={c === null ? invalidStyle : undefined}
                        />
                        <span
                          className="ml-3 text-[12px]"
                          style={{ color: it.clockSource === 'metadata' || it.clockSource === 'metadata-local' ?'var(--tb-text-muted)' : 'var(--tb-warn)' }}
                        >
                          {CLOCK_NOTE[it.clockSource]}
                        </span>
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setActiveId(it.id)} className="tb-btn-ghost px-3 py-1.5 text-xs">
                        Play
                      </button>
                      <button
                        onClick={() => removeItem(it.id)}
                        className="tb-btn-ghost px-3 py-1.5 text-xs"
                        aria-label={`Remove ${it.file.name}`}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="tb-eyebrow">Speech model</span>
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              className="tb-input mt-1 w-full px-3 py-2 text-sm"
              disabled={busy}
            >
              {WHISPER_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={runTranscribe} disabled={!untranscribed || busy} className="tb-btn px-4 py-2 text-sm">
            {untranscribed && untranscribed < items.length
              ? `Transcribe ${untranscribed} new recording${untranscribed === 1 ? '' : 's'}`
              : 'Transcribe recordings'}
          </button>
          <button
            onClick={runExtract}
            disabled={!allTranscribed || !boatMap || !allClocksValid || busy}
            className="tb-btn px-4 py-2 text-sm"
          >
            Read finishes with Claude
          </button>
        </div>
        {allTranscribed && (!boatMap || !allClocksValid) && (
          <p className="mt-2 text-[12.5px] text-[var(--tb-text-muted)]">
            {!boatMap ? 'Load the boat list' : 'Enter a valid start time for every recording'} to continue.
          </p>
        )}
        {status && <p className="mt-3 text-sm text-[var(--tb-text-muted)]">{status}</p>}
        {error && (
          <p className="mt-4 rounded-[3px] border border-[var(--tb-danger)]/40 bg-[#fef3f2] p-3 text-sm text-[var(--tb-danger)]">
            {error}
          </p>
        )}
        {rows && extractedSig !== clockSig && (
          <p className="mt-4 rounded-[3px] border border-[var(--tb-warn)]/40 bg-[#fffaeb] p-3 text-sm text-[var(--tb-warn)]">
            Recordings or start times changed since the table was built — press &ldquo;Read finishes with
            Claude&rdquo; again to apply them.
          </p>
        )}
      </div>

      {active && (
        <div className="tb-card mt-8 p-6">
          <h2 className="tb-display text-[17px]">Playback — {active.file.name}</h2>
          {active.isVideo ? (
            <video
              key={active.id}
              ref={(el) => {
                mediaRef.current = el;
              }}
              src={active.url}
              controls
              className="mt-3 max-h-64 w-full"
              onLoadedMetadata={(e) => {
                if (pendingSeek.current !== null) {
                  e.currentTarget.currentTime = pendingSeek.current;
                  pendingSeek.current = null;
                  void e.currentTarget.play().catch(() => undefined);
                }
              }}
            />
          ) : (
            <audio
              key={active.id}
              ref={(el) => {
                mediaRef.current = el;
              }}
              src={active.url}
              controls
              className="mt-3 w-full"
              onLoadedMetadata={(e) => {
                if (pendingSeek.current !== null) {
                  e.currentTarget.currentTime = pendingSeek.current;
                  pendingSeek.current = null;
                  void e.currentTarget.play().catch(() => undefined);
                }
              }}
            />
          )}
        </div>
      )}

      {combinedWords.length > 0 && (
        <div className="tb-card mt-8 p-6">
          <h2 className="tb-display text-[17px]">Transcript</h2>
          <p className="mt-1 text-[12.5px] text-[var(--tb-text-muted)]">
            Combined across all recordings, shown in clock time. Click a time to play from there.
          </p>
          <div className="mt-3 max-h-72 overflow-y-auto border border-[var(--tb-border)] p-3 text-[13px] leading-relaxed">
            {lines.map((l, i) => (
              <p key={i}>
                <button
                  onClick={() => seekClock(l.start)}
                  className="tb-mono mr-2 text-[11.5px] text-[var(--tb-accent)] hover:underline"
                >
                  {clockString(l.start)}
                </button>
                {l.text}
              </p>
            ))}
          </div>
        </div>
      )}

      {rows && (
        <div className="tb-card mt-8 overflow-x-auto p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="tb-display text-[17px]">Preview</h2>
            <span className="tb-mono text-xs text-[var(--tb-text-muted)]">
              {rows.length} row{rows.length === 1 ? '' : 's'}
              {invalidCount > 0 ? `, ${invalidCount} invalid` : ''}
            </span>
          </div>
          {invalidCount > 0 && (
            <p className="mt-3 rounded-[3px] border border-[var(--tb-warn)]/40 bg-[#fffaeb] p-3 text-sm text-[var(--tb-warn)]">
              {invalidCount} row{invalidCount === 1 ? '' : 's'} need attention (highlighted) — usually a sail
              number not in the boat list, a boat with no &ldquo;now&rdquo; heard, or a duplicate. Export is
              disabled until fixed.
            </p>
          )}

          <table className="tb-table mt-4">
            <thead>
              <tr>
                <th>Place</th>
                <th>Sail No</th>
                <th>Boat</th>
                <th>Fleet</th>
                <th>HR</th>
                <th>MN</th>
                <th>SC</th>
                <th>Heard</th>
                <th>Note</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r) => {
                const v = validateRow(r, duplicateSails);
                const t = recTimes[r.id];
                return (
                  <tr key={r.id} style={!rowIsValid(v) ? { background: '#fffaeb' } : undefined}>
                    <td>
                      <input
                        className="tb-input w-14 px-2 py-1 text-sm"
                        value={r.place}
                        onChange={(e) => updateRow(r.id, { place: e.target.value })}
                        style={!v.place ? invalidStyle : undefined}
                      />
                    </td>
                    <td>
                      <input
                        className="tb-input w-24 px-2 py-1 text-sm"
                        value={r.sailNum}
                        onChange={(e) => updateRow(r.id, { sailNum: e.target.value })}
                        title={
                          !v.sailNum
                            ? "Doesn't match a sail number in the boat list."
                            : !v.unique
                              ? 'Duplicate: this sail number is already on another row.'
                              : undefined
                        }
                        style={!v.sailNum || !v.unique ? invalidStyle : undefined}
                      />
                    </td>
                    <td>
                      <input
                        readOnly
                        className="tb-input w-40 cursor-not-allowed px-2 py-1 text-sm text-[var(--tb-text-muted)]"
                        value={r.boat}
                        style={!v.boat ? invalidStyle : { background: 'var(--tb-surface)' }}
                      />
                    </td>
                    <td>
                      <input
                        readOnly
                        className="tb-input w-24 cursor-not-allowed px-2 py-1 text-sm text-[var(--tb-text-muted)]"
                        value={r.fleet}
                        style={!v.fleet ? invalidStyle : { background: 'var(--tb-surface)' }}
                      />
                    </td>
                    {(['hr', 'mm', 'ss'] as const).map((k) => (
                      <td key={k}>
                        <input
                          className="tb-input w-14 px-2 py-1 text-sm"
                          value={r[k]}
                          onChange={(e) => updateRow(r.id, { [k]: e.target.value })}
                          style={!v[k] ? invalidStyle : undefined}
                        />
                      </td>
                    ))}
                    <td className="tb-mono text-xs">
                      {typeof t === 'number' ? (
                        <button
                          onClick={() => seekClock(t - 5)}
                          className="text-[var(--tb-accent)] hover:underline"
                          title="Play from 5 seconds before this “now”"
                        >
                          ▶ play
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td>
                      <input
                        className="tb-input w-28 px-2 py-1 text-sm"
                        value={r.note}
                        onChange={(e) => updateRow(r.id, { note: e.target.value })}
                        title="Not exported — DidNot is always left blank in the CSV."
                      />
                    </td>
                    <td>
                      <button onClick={() => removeRow(r.id)} className="tb-btn-ghost px-2 py-1 text-xs" aria-label="Remove row">
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="mt-4 flex flex-wrap gap-3">
            <button onClick={addRow} className="tb-btn-ghost px-4 py-2 text-sm">
              + Add row
            </button>
            <button onClick={exportCsv} disabled={!canExport} className="tb-btn px-4 py-2 text-sm">
              Export CSV
            </button>
          </div>
          <p className="tb-mono mt-2 text-xs text-[var(--tb-text-muted)]">
            Exports Boat, Sail No, Fleet, HR, MN, SC, DidNot (always blank) — same format as the Finish Sheet
            Reader, sorted by place.
          </p>
        </div>
      )}
    </ToolboxShell>
  );
}
