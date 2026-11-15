/**
 * A small hand-written multi-page PDF writer, in the same spirit as
 * courseMaker/exporters.ts: every primitive is a rect / circle / poly /
 * line / text run, so emitting a PDF content stream directly is simple and
 * the result is true vector (no library, no screenshot). Coordinates are
 * top-left origin with y increasing downward, like CSS, which is easier to
 * lay a document out in than PDF's native bottom-left system — the Y flip
 * happens once per page in buildContentStream.
 */
import { textWidth } from "./courseMaker/scene";

export type PdfPrim =
  | {
      k: "rect";
      x: number;
      y: number;
      w: number;
      h: number;
      fill?: string;
      stroke?: string;
      sw?: number;
    }
  | {
      k: "circle";
      cx: number;
      cy: number;
      r: number;
      fill?: string;
      stroke?: string;
      sw?: number;
    }
  | {
      k: "poly";
      pts: [number, number][];
      fill?: string;
      stroke?: string;
      sw?: number;
    }
  | {
      k: "line";
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      stroke: string;
      w: number;
    }
  | {
      k: "text";
      x: number;
      y: number;
      text: string;
      size: number;
      fill: string;
      anchor?: "start" | "middle" | "end";
      bold?: boolean;
      italic?: boolean;
    }
  | { k: "image"; id: string; x: number; y: number; w: number; h: number };

/** A baseline JPEG embedded as-is (DCTDecode); bytes are a latin1 binary string. */
export interface PdfImage {
  bytes: string;
  width: number;
  height: number;
  components: number;
}

/** Fetch a JPEG and read its size/components from the SOF marker. */
export async function loadJpeg(url: string): Promise<PdfImage | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) {
        i++;
        continue;
      }
      const m = buf[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        let bytes = "";
        for (let j = 0; j < buf.length; j += 8192)
          bytes += String.fromCharCode(...buf.subarray(j, j + 8192));
        return {
          bytes,
          height: (buf[i + 5] << 8) | buf[i + 6],
          width: (buf[i + 7] << 8) | buf[i + 8],
          components: buf[i + 9],
        };
      }
      i += 2 + ((buf[i + 2] << 8) | buf[i + 3]);
    }
  } catch {
    /* fall through: the PDF is built without the image */
  }
  return null;
}

function pdfColor(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full =
    h.length === 3
      ? h
          .split("")
          .map((c) => c + c)
          .join("")
      : h;
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function pdfEscape(s: string) {
  return s
    .replace(/[\\()]/g, (c) => `\\${c}`)
    .split("")
    .map((c) => (c.charCodeAt(0) < 256 ? c : "?"))
    .join("");
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
  ].join("\n");
}

function buildContentStream(prims: PdfPrim[], w: number, h: number): string {
  const out: string[] = [];
  const f = (n: number) => n.toFixed(3);
  out.push("q");
  out.push(`1 0 0 -1 0 ${f(h)} cm`);
  out.push("1 1 1 rg");
  out.push(`0 0 ${f(w)} ${f(h)} re f`);

  for (const p of prims) {
    switch (p.k) {
      case "rect": {
        if (p.fill) {
          const [r, g, b] = pdfColor(p.fill);
          out.push(`${r} ${g} ${b} rg`);
        }
        if (p.stroke) {
          const [r, g, b] = pdfColor(p.stroke);
          out.push(`${r} ${g} ${b} RG ${f(p.sw ?? 1)} w`);
        }
        out.push(`${f(p.x)} ${f(p.y)} ${f(p.w)} ${f(p.h)} re`);
        out.push(p.fill && p.stroke ? "B" : p.fill ? "f" : "S");
        break;
      }
      case "circle": {
        if (p.fill) {
          const [r, g, b] = pdfColor(p.fill);
          out.push(`${r} ${g} ${b} rg`);
        }
        if (p.stroke) {
          const [r, g, b] = pdfColor(p.stroke);
          out.push(`${r} ${g} ${b} RG ${f(p.sw ?? 1)} w`);
        }
        out.push(circlePath(p.cx, p.cy, p.r));
        out.push(p.fill && p.stroke ? "B" : p.fill ? "f" : "S");
        break;
      }
      case "poly": {
        if (p.fill) {
          const [r, g, b] = pdfColor(p.fill);
          out.push(`${r} ${g} ${b} rg`);
        }
        if (p.stroke) {
          const [r, g, b] = pdfColor(p.stroke);
          out.push(`${r} ${g} ${b} RG ${f(p.sw ?? 1)} w 1 j`);
        }
        p.pts.forEach(([x, y], i) =>
          out.push(`${f(x)} ${f(y)} ${i === 0 ? "m" : "l"}`),
        );
        out.push("h");
        out.push(p.fill && p.stroke ? "B" : p.fill ? "f" : "S");
        break;
      }
      case "line": {
        const [r, g, b] = pdfColor(p.stroke);
        out.push(`${r} ${g} ${b} RG ${f(p.w)} w`);
        out.push(`${f(p.x1)} ${f(p.y1)} m ${f(p.x2)} ${f(p.y2)} l S`);
        break;
      }
      case "text": {
        const [r, g, b] = pdfColor(p.fill);
        const tw = textWidth(p.text, p.size, p.bold);
        const x =
          p.anchor === "middle"
            ? p.x - tw / 2
            : p.anchor === "end"
              ? p.x - tw
              : p.x;
        out.push(`${r} ${g} ${b} rg`);
        out.push("BT");
        out.push(
          `/${p.bold ? "F2" : p.italic ? "F3" : "F1"} ${f(p.size)} Tf`,
        );
        out.push(`1 0 0 -1 ${f(x)} ${f(p.y)} Tm`);
        out.push(`(${pdfEscape(p.text)}) Tj`);
        out.push("ET");
        break;
      }
      case "image": {
        // Counter the page's Y flip so the picture isn't drawn upside down.
        out.push(
          `q ${f(p.w)} 0 0 ${f(-p.h)} ${f(p.x)} ${f(p.y + p.h)} cm /${p.id} Do Q`,
        );
        break;
      }
    }
  }
  out.push("Q");
  return out.join("\n");
}

/** Greedy word wrap using the same Helvetica metrics the content stream renders with. */
export function wrapText(
  text: string,
  maxWidth: number,
  size: number,
  bold = false,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (paragraph === "") {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of paragraph.split(" ")) {
      const candidate = line ? `${line} ${word}` : word;
      if (textWidth(candidate, size, bold) > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

export function buildPdfBytes(
  pages: PdfPrim[][],
  width: number,
  height: number,
  images: Record<string, PdfImage> = {},
): string {
  // Object numbers are fixed up front: catalog=1, pages=2, then a Page +
  // Contents pair per page, then the three fonts, then any images.
  const objects: string[] = [];
  const imageIds = Object.keys(images);
  const imageRefs = imageIds
    .map((id, i) => `/${id} ${fontsObjNumFor(pages.length) + 3 + i} 0 R`)
    .join(" ");
  objects.push("<</Type/Catalog/Pages 2 0 R>>");
  objects.push(
    `<</Type/Pages/Kids[${pages.map((_, i) => `${3 + i * 2} 0 R`).join(" ")}]/Count ${pages.length}>>`,
  );
  const fontsObjNum = 3 + pages.length * 2;
  for (let i = 0; i < pages.length; i++) {
    const content = buildContentStream(pages[i], width, height);
    objects.push(
      `<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${width.toFixed(2)} ${height.toFixed(2)}]/Resources<</Font<</F1 ${fontsObjNum} 0 R/F2 ${fontsObjNum + 1} 0 R/F3 ${fontsObjNum + 2} 0 R>>/XObject<<${imageRefs}>>>>/Contents ${4 + i * 2} 0 R>>`,
    );
    objects.push(
      `<</Length ${content.length}>>\nstream\n${content}\nendstream`,
    );
  }
  objects.push(
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>",
  );
  objects.push(
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica-Bold/Encoding/WinAnsiEncoding>>",
  );
  objects.push(
    "<</Type/Font/Subtype/Type1/BaseFont/Helvetica-Oblique/Encoding/WinAnsiEncoding>>",
  );
  for (const id of imageIds) {
    const im = images[id];
    objects.push(
      `<</Type/XObject/Subtype/Image/Width ${im.width}/Height ${im.height}/ColorSpace/${im.components === 1 ? "DeviceGray" : "DeviceRGB"}/BitsPerComponent 8/Filter/DCTDecode/Length ${im.bytes.length}>>\nstream\n${im.bytes}\nendstream`,
    );
  }

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefPos = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets)
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<</Size ${objects.length + 1}/Root 1 0 R>>\nstartxref\n${xrefPos}\n%%EOF`;
  return pdf;
}

function fontsObjNumFor(pageCount: number) {
  return 3 + pageCount * 2;
}

export function downloadPdf(
  pages: PdfPrim[][],
  width: number,
  height: number,
  filename: string,
  images: Record<string, PdfImage> = {},
) {
  const pdf = buildPdfBytes(pages, width, height, images);
  // Strings hold one byte per char (latin1), so embedded JPEG data survives.
  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 255;
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
