import React, { useMemo, useState } from "react";
import Papa from "papaparse";
import ToolboxShell from "@/components/toolbox/ToolboxShell";
import {
  findDivisionColumn,
  missingColumns,
  processEntrants,
  type RaceType,
  type SheetRow as Row,
} from "@/lib/startSheets";

const LOGO = "/race/logo.png";
const LUNCH_QR = "/race/booking.png";
const CREW_QR = "/race/MOB.png";

const LUNCH_LINK =
  "https://rycv.com.au/2021/06/https-bookings-nowbookit-com-accountidb6147ee5-f9cb-4bc9-870b-0ed95a3d511dvenueid3916themelightcolorshex1a237e3d5afe/";
const CREW_LINK = "https://topyacht.com.au/db/kb2/mob_crew_login.php";

function todayDate() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export default function AutoStartSheetMaker() {
  const [rawRows, setRawRows] = useState<Record<string, string>[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");

  const [eventName, setEventName] = useState("");
  const [raceNumber, setRaceNumber] = useState("");
  const [startTime, setStartTime] = useState("");
  const [raceType, setRaceType] = useState<RaceType | "">("");
  const [purhcPlus, setPurhcPlus] = useState(false);
  const [includeDivisions, setIncludeDivisions] = useState(false);
  const [sortBy, setSortBy] = useState<"division" | "sail">("division");

  const handleFile = (file: File) => {
    setError("");
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (res) => {
        const rows = res.data;
        if (!rows.length) {
          setError("CSV appears to be empty.");
          setRawRows(null);
          return;
        }
        const missing = missingColumns(rows[0]);
        if (missing.length) {
          setError(`CSV is missing required column(s): ${missing.join(", ")}`);
          setRawRows(null);
          return;
        }
        setRawRows(rows);
      },
      error: (err) => {
        setError(`Failed to parse CSV: ${err.message}`);
        setRawRows(null);
      },
    });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const processed = useMemo(
    () =>
      rawRows && raceType
        ? processEntrants(rawRows, { raceType, purhcPlus, includeDivisions, sortBy })
        : null,
    [rawRows, raceType, purhcPlus, includeDivisions, sortBy],
  );

  // The division controls only mean something when the CSV actually has the column.
  const hasDivision = useMemo(
    () => (rawRows && rawRows.length ? !!findDivisionColumn(rawRows[0]) : false),
    [rawRows],
  );

  const ready = processed && eventName.trim() && raceType;
  const date = todayDate();
  const [downloading, setDownloading] = useState(false);

  const toDataUrl = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not load ${url}`);
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = () => reject(new Error(`Could not read ${url}`));
      fr.readAsDataURL(blob);
    });
  };

  const esc = (s: string) =>
    s.replace(
      /[&<>"']/g,
      (c) =>
        (
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          }) as Record<string, string>
        )[c],
    );

  const STYLE =
    `<style>@page{size:A4;margin:5mm;}html,body{height:auto;}` +
    `body{font-family:Arial,sans-serif;font-size:12pt;margin:0;}` +
    `#fit-outer{margin:0 auto;overflow:hidden;}` +
    `#fit-inner{width:200mm;transform-origin:top left;}` +
    `table{table-layout:auto;border-collapse:collapse;margin:10px auto;font-size:9pt;}` +
    `th,td{border:1px solid black;padding:4px;text-align:left;white-space:nowrap;}` +
    `th{background:#f0f0f0;}h1,h3{text-align:center;margin:0;}` +
    `.header{display:flex;align-items:center;justify-content:center;margin-bottom:20px;}` +
    `.logo{width:60px;height:100px;object-fit:contain;margin:0 15px;}` +
    `.header-text{text-align:center;}` +
    `.content-row{display:flex;align-items:stretch;justify-content:center;}` +
    `.side-qr{width:120px;font-size:9pt;display:flex;flex-direction:column;justify-content:flex-end;}` +
    `.side-qr img{width:80px;height:80px;margin-top:5px;}` +
    `td.cb input[type=checkbox]{transform:scale(.75);margin:0;}</style>`;

  const headerBlock = (logo: string) => `
      <div class="header">
        <img src="${logo}" class="logo" alt="Logo">
        <div class="header-text">
          <h1>${esc(eventName)}</h1>
          <h3>${esc(raceNumber)}</h3>
          <h3>${esc(startTime)}</h3>
          <h3>${esc(date)}</h3>
        </div>
        <img src="${logo}" class="logo" alt="Logo">
      </div>`;

  const FIT_SCRIPT =
    `<script>(function(){function fit(){` +
    `var outer=document.getElementById('fit-outer'),inner=document.getElementById('fit-inner');` +
    `if(!outer||!inner)return;` +
    `inner.style.transform='none';outer.style.width='auto';outer.style.height='auto';` +
    `var probe=document.createElement('div');` +
    `probe.style.cssText='position:absolute;left:-9999px;top:0;width:100mm;height:100mm;';` +
    `document.body.appendChild(probe);` +
    `var mm=probe.getBoundingClientRect().height/100;` +
    `document.body.removeChild(probe);` +
    `if(!mm)return;` +
    `var availH=(297-10)*mm*0.99,availW=(210-10)*mm;` +
    `var h=inner.scrollHeight,w=inner.scrollWidth;` +
    `if(!h||!w)return;` +
    `var s=Math.min(1,availH/h,availW/w);` +
    `inner.style.transform='scale('+s+')';` +
    `outer.style.width=Math.ceil(w*s)+'px';` +
    `outer.style.height=Math.ceil(h*s)+'px';}` +
    `window.addEventListener('load',fit);` +
    `window.addEventListener('beforeprint',fit);` +
    `if(document.readyState==='complete')fit();})();</scr` + `ipt>`;

  const doc = (title: string, body: string) =>
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title>${STYLE}</head>` +
    `<body><div id="fit-outer"><div id="fit-inner">${body}</div></div>${FIT_SCRIPT}</body></html>`;

  const buildCompetitorHtml = (logo: string, lunch: string, crew: string) => {
    if (!processed) return "";
    const headRow = processed.headers.map((h) => `<th>${esc(h)}</th>`).join("");
    const bodyRows = processed.data
      .map(
        (row) =>
          `<tr>${processed.headers
            .map((h) => `<td>${esc(String(row[h] ?? ""))}</td>`)
            .join("")}</tr>`,
      )
      .join("");
    const table = `
      <div class="content-row">
        ${
          raceType === "pursuit"
            ? `<div class="side-qr left">
                 <p><a href="${LUNCH_LINK}">Book a table for lunch before or dinner after racing</a></p>
                 <img src="${lunch}" alt="Lunch Booking QR">
               </div>`
            : ""
        }
        <div class="table-container">
          <table><thead><tr>${headRow}</tr></thead><tbody>${bodyRows}</tbody></table>
        </div>
        ${
          raceType === "pursuit"
            ? `<div class="side-qr right">
                 <p><a href="${CREW_LINK}">Crew registration</a></p>
                 <img src="${crew}" alt="Crew Registration QR">
               </div>`
            : ""
        }
      </div>`;
    return doc(`${eventName} - ${raceNumber}`, headerBlock(logo) + table);
  };

  const buildCheckboxHtml = (logo: string) => {
    if (!processed) return "";
    const headRow = processed.headers.map((h) => `<th>${esc(h)}</th>`).join("");
    const body = processed.data
      .map(
        (row) =>
          `<tr><td class="cb"><input type="checkbox"></td><td class="cb"><input type="checkbox"></td>${processed.headers
            .map((h) => `<td>${esc(String(row[h] ?? ""))}</td>`)
            .join("")}</tr>`,
      )
      .join("");
    const table = `
      <table>
        <thead><tr><th>Here</th><th>Crew Declaration</th>${headRow}</tr></thead>
        <tbody>${body}</tbody>
      </table>`;
    return doc(`${eventName} - ${raceNumber} (sign-on)`, headerBlock(logo) + table);
  };

  const downloadFile = (html: string, name: string) => {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadSheet = async () => {
    if (!ready) return;
    setDownloading(true);
    setError("");
    try {
      const [logo, lunch, crew] = await Promise.all([
        toDataUrl(LOGO),
        toDataUrl(LUNCH_QR),
        toDataUrl(CREW_QR),
      ]);
      const safe = `${eventName} ${raceNumber}`.trim().replace(/[\\/:*?"<>|]+/g, "-") || "race-sheet";
      downloadFile(buildCompetitorHtml(logo, lunch, crew), `${safe} - competitor.html`);
      await new Promise((r) => setTimeout(r, 400));
      downloadFile(buildCheckboxHtml(logo), `${safe} - sign-on.html`);
    } catch (e) {
      setError(
        `Could not build the download: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <ToolboxShell
      eyebrow="Tool 05"
      title="Start Sheets"
      description="Generate printable sailing race start sheets from a CSV of entrants."
    >
      <h1 className="tb-display tb-anim-rise text-[26px] leading-tight">
        Start Sheets
      </h1>
      <p className="tb-anim-rise mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--tb-text-muted)]" style={{ animationDelay: '0.04s' }}>
        Upload a race entrants CSV (with <code>BOATNAME</code>, <code>SAILNUM</code>,{" "}
        <code>PURHC</code> columns), set the event details, then generate printable start sheets.
      </p>

      <div className="tb-anim-rise tb-card mt-8 p-6" style={{ animationDelay: '0.08s' }}>
        <label
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className="flex cursor-pointer flex-col items-center justify-center border-4 border-dashed border-[var(--tb-border)] p-10 text-center transition hover:border-[var(--tb-accent)]"
        >
          <p className="text-[var(--tb-text-muted)]">Drag and drop your CSV file here, or click to select</p>
          {fileName && <p className="tb-mono mt-2 text-sm font-medium text-[var(--tb-accent)]">{fileName}</p>}
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </label>

        {error && (
          <p className="mt-4 rounded-[3px] border border-[var(--tb-danger)]/40 bg-[#fef3f2] p-3 text-sm text-[var(--tb-danger)]">
            {error}
          </p>
        )}

        {processed && processed.badHandicaps.length > 0 && (
          <p className="mt-4 rounded-[3px] border border-[var(--tb-warn)]/40 bg-[#fffaeb] p-3 text-sm text-[var(--tb-warn)]">
            {processed.badHandicaps.length} boat
            {processed.badHandicaps.length === 1 ? " has" : "s have"} an unreadable PURHC and
            {processed.badHandicaps.length === 1 ? " has" : " have"} been set to 0:{" "}
            {processed.badHandicaps.join(", ")}.
          </p>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <label className="block text-sm">
            <span className="tb-eyebrow">Event Name</span>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="e.g. RYCV Winter Series 2026"
              className="tb-input mt-1 w-full px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="tb-eyebrow">Race Number</span>
            <input
              type="text"
              value={raceNumber}
              onChange={(e) => setRaceNumber(e.target.value)}
              placeholder="e.g. Race 3"
              className="tb-input mt-1 w-full px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="tb-eyebrow">Start Time</span>
            <input
              type="text"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              placeholder="e.g. Start : 13:05"
              className="tb-input mt-1 w-full px-3 py-2 text-sm"
            />
          </label>
        </div>

        <div className="mt-6 space-y-3">
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="race_type" checked={raceType === "pursuit"} onChange={() => setRaceType("pursuit")} />
              Pursuit
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="radio" name="race_type" checked={raceType === "fleet"} onChange={() => setRaceType("fleet")} />
              Fleet Start
            </label>
          </div>

          {raceType === "pursuit" && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={purhcPlus} onChange={(e) => setPurhcPlus(e.target.checked)} />
              Include PURHC+ (+4 minutes)
            </label>
          )}

          {raceType === "fleet" && (
            <div className="space-y-2">
              <label
                className={`flex items-center gap-2 text-sm ${hasDivision ? "" : "opacity-50"}`}
              >
                <input
                  type="checkbox"
                  disabled={!hasDivision}
                  checked={includeDivisions && hasDivision}
                  onChange={(e) => setIncludeDivisions(e.target.checked)}
                />
                Include divisions
              </label>
              {!hasDivision && (
                <p className="text-[12px] text-[var(--tb-text-muted)]">
                  No division column found in this CSV. Add a{" "}
                  <code className="tb-mono text-[11.5px]">DIVISION</code> column to enable this.
                </p>
              )}
              <div className="ml-6 flex gap-6">
                <label
                  className={`flex items-center gap-2 text-sm ${hasDivision && includeDivisions ? "" : "opacity-50"}`}
                >
                  <input
                    type="radio"
                    name="sort_by"
                    disabled={!hasDivision || !includeDivisions}
                    checked={sortBy === "division"}
                    onChange={() => setSortBy("division")}
                  />
                  Sort by division
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="sort_by"
                    checked={sortBy === "sail"}
                    onChange={() => setSortBy("sail")}
                  />
                  Sort by sail number
                </label>
              </div>
            </div>
          )}
        </div>

        <button onClick={downloadSheet} disabled={!ready || downloading} className="tb-btn mt-6 px-4 py-2 text-sm">
          {downloading ? "Preparing downloads…" : "Download Race Sheets (HTML)"}
        </button>
        <p className="tb-mono mt-2 text-xs text-[var(--tb-text-muted)]">
          Downloads two self-contained files (competitor sheet and sign-on sheet) with images
          embedded. Open each and use your browser&apos;s Print to save as PDF.
        </p>
      </div>

      {ready && processed && (
        <div className="tb-card mt-8 overflow-x-auto p-6">
          <div id="print-area">
            <div className="header">
              <img src={LOGO} className="logo" alt="Logo" />
              <div className="header-text">
                <h1>{eventName}</h1>
                <h3>{raceNumber}</h3>
                <h3>{startTime}</h3>
                <h3>{date}</h3>
              </div>
              <img src={LOGO} className="logo" alt="Logo" />
            </div>

            <div className="content-row">
              {raceType === "pursuit" && (
                <div className="side-qr left">
                  <p>
                    <a href={LUNCH_LINK}>Book a table for lunch before or dinner after racing</a>
                  </p>
                  <img src={LUNCH_QR} alt="Lunch Booking QR" />
                </div>
              )}

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      {processed.headers.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {processed.data.map((row, i) => (
                      <tr key={i}>
                        {processed.headers.map((h) => (
                          <td key={h}>{String(row[h] ?? "")}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {raceType === "pursuit" && (
                <div className="side-qr right">
                  <p>
                    <a href={CREW_LINK}>Crew registration</a>
                  </p>
                  <img src={CREW_QR} alt="Crew Registration QR" />
                </div>
              )}
            </div>

            <div className="page-break" />
            <div className="header">
              <img src={LOGO} className="logo" alt="Logo" />
              <div className="header-text">
                <h1>{eventName}</h1>
                <h3>{raceNumber}</h3>
                <h3>{startTime}</h3>
                <h3>{date}</h3>
              </div>
              <img src={LOGO} className="logo" alt="Logo" />
            </div>
            <table>
              <thead>
                <tr>
                  <th>Here</th>
                  <th>Crew Declaration</th>
                  {processed.headers.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {processed.data.map((row, i) => (
                  <tr key={i}>
                    <td>
                      <input type="checkbox" />
                    </td>
                    <td>
                      <input type="checkbox" />
                    </td>
                    {processed.headers.map((h) => (
                      <td key={h}>{String(row[h] ?? "")}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style jsx>{`
        #print-area :global(.header) {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
        }
        #print-area :global(.logo) {
          width: 60px;
          height: 100px;
          object-fit: contain;
          margin: 0 15px;
        }
        #print-area :global(.header-text) {
          text-align: center;
        }
        #print-area :global(.header-text h1),
        #print-area :global(.header-text h3) {
          margin: 0;
        }
        #print-area :global(.content-row) {
          display: flex;
          align-items: stretch;
          justify-content: center;
        }
        #print-area :global(.side-qr) {
          width: 120px;
          font-size: 9pt;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
        }
        #print-area :global(.side-qr img) {
          width: 80px;
          height: 80px;
          margin-top: 5px;
        }
        #print-area :global(table) {
          border-collapse: collapse;
          margin: 10px auto;
          font-size: 9pt;
        }
        #print-area :global(th),
        #print-area :global(td) {
          border: 1px solid black;
          padding: 4px;
          text-align: left;
          white-space: nowrap;
        }
        #print-area :global(th) {
          background: #f0f0f0;
        }
        #print-area :global(.page-break) {
          height: 30px;
        }
      `}</style>
    </ToolboxShell>
  );
}
