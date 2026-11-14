// No test runner is wired up in this repo, so run it directly:
//   npx tsx src/lib/startSequence.selftest.ts
import assert from "node:assert";
import { buildStartSequence, rescheduleStartTime } from "./startSequence";

const d = (iso: string) => new Date(iso);

// Single class at 14:00:00.
{
  const r = buildStartSequence({
    startTime: d("2026-02-01T14:00:00+11:00"),
    classNames: ["Div 1"],
  });
  assert.equal(r.rows.length, 4, "one class should produce 4 rows");
  const times = r.rows.map((row) => row.time.toISOString());
  assert.deepEqual(times, [
    d("2026-02-01T13:55:00+11:00").toISOString(),
    d("2026-02-01T13:56:00+11:00").toISOString(),
    d("2026-02-01T13:59:00+11:00").toISOString(),
    d("2026-02-01T14:00:00+11:00").toISOString(),
  ]);
  assert.deepEqual(
    r.rows.map((row) => row.signals[0].stage),
    ["warning", "preparatory", "one-minute", "starting"],
  );
  assert.equal(
    r.warnings.length,
    0,
    "the standard 5 minute sequence should not warn",
  );
}

// Two classes at 5 minute gaps: class 2's warning lands on class 1's start, so they merge.
{
  const r = buildStartSequence({
    startTime: d("2026-02-01T14:00:00+11:00"),
    classNames: ["Div 1", "Div 2"],
    gapMinutes: 5,
  });
  assert.equal(r.rows.length, 7, "2 classes x 4 signals - 1 merged row = 7");
  const merged = r.rows.find(
    (row) => row.time.getTime() === d("2026-02-01T14:00:00+11:00").getTime(),
  );
  assert.ok(merged, "should have a row at 14:00:00");
  assert.equal(
    merged!.signals.length,
    2,
    "the merged row should carry both signals",
  );
  const stages = merged!.signals.map((s) => `${s.className}:${s.stage}`).sort();
  assert.deepEqual(stages, ["Div 1:starting", "Div 2:warning"]);
}

// A 10 minute gap: no merge, class 2's warning is 5 minutes after class 1 starts.
{
  const r = buildStartSequence({
    startTime: d("2026-02-01T14:00:00+11:00"),
    classNames: ["Div 1", "Div 2"],
    gapMinutes: 10,
  });
  assert.equal(r.rows.length, 8, "2 classes x 4 signals, nothing coincides");
  const div2Warning = r.rows.find((row) =>
    row.signals.some((s) => s.className === "Div 2" && s.stage === "warning"),
  );
  assert.equal(
    div2Warning!.time.toISOString(),
    d("2026-02-01T14:05:00+11:00").toISOString(),
  );
}

// Midnight rollover.
{
  const r = buildStartSequence({
    startTime: d("2026-02-02T00:02:00+11:00"),
    classNames: ["Div 1"],
  });
  assert.equal(
    r.rows[0].time.toISOString(),
    d("2026-02-01T23:57:00+11:00").toISOString(),
  );
}

// A gap under the warning time is rejected.
{
  assert.throws(
    () =>
      buildStartSequence({
        startTime: d("2026-02-01T14:00:00+11:00"),
        classNames: ["Div 1", "Div 2"],
        gapMinutes: 3,
      }),
    /cannot be less than the warning time/,
  );
}

// A non-standard warning time is flagged but not rejected.
{
  const r = buildStartSequence({
    startTime: d("2026-02-01T14:00:00+11:00"),
    classNames: ["Div 1"],
    warningMinutes: 3,
  });
  assert.equal(
    r.rows[1].time.toISOString(),
    d("2026-02-01T13:58:00+11:00").toISOString(),
    "prep = (warningMinutes - 1) before start",
  );
  assert.ok(r.warnings.length >= 1);
}

// Reschedule: warning 1 minute from now, start warningMinutes after that.
{
  const now = d("2026-02-01T14:10:00+11:00");
  const start = rescheduleStartTime(now, 5);
  assert.equal(
    start.toISOString(),
    d("2026-02-01T14:16:00+11:00").toISOString(),
  );
}

console.log("startSequence.selftest: OK");
