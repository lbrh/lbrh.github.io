import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";

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
            <line
              x1={pad.left}
              x2={W - pad.right}
              y1={y(v)}
              y2={y(v)}
              stroke="#e5e7eb"
            />
            <text x={pad.left - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#6b7280">
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
            fill="#6b7280"
            transform={`rotate(-45 ${x(i)} ${H - pad.bottom + 16})`}
          >
            {t.slice(11, 16)}
          </text>
        ) : null,
      )}
      <path d={path(wind)} fill="none" stroke="#2563eb" strokeWidth="2" />
      <path d={path(gusts)} fill="none" stroke="#dc2626" strokeWidth="2" />
      <g fontSize="11">
        <rect x={pad.left + 10} y={pad.top} width="12" height="3" fill="#2563eb" />
        <text x={pad.left + 28} y={pad.top + 4} fill="#374151">
          Wind (kt)
        </text>
        <rect x={pad.left + 110} y={pad.top} width="12" height="3" fill="#dc2626" />
        <text x={pad.left + 128} y={pad.top + 4} fill="#374151">
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
    YES: "bg-green-100 text-green-800",
    MAYBE: "bg-yellow-100 text-yellow-800",
    NO: "bg-red-100 text-red-800",
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Head>
        <title>Race Day Risk Assessment</title>
        <meta
          name="description"
          content="Generate a sailing race-day risk assessment for Port Phillip from live weather and marine forecasts."
        />
      </Head>

      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <Link href="/" className="text-sm text-indigo-600 hover:underline">
            &larr; Back to portfolio
          </Link>
        </div>

        <div className="rounded-xl bg-white p-8 shadow-md">
          <h1 className="text-3xl font-extrabold text-gray-900">
            Race Day Risk Assessment
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Pulls live weather and marine forecasts for Port Phillip
            (Melbourne) and produces a go / no-go recommendation. Gale and
            strong-wind warnings are entered manually below, since the Bureau of
            Meteorology FTP feed and Ports Victoria ship movements can&apos;t be
            fetched directly from a browser.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-gray-700">Event Name</span>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-700">Race Officer</span>
              <input
                type="text"
                value={raceOfficer}
                onChange={(e) => setRaceOfficer(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-700">Flag Officer</span>
              <input
                type="text"
                value={flagOfficer}
                onChange={(e) => setFlagOfficer(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-700">Air Quality</span>
              <select
                value={airQuality}
                onChange={(e) => setAirQuality(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="good">Good</option>
                <option value="bad">Bad</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-gray-700">Visibility</span>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="good">Good</option>
                <option value="bad">Bad</option>
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={strongWarning}
                onChange={(e) => setStrongWarning(e.target.checked)}
              />
              Strong wind warning (Port Phillip)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={galeWarning}
                onChange={(e) => setGaleWarning(e.target.checked)}
              />
              Gale warning (Port Phillip)
            </label>
          </div>

          <button
            onClick={generate}
            disabled={loading}
            className={`mt-6 rounded-md px-4 py-2 text-sm font-medium text-white ${
              loading
                ? "cursor-not-allowed bg-gray-400"
                : "bg-indigo-600 hover:bg-indigo-700"
            }`}
          >
            {loading ? "Fetching forecast…" : "Generate Assessment"}
          </button>

          {error && (
            <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
        </div>

        {result && (
          <div id="risk-report" className="mt-8 rounded-xl bg-white p-8 shadow-md">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                Risk Assessment
              </h2>
              <button
                onClick={() => window.print()}
                className="no-print rounded-md bg-gray-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
              >
                Print / Save PDF
              </button>
            </div>

            <div
              className={`mt-4 rounded-lg p-4 text-center text-xl font-bold ${recColor[result.recommendation]}`}
            >
              Recommendation: {result.recommendation} to racing
            </div>

            <table className="mt-6 w-full text-sm">
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
                  <tr key={k} className="border-b border-gray-100">
                    <td className="py-2 pr-4 font-medium text-gray-700 align-top w-48">
                      {k}
                    </td>
                    <td className="py-2 text-gray-900">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <h3 className="mt-6 mb-2 font-semibold text-gray-800">
              Wind / Gust Forecast
            </h3>
            <WindChart
              times={result.times}
              wind={result.windKnots}
              gusts={result.gustsKnots}
            />
          </div>
        )}
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #risk-report,
          #risk-report * {
            visibility: visible;
          }
          #risk-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            box-shadow: none;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
