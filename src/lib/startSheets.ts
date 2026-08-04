export type RaceType = 'pursuit' | 'fleet';
export type SheetRow = Record<string, string | number>;

export const REQUIRED_COLUMNS = ['BOATNAME', 'SAILNUM', 'PURHC'] as const;

/** Column names TopYacht exports have used for the division field. */
const DIVISION_ALIASES = ['DIVISION', 'DIV NO', 'DIVNO', 'DIV'];

export const DIVISION_HEADER = 'Division';

export interface ProcessOptions {
  raceType: RaceType;
  purhcPlus: boolean;
  includeDivisions: boolean;
  sortBy: 'division' | 'sail';
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
  { raceType, purhcPlus, includeDivisions, sortBy }: ProcessOptions,
): ProcessedSheet {
  const divCol = rawRows.length ? findDivisionColumn(rawRows[0]) : null;
  const badHandicaps: string[] = [];

  const rows = rawRows.map((r) => {
    const raw = String(r['PURHC'] ?? '').trim();
    const num = Number(raw);
    const ok = raw !== '' && Number.isFinite(num);
    const name = String(r['BOATNAME'] ?? '').trim();
    if (!ok) badHandicaps.push(name || String(r['SAILNUM'] ?? '?'));
    return {
      'Boat Name': name,
      'Sail No': String(r['SAILNUM'] ?? '').trim(),
      PURHC: ok ? num : 0,
      ...(divCol ? { [DIVISION_HEADER]: String(r[divCol] ?? '').trim() } : {}),
    };
  });

  // Pursuit order is by handicap; fleet sheets start from the same baseline.
  rows.sort((a, b) => a.PURHC - b.PURHC);

  const showDivision = raceType === 'fleet' && includeDivisions && !!divCol;
  let headers: string[] = showDivision
    ? [DIVISION_HEADER, 'Boat Name', 'Sail No', 'PURHC']
    : ['Boat Name', 'Sail No', 'PURHC'];

  const data: SheetRow[] = rows.map((r) => {
    const copy: SheetRow = { ...r };
    if (!showDivision) delete copy[DIVISION_HEADER];
    return copy;
  });

  const bySail = (a: SheetRow, b: SheetRow) =>
    String(a['Sail No']).localeCompare(String(b['Sail No']), undefined, { numeric: true });

  if (raceType === 'pursuit') {
    if (purhcPlus) {
      for (const r of data) r['PURHC+ (with kite)'] = Number(r.PURHC) + 4;
      headers = [...headers, 'PURHC+ (with kite)'];
    }
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
