"use client";

import { useState } from "react";
import type { CanonEntry } from "@/lib/canon-schema";
import {
  axisValues,
  DIMENSION_KEYS,
  DIMENSION_LABELS,
  inCell,
  UNTAGGED,
  untaggedCount,
  type DimensionKey,
} from "@/lib/canon-dimensions";
import { TABLE_HEAD_ROW, TABLE_ROW, TABLE_WRAP } from "@/lib/table-styles";

const PAGE_SIZE = 10;

/**
 * Four steps, so a reader can tell them apart at a glance. The key beneath
 * the table names each one; a shaded cell with no key is a colour with no
 * meaning.
 */
const SHADES: { label: string; className: string }[] = [
  { label: "0", className: "" },
  { label: "1", className: "bg-accent/15" },
  { label: "2–3", className: "bg-accent/35" },
  { label: "4+", className: "bg-accent/60" },
];

function shade(count: number): string {
  if (count === 0) return SHADES[0].className;
  if (count === 1) return SHADES[1].className;
  if (count <= 3) return SHADES[2].className;
  return SHADES[3].className;
}

/**
 * One axis of the cross-table, as a row of buttons.
 *
 * `other` is the dimension the opposite axis holds. Choosing it swaps the two
 * rather than putting one dimension on both axes, which would cross a
 * dimension with itself.
 */
function AxisPicker({
  legend,
  selected,
  other,
  onSelect,
}: {
  legend: string;
  selected: DimensionKey;
  other: DimensionKey;
  onSelect: (key: DimensionKey) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="w-20 shrink-0 font-mono text-xs uppercase tracking-[0.2em] text-muted">
        {legend}
      </span>
      {DIMENSION_KEYS.map((key) => {
        const isSelected = key === selected;
        const swaps = key === other;
        return (
          <button
            key={key}
            type="button"
            aria-pressed={isSelected}
            title={
              swaps
                ? `Swap: ${DIMENSION_LABELS[key]} moves to ${legend.toLowerCase()}`
                : undefined
            }
            onClick={() => onSelect(key)}
            className={`border px-2.5 py-1 font-mono text-[11px] uppercase tracking-widest transition-colors ${
              isSelected
                ? "border-accent bg-accent/10 font-semibold text-accent"
                : "border-rule text-muted hover:border-accent hover:text-accent"
            }`}
          >
            {DIMENSION_LABELS[key]}
          </button>
        );
      })}
    </div>
  );
}

export function CanonExplorer({ entries }: { entries: CanonEntry[] }) {
  const [dimA, setDimA] = useState<DimensionKey>("focus_area");
  const [dimB, setDimB] = useState<DimensionKey>("threat_model");
  const [activeCell, setActiveCell] = useState<{
    row: string;
    col: string;
  } | null>(null);
  const [page, setPage] = useState(1);

  // Each axis ends in "Not tagged", which is what puts a paper carrying no
  // value on that dimension onto the table. See lib/canon-dimensions.ts.
  const rowValues = axisValues(dimA);
  const colValues = axisValues(dimB);

  function count(rowValue: string, colValue: string): number {
    return entries.filter((entry) => inCell(entry, dimA, rowValue, dimB, colValue))
      .length;
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
    ? entries.filter((entry) =>
        inCell(entry, dimA, activeCell.row, dimB, activeCell.col),
      )
    : entries;

  // What the cells sum to. Larger than `entries.length` whenever a paper
  // carries two values on one of the two axes.
  const cellTotal = rowValues.reduce(
    (sum, row) => sum + colValues.reduce((n, col) => n + count(row, col), 0),
    0,
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div>
      {/*
        Both axes as visible buttons rather than <select>. Six dimensions per
        axis is small enough to show at once, and a dropdown hid what the
        table can be crossed against until it was opened. Picking the
        dimension the other axis already holds swaps the two, which the
        title says on the button that would do it.
      */}
      <div className="flex flex-col gap-3">
        <AxisPicker
          legend="Rows"
          selected={dimA}
          other={dimB}
          onSelect={selectDimA}
        />
        <AxisPicker
          legend="Columns"
          selected={dimB}
          other={dimA}
          onSelect={selectDimB}
        />
      </div>

      {activeCell && (
        <button
          onClick={() => {
            setActiveCell(null);
            setPage(1);
          }}
          className="mt-4 font-mono text-xs text-accent hover:underline"
        >
          Clear selection ×
        </button>
      )}

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
                  className={`border border-rule p-2 text-left align-bottom font-mono text-[10px] font-normal uppercase tracking-wide text-muted ${
                    col === UNTAGGED ? "italic" : ""
                  }`}
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
                  className={`border border-rule p-2 text-left font-mono text-[10px] font-normal uppercase tracking-wide text-muted ${
                    row === UNTAGGED ? "italic" : ""
                  }`}
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
                        aria-label={`${row} × ${col}: ${n} paper${n === 1 ? "" : "s"}`}
                        className={`h-10 w-10 text-sm tabular-nums transition-colors ${
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

      {/*
        The key. The cells carry a colour scale, and a scale with no key is a
        colour a reader has to guess at.
      */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[10px] uppercase tracking-widest text-muted">
        <span>Papers per pair</span>
        {SHADES.map((step) => (
          <span key={step.label} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={`inline-block h-3 w-3 border border-rule ${step.className}`}
            />
            {step.label}
          </span>
        ))}
      </div>

      {/*
        Counted here, not written into the copy, so none of it goes stale as
        the canon gets tagged.
      */}
      <p className="mt-3 max-w-3xl text-xs leading-relaxed text-muted">
        Every paper appears in at least one cell.{" "}
        <span className="italic">Not tagged</span> holds the papers carrying no
        value on that axis: {untaggedCount(entries, dimA)} of {entries.length}{" "}
        on {DIMENSION_LABELS[dimA]}, {untaggedCount(entries, dimB)} of{" "}
        {entries.length} on {DIMENSION_LABELS[dimB]}.
        {cellTotal > entries.length && (
          <>
            {" "}A paper carrying two values on a dimension appears once per
            value, so the {cellTotal} cell entries exceed the {entries.length}{" "}
            papers.
          </>
        )}
      </p>

      <div className="mt-12">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
          {activeCell
            ? `${filtered.length} paper${filtered.length === 1 ? "" : "s"} - ${activeCell.row} × ${activeCell.col}`
            : `All ${filtered.length} papers`}
        </p>
        <div className={`mt-4 ${TABLE_WRAP}`}>
          <table className="w-full min-w-[40rem] border-collapse text-sm">
            <thead>
              <tr className={TABLE_HEAD_ROW}>
                <th className="px-3 py-2 font-normal">Title</th>
                <th className="px-3 py-2 font-normal">Creators</th>
                <th className="px-3 py-2 font-normal">Date</th>
                <th className="px-3 py-2 font-normal">Tags</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((entry) => (
                <tr key={entry.url} className={TABLE_ROW}>
                  <td className="px-3 py-3">
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-serif text-base font-semibold transition-colors hover:text-accent"
                    >
                      {entry.title}
                    </a>
                  </td>
                  <td className="px-3 py-3 text-foreground/70">
                    {entry.creators}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-foreground/70">
                    {entry.date}
                  </td>
                  <td className="px-3 py-3 text-foreground/70">{entry.tags}</td>
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
