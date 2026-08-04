import React, { useState } from "react";
import ToolboxShell from "@/components/toolbox/ToolboxShell";

const LAT = -37.8136;
const LON = 144.9631;

type Recommendation = "YES" | "MAYBE" | "NO";

type Result = {
  eventName: string;
  raceOfficer: string;
  flagOfficer: string;
  airQuality: string;
  visibility: string;
  date: string;
  time: string;
  maxTemp: number;
  minTemp: number;
  maxWind: number;
  minGust: number;
  maxUv: number;
  waveHeight: number;
  lightningHours: number;
  galeWarning: boolean;
  strongWarning: boolean;
  recommendation: Recommendation;
  times: string[];
  windKnots: number[];
  gustsKnots: number[];
};

const KMH_TO_KT = 0.539957;

function WindChart({
  times,
  wind,
  gusts,
}: {
  times: string[];
  wind: number[];
  gusts: number[];
}) {
  const W = 720;
  const H = 320;
  const pad = { top: 20, right: 20, bottom: 50, left: 40 };
  const maxY = Math.max(...gusts, ...wind, 10) * 1.1;
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;
  const x = (i: number) => pad.left + (i / (times.length - 1)) * innerW;
  const y = (v: number) => pad.top + innerH - (v / maxY) * innerH;
  const path = (vals: number[]) =>
    vals.map((v, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(v)}`).join(" ");

  const yTicks = 5;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const v = (maxY / yTicks) * i;
        return (
          <g key={i}>
            <line x1={pad.left} x2={W - pad.right} y1={y(v)} y2={y(v)} stroke="#e3e6ea" />
            <text x={pad.left - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#5b6470">
              {Math.round(v)}
            </text>
          </g>
        );
      })}
      {times.map((t, i) =>
        i % 3 === 0 ? (
          <text
            key={i}
            x={x(i)}
            y={H - pad.bottom + 16}
            textAnchor="end"
            fontSize="9"
            fill="#5b6470"
            transform={`rotate(-45 ${x(i)} ${H - pad.bottom + 16})`}
          >
            {t.slice(11, 16)}
          </text>
        ) : null,
      )}
      <path d={path(wind)} fill="none" stroke="#1a56a8" strokeWidth="2" />
      <path d={path(gusts)} fill="none" stroke="#b42318" strokeWidth="2" />
      <g fontSize="11">
        <rect x={pad.left + 10} y={pad.top} width="12" height="3" fill="#1a56a8" />
        <text x={pad.left + 28} y={pad.top + 4} fill="#1b1f24">
          Wind (kt)
        </text>
        <rect x={pad.left + 110} y={pad.top} width="12" height="3" fill="#b42318" />
        <text x={pad.left + 128} y={pad.top + 4} fill="#1b1f24">
          Gusts (kt)
        </text>
      </g>
    </svg>
  );
}

export default function AutoRisk() {
  const [eventName, setEventName] = useState("");
  const [raceOfficer, setRaceOfficer] = useState("");
  const [flagOfficer, setFlagOfficer] = useState("");
  const [airQuality, setAirQuality] = useState("good");
  const [visibility, setVisibility] = useState("good");
  const [galeWarning, setGaleWarning] = useState(false);
  const [strongWarning, setStrongWarning] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  const generate = async () => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const forecastUrl =
        `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
        `&hourly=temperature_2m,wind_speed_10m,wind_gusts_10m,uv_index,weather_code` +
        `&timezone=Australia%2FSydney&forecast_days=1`;
      const waveUrl =
        `https://marine-api.open-meteo.com/v1/marine?latitude=${LAT}&longitude=${LON}` +
        `&daily=wave_height_max&timezone=Australia%2FSydney&forecast_days=1`;

      const [fRes, wRes] = await Promise.all([
        fetch(forecastUrl),
        fetch(waveUrl).catch(() => null),
      ]);
      if (!fRes.ok) throw new Error(`Forecast API returned ${fRes.status}`);
      const weather = await fRes.json();

      let waveHeight = 0;
      if (wRes && wRes.ok) {
        const wave = await wRes.json();
        waveHeight = wave?.daily?.wave_height_max?.[0] ?? 0;
      }

      const times: string[] = weather.hourly.time;
      const temps: number[] = weather.hourly.temperature_2m;
      const windKmh: number[] = weather.hourly.wind_speed_10m;
      const gustsKmh: number[] = weather.hourly.wind_gusts_10m;
      const uv: number[] = weather.hourly.uv_index;
      const codes: number[] = weather.hourly.weather_code;

      const windKnots = windKmh.map((w) => Math.round(w * KMH_TO_KT * 10) / 10);
      const gustsKnots = gustsKmh.map((g) => Math.round(g * KMH_TO_KT * 10) / 10);

      const thunder = [95, 96, 99];
      const lightningHours = codes.filter((c) => thunder.includes(c)).length;

      const maxTemp = Math.max(...temps);
      const minTemp = Math.min(...temps);
      const maxWind = Math.max(...gustsKnots);
      const minGust = Math.min(...gustsKnots);
      const maxUv = Math.max(...uv);

      let recommendation: Recommendation;
      if (galeWarning || maxWind > 35 || lightningHours > 3 || waveHeight > 3) {
        recommendation = "NO";
      } else if (strongWarning || maxWind > 25 || lightningHours > 0) {
        recommendation = "MAYBE";
      } else {
        recommendation = "YES";
      }

      const now = new Date();
      setResult({
        eventName,
        raceOfficer,
        flagOfficer,
        airQuality,
        visibility,
        date: now.toLocaleDateString("en-AU", {
          weekday: "long",
          day: "2-digit",
          month: "long",
          year: "numeric",
        }),
        time: now.toLocaleTimeString("en-AU"),
        maxTemp,
        minTemp,
        maxWind,
        minGust,
        maxUv,
        waveHeight,
        lightningHours,
        galeWarning,
        strongWarning,
        recommendation,
        times,
        windKnots,
        gustsKnots,
      });
    } catch (e) {
      setError(
        `Could not fetch forecast data: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    } finally {
      setLoading(false);
    }
  };

  const recColor: Record<Recommendation, string> = {
    YES: "#1f7a44",
    MAYBE: "#b54708",
    NO: "#b42318",
  };

  return (
    <ToolboxShell
      eyebrow="Tool 02"
      title="Risk Assessment"
      description="Generate a sailing race-day risk assessment for Port Phillip from live weather and marine forecasts."
    >
      <h1 className="tb-display tb-anim-rise text-[26px] leading-tight">
        Risk Assessment
      </h1>
      <p className="tb-anim-rise mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--tb-text-muted)]" style={{ animationDelay: '0.04s' }}>
        Pulls live weather and marine forecasts for Port Phillip and produces a go / no-go
        recommendation. Gale and strong-wind warnings are entered manually, since the Bureau
        of Meteorology feed and Ports Victoria ship movements can&apos;t be fetched directly
        from a browser.
      </p>

      <div className="tb-anim-rise tb-card mt-8 p-6" style={{ animationDelay: '0.08s' }}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="tb-eyebrow">Event Name</span>
            <input
              type="text"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              className="tb-input mt-1 w-full px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="tb-eyebrow">Race Officer</span>
            <input
              type="text"
              value={raceOfficer}
              onChange={(e) => setRaceOfficer(e.target.value)}
              className="tb-input mt-1 w-full px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="tb-eyebrow">Flag Officer</span>
            <input
              type="text"
              value={flagOfficer}
              onChange={(e) => setFlagOfficer(e.target.value)}
              className="tb-input mt-1 w-full px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="tb-eyebrow">Air Quality</span>
            <select
              value={airQuality}
              onChange={(e) => setAirQuality(e.target.value)}
              className="tb-input mt-1 w-full px-3 py-2 text-sm"
            >
              <option value="good">Good</option>
              <option value="bad">Bad</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="tb-eyebrow">Visibility</span>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="tb-input mt-1 w-full px-3 py-2 text-sm"
            >
              <option value="good">Good</option>
              <option value="bad">Bad</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={strongWarning} onChange={(e) => setStrongWarning(e.target.checked)} />
            Strong wind warning (Port Phillip)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={galeWarning} onChange={(e) => setGaleWarning(e.target.checked)} />
            Gale warning (Port Phillip)
          </label>
        </div>

        <button onClick={generate} disabled={loading} className="tb-btn mt-6 px-4 py-2 text-sm">
          {loading ? "Fetching forecast…" : "Generate Assessment"}
        </button>

        {error && (
          <p className="mt-4 border border-[var(--tb-danger)]/40 p-3 text-sm text-[var(--tb-danger)]">
            {error}
          </p>
        )}
      </div>

      {result && (
        <div id="risk-report" className="tb-card mt-8 p-6">
          <div className="flex items-center justify-between">
            <h2 className="tb-display text-[18px]">Report</h2>
            <button onClick={() => window.print()} className="tb-btn-ghost no-print px-3 py-1.5 text-xs">
              Print / Save PDF
            </button>
          </div>

          <div
            className="mt-5 rounded-[3px] px-4 py-3 text-center text-[16px] font-semibold text-white"
            style={{ background: recColor[result.recommendation] }}
          >
            Recommendation: {result.recommendation} to racing
          </div>

          <table className="tb-table mt-5">
            <tbody>
              {[
                ["Event Name", result.eventName || "—"],
                ["Race Officer", result.raceOfficer || "—"],
                ["Flag Officer", result.flagOfficer || "—"],
                ["Date", result.date],
                ["Time Created", result.time],
                [
                  "Weather Summary",
                  `Max Temp: ${result.maxTemp}°C | Min Temp: ${result.minTemp}°C | Max Wind: ${result.maxWind} kt | Min Gust: ${result.minGust} kt | Max UV: ${result.maxUv}`,
                ],
                ["Gale Warning", result.galeWarning ? "YES" : "NO"],
                ["Strong Wind Warning", result.strongWarning ? "YES" : "NO"],
                ["Wave Height (m)", String(result.waveHeight)],
                ["Air Quality", result.airQuality],
                ["Visibility", result.visibility],
                ["Lightning Hours", String(result.lightningHours)],
              ].map(([k, v]) => (
                <tr key={k}>
                  <td className="w-52 align-top font-medium text-[var(--tb-text-muted)]">{k}</td>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 className="tb-display mb-2 mt-6 text-[15px]">Wind / Gust Forecast</h3>
          <WindChart times={result.times} wind={result.windKnots} gusts={result.gustsKnots} />
        </div>
      )}

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #risk-report, #risk-report * { visibility: visible; }
          #risk-report { position: absolute; left: 0; top: 0; width: 100%; margin: 0; }
          .no-print { display: none !important; }
        }
      `}</style>
    </ToolboxShell>
  );
}
