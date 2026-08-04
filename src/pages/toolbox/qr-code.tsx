import React, { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import ToolboxShell from '@/components/toolbox/ToolboxShell';

const SIZES = [512, 1024, 2048, 4096];

/** On-screen render size. Kept small deliberately — see downloadQRCode. */
const PREVIEW = 512;

export default function QRGenerator() {
  const [text, setText] = useState('https://lbrh.space');
  const [size, setSize] = useState(1024);
  const [ecLevel, setEcLevel] = useState<'L' | 'M' | 'Q' | 'H'>('H');
  const qrRef = useRef<HTMLDivElement>(null);

  /**
   * Upscales the small preview canvas at download time instead of keeping a
   * huge one mounted. A 4096px canvas is backed at devicePixelRatio, so it
   * costs ~256 MB of memory and can crash mobile browsers just sitting there.
   * QR codes are pure black-and-white squares, so nearest-neighbour scaling
   * reproduces them exactly.
   */
  const downloadQRCode = () => {
    const src = qrRef.current?.querySelector('canvas');
    if (!src) return;

    const out = document.createElement('canvas');
    out.width = size;
    out.height = size;
    const ctx = out.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(src, 0, 0, size, size);

    out.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qrcode-${size}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  return (
    <ToolboxShell
      eyebrow="Tool 06"
      title="QR Code"
      description="Generate a downloadable QR code for any link or text — booking links, crew registration, race notices."
    >
      <h1 className="tb-display tb-anim-rise text-[26px] leading-tight">QR Code</h1>
      <p
        className="tb-anim-rise mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--tb-text-muted)]"
        style={{ animationDelay: '0.04s' }}
      >
        Generate a QR code for a booking link, crew sign-on page or race notice, and download it
        at print resolution.
      </p>

      <div
        className="tb-anim-rise tb-card mx-auto mt-8 max-w-md p-6"
        style={{ animationDelay: '0.08s' }}
      >
        <label className="block">
          <span className="tb-eyebrow block pb-1.5">Text or URL</span>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="tb-input w-full px-3 py-2"
            placeholder="Enter text or URL"
          />
        </label>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="block">
            <span className="tb-eyebrow block pb-1.5">Download size</span>
            <select
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="tb-input w-full px-2 py-2"
            >
              {SIZES.map((s) => (
                <option key={s} value={s}>
                  {s} × {s} px
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="tb-eyebrow block pb-1.5">Error correction</span>
            <select
              value={ecLevel}
              onChange={(e) => setEcLevel(e.target.value as 'L' | 'M' | 'Q' | 'H')}
              className="tb-input w-full px-2 py-2"
            >
              <option value="L">L — 7%</option>
              <option value="M">M — 15%</option>
              <option value="Q">Q — 25%</option>
              <option value="H">H — 30%</option>
            </select>
          </label>
        </div>

        <div
          ref={qrRef}
          className="mt-5 flex min-h-[248px] flex-col items-center justify-center border border-[var(--tb-border)] bg-white p-6"
        >
          {text ? (
            <QRCodeCanvas
              value={text}
              size={PREVIEW}
              level={ecLevel}
              includeMargin
              style={{ width: 200, height: 200 }}
            />
          ) : (
            <p className="text-[13px] text-[var(--tb-text-muted)]">Enter text to see a QR code</p>
          )}
        </div>

        <button onClick={downloadQRCode} disabled={!text} className="tb-btn mt-5 w-full px-4 py-2">
          Download PNG
        </button>
        <p className="mt-2 text-[12px] text-[var(--tb-text-muted)]">
          Higher error correction keeps the code scannable if it is partly obscured or printed
          small.
        </p>
      </div>
    </ToolboxShell>
  );
}
