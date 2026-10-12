import type { ReactNode } from 'react';
import { csvFileName, downloadCsv } from '@/lib/csv';
import type { CsvTable } from '@/lib/csv';

/** The prototype's `box()`: a titled card, with the CSV button whenever it holds a table. */
export function Card({ title, csv, children }: { title: string; csv?: CsvTable; children: ReactNode }) {
  return (
    <div className="card">
      <div className="chd">
        <h2>{title}</h2>
        {csv && <ExportCsvButton onClick={() => downloadCsv(csv, csvFileName(title))} />}
      </div>
      {children}
    </div>
  );
}

function ExportCsvButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="exp" title="Export CSV" onClick={onClick}>
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 3v12" />
        <path d="M7 10l5 5 5-5" />
        <path d="M5 21h14" />
      </svg>
      CSV
    </button>
  );
}
