import { useState } from 'react';
import ToolboxShell from '@/components/toolbox/ToolboxShell';
import { parseVkxTrack, trackToCsv, type TrackPoint } from '@/lib/vkx';

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

export default function VkxToCsv() {
  const [fileName, setFileName] = useState('');
  const [points, setPoints] = useState<TrackPoint[] | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    setError('');
    setPoints(null);
    setFileName(file.name);
    setBusy(true);
    try {
      const pts = parseVkxTrack(await file.arrayBuffer());
      if (!pts.length) {
        setError('No position records (0x02) were found in that file.');
        return;
      }
      setPoints(pts);
      const csvName = file.name.replace(/\.vkx$/i, '') + '.csv';
      download(trackToCsv(pts), csvName || 'track.csv');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ToolboxShell
      eyebrow="Tool 08"
      title="VKX to CSV"
      description="Convert a Vakaros VKX telemetry log into a plain CSV of the GPS track."
    >
      <h1 className="tb-display tb-anim-rise text-[26px] leading-tight">VKX to CSV</h1>
      <p
        className="tb-anim-rise mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--tb-text-muted)]"
        style={{ animationDelay: '0.04s' }}
      >
        Upload a <span className="tb-mono">.vkx</span> file exported from a Vakaros device. Every
        Position / Velocity / Orientation record is read into a CSV row — timestamp, latitude,
        longitude, speed over ground (knots), course over ground, altitude, and heading / roll /
        pitch from the orientation quaternion. The CSV downloads automatically. Nothing is uploaded.
      </p>

      <div className="tb-anim-rise tb-card mt-8 p-6" style={{ animationDelay: '0.08s' }}>
        <label
          className="flex cursor-pointer flex-col items-center justify-center border-4 border-dashed border-[var(--tb-border)] p-10 text-center transition hover:border-[var(--tb-accent)]"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
        >
          <p className="text-[var(--tb-text-muted)]">Drag and drop a .vkx file here, or click to select</p>
          {fileName && <p className="tb-mono mt-2 text-sm font-medium text-[var(--tb-accent)]">{fileName}</p>}
          <input
            type="file"
            accept=".vkx"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>

        {busy && <p className="mt-4 text-sm text-[var(--tb-text-muted)]">Reading the log…</p>}

        {error && (
          <p className="mt-4 rounded-[3px] border border-[var(--tb-danger)]/40 bg-[#fef3f2] p-3 text-sm text-[var(--tb-danger)]">
            {error}
          </p>
        )}

        {points && (
          <div className="mt-4">
            <p className="text-sm text-[var(--tb-text-muted)]">
              {points.length.toLocaleString()} track points ·{' '}
              {points[0].timestamp.replace('T', ' ').replace('.000Z', 'Z')} →{' '}
              {points[points.length - 1].timestamp.replace('T', ' ').replace('.000Z', 'Z')}
            </p>
            <button
              onClick={() => download(trackToCsv(points), (fileName.replace(/\.vkx$/i, '') || 'track') + '.csv')}
              className="tb-btn mt-3 px-4 py-2 text-sm"
            >
              Download CSV again
            </button>
          </div>
        )}
      </div>
    </ToolboxShell>
  );
}
