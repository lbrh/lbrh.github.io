import { useMemo, useState } from 'react';
import Papa from 'papaparse';
import ToolboxShell from '@/components/toolbox/ToolboxShell';
import {
  blankRow,
  buildBoatMap,
  missingBoatColumns,
  parseExtractedRows,
  rematchRow,
  rowIsValid,
  rowsFromExtracted,
  rowsToCsv,
  validateRow,
  type BoatEntry,
  type FinishRow,
} from '@/lib/finishSheet';

// Cloudflare Worker that proxies the photo to the Anthropic API — see
// cloudflare/finish-sheet-worker.js.
const WORKER_URL = 'https://spring-river-924e.lbrhounsell.workers.dev';

const HEIC2ANY_SRC = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
const MAX_EDGE_PX = 1600;
const JPEG_QUALITY = 0.85;
// Guards against absurd files before we even try to decode them client-side.
const MAX_SOURCE_BYTES = 30 * 1024 * 1024;

type Heic2Any = (opts: { blob: Blob; toType?: string; quality?: number }) => Promise<Blob | Blob[]>;

/** Loaded from a CDN on first use rather than bundled, so HEIC decoding
 *  (libheif via WASM) doesn't add weight to every page load for a tool
 *  most visitors won't touch. */
function loadHeic2Any(): Promise<Heic2Any> {
  const w = window as typeof window & { heic2any?: Heic2Any };
  if (w.heic2any) return Promise.resolve(w.heic2any);
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = HEIC2ANY_SRC;
    script.onload = () => (w.heic2any ? resolve(w.heic2any) : reject(new Error('heic2any failed to load.')));
    script.onerror = () => reject(new Error('Could not load the HEIC conversion library — check your connection.'));
    document.head.appendChild(script);
  });
}

function isHeic(file: File): boolean {
  return file.type === 'image/heic' || file.type === 'image/heif' || /\.(heic|heif)$/i.test(file.name);
}

function isGif(file: File): boolean {
  return file.type === 'image/gif' || /\.gif$/i.test(file.name);
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(new Error('Could not read the image file.'));
    fr.readAsDataURL(blob);
  });
}

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

/**
 * Converts HEIC/HEIF (what iPhones save by default) to JPEG, then
 * downscales to a max edge and re-encodes as JPEG. This keeps every
 * upload small and in a format Anthropic actually accepts — Claude's
 * vision API doesn't support HEIC, and a full-resolution phone photo is
 * far bigger than useful for reading a printed or handwritten sheet.
 */
async function normalizePhoto(file: File): Promise<{ base64: string; mediaType: string; dataUrl: string }> {
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('That photo is too large — try a smaller file (under 30MB).');
  }

  let sourceBlob: Blob = file;
  if (isHeic(file)) {
    const heic2any = await loadHeic2Any();
    const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.92 });
    sourceBlob = Array.isArray(converted) ? converted[0] : converted;
  }

  const bitmap = await createImageBitmap(sourceBlob);
  const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('This browser does not support canvas image processing.');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const jpegBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Could not encode the image.'))),
      'image/jpeg',
      JPEG_QUALITY,
    );
  });

  const dataUrl = await blobToDataUrl(jpegBlob);
  const [, mediaType, base64] = dataUrl.match(/^data:(.+);base64,(.*)$/) ?? [];
  if (!mediaType || !base64) throw new Error('Could not encode the image.');
  return { base64, mediaType, dataUrl };
}

export default function FinishSheetReader() {
  const [photoName, setPhotoName] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');

  const [boatFileName, setBoatFileName] = useState('');
  const [boatMap, setBoatMap] = useState<Map<string, BoatEntry> | null>(null);
  const [boatError, setBoatError] = useState('');

  const [rows, setRows] = useState<FinishRow[] | null>(null);

  const handlePhoto = async (file: File) => {
    if (!boatMap) {
      setError('Upload the boat list CSV first — boat and fleet are filled in from it, not typed by hand.');
      return;
    }
    setError('');
    setPhotoName(file.name);

    if (isGif(file)) {
      setError('GIF is not supported — upload a still photo (jpg, png, webp or heic).');
      return;
    }
    if (!file.type.startsWith('image/') && !isHeic(file)) {
      setError(`Unsupported file type: ${file.type || 'unknown'}. Use a jpg, png, webp or heic photo.`);
      return;
    }

    setExtracting(true);
    try {
      const { base64, mediaType, dataUrl } = await normalizePhoto(file);
      setPhotoPreview(dataUrl);

      const res = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body || body.error) {
        throw new Error(body?.error || `Worker responded with status ${res.status}`);
      }

      const extracted = parseExtractedRows(body.rows);
      if (!extracted.length) {
        throw new Error('No finish rows could be read from that photo. Try a clearer or straighter shot.');
      }
      setRows(rowsFromExtracted(extracted, boatMap));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setExtracting(false);
    }
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
        setError('');
        // Re-match any rows already on screen against the freshly loaded list.
        setRows((prev) => (prev ? prev.map((r) => rematchRow(r, map)) : prev));
      },
      error: (err) => {
        setBoatError(`Failed to parse CSV: ${err.message}`);
        setBoatMap(null);
      },
    });
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

  const removeRow = (id: string) => {
    setRows((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
  };

  const addRow = () => {
    setRows((prev) => [...(prev ?? []), blankRow()]);
  };

  const sortedRows = useMemo(() => {
    if (!rows) return [];
    return [...rows].sort((a, b) => {
      const pa = Number(a.place);
      const pb = Number(b.place);
      const na = Number.isFinite(pa) ? pa : Infinity;
      const nb = Number.isFinite(pb) ? pb : Infinity;
      return na - nb;
    });
  }, [rows]);

  const invalidCount = rows ? rows.filter((r) => !rowIsValid(validateRow(r))).length : 0;
  const canExport = !!rows && rows.length > 0 && invalidCount === 0;

  const exportCsv = () => {
    if (!canExport || !rows) return;
    const safe = photoName.trim().replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]+/g, '-') || 'finish-sheet';
    download(new Blob([rowsToCsv(rows)], { type: 'text/csv' }), `FinishTimeImport_${safe}.csv`);
  };

  return (
    <ToolboxShell
      eyebrow="Tool 07"
      title="Finish Sheet Reader"
      description="Turn a photo of a race finish sheet into a TopYacht FinishTime import CSV."
    >
      <h1 className="tb-display tb-anim-rise text-[26px] leading-tight">Finish Sheet Reader</h1>
      <p
        className="tb-anim-rise mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--tb-text-muted)]"
        style={{ animationDelay: '0.04s' }}
      >
        Navigate to the correct race in TopYacht first, then export its boat list (Boat List &rarr;
        Export) and upload it below — it&apos;s required, since boat and fleet are always filled in
        from it rather than typed by hand. Then upload a photo of the finish sheet and Claude will
        read it into a table you can check and correct before exporting.
      </p>

      <div className="tb-anim-rise tb-card mt-8 p-6" style={{ animationDelay: '0.08s' }}>
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <span className="tb-eyebrow">Boat List CSV (required)</span>
            <label
              className="mt-2 flex cursor-pointer flex-col items-center justify-center border-4 border-dashed border-[var(--tb-border)] p-8 text-center transition hover:border-[var(--tb-accent)]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) handleBoatCsv(f);
              }}
            >
              <p className="text-[var(--tb-text-muted)]">
                Drag and drop the exported boat list here, or click to select
              </p>
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
            <span className="tb-eyebrow">Finish Sheet Photo</span>
            <label
              className={`mt-2 flex flex-col items-center justify-center border-4 border-dashed p-8 text-center transition ${
                boatMap
                  ? 'cursor-pointer border-[var(--tb-border)] hover:border-[var(--tb-accent)]'
                  : 'cursor-not-allowed border-[var(--tb-border)] opacity-50'
              }`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) handlePhoto(f);
              }}
            >
              {photoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreview} alt="Finish sheet preview" className="max-h-40 object-contain" />
              ) : (
                <p className="text-[var(--tb-text-muted)]">
                  {boatMap ? 'Drag and drop a photo here, or click to select' : 'Upload the boat list first'}
                </p>
              )}
              {photoName && <p className="tb-mono mt-2 text-sm font-medium text-[var(--tb-accent)]">{photoName}</p>}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
                className="hidden"
                disabled={!boatMap}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePhoto(f);
                }}
              />
            </label>
            {extracting && <p className="mt-2 text-sm text-[var(--tb-text-muted)]">Reading the finish sheet…</p>}
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-[3px] border border-[var(--tb-danger)]/40 bg-[#fef3f2] p-3 text-sm text-[var(--tb-danger)]">
            {error}
          </p>
        )}

        {rows && invalidCount > 0 && (
          <p className="mt-4 rounded-[3px] border border-[var(--tb-warn)]/40 bg-[#fffaeb] p-3 text-sm text-[var(--tb-warn)]">
            {invalidCount} row{invalidCount === 1 ? '' : 's'} {invalidCount === 1 ? 'has' : 'have'} a problem,
            highlighted below — usually a sail number that didn&apos;t match the boat list, or a place/time
            out of range. Export is disabled until these are fixed.
          </p>
        )}
      </div>

      {rows && (
        <div className="tb-card mt-8 overflow-x-auto p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="tb-display text-[17px]">Preview</h2>
            <span className="tb-mono text-xs text-[var(--tb-text-muted)]">
              {rows.length} row{rows.length === 1 ? '' : 's'}
              {invalidCount > 0 ? `, ${invalidCount} invalid` : ''}
            </span>
          </div>

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
                <th>Note</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r) => {
                const v = validateRow(r);
                const invalidStyle = { borderColor: 'var(--tb-danger)', background: '#fef3f2' };
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
                        title={!v.sailNum ? "Doesn't match a sail number in the boat list." : undefined}
                        style={!v.sailNum ? invalidStyle : undefined}
                      />
                    </td>
                    <td>
                      <input
                        readOnly
                        className="tb-input w-40 cursor-not-allowed px-2 py-1 text-sm text-[var(--tb-text-muted)]"
                        value={r.boat}
                        title="Filled in automatically from the boat list — fix the sail number to change this."
                        style={!v.boat ? invalidStyle : { background: 'var(--tb-surface)' }}
                      />
                    </td>
                    <td>
                      <input
                        readOnly
                        className="tb-input w-24 cursor-not-allowed px-2 py-1 text-sm text-[var(--tb-text-muted)]"
                        value={r.fleet}
                        title="Filled in automatically from the boat list — fix the sail number to change this."
                        style={!v.fleet ? invalidStyle : { background: 'var(--tb-surface)' }}
                      />
                    </td>
                    <td>
                      <input
                        className="tb-input w-14 px-2 py-1 text-sm"
                        value={r.hr}
                        onChange={(e) => updateRow(r.id, { hr: e.target.value })}
                        title={
                          !v.hr
                            ? 'Must be 0–23.'
                            : r.hourGuessed
                              ? 'Hour was inferred, not written on the sheet — double-check it.'
                              : undefined
                        }
                        style={!v.hr ? invalidStyle : r.hourGuessed ? { borderColor: 'var(--tb-warn)' } : undefined}
                      />
                    </td>
                    <td>
                      <input
                        className="tb-input w-14 px-2 py-1 text-sm"
                        value={r.mm}
                        onChange={(e) => updateRow(r.id, { mm: e.target.value })}
                        title={!v.mm ? 'Must be 0–60.' : undefined}
                        style={!v.mm ? invalidStyle : undefined}
                      />
                    </td>
                    <td>
                      <input
                        className="tb-input w-14 px-2 py-1 text-sm"
                        value={r.ss}
                        onChange={(e) => updateRow(r.id, { ss: e.target.value })}
                        title={!v.ss ? 'Must be 0–60.' : undefined}
                        style={!v.ss ? invalidStyle : undefined}
                      />
                    </td>
                    <td>
                      <input
                        className="tb-input w-20 px-2 py-1 text-sm"
                        value={r.note}
                        onChange={(e) => updateRow(r.id, { note: e.target.value })}
                        title="Not exported — DidNot is always left blank in the CSV."
                      />
                    </td>
                    <td>
                      <button
                        onClick={() => removeRow(r.id)}
                        className="tb-btn-ghost px-2 py-1 text-xs"
                        aria-label="Remove row"
                      >
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
            Exports Boat, Sail No, Fleet, HR, MN, SC, DidNot (always blank) — ready for TopYacht&apos;s
            FinishTime CSV import, sorted by place.
          </p>
        </div>
      )}
    </ToolboxShell>
  );
}
