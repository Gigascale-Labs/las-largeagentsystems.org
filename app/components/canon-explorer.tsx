"use client";

import { useState } from "react";
import {
  CLAIM_TYPES,
  FOCUS_AREAS,
  OBSERVABILITY_LEVELS,
  PARTICIPANT_MIXES,
  SYSTEM_TYPES,
  THREAT_MODELS,
  type CanonEntry,
} from "@/lib/canon-schema";

type DimensionKey =
  | "system_type"
  | "participant_mix"
  | "observability"
  | "focus_area"
  | "threat_model"
  | "claim_type";

const DIMENSION_LABELS: Record<DimensionKey, string> = {
  system_type: "System Type",
  participant_mix: "Participant Mix",
  observability: "Observability",
  focus_area: "Focus Area",
  threat_model: "Threat Model",
  claim_type: "Claim Type",
};

const DIMENSION_KEYS = Object.keys(DIMENSION_LABELS) as DimensionKey[];

const PAGE_SIZE = 10;

const CLOSED_SET_VALUES: Partial<Record<DimensionKey, readonly string[]>> = {
  system_type: SYSTEM_TYPES,
  participant_mix: PARTICIPANT_MIXES,
  observability: OBSERVABILITY_LEVELS,
  focus_area: FOCUS_AREAS,
  threat_model: THREAT_MODELS,
  claim_type: CLAIM_TYPES,
};

function valuesFor(entry: CanonEntry, key: DimensionKey): string[] {
  return entry[key] ?? [];
}

function shade(count: number): string {
  if (count === 0) return "";
  if (count === 1) return "bg-accent/15";
  if (count <= 3) return "bg-accent/35";
  return "bg-accent/60";
}

export function CanonExplorer({ entries }: { entries: CanonEntry[] }) {
  const [dimA, setDimA] = useState<DimensionKey>("focus_area");
  const [dimB, setDimB] = useState<DimensionKey>("threat_model");
  const [activeCell, setActiveCell] = useState<{
    row: string;
    col: string;
  } | null>(null);
  const [page, setPage] = useState(1);

  const valueUniverse = CLOSED_SET_VALUES as Record<
    DimensionKey,
    readonly string[]
  >;

  const rowValues = valueUniverse[dimA];
  const colValues = valueUniverse[dimB];

  function count(rowValue: string, colValue: string): number {
    return entries.filter(
      (entry) =>
        valuesFor(entry, dimA).includes(rowValue) &&
        valuesFor(entry, dimB).includes(colValue),
    ).length;
  }

  function selectDimA(next: DimensionKey) {
    setActiveCell(null);
    setPage(1);
    if (next === dimB) setDimB(dimA);
    setDimA(next);
  }

  function selectDimB(next: DimensionKey) {
    setActiveCell(null);
    setPage(1);
    if (next === dimA) setDimA(dimB);
    setDimB(next);
  }

  function toggleCell(row: string, col: string) {
    const isActive = activeCell?.row === row && activeCell?.col === col;
    setActiveCell(isActive ? null : { row, col });
    setPage(1);
  }

  const filtered = activeCell
    ? entries.filter(
        (entry) =>
          valuesFor(entry, dimA).includes(activeCell.row) &&
          valuesFor(entry, dimB).includes(activeCell.col),
      )
    : entries;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 font-mono text-xs uppercase tracking-[0.2em] text-muted">
        <label className="flex items-center gap-2">
          Rows
          <select
            value={dimA}
            onChange={(e) => selectDimA(e.target.value as DimensionKey)}
            className="border border-rule bg-background px-2 py-1 text-xs normal-case tracking-normal text-foreground"
          >
            {DIMENSION_KEYS.map((key) => (
              <option key={key} value={key}>
                {DIMENSION_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2">
          Columns
          <select
            value={dimB}
            onChange={(e) => selectDimB(e.target.value as DimensionKey)}
            className="border border-rule bg-background px-2 py-1 text-xs normal-case tracking-normal text-foreground"
          >
            {DIMENSION_KEYS.map((key) => (
              <option key={key} value={key}>
                {DIMENSION_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
        {activeCell && (
          <button
            onClick={() => {
              setActiveCell(null);
              setPage(1);
            }}
            className="normal-case tracking-normal text-accent hover:underline"
          >
            Clear selection ×
          </button>
        )}
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-rule p-2 text-left align-bottom font-mono text-[10px] font-normal uppercase tracking-widest text-muted">
                {DIMENSION_LABELS[dimA]} &#92; {DIMENSION_LABELS[dimB]}
              </th>
              {colValues.map((col) => (
                <th
                  key={col}
                  scope="col"
                  className="border border-rule p-2 text-left align-bottom font-mono text-[10px] font-normal uppercase tracking-wide text-muted"
                >
                  <span className="block max-w-28">{col}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowValues.map((row) => (
              <tr key={row}>
                <th
                  scope="row"
                  className="border border-rule p-2 text-left font-mono text-[10px] font-normal uppercase tracking-wide text-muted"
                >
                  <span className="block max-w-40">{row}</span>
                </th>
                {colValues.map((col) => {
                  const n = count(row, col);
                  const isActive =
                    activeCell?.row === row && activeCell?.col === col;
                  return (
                    <td
                      key={col}
                      className={`border border-rule p-0 text-center ${shade(n)}`}
                    >
                      <button
                        onClick={() => toggleCell(row, col)}
                        disabled={n === 0}
                        className={`h-10 w-10 text-sm transition-colors ${
                          isActive
                            ? "font-semibold ring-2 ring-inset ring-accent"
                            : ""
                        } ${
                          n === 0
                            ? "cursor-default text-muted/40"
                            : "cursor-pointer hover:ring-1 hover:ring-inset hover:ring-accent"
                        }`}
                      >
                        {n || "–"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-12">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
          {activeCell
            ? `${filtered.length} paper${filtered.length === 1 ? "" : "s"} - ${activeCell.row} × ${activeCell.col}`
            : `All ${filtered.length} papers`}
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-rule text-left font-mono text-[10px] font-normal uppercase tracking-widest text-muted">
                <th className="py-2 pr-4 font-normal">Title</th>
                <th className="py-2 pr-4 font-normal">Creators</th>
                <th className="py-2 pr-4 font-normal">Date</th>
                <th className="py-2 font-normal">Tags</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((entry) => (
                <tr key={entry.url} className="border-b border-rule align-top">
                  <td className="py-3 pr-4">
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-serif text-base font-semibold transition-colors hover:text-accent"
                    >
                      {entry.title}
                    </a>
                  </td>
                  <td className="py-3 pr-4 text-foreground/70">
                    {entry.creators}
                  </td>
                  <td className="py-3 pr-4 whitespace-nowrap text-foreground/70">
                    {entry.date}
                  </td>
                  <td className="py-3 text-foreground/70">{entry.tags}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="mt-4 flex items-center gap-4 font-mono text-xs uppercase tracking-[0.2em] text-muted">
            <button
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="text-accent hover:underline disabled:cursor-default disabled:text-muted/40 disabled:no-underline"
            >
              ← Prev
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="text-accent hover:underline disabled:cursor-default disabled:text-muted/40 disabled:no-underline"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
