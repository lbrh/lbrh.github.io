import { useEffect, useMemo, useRef, useState } from 'react';
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
  clockAt,
  clockString,
  eventsToExtracted,
  formatRecTime,
  parseClock,
  parseVoiceEvents,
  transcriptForPrompt,
  transcriptLines,
  type TranscriptWord,
} from '@/lib/finishVoice';
import { WHISPER_MODELS, decodeToMono16k, transcribeSamples } from '@/lib/transcribe';

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

export default function FinishVoiceLogger() {
  const [boatFileName, setBoatFileName] = useState('');
  const [boatMap, setBoatMap] = useState<Map<string, BoatEntry> | null>(null);
  const [boatError, setBoatError] = useState('');

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [isVideo, setIsVideo] = useState(false);
  const [duration, setDuration] = useState(0);
  const [modelId, setModelId] = useState<string>(WHISPER_MODELS[1].id);
  const [clockInput, setClockInput] = useState('');
  const [clockGuessed, setClockGuessed] = useState(false);

  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [words, setWords] = useState<TranscriptWord[] | null>(null);
  const [rows, setRows] = useState<FinishRow[] | null>(null);
  /** Seconds into the recording of each row's "now", keyed by row id — lets the clock be re-applied. */
  const [recTimes, setRecTimes] = useState<Record<string, number | null>>({});

  const mediaRef = useRef<HTMLMediaElement | null>(null);
  const samplesRef = useRef<Float32Array | null>(null);

  useEffect(() => {
    return () => {
      if (mediaUrl) URL.revokeObjectURL(mediaUrl);
    };
  }, [mediaUrl]);

  const startClock = useMemo(() => parseClock(clockInput), [clockInput]);

  const seek = (t: number) => {
    const el = mediaRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, t);
    void el.play().catch(() => undefined);
  };

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

  const handleMedia = (file: File) => {
    setError('');
    setWords(null);
    setRows(null);
    setRecTimes({});
    samplesRef.current = null;
    setMediaFile(file);
    setIsVideo(file.type.startsWith('video/') || /\.(mp4|mov|m4v|webm)$/i.test(file.name));
    setMediaUrl(URL.createObjectURL(file));
    setDuration(0);
    setClockInput('');
    setClockGuessed(false);
  };

  const runTranscribe = async () => {
    if (!mediaFile) return;
    setError('');
    setBusy(true);
    setWords(null);
    setRows(null);
    try {
      setStatus('Reading the audio from the file…');
      const { samples, duration: dur } = await decodeToMono16k(mediaFile);
      samplesRef.current = samples;
      setDuration(dur);
      // Phones stamp a file's modified time when recording stops, so the
      // start is roughly lastModified - duration. Only a guess — flagged.
      if (!clockInput) {
        const end = new Date(mediaFile.lastModified);
        const endSeconds = end.getHours() * 3600 + end.getMinutes() * 60 + end.getSeconds();
        setClockInput(clockString(endSeconds - dur));
        setClockGuessed(true);
      }
      const result = await transcribeSamples(samples, modelId, (p) => setStatus(p.message));
      if (!result.length) throw new Error('No speech was found in that recording.');
      setWords(result);
      setStatus('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('');
    } finally {
      setBusy(false);
    }
  };

  const runExtract = async () => {
    if (!words || !boatMap) return;
    setError('');
    setBusy(true);
    setStatus('Claude is matching boats to "now" calls…');
    try {
      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: transcriptForPrompt(words),
          sails: [...boatMap.keys()],
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body || body.error) {
        throw new Error(body?.error || `Worker responded with status ${res.status}`);
      }
      const events = parseVoiceEvents(body.events);
      if (!events.length) throw new Error('No boat finishes were found in that transcript.');
      const built = rowsFromExtracted(eventsToExtracted(events, startClock), boatMap);
      const times: Record<string, number | null> = {};
      built.forEach((r, i) => {
        times[r.id] = events[i].t;
      });
      setRecTimes(times);
      setRows(built);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setStatus('');
    }
  };

  const changeClock = (value: string) => {
    setClockInput(value);
    setClockGuessed(false);
    const sc = parseClock(value);
    if (sc === null) return;
    setRows((prev) =>
      prev
        ? prev.map((r) => {
            const t = recTimes[r.id];
            if (t === null || t === undefined) return r;
            const c = clockAt(sc, t);
            return { ...r, hr: c.hr, mm: c.min, ss: c.sec };
          })
        : prev,
    );
  };

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
  const lines = useMemo(() => (words ? transcriptLines(words) : []), [words]);

  const exportCsv = () => {
    if (!canExport || !rows) return;
    const safe = (mediaFile?.name ?? '').replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]+/g, '-') || 'voice-finish';
    download(new Blob([rowsToCsv(rows)], { type: 'text/csv' }), `FinishTimeImport_${safe}.csv`);
  };

  const invalidStyle = { borderColor: 'var(--tb-danger)', background: '#fef3f2' };

  return (
    <ToolboxShell
      eyebrow="Tool 11"
      title="Voice Finish Logger"
      description="Transcribe a recording of boats being called across the finish line and turn it into a TopYacht FinishTime import CSV."
    >
      <h1 className="tb-display tb-anim-rise text-[26px] leading-tight">Voice Finish Logger</h1>
      <p
        className="tb-anim-rise mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--tb-text-muted)]"
        style={{ animationDelay: '0.04s' }}
      >
        Record yourself calling each boat and &ldquo;now&rdquo; as it finishes. The recording is
        transcribed on your own device (nothing is uploaded), then only the text goes to Claude, which
        pairs each &ldquo;now&rdquo; with the boat it refers to — repeats and double-loads included —
        and stamps it with the time. Check the table, then export the CSV.
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
            <span className="tb-eyebrow">2. Audio or video recording</span>
            <label
              className="mt-2 flex cursor-pointer flex-col items-center justify-center border-4 border-dashed border-[var(--tb-border)] p-6 text-center transition hover:border-[var(--tb-accent)]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) handleMedia(f);
              }}
            >
              <p className="text-[var(--tb-text-muted)]">Drop an mp3 / m4a / wav / mp4 / mov here, or click to select</p>
              {mediaFile && <p className="tb-mono mt-2 text-sm font-medium text-[var(--tb-accent)]">{mediaFile.name}</p>}
              <input
                type="file"
                accept="audio/*,video/*,.m4a,.mp3,.wav,.mp4,.mov,.m4v,.webm,.aac"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleMedia(f);
                }}
              />
            </label>
          </div>
        </div>

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
          <label className="block text-sm">
            <span className="tb-eyebrow">Clock time at 0:00 of the recording (HH:MM:SS)</span>
            <input
              value={clockInput}
              onChange={(e) => changeClock(e.target.value)}
              placeholder="e.g. 15:42:10"
              className="tb-input mt-1 w-full px-3 py-2 text-sm tb-mono"
              style={clockInput && startClock === null ? invalidStyle : undefined}
            />
            <span className="mt-1 block text-[12px] text-[var(--tb-text-muted)]">
              {clockGuessed
                ? 'Guessed from the file’s saved time minus its length — check it against a known finish.'
                : 'The wall-clock time when the recording began. Each finish time is this plus its position in the recording.'}
            </span>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={runTranscribe} disabled={!mediaFile || busy} className="tb-btn px-4 py-2 text-sm">
            Transcribe recording
          </button>
          <button
            onClick={runExtract}
            disabled={!words || !boatMap || startClock === null || busy}
            className="tb-btn px-4 py-2 text-sm"
          >
            Read finishes with Claude
          </button>
        </div>
        {words && (!boatMap || startClock === null) && (
          <p className="mt-2 text-[12.5px] text-[var(--tb-text-muted)]">
            {!boatMap ? 'Load the boat list' : 'Enter a valid start clock time'} to continue.
          </p>
        )}
        {status && <p className="mt-3 text-sm text-[var(--tb-text-muted)]">{status}</p>}
        {error && (
          <p className="mt-4 rounded-[3px] border border-[var(--tb-danger)]/40 bg-[#fef3f2] p-3 text-sm text-[var(--tb-danger)]">
            {error}
          </p>
        )}
      </div>

      {mediaUrl && (
        <div className="tb-card mt-8 p-6">
          <h2 className="tb-display text-[17px]">Recording</h2>
          {isVideo ? (
            <video
              ref={(el) => {
                mediaRef.current = el;
              }}
              src={mediaUrl}
              controls
              className="mt-3 max-h-64 w-full"
              onLoadedMetadata={(e) => setDuration((d) => d || e.currentTarget.duration)}
            />
          ) : (
            <audio
              ref={(el) => {
                mediaRef.current = el;
              }}
              src={mediaUrl}
              controls
              className="mt-3 w-full"
              onLoadedMetadata={(e) => setDuration((d) => d || e.currentTarget.duration)}
            />
          )}
          {duration > 0 && (
            <p className="tb-mono mt-1 text-xs text-[var(--tb-text-muted)]">Length {formatRecTime(duration)}</p>
          )}
        </div>
      )}

      {words && (
        <div className="tb-card mt-8 p-6">
          <h2 className="tb-display text-[17px]">Transcript</h2>
          <p className="mt-1 text-[12.5px] text-[var(--tb-text-muted)]">
            Click a timestamp to play from there.
          </p>
          <div className="mt-3 max-h-72 overflow-y-auto border border-[var(--tb-border)] p-3 text-[13px] leading-relaxed">
            {lines.map((l, i) => (
              <p key={i}>
                <button
                  onClick={() => seek(l.start)}
                  className="tb-mono mr-2 text-[11.5px] text-[var(--tb-accent)] hover:underline"
                >
                  {formatRecTime(l.start)}
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
                <th>Heard at</th>
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
                          onClick={() => seek(t - 5)}
                          className="text-[var(--tb-accent)] hover:underline"
                          title="Play from 5 seconds before this “now”"
                        >
                          ▶ {formatRecTime(t)}
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
