export type CsvCell = string | number;

export interface CsvTable {
  headers: readonly string[];
  rows: readonly (readonly CsvCell[])[];
}

const cell = (v: CsvCell): string => {
  const s = String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv({ headers, rows }: CsvTable): string {
  return [headers, ...rows].map((r) => r.map(cell).join(',')).join('\r\n');
}

/** "Top impact by asset" → "top-impact-by-asset.csv" */
export const csvFileName = (title: string): string =>
  (title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'export') + '.csv';

/** Client-side download; the BOM keeps Excel from mangling non-ASCII text. */
export function downloadCsv(table: CsvTable, fileName: string): void {
  const blob = new Blob(['\uFEFF' + toCsv(table)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke later: some browsers start the download asynchronously.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
