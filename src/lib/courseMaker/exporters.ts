import { boundsOf, textWidth } from './scene';
import type { Bounds, Prim } from './types';

export const EXPORT_PAD = 60;

/** Bounds always come from the actual content, so a course that grew past the
 *  initial canvas still exports whole. */
export function exportBounds(prims: Prim[]): Bounds {
  const b = boundsOf(prims);
  return {
    minX: b.minX - EXPORT_PAD,
    minY: b.minY - EXPORT_PAD,
    maxX: b.maxX + EXPORT_PAD,
    maxY: b.maxY + EXPORT_PAD,
  };
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const FONT_STACK = 'Helvetica, Arial, sans-serif';

export function primToSvg(p: Prim): string {
  switch (p.k) {
    case 'line':
      return `<line x1="${p.x1.toFixed(2)}" y1="${p.y1.toFixed(2)}" x2="${p.x2.toFixed(2)}" y2="${p.y2.toFixed(2)}" stroke="${p.stroke}" stroke-width="${p.w}"${p.dash ? ` stroke-dasharray="${p.dash.join(' ')}"` : ''}${p.cap ? ` stroke-linecap="${p.cap}"` : ''}/>`;
    case 'circle':
      return `<circle cx="${p.cx.toFixed(2)}" cy="${p.cy.toFixed(2)}" r="${p.r.toFixed(2)}" fill="${p.fill ?? 'none'}"${p.stroke ? ` stroke="${p.stroke}" stroke-width="${p.w ?? 1}"` : ''}/>`;
    case 'poly': {
      const pts = p.pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
      const tag = p.close === false ? 'polyline' : 'polygon';
      return `<${tag} points="${pts}" fill="${p.fill ?? 'none'}"${p.stroke ? ` stroke="${p.stroke}" stroke-width="${p.w ?? 1}" stroke-linejoin="round"` : ''}/>`;
    }
    case 'rect':
      return `<rect x="${p.x.toFixed(2)}" y="${p.y.toFixed(2)}" width="${p.w.toFixed(2)}" height="${p.h.toFixed(2)}" fill="${p.fill ?? 'none'}"${p.stroke ? ` stroke="${p.stroke}" stroke-width="${p.sw ?? 1}"` : ''}/>`;
    case 'text':
      return `<text x="${p.x.toFixed(2)}" y="${p.y.toFixed(2)}" font-family="${FONT_STACK}" font-size="${p.size}" fill="${p.fill}" text-anchor="${p.anchor}"${p.bold ? ' font-weight="700"' : ''}>${esc(p.text)}</text>`;
  }
}

export function buildSvg(prims: Prim[], bounds: Bounds): string {
  const w = bounds.maxX - bounds.minX;
  const h = bounds.maxY - bounds.minY;
  const body = prims.map(primToSvg).join('\n  ');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w.toFixed(0)}" height="${h.toFixed(0)}" viewBox="${bounds.minX.toFixed(2)} ${bounds.minY.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)}">
  <rect x="${bounds.minX.toFixed(2)}" y="${bounds.minY.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" fill="#ffffff"/>
  ${body}
</svg>`;
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

export function exportSvgFile(prims: Prim[], name: string) {
  download(new Blob([buildSvg(prims, exportBounds(prims))], { type: 'image/svg+xml' }), `${name}.svg`);
}

export function exportPng(prims: Prim[], name: string, scale: number): Promise<void> {
  const bounds = exportBounds(prims);
  const svg = buildSvg(prims, bounds);
  const w = bounds.maxX - bounds.minX;
  const h = bounds.maxY - bounds.minY;

  return new Promise((resolve, reject) => {
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas 2D is unavailable in this browser.'));
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob((out) => {
        if (out) download(out, `${name}@${scale}x.png`);
        resolve();
      }, 'image/png');
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not rasterise the diagram.'));
    };
    img.src = url;
  });
}

/* ── PDF ──────────────────────────────────────────────────────────
   Written by hand rather than pulled from a library. Because every
   primitive is already a circle / line / polygon / text run, emitting
   a PDF content stream is direct — and the result is true vector, so
   it stays sharp at any zoom instead of embedding a bitmap.        */

function pdfColor(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function pdfEscape(s: string) {
  // Drop anything outside WinAnsi range — the base-14 fonts can't encode it.
  return s
    .replace(/[\\()]/g, (c) => `\\${c}`)
    .split('')
    .map((c) => (c.charCodeAt(0) < 256 ? c : '?'))
    .join('');
}

const KAPPA = 0.5522847498;

function circlePath(cx: number, cy: number, r: number): string {
  const k = r * KAPPA;
  const f = (n: number) => n.toFixed(3);
  return [
    `${f(cx + r)} ${f(cy)} m`,
    `${f(cx + r)} ${f(cy + k)} ${f(cx + k)} ${f(cy + r)} ${f(cx)} ${f(cy + r)} c`,
    `${f(cx - k)} ${f(cy + r)} ${f(cx - r)} ${f(cy + k)} ${f(cx - r)} ${f(cy)} c`,
    `${f(cx - r)} ${f(cy - k)} ${f(cx - k)} ${f(cy - r)} ${f(cx)} ${f(cy - r)} c`,
    `${f(cx + k)} ${f(cy - r)} ${f(cx + r)} ${f(cy - k)} ${f(cx + r)} ${f(cy)} c`,
  ].join('\n');
}

function buildContentStream(prims: Prim[], bounds: Bounds, h: number): string {
  const out: string[] = [];
  const f = (n: number) => n.toFixed(3);
  // Shift the origin to the content box, then flip Y so world coords map straight in.
  out.push('q');
  out.push(`1 0 0 -1 ${f(-bounds.minX)} ${f(h + bounds.minY)} cm`);

  // White page behind everything.
  const [br, bg, bb] = [1, 1, 1];
  out.push(`${br} ${bg} ${bb} rg`);
  out.push(`${f(bounds.minX)} ${f(bounds.minY)} ${f(bounds.maxX - bounds.minX)} ${f(bounds.maxY - bounds.minY)} re f`);

  for (const p of prims) {
    switch (p.k) {
      case 'line': {
        const [r, g, b] = pdfColor(p.stroke);
        out.push(`${r} ${g} ${b} RG ${f(p.w)} w ${p.cap === 'round' ? 1 : 0} J`);
        out.push(p.dash ? `[${p.dash.join(' ')}] 0 d` : '[] 0 d');
        out.push(`${f(p.x1)} ${f(p.y1)} m ${f(p.x2)} ${f(p.y2)} l S`);
        break;
      }
      case 'circle': {
        out.push('[] 0 d');
        if (p.fill) {
          const [r, g, b] = pdfColor(p.fill);
          out.push(`${r} ${g} ${b} rg`);
        }
        if (p.stroke) {
          const [r, g, b] = pdfColor(p.stroke);
          out.push(`${r} ${g} ${b} RG ${f(p.w ?? 1)} w`);
        }
        out.push(circlePath(p.cx, p.cy, p.r));
        out.push(p.fill && p.stroke ? 'B' : p.fill ? 'f' : 'S');
        break;
      }
      case 'poly': {
        out.push('[] 0 d');
        if (p.fill) {
          const [r, g, b] = pdfColor(p.fill);
          out.push(`${r} ${g} ${b} rg`);
        }
        if (p.stroke) {
          const [r, g, b] = pdfColor(p.stroke);
          out.push(`${r} ${g} ${b} RG ${f(p.w ?? 1)} w 1 j`);
        }
        p.pts.forEach(([x, y], i) => out.push(`${f(x)} ${f(y)} ${i === 0 ? 'm' : 'l'}`));
        if (p.close !== false) out.push('h');
        out.push(p.fill && p.stroke ? 'B' : p.fill ? 'f' : 'S');
        break;
      }
      case 'rect': {
        out.push('[] 0 d');
        if (p.fill) {
          const [r, g, b] = pdfColor(p.fill);
          out.push(`${r} ${g} ${b} rg`);
        }
        if (p.stroke) {
          const [r, g, b] = pdfColor(p.stroke);
          out.push(`${r} ${g} ${b} RG ${f(p.sw ?? 1)} w`);
        }
        out.push(`${f(p.x)} ${f(p.y)} ${f(p.w)} ${f(p.h)} re`);
        out.push(p.fill && p.stroke ? 'B' : p.fill ? 'f' : 'S');
        break;
      }
      case 'text': {
        const [r, g, b] = pdfColor(p.fill);
        const w = textWidth(p.text, p.size, p.bold);
        const x = p.anchor === 'middle' ? p.x - w / 2 : p.anchor === 'end' ? p.x - w : p.x;
        out.push(`${r} ${g} ${b} rg`);
        out.push('BT');
        out.push(`/${p.bold ? 'F2' : 'F1'} ${f(p.size)} Tf`);
        // Negative Y scale cancels the page flip so glyphs read upright.
        out.push(`1 0 0 -1 ${f(x)} ${f(p.y)} Tm`);
        out.push(`(${pdfEscape(p.text)}) Tj`);
        out.push('ET');
        break;
      }
    }
  }

  out.push('Q');
  return out.join('\n');
}

export function exportPdf(prims: Prim[], name: string) {
  const bounds = exportBounds(prims);
  const w = bounds.maxX - bounds.minX;
  const h = bounds.maxY - bounds.minY;
  const content = buildContentStream(prims, bounds, h);

  const objects = [
    '<</Type/Catalog/Pages 2 0 R>>',
    '<</Type/Pages/Kids[3 0 R]/Count 1>>',
    `<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${w.toFixed(2)} ${h.toFixed(2)}]/Resources<</Font<</F1 5 0 R/F2 6 0 R>>>>/Contents 4 0 R>>`,
    `<</Length ${content.length}>>\nstream\n${content}\nendstream`,
    '<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>',
    '<</Type/Font/Subtype/Type1/BaseFont/Helvetica-Bold/Encoding/WinAnsiEncoding>>',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xrefPos}\n%%EOF`;

  download(new Blob([pdf], { type: 'application/pdf' }), `${name}.pdf`);
}

export function exportJson(doc: unknown, name: string) {
  download(new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' }), `${name}.json`);
}
