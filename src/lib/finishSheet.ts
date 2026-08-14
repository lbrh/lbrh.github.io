/**
 * Shared logic for the Finish Sheet Reader tool: turning the raw rows
 * Claude extracts from a photographed finish sheet into an editable
 * table, matched against a required exported boat-list CSV (boat/fleet
 * are always derived from that match, never freely typed), and finally
 * into the "Boat,Sail No,Fleet,HR,MN,SC,DidNot" CSV format TopYacht's
 * FinishTime import expects. DidNot is intentionally always left blank.
 *
 * Kept out of the page component so the matching/CSV logic can be
 * exercised without a browser or a real file upload.
 */

export type ExtractedRow = {
  place: number;
  sailNum: string;
  hr: string;
  min: string;
  sec: string;
  note: string;
  hourGuessed: boolean;
};

export type BoatEntry = {
  boatName: string;
  fleet: string;
};

export type FinishRow = {
  id: string;
  place: string;
  sailNum: string;
  boat: string;
  fleet: string;
  hr: string;
  mm: string;
  ss: string;
  note: string;
  hourGuessed: boolean;
  /** true if this sail number was found in the boat list — boat/fleet are only ever set when matched. */
  matched: boolean;
};

/** Strips everything but letters/digits and uppercases, so "r 281", "R281" and "R-281" all match. */
export function normalizeSail(sailNum: string): string {
  return sailNum
    .toUpperCase()
    .split('')
    .filter((ch) => /[A-Z0-9]/.test(ch))
    .join('');
}

function pad2(v: unknown): string {
  const s = String(v ?? '').trim();
  if (s === '') return '00';
  return s.padStart(2, '0');
}

/**
 * Defensively coerces whatever JSON the model / Worker returned into
 * ExtractedRow[], dropping entries with no sail number rather than
 * throwing, since a single malformed row shouldn't sink the whole sheet.
 */
export function parseExtractedRows(input: unknown): ExtractedRow[] {
  if (!Array.isArray(input)) return [];
  const rows: ExtractedRow[] = [];
  for (const item of input) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const sailNum = String(rec.sailNum ?? '').trim();
    if (!sailNum) continue;
    const place = Number(rec.place);
    rows.push({
      place: Number.isFinite(place) ? place : 0,
      sailNum,
      hr: pad2(rec.hr),
      min: pad2(rec.min),
      sec: pad2(rec.sec),
      note: String(rec.note ?? '').trim(),
      hourGuessed: rec.hourGuessed === true,
    });
  }
  return rows;
}

const SAIL_ALIASES = ['SAILNUM', 'SAIL NO', 'SAIL_NO', 'SAILNO', 'SAIL NUMBER'];
const BOAT_ALIASES = ['BOATNAME', 'BOAT NAME', 'BOAT'];
const FLEET_ALIASES = ['FLEET'];

function findColumn(firstRow: Record<string, unknown>, aliases: string[]): string | null {
  return Object.keys(firstRow).find((k) => aliases.includes(k.trim().toUpperCase())) ?? null;
}

/** Returns the missing required column names (empty if the CSV looks usable), for a validation message. */
export function missingBoatColumns(firstRow: Record<string, unknown>): string[] {
  const missing: string[] = [];
  if (!findColumn(firstRow, SAIL_ALIASES)) missing.push('SAILNUM');
  if (!findColumn(firstRow, BOAT_ALIASES)) missing.push('BOATNAME');
  return missing;
}

/** Indexes an exported boat-list CSV by normalized sail number for O(1) lookups. */
export function buildBoatMap(rows: Record<string, string>[]): Map<string, BoatEntry> {
  const map = new Map<string, BoatEntry>();
  if (!rows.length) return map;
  const sailCol = findColumn(rows[0], SAIL_ALIASES);
  const boatCol = findColumn(rows[0], BOAT_ALIASES);
  const fleetCol = findColumn(rows[0], FLEET_ALIASES);
  if (!sailCol || !boatCol) return map;

  for (const r of rows) {
    const sail = String(r[sailCol] ?? '').trim();
    if (!sail) continue;
    map.set(normalizeSail(sail), {
      boatName: String(r[boatCol] ?? '').trim(),
      fleet: fleetCol ? String(r[fleetCol] ?? '').trim() : '',
    });
  }
  return map;
}

let nextId = 0;
function newRowId(): string {
  nextId += 1;
  return `row-${Date.now()}-${nextId}`;
}

/** Builds the editable table rows from what Claude extracted, matching each against the boat list. */
export function rowsFromExtracted(extracted: ExtractedRow[], boatMap: Map<string, BoatEntry> | null): FinishRow[] {
  return extracted.map((item) => {
    const entry = boatMap?.get(normalizeSail(item.sailNum));
    return {
      id: newRowId(),
      place: item.place ? String(item.place) : '',
      sailNum: item.sailNum,
      boat: entry?.boatName ?? '',
      fleet: entry?.fleet ?? '',
      hr: item.hr,
      mm: item.min,
      ss: item.sec,
      note: item.note,
      hourGuessed: item.hourGuessed,
      matched: !!entry,
    };
  });
}

export function blankRow(): FinishRow {
  return {
    id: newRowId(),
    place: '',
    sailNum: '',
    boat: '',
    fleet: '',
    hr: '',
    mm: '',
    ss: '',
    note: '',
    hourGuessed: false,
    // Nothing to match yet — this becomes true once rematchRow finds an entrant.
    matched: false,
  };
}

/** Re-checks a row's sail number against the boat list after the user edits it, filling boat/fleet in on a match. */
export function rematchRow(row: FinishRow, boatMap: Map<string, BoatEntry> | null): FinishRow {
  if (!boatMap) return { ...row, matched: false };
  const entry = boatMap.get(normalizeSail(row.sailNum));
  if (!entry) return { ...row, boat: '', fleet: '', matched: false };
  return { ...row, boat: entry.boatName, fleet: entry.fleet, matched: true };
}

function csvField(v: string | number): string {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function isIntInRange(v: string, min: number, max: number): boolean {
  if (v.trim() === '') return false;
  const n = Number(v);
  return Number.isInteger(n) && n >= min && n <= max;
}

export type RowValidation = {
  place: boolean;
  sailNum: boolean;
  boat: boolean;
  fleet: boolean;
  hr: boolean;
  mm: boolean;
  ss: boolean;
};

/**
 * Checks a row against TopYacht's FinishTime import rules: sail number,
 * boat and fleet must match an entrant from the boat list, and HR/MN/SC
 * must be in range. DidNot isn't validated — it's always exported blank.
 */
export function validateRow(row: FinishRow): RowValidation {
  return {
    place: isIntInRange(row.place, 1, 9999),
    sailNum: row.matched,
    boat: row.matched && row.boat.trim() !== '',
    fleet: row.matched && row.fleet.trim() !== '',
    hr: isIntInRange(row.hr, 0, 23),
    mm: isIntInRange(row.mm, 0, 60),
    ss: isIntInRange(row.ss, 0, 60),
  };
}

export function rowIsValid(v: RowValidation): boolean {
  return v.place && v.sailNum && v.boat && v.fleet && v.hr && v.mm && v.ss;
}

/** Sorts by place (numeric, blanks/unparsable last) and formats as the TopYacht FinishTime import CSV. DidNot is always left blank. */
export function rowsToCsv(rows: FinishRow[]): string {
  const sorted = [...rows].sort((a, b) => {
    const pa = Number(a.place);
    const pb = Number(b.place);
    const na = Number.isFinite(pa) ? pa : Infinity;
    const nb = Number.isFinite(pb) ? pb : Infinity;
    return na - nb;
  });

  const header = ['Boat', 'Sail No', 'Fleet', 'HR', 'MN', 'SC', 'DidNot'];
  const lines = sorted.map((r) =>
    [r.boat, r.sailNum, r.fleet, pad2(r.hr), pad2(r.mm), pad2(r.ss), ''].map(csvField).join(','),
  );
  return [header.join(','), ...lines].join('\n') + '\n';
}
