/**
 * RRS 2025-2028, rule 26 starting sequence, extended to multiple classes
 * (rule 26: "the warning signal for each succeeding class shall be made
 * with or after the starting signal of the preceding class").
 *
 * Kept out of the component so the timing maths can be exercised without a
 * browser. See startSequence.selftest.ts.
 */

export type PrepFlag = "P" | "I" | "Z" | "ZI" | "U" | "BLACK";

export const PREP_FLAGS: { value: PrepFlag; label: string; rule: string }[] = [
  { value: "P", label: "P", rule: "Preparatory signal" },
  { value: "I", label: "I", rule: "Rule 30.1" },
  { value: "Z", label: "Z", rule: "Rule 30.2" },
  { value: "ZI", label: "Z with I", rule: "Rules 30.1 and 30.2" },
  { value: "U", label: "U", rule: "Rule 30.3" },
  { value: "BLACK", label: "Black flag", rule: "Rule 30.4" },
];

export function prepFlagInfo(flag: PrepFlag) {
  return PREP_FLAGS.find((f) => f.value === flag) ?? PREP_FLAGS[0];
}

export type SignalStage = "warning" | "preparatory" | "one-minute" | "starting";

export const STAGE_INFO: Record<SignalStage, { name: string; sound: string }> =
  {
    warning: { name: "Warning", sound: "1 sound" },
    preparatory: { name: "Preparatory", sound: "1 sound" },
    "one-minute": { name: "One-minute", sound: "1 long sound" },
    starting: { name: "Starting", sound: "1 sound" },
  };

export interface ClassSignal {
  classIndex: number;
  className: string;
  stage: SignalStage;
}

export interface SequenceRow {
  time: Date;
  signals: ClassSignal[];
}

export interface StartSequenceOptions {
  /** Starting signal time of the first class. */
  startTime: Date;
  classNames: string[];
  /** Minutes before the start that the warning signal is made. Default 5. */
  warningMinutes?: number;
  /** Minutes between each class's starting signal. Default equals warningMinutes. */
  gapMinutes?: number;
  prepFlag?: PrepFlag;
}

export interface StartSequenceResult {
  rows: SequenceRow[];
  warningMinutes: number;
  gapMinutes: number;
  prepFlag: PrepFlag;
  /** Human-readable notices about an unusual sequence, not fatal errors. */
  warnings: string[];
}

const MIN_MS = 60_000;

export function buildStartSequence(
  opts: StartSequenceOptions,
): StartSequenceResult {
  const warningMinutes = opts.warningMinutes ?? 5;
  const gapMinutes = opts.gapMinutes ?? warningMinutes;
  const prepFlag = opts.prepFlag ?? "P";
  const classNames = opts.classNames;

  if (classNames.length === 0)
    throw new Error("At least one class is required.");
  if (warningMinutes <= 0)
    throw new Error("Warning time must be greater than zero.");
  if (gapMinutes < warningMinutes) {
    throw new Error(
      `The gap between classes (${gapMinutes} min) cannot be less than the warning time (${warningMinutes} min) — rule 26 requires the next warning signal to be made with or after the preceding start.`,
    );
  }

  const warnings: string[] = [];
  if (warningMinutes !== 5) {
    warnings.push(
      `Warning time is set to ${warningMinutes} minute${warningMinutes === 1 ? "" : "s"}, not the standard 5 — only use this if the sailing instructions say so.`,
    );
  }
  if (warningMinutes < 2) {
    warnings.push(
      "With a warning time under 2 minutes, the preparatory and one-minute signals fall within a minute of the warning signal.",
    );
  }

  const signals: (ClassSignal & { time: Date })[] = [];
  classNames.forEach((className, classIndex) => {
    const start = new Date(
      opts.startTime.getTime() + classIndex * gapMinutes * MIN_MS,
    );
    const warning = new Date(start.getTime() - warningMinutes * MIN_MS);
    const preparatory = new Date(
      start.getTime() - (warningMinutes - 1) * MIN_MS,
    );
    const oneMinute = new Date(start.getTime() - MIN_MS);
    signals.push({ classIndex, className, stage: "warning", time: warning });
    signals.push({
      classIndex,
      className,
      stage: "preparatory",
      time: preparatory,
    });
    signals.push({
      classIndex,
      className,
      stage: "one-minute",
      time: oneMinute,
    });
    signals.push({ classIndex, className, stage: "starting", time: start });
  });

  signals.sort(
    (a, b) =>
      a.time.getTime() - b.time.getTime() || a.classIndex - b.classIndex,
  );

  // Signals that land on the same second (for example a start and the next
  // class's warning when the gap equals the warning time) share one row.
  const rows: SequenceRow[] = [];
  for (const s of signals) {
    const last = rows[rows.length - 1];
    const signal: ClassSignal = {
      classIndex: s.classIndex,
      className: s.className,
      stage: s.stage,
    };
    if (last && last.time.getTime() === s.time.getTime()) {
      last.signals.push(signal);
    } else {
      rows.push({ time: s.time, signals: [signal] });
    }
  }

  return { rows, warningMinutes, gapMinutes, prepFlag, warnings };
}

/**
 * The new starting signal time after a reschedule: the next warning signal
 * is made 1 minute after AP or the First Substitute is lowered (rule 27.3
 * and rule 29.2), and the start follows warningMinutes after that.
 */
export function rescheduleStartTime(now: Date, warningMinutes: number): Date {
  return new Date(now.getTime() + (1 + warningMinutes) * MIN_MS);
}
