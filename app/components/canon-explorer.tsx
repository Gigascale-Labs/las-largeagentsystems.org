"use client";

import { useMemo, useState } from "react";
import type { CanonEntry } from "@/lib/canon-schema";
import {
  axisValues,
  DIMENSION_KEYS,
  DIMENSION_LABELS,
  inCell,
  UNTAGGED,
  valueLabel,
  type DimensionKey,
} from "@/lib/canon-dimensions";
import { TABLE_HEAD_ROW, TABLE_ROW, TABLE_WRAP } from "@/lib/table-styles";
import { bandLabel, scaleBands, shadeFor } from "@/lib/table-scale";

const PAGE_SIZE = 10;

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

  // One pass over the grid per axis change, rather than one per cell per
  // render: the shading needs the largest cell before any cell can be drawn,
  // so the counts have to exist as a whole anyway.
  const { counts, max } = useMemo(() => {
    const grid = axisValues(dimA).map((row) =>
      axisValues(dimB).map(
        (col) =>
          entries.filter((entry) => inCell(entry, dimA, row, dimB, col)).length,
      ),
    );
    return { counts: grid, max: Math.max(0, ...grid.flat()) };
  }, [entries, dimA, dimB]);

  const bands = scaleBands(max);

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
                  // The stored value is the whole definition, which is too long
                  // for a header. The short form is shown; the full one is the
                  // tooltip, so nothing is lost.
                  title={col}
                  className={`border border-rule p-2 text-left align-bottom font-mono text-[10px] font-normal uppercase tracking-wide text-muted ${
                    col === UNTAGGED ? "italic" : ""
                  }`}
                >
                  <span className="block max-w-28">{valueLabel(col)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowValues.map((row, rowIndex) => (
              <tr key={row}>
                <th
                  scope="row"
                  title={row}
                  className={`border border-rule p-2 text-left font-mono text-[10px] font-normal uppercase tracking-wide text-muted ${
                    row === UNTAGGED ? "italic" : ""
                  }`}
                >
                  <span className="block max-w-40">{valueLabel(row)}</span>
                </th>
                {colValues.map((col, colIndex) => {
                  const n = counts[rowIndex][colIndex];
                  const isActive =
                    activeCell?.row === row && activeCell?.col === col;
                  return (
                    <td
                      key={col}
                      className={`border border-rule p-0 text-center ${shadeFor(n, bands)}`}
                    >
                      <button
                        onClick={() => toggleCell(row, col)}
                        disabled={n === 0}
                        aria-label={`${valueLabel(row)} × ${valueLabel(col)}: ${n} paper${n === 1 ? "" : "s"}`}
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
        colour a reader has to guess at. It names the maximum it is scaled to,
        because that maximum changes with the axes and so do the step ranges.
      */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[10px] uppercase tracking-widest text-muted">
        <span>
          Papers per pair, scaled to this view (max {max})
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-3 w-3 border border-rule"
          />
          0
        </span>
        {bands.map((band) => (
          <span key={band.className} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className={`inline-block h-3 w-3 border border-rule ${band.className}`}
            />
            {bandLabel(band)}
          </span>
        ))}
      </div>


      <div className="mt-12">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
          {activeCell
            ? `${filtered.length} paper${filtered.length === 1 ? "" : "s"} - ${valueLabel(activeCell.row)} × ${valueLabel(activeCell.col)}`
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
