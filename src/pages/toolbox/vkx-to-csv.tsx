import { useState } from 'react';
import ToolboxShell from '@/components/toolbox/ToolboxShell';
import { parseVkxTrack, trackToCsv } from '@/lib/vkx';

function download(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

type Result = { name: string; csvName: string; csv: string; points: number; error?: string };

async function convert(file: File): Promise<Result> {
  const csvName = file.name.replace(/\.vkx$/i, '') + '.csv';
  try {
    const pts = parseVkxTrack(await file.arrayBuffer());
    if (!pts.length) return { name: file.name, csvName, csv: '', points: 0, error: 'No position records (0x02) found.' };
    return { name: file.name, csvName, csv: trackToCsv(pts), points: pts.length };
  } catch (e) {
    return { name: file.name, csvName, csv: '', points: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

export default function VkxToCsv() {
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);

  const handleFiles = async (files: File[]) => {
    const vkx = files.filter((f) => /\.vkx$/i.test(f.name));
    if (!vkx.length) return;
    setBusy(true);
    setResults([]);
    const out = await Promise.all(vkx.map(convert));
    setResults(out);
    setBusy(false);
    // Browsers throttle rapid programmatic downloads; space them slightly.
    for (const r of out.filter((r) => r.csv)) {
      download(r.csv, r.csvName);
      await new Promise((res) => setTimeout(res, 150));
    }
  };

  return (
    <ToolboxShell
      eyebrow="Tool 08"
      title="VKX to CSV"
      description="Convert Vakaros VKX telemetry logs into plain CSVs of the GPS track."
    >
      <h1 className="tb-display tb-anim-rise text-[26px] leading-tight">VKX to CSV</h1>
      <p
        className="tb-anim-rise mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--tb-text-muted)]"
        style={{ animationDelay: '0.04s' }}
      >
        Upload one or more <span className="tb-mono">.vkx</span> files exported from a Vakaros device.
        Every Position / Velocity / Orientation record is read into a CSV row — timestamp, latitude,
        longitude, speed over ground (knots), course over ground, altitude, and heading / roll / pitch
        from the orientation quaternion. One CSV per file downloads automatically. Nothing is uploaded.
      </p>

      <div className="tb-anim-rise tb-card mt-8 p-6" style={{ animationDelay: '0.08s' }}>
        <label
          className="flex cursor-pointer flex-col items-center justify-center border-4 border-dashed border-[var(--tb-border)] p-10 text-center transition hover:border-[var(--tb-accent)]"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(Array.from(e.dataTransfer.files ?? []));
          }}
        >
          <p className="text-[var(--tb-text-muted)]">Drag and drop .vkx files here, or click to select</p>
          <input
            type="file"
            accept=".vkx"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(Array.from(e.target.files ?? []))}
          />
        </label>

        {busy && <p className="mt-4 text-sm text-[var(--tb-text-muted)]">Reading the logs…</p>}

        {results.length > 0 && (
          <ul className="mt-4 space-y-2">
            {results.map((r) => (
              <li key={r.name} className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
                <span className="tb-mono font-medium">{r.name}</span>
                {r.error ? (
                  <span className="text-[var(--tb-danger)]">{r.error}</span>
                ) : (
                  <span className="flex items-center gap-3 text-[var(--tb-text-muted)]">
                    {r.points.toLocaleString()} track points
                    <button onClick={() => download(r.csv, r.csvName)} className="tb-btn-ghost px-3 py-1 text-xs">
                      Download {r.csvName}
                    </button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </ToolboxShell>
  );
}
