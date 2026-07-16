import React, { useMemo, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import Papa from "papaparse";

type Row = Record<string, string | number>;
type RaceType = "pursuit" | "fleet";

const LOGO = "race/logo.png";
const LUNCH_QR = "race/booking.png";
const CREW_QR = "race/MOB.png";

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
  const [rawRows, setRawRows] = useState<Row[] | null>(null);
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
        const required = ["BOATNAME", "SAILNUM", "PURHC"];
        const missing = required.filter((c) => !(c in rows[0]));
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

  // Build the processed table the same way the Python app does.
  const processed = useMemo(() => {
    if (!rawRows) return null;

    let rows = rawRows.map((r) => ({
      "Boat Name": String(r["BOATNAME"] ?? "").trim(),
      "Sail No": String(r["SAILNUM"] ?? "").trim(),
      PURHC: Number.isFinite(Number(r["PURHC"])) ? Number(r["PURHC"]) : 0,
    }));

    rows = rows.sort((a, b) => a.PURHC - b.PURHC);

    let headers: string[] = ["Boat Name", "Sail No", "PURHC"];

    const data: Row[] = rows.map((r) => ({ ...r }));

    if (raceType === "pursuit") {
      if (purhcPlus) {
        data.forEach((r) => {
          r["PURHC+ (with kite)"] = Number(r.PURHC) + 4;
        });
        headers = [...headers, "PURHC+ (with kite)"];
      }
    } else if (raceType === "fleet") {
      // Sort by sail number when requested (division column not present in source CSV).
      if (sortBy === "sail") {
        data.sort((a, b) =>
          String(a["Sail No"]).localeCompare(String(b["Sail No"]), undefined, {
            numeric: true,
          }),
        );
      }
    }

    return { headers, data };
  }, [rawRows, raceType, purhcPlus, sortBy]);

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
    `<style>@page{size:A4;margin:5mm;}body{font-family:Arial,sans-serif;font-size:12pt;margin:0;}` +
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

  const doc = (title: string, body: string) =>
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title>${STYLE}</head><body>${body}</body></html>`;

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
      // Slight delay so browsers don't suppress the second download.
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
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Head>
        <title>Race Sheet Generator</title>
        <meta
          name="description"
          content="Generate printable sailing race start sheets from a CSV of entrants."
        />
      </Head>

      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link href="/" className="text-sm text-indigo-600 hover:underline">
            &larr; Back to portfolio
          </Link>
        </div>

        <div className="rounded-xl bg-white p-8 shadow-md">
          <h1 className="text-3xl font-extrabold text-gray-900">
            Race Sheet Generator
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Upload a race entrants CSV (with <code>BOATNAME</code>,{" "}
            <code>SAILNUM</code>, <code>PURHC</code> columns), set the event
            details, then generate printable start sheets.
          </p>

          {/* Drop zone */}
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-lg border-4 border-dashed border-gray-300 p-10 text-center hover:border-indigo-400"
          >
            <p className="text-gray-600">
              Drag and drop your CSV file here, or click to select
            </p>
            {fileName && (
              <p className="mt-2 text-sm font-medium text-indigo-600">
                {fileName}
              </p>
            )}
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
            <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {/* Metadata */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="text-gray-700">Event Name</span>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="e.g. RYCV Winter Series 2026"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-700">Race Number</span>
              <input
                type="text"
                value={raceNumber}
                onChange={(e) => setRaceNumber(e.target.value)}
                placeholder="e.g. Race 3"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-700">Start Time</span>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="e.g. Start : 13:05"
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </label>
          </div>

          {/* Race type */}
          <div className="mt-6 space-y-3">
            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="race_type"
                  checked={raceType === "pursuit"}
                  onChange={() => setRaceType("pursuit")}
                />
                Pursuit
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="race_type"
                  checked={raceType === "fleet"}
                  onChange={() => setRaceType("fleet")}
                />
                Fleet Start
              </label>
            </div>

            {raceType === "pursuit" && (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={purhcPlus}
                  onChange={(e) => setPurhcPlus(e.target.checked)}
                />
                Include PURHC+ (+4 minutes)
              </label>
            )}

            {raceType === "fleet" && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={includeDivisions}
                    onChange={(e) => setIncludeDivisions(e.target.checked)}
                  />
                  Include Divisions
                </label>
                <div className="ml-6 flex gap-6">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="sort_by"
                      checked={sortBy === "division"}
                      onChange={() => setSortBy("division")}
                    />
                    Sort by Division
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="sort_by"
                      checked={sortBy === "sail"}
                      onChange={() => setSortBy("sail")}
                    />
                    Sort by Sail Number
                  </label>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={downloadSheet}
            disabled={!ready || downloading}
            className={`mt-6 rounded-md px-4 py-2 text-sm font-medium text-white ${
              ready && !downloading
                ? "bg-indigo-600 hover:bg-indigo-700"
                : "cursor-not-allowed bg-gray-400"
            }`}
          >
            {downloading ? "Preparing downloads…" : "Download Race Sheets (HTML)"}
          </button>
          <p className="mt-2 text-xs text-gray-500">
            Downloads two self-contained files (competitor sheet and sign-on
            sheet) with images embedded. Open each and use your browser&apos;s
            Print to save as PDF.
          </p>
        </div>

        {/* Preview / print area */}
        {ready && processed && (
          <div className="mt-8 overflow-x-auto rounded-xl bg-white p-6 shadow-md">
            <div id="print-area">
              {/* Competitor page */}
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
                      <a href={LUNCH_LINK}>
                        Book a table for lunch before or dinner after racing
                      </a>
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

              {/* Checkbox / sign-on page */}
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
      </div>

      <style jsx global>{`
        body { background: #f9fafb !important; color: #000 !important; }
      `}</style>
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
    </div>
  );
}
