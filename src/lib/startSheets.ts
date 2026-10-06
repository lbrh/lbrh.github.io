export type RaceType = 'pursuit' | 'fleet';
export type SheetRow = Record<string, string | number>;

export const REQUIRED_COLUMNS = ['BOATNAME', 'SAILNUM'] as const;

/** Handicap columns a TopYacht export can contain, in display order. */
const HANDICAP_COLUMNS = ['PURHC', 'PHS', 'AMS', 'ORC', 'CAS'];

/** Pursuit handicap: drives pursuit start order and the PURHC+ option. */
const PURSUIT_COLUMN = 'PURHC';

/** Returns every handicap column present in the CSV. */
export function findHandicapColumns(firstRow: Record<string, unknown>): string[] {
  return HANDICAP_COLUMNS.filter((c) => c in firstRow);
}

/** Column names TopYacht exports have used for the division field. */
const DIVISION_ALIASES = ['DIVISION', 'FLEET', 'DIV NO', 'DIVNO', 'DIV'];

export const DIVISION_HEADER = 'Division';

export interface ProcessOptions {
  raceType: RaceType;
  purhcPlus: boolean;
  includeDivisions: boolean;
  sortBy: 'division' | 'sail';
  /** Handicap columns to print. Anything not listed (or not in the CSV) is left out. */
  handicaps: string[];
}

export interface ProcessedSheet {
  headers: string[];
  data: SheetRow[];
  /** Rows whose PURHC could not be read as a number (treated as 0). */
  badHandicaps: string[];
}

export function missingColumns(firstRow: Record<string, unknown>): string[] {
  return REQUIRED_COLUMNS.filter((c) => !(c in firstRow));
}

/** Returns the CSV's division column name, if it has one. */
export function findDivisionColumn(firstRow: Record<string, unknown>): string | null {
  return Object.keys(firstRow).find((k) => DIVISION_ALIASES.includes(k.trim().toUpperCase())) ?? null;
}

/**
 * Normalises raw CSV rows into the printable sheet table.
 *
 * Kept out of the component so the ordering and handicap maths can be
 * exercised without a browser or a real file upload.
 */
export function processEntrants(
  rawRows: Record<string, string>[],
  { raceType, purhcPlus, includeDivisions, sortBy, handicaps }: ProcessOptions,
): ProcessedSheet {
  const first = rawRows[0] ?? {};
  const divCol = rawRows.length ? findDivisionColumn(first) : null;
  const shown = findHandicapColumns(first).filter((c) => handicaps.includes(c));
  const hasPursuit = PURSUIT_COLUMN in first;
  const badHandicaps: string[] = [];

  const rows = rawRows.map((r) => {
    const name = String(r['BOATNAME'] ?? '').trim();
    const row: SheetRow = {
      'Boat Name': name,
      'Sail No': String(r['SAILNUM'] ?? '').trim(),
    };
    if (divCol) row[DIVISION_HEADER] = String(r[divCol] ?? '').trim();
    for (const c of shown) row[c] = String(r[c] ?? '').trim();
    // PURHC is read as a number for ordering and PURHC+, so it is checked even when hidden.
    let pursuit = 0;
    if (hasPursuit) {
      const raw = String(r[PURSUIT_COLUMN] ?? '').trim();
      const num = Number(raw);
      if (raw !== '' && Number.isFinite(num)) pursuit = num;
      else if (raceType === 'pursuit' || shown.includes(PURSUIT_COLUMN)) {
        badHandicaps.push(name || String(r['SAILNUM'] ?? '?'));
      }
      if (shown.includes(PURSUIT_COLUMN)) row[PURSUIT_COLUMN] = pursuit;
    }
    return { row, pursuit };
  });

  // Pursuit order is by PURHC; without one the list falls back to sail number below.
  if (hasPursuit) rows.sort((a, b) => a.pursuit - b.pursuit);

  const showDivision = raceType === 'fleet' && includeDivisions && !!divCol;
  const plus = raceType === 'pursuit' && purhcPlus && shown.includes(PURSUIT_COLUMN);
  const headers: string[] = [
    ...(showDivision ? [DIVISION_HEADER] : []),
    'Boat Name',
    'Sail No',
    ...shown,
    ...(plus ? ['PURHC+ (with kite)'] : []),
  ];

  const data: SheetRow[] = rows.map(({ row, pursuit }) => {
    const copy: SheetRow = { ...row };
    if (!showDivision) delete copy[DIVISION_HEADER];
    if (plus) copy['PURHC+ (with kite)'] = pursuit + 4;
    return copy;
  });

  const bySail = (a: SheetRow, b: SheetRow) =>
    String(a['Sail No']).localeCompare(String(b['Sail No']), undefined, { numeric: true });

  if (raceType === 'pursuit') {
    if (!hasPursuit) data.sort(bySail);
  } else if (sortBy === 'division' && showDivision) {
    // Group by division, then by sail number within each division.
    data.sort((a, b) => {
      const d = String(a[DIVISION_HEADER]).localeCompare(String(b[DIVISION_HEADER]), undefined, {
        numeric: true,
      });
      return d !== 0 ? d : bySail(a, b);
    });
  } else if (sortBy === 'sail') {
    data.sort(bySail);
  }

  return { headers, data, badHandicaps };
}
