import React, { useEffect, useMemo, useRef, useState } from "react";
import ToolboxShell from "@/components/toolbox/ToolboxShell";
import {
  buildStartSequence,
  prepFlagInfo,
  rescheduleStartTime,
  PREP_FLAGS,
  type PrepFlag,
  type SignalStage,
  type SequenceRow,
} from "@/lib/startSequence";

const STORAGE_KEY = "toolbox:start-sequence:fields";
const MAX_CLASSES = 8;

function defaultClassNames(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `Class ${i + 1}`);
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function timeToString(d: Date) {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Parses "HH:MM:SS" (or "HH:MM") against today's date. Returns null if invalid. */
function parseTimeToday(value: string): Date | null {
  const m = value.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const [, h, min, s] = m;
  const hours = Number(h);
  const minutes = Number(min);
  const seconds = s ? Number(s) : 0;
  if (hours > 23 || minutes > 59 || seconds > 59) return null;
  const d = new Date();
  d.setHours(hours, minutes, seconds, 0);
  return d;
}

function formatClock(d: Date) {
  return d.toLocaleTimeString("en-AU", { hour12: false });
}

function formatCountdown(ms: number) {
  if (ms <= 0) return "0:00";
  const totalSeconds = Math.ceil(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function stageLabel(stage: SignalStage, className: string): string {
  switch (stage) {
    case "warning":
      return `${className} warning`;
    case "preparatory":
      return "Preparatory";
    case "one-minute":
      return "One-minute";
    case "starting":
      return `${className} starting`;
  }
}

function flagsForRow(row: SequenceRow, prepFlag: PrepFlag): string {
  const parts: string[] = [];
  for (const s of row.signals) {
    if (s.stage === "warning") parts.push(`${s.className} flag up`);
    if (s.stage === "preparatory")
      parts.push(`${prepFlagInfo(prepFlag).label} up`);
    if (s.stage === "one-minute")
      parts.push(`${prepFlagInfo(prepFlag).label} down`);
    if (s.stage === "starting") parts.push(`${s.className} flag down`);
  }
  return parts.join(", ");
}

function soundForRow(row: SequenceRow): string {
  // One row can carry more than one signal when times coincide; a long
  // sound (the one-minute signal) is the one that needs calling out.
  const hasOneMinute = row.signals.some((s) => s.stage === "one-minute");
  return hasOneMinute ? "1 long sound" : "1 sound";
}

/** Current flag state for one class, derived from its own four signal times. */
function classFlagStatus(
  className: string,
  rows: SequenceRow[],
  prepFlag: PrepFlag,
  now: Date,
): string {
  const times: Partial<Record<SignalStage, Date>> = {};
  for (const row of rows) {
    for (const s of row.signals) {
      if (s.className === className) times[s.stage] = row.time;
    }
  }
  const { warning, preparatory, "one-minute": oneMinute, starting } = times;
  if (!warning || !preparatory || !oneMinute || !starting) return "Unknown";
  const t = now.getTime();
  if (t < warning.getTime()) return "No flags yet";
  if (t < preparatory.getTime()) return `${className} flag up`;
  if (t < oneMinute.getTime())
    return `${className} flag + ${prepFlagInfo(prepFlag).label} up`;
  if (t < starting.getTime())
    return `${className} flag up (${prepFlagInfo(prepFlag).label} removed)`;
  return "Started — no flags";
}

// ponytail: one oscillator beep is plenty for a committee-boat cue; a
// multi-tone horn sequence would need a sample library for no real benefit.
function playBeep(ctx: AudioContext, long: boolean) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.frequency.value = 880;
  osc.type = "square";
  const dur = long ? 1.1 : 0.18;
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + dur + 0.05);
}

export default function StartSequenceCalculator() {
  const [timeInput, setTimeInput] = useState("");
  const [classCount, setClassCount] = useState(1);
  const [classNames, setClassNames] = useState<string[]>(defaultClassNames(1));
  const [prepFlag, setPrepFlag] = useState<PrepFlag>("P");
  const [warningMinutes, setWarningMinutes] = useState(5);
  const [gapMinutes, setGapMinutes] = useState(5);
  const [gapTouched, setGapTouched] = useState(false);
  const [beepsOn, setBeepsOn] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  const [restored, setRestored] = useState(false);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      if (typeof saved.prepFlag === "string") setPrepFlag(saved.prepFlag);
      if (typeof saved.classCount === "number") {
        setClassCount(saved.classCount);
        setClassNames(defaultClassNames(saved.classCount));
      }
      if (typeof saved.gapMinutes === "number") {
        setGapMinutes(saved.gapMinutes);
        setGapTouched(true);
      }
    } catch {
      /* storage unavailable or corrupt; start blank */
    }
    setRestored(true);
    setNow(new Date());
  }, []);
  useEffect(() => {
    if (!restored) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ prepFlag, classCount, gapMinutes }),
      );
    } catch {
      /* ignore quota / private-mode errors */
    }
  }, [restored, prepFlag, classCount, gapMinutes]);

  // A gap the user hasn't touched tracks the warning time, same as the default sequence.
  useEffect(() => {
    if (!gapTouched) setGapMinutes(warningMinutes);
  }, [warningMinutes, gapTouched]);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const setClassCountClamped = (n: number) => {
    const clamped = Math.max(1, Math.min(MAX_CLASSES, n));
    setClassCount(clamped);
    setClassNames((prev) => {
      const next = [...prev];
      while (next.length < clamped) next.push(`Class ${next.length + 1}`);
      next.length = clamped;
      return next;
    });
  };

  const startDate = useMemo(() => parseTimeToday(timeInput), [timeInput]);

  const sequence = useMemo(() => {
    if (!startDate) return null;
    try {
      return buildStartSequence({
        startTime: startDate,
        classNames,
        warningMinutes,
        gapMinutes,
        prepFlag,
      });
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) } as const;
    }
  }, [startDate, classNames, warningMinutes, gapMinutes, prepFlag]);

  const result = sequence && !("error" in sequence) ? sequence : null;
  const sequenceError = sequence && "error" in sequence ? sequence.error : null;

  const nextRowIndex = useMemo(() => {
    if (!result || !now) return -1;
    return result.rows.findIndex((r) => r.time.getTime() > now.getTime());
  }, [result, now]);

  // Audio: beeps only ever fire for rows whose time is after the moment
  // beeps were switched on, so nothing sounds off for a sequence that
  // already happened before the page was opened or the box was ticked.
  const audioCtxRef = useRef<AudioContext | null>(null);
  const beepedRef = useRef<Set<number>>(new Set());
  const beepsEnabledAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (beepsOn && beepsEnabledAtRef.current === null) {
      beepsEnabledAtRef.current = Date.now();
      try {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (Ctx) audioCtxRef.current = new Ctx();
      } catch {
        /* Web Audio unavailable; beeps silently do nothing */
      }
    }
    if (!beepsOn) beepsEnabledAtRef.current = null;
  }, [beepsOn]);

  useEffect(() => {
    if (!beepsOn || !result || !now || beepsEnabledAtRef.current === null)
      return;
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    for (const row of result.rows) {
      const t = row.time.getTime();
      if (
        t < beepsEnabledAtRef.current ||
        t > now.getTime() ||
        beepedRef.current.has(t)
      )
        continue;
      beepedRef.current.add(t);
      playBeep(
        ctx,
        row.signals.some((s) => s.stage === "one-minute"),
      );
    }
  }, [beepsOn, result, now]);

  const reschedule = () => {
    const current = now ?? new Date();
    const next = rescheduleStartTime(current, warningMinutes);
    setTimeInput(timeToString(next));
    beepedRef.current.clear();
  };

  return (
    <ToolboxShell
      eyebrow="Tool 09"
      title="Start Sequence Calculator"
      description="Work out every flag and sound signal back from a sailing race start time, with a live countdown, under RRS 2025-2028 rule 26."
    >
      <h1 className="tb-display tb-anim-rise text-[26px] leading-tight">
        Start Sequence Calculator
      </h1>
      <p
        className="tb-anim-rise mt-2 max-w-2xl text-[14px] leading-relaxed text-[var(--tb-text-muted)]"
        style={{ animationDelay: "0.04s" }}
      >
        Set the starting signal time for the first class and the tool works out
        every flag and sound back to the warning signal, under RRS rule 26.
        Times are taken from the visual signals — the absence of a sound signal
        is disregarded.
      </p>

      <div
        className="tb-anim-rise tb-card mt-8 p-6"
        style={{ animationDelay: "0.08s" }}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm">
            <span className="tb-eyebrow">First start time</span>
            <input
              type="time"
              step={1}
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
              className="tb-input mt-1 w-full px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="tb-eyebrow">Number of classes</span>
            <input
              type="number"
              min={1}
              max={MAX_CLASSES}
              value={classCount}
              onChange={(e) => setClassCountClamped(Number(e.target.value))}
              className="tb-input mt-1 w-full px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="tb-eyebrow">Preparatory flag</span>
            <select
              value={prepFlag}
              onChange={(e) => setPrepFlag(e.target.value as PrepFlag)}
              className="tb-input mt-1 w-full px-3 py-2 text-sm"
            >
              {PREP_FLAGS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label} — {f.rule}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="tb-eyebrow">Warning time (minutes)</span>
            <input
              type="number"
              min={1}
              value={warningMinutes}
              onChange={(e) =>
                setWarningMinutes(Math.max(1, Number(e.target.value) || 1))
              }
              className="tb-input mt-1 w-full px-3 py-2 text-sm"
            />
          </label>
        </div>

        {classCount > 1 && (
          <div className="mt-4">
            <span className="tb-eyebrow">Gap between starts (minutes)</span>
            <input
              type="number"
              min={warningMinutes}
              value={gapMinutes}
              onChange={(e) => {
                setGapTouched(true);
                setGapMinutes(
                  Math.max(
                    warningMinutes,
                    Number(e.target.value) || warningMinutes,
                  ),
                );
              }}
              className="tb-input mt-1 w-32 px-3 py-2 text-sm"
            />
            <p className="mt-1 text-[12px] text-[var(--tb-text-muted)]">
              Cannot be less than the warning time. When the gap equals the
              warning time, a class&apos;s start and the next class&apos;s
              warning land on the same signal and are shown as one row.
            </p>
          </div>
        )}

        {classCount > 1 && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {classNames.map((name, i) => (
              <label key={i} className="block text-sm">
                <span className="tb-eyebrow">Class {i + 1} name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) =>
                    setClassNames((prev) =>
                      prev.map((n, idx) => (idx === i ? e.target.value : n)),
                    )
                  }
                  className="tb-input mt-1 w-full px-3 py-2 text-sm"
                />
              </label>
            ))}
          </div>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={beepsOn}
              onChange={(e) => setBeepsOn(e.target.checked)}
            />
            Horn beeps (off by default)
          </label>
          <button
            onClick={reschedule}
            disabled={!startDate}
            className="tb-btn-ghost px-3 py-1.5 text-xs"
          >
            Postponement / general recall — reschedule from now
          </button>
        </div>
        <p className="mt-1 text-[12px] text-[var(--tb-text-muted)]">
          Press this the moment AP or the First Substitute is lowered. It resets
          the sequence with the warning signal one minute from now.
        </p>

        {result && result.warnings.length > 0 && (
          <div className="mt-4 border border-[var(--tb-warn)]/40 bg-[#fffaeb] p-3 text-sm text-[var(--tb-warn)]">
            {result.warnings.map((w, i) => (
              <p key={i}>{w}</p>
            ))}
          </div>
        )}
        {sequenceError && (
          <p className="mt-4 border border-[var(--tb-danger)]/40 bg-[#fef3f2] p-3 text-sm text-[var(--tb-danger)]">
            {sequenceError}
          </p>
        )}
      </div>

      {result && now && (
        <div className="tb-card mt-8 p-6 text-center">
          {nextRowIndex === -1 ? (
            <p className="tb-display text-[22px]">Sequence complete</p>
          ) : (
            <>
              <p className="tb-eyebrow">
                Next:{" "}
                {result.rows[nextRowIndex].signals
                  .map((s) => stageLabel(s.stage, s.className))
                  .join(" / ")}
              </p>
              <p className="tb-mono mt-1 text-[56px] font-bold leading-none tracking-tight sm:text-[84px]">
                {formatCountdown(
                  result.rows[nextRowIndex].time.getTime() - now.getTime(),
                )}
              </p>
              <p className="mt-1 text-[13px] text-[var(--tb-text-muted)]">
                at {formatClock(result.rows[nextRowIndex].time)} —{" "}
                {soundForRow(result.rows[nextRowIndex])}
              </p>
            </>
          )}

          <div className="mt-6 grid gap-2 border-t border-[var(--tb-border)] pt-4 text-left sm:grid-cols-2 lg:grid-cols-4">
            {classNames.map((name) => (
              <div key={name} className="tb-mono text-[12.5px]">
                <span className="font-semibold">{name}:</span>{" "}
                {classFlagStatus(name, result.rows, prepFlag, now)}
              </div>
            ))}
          </div>
        </div>
      )}

      {result && (
        <div className="tb-card mt-8 overflow-x-auto p-6">
          <h2 className="tb-display text-[16px]">Schedule</h2>
          <table className="tb-table mt-3">
            <thead>
              <tr>
                <th>Clock time</th>
                <th>Relative</th>
                <th>Signal</th>
                <th>Flags</th>
                <th>Sound</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row, i) => {
                const isPast = now
                  ? row.time.getTime() <= now.getTime()
                  : false;
                const isNext = i === nextRowIndex;
                const relMs = startDate
                  ? row.time.getTime() - startDate.getTime()
                  : 0;
                const relMin = Math.round(relMs / 60000);
                return (
                  <tr
                    key={i}
                    style={{
                      opacity: isPast && !isNext ? 0.45 : 1,
                      background: isNext ? "var(--tb-accent-soft)" : undefined,
                      fontWeight: isNext ? 600 : undefined,
                    }}
                  >
                    <td className="tb-mono">{formatClock(row.time)}</td>
                    <td className="tb-mono">
                      {relMin === 0
                        ? "Start"
                        : `${relMin > 0 ? "+" : ""}${relMin} min`}
                    </td>
                    <td>
                      {row.signals
                        .map((s) => stageLabel(s.stage, s.className))
                        .join(" / ")}
                    </td>
                    <td>{flagsForRow(row, prepFlag)}</td>
                    <td>{soundForRow(row)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="tb-card mt-8 p-6">
        <h2 className="tb-display text-[16px]">Other race signals</h2>
        <p className="mt-1 text-[12.5px] text-[var(--tb-text-muted)]">
          Always check the sailing instructions and rule 27.3 before using any
          of these — the race committee may use its own combination of flags,
          and the notice of race or sailing instructions govern over this
          reference.
        </p>
        <table className="tb-table mt-3">
          <thead>
            <tr>
              <th>Flag</th>
              <th>Meaning</th>
              <th>Sound</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="tb-mono">AP</td>
              <td>
                Races not started are postponed. Warning signal 1 minute after
                removal.
              </td>
              <td>2 sounds up, 1 down</td>
            </tr>
            <tr>
              <td className="tb-mono">AP over H</td>
              <td>Races not started are postponed. Further signals ashore.</td>
              <td>2 sounds</td>
            </tr>
            <tr>
              <td className="tb-mono">AP over A</td>
              <td>Races not started are postponed. No more racing today.</td>
              <td>2 sounds</td>
            </tr>
            <tr>
              <td className="tb-mono">AP over 1–9</td>
              <td>
                Postponement of 1 to 9 hours from the scheduled starting time.
              </td>
              <td>2 sounds up, 1 down</td>
            </tr>
            <tr>
              <td className="tb-mono">First Substitute</td>
              <td>General recall. Warning signal 1 minute after removal.</td>
              <td>2 sounds up, 1 down</td>
            </tr>
            <tr>
              <td className="tb-mono">X</td>
              <td>Individual recall.</td>
              <td>1 sound</td>
            </tr>
            <tr>
              <td className="tb-mono">N</td>
              <td>
                All races in progress are abandoned. Return to the starting
                area.
              </td>
              <td>3 sounds up, 1 down</td>
            </tr>
            <tr>
              <td className="tb-mono">N over H</td>
              <td>
                All races in progress are abandoned. Further signals ashore.
              </td>
              <td>3 sounds</td>
            </tr>
            <tr>
              <td className="tb-mono">N over A</td>
              <td>
                All races in progress are abandoned. No more racing today.
              </td>
              <td>3 sounds</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-3 text-[12px] text-[var(--tb-text-faint)]">
          Rule 27.3 lets the race committee postpone with AP or abandon with N
          at any point before the starting signal, not only once a race is under
          way — under RRS 2025-2028 flag N was added to the flags that can be
          used before the start, alongside AP. Once a race has started, rule 32
          governs and only the N flags apply.
        </p>
      </div>

      <p className="tb-mono mt-6 text-[11px] text-[var(--tb-text-faint)]">
        Reference only. This tool follows RRS 2025-2028 rule 26 and is not a
        substitute for the sailing instructions, which govern the actual
        starting sequence used on the day.
      </p>
    </ToolboxShell>
  );
}
