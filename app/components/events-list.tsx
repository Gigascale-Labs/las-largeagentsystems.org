"use client";

import { useCallback, useMemo, useState, useSyncExternalStore } from "react";
import type { Event, EventType } from "@/lib/events-schema";
import { TABLE_HEAD_ROW, TABLE_ROW, TABLE_WRAP } from "@/lib/table-styles";
import {
  localDayAsUtc,
  orderEventsByDate,
  startOfUtcDay,
  type EventGroup,
  type OrderedEvent,
  type ParsedEventDate,
} from "@/lib/event-dates";

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  workshop: "Workshop",
  conference: "Conference",
  cfp: "CFP",
};

const EVENT_GROUP_LABELS: Record<EventGroup, string> = {
  upcoming: "Upcoming & current",
  past: "Past",
  undated: "Date not stated",
};

const PAGE_SIZE = 15;

/**
 * Names a sort date that is not an exact event date, so a reader is not
 * misled. Two cases: the date is a deadline, because the source stated no
 * event date; and only a month was stated, so the day is this parser's, not
 * the organiser's. Both can apply to one event. Neither replaces the raw
 * string — they say how the row was placed, nothing more.
 */
function dateQualifiers(parsed: ParsedEventDate): string[] {
  if (parsed.kind !== "dated") return [];
  const notes: string[] = [];
  if (parsed.source === "deadline") notes.push("Sorted by deadline");
  if (parsed.precision === "month") notes.push("Day not stated");
  return notes;
}

/**
 * A run of neighbouring rows in the same group. Pagination cuts the ordered
 * list at a fixed size, so a page can start in the middle of a group or hold
 * parts of three. One run per contiguous stretch gives every stretch its own
 * heading, including the one a page opens on.
 */
interface GroupRun {
  group: EventGroup;
  entries: OrderedEvent<Event>[];
}

function toRuns(entries: OrderedEvent<Event>[]): GroupRun[] {
  const runs: GroupRun[] = [];
  for (const entry of entries) {
    const last = runs[runs.length - 1];
    if (last && last.group === entry.group) last.entries.push(entry);
    else runs.push({ group: entry.group, entries: [entry] });
  }
  return runs;
}

/**
 * The clock is the external store. Nothing pushes updates to it, so there is
 * nothing to unsubscribe from: the day is read once, after hydration.
 */
const NO_UPDATES = () => () => {};

/**
 * The reader's own day, in milliseconds. A number, not a Date, because
 * `useSyncExternalStore` compares snapshots by identity and would loop on a
 * fresh object; the same day always reads as the same number.
 */
function readClientDay(): number {
  return localDayAsUtc(new Date()).getTime();
}

/**
 * `buildDate` is the day of the static prerender, as YYYY-MM-DD. It is the
 * first render on the server and the first render in the browser, which is
 * what keeps hydration in step — the two sides must agree before React can
 * attach. React then reads the clock and re-renders, so a page built on
 * Monday still splits upcoming from past correctly on Friday.
 *
 * `useSyncExternalStore` and not `useEffect` + `setState`: this Next version
 * ships the React Compiler's `react-hooks/set-state-in-effect` rule as an
 * error, and it rejects setting state synchronously in an effect. This hook
 * is React's own answer for a value the server and the client disagree
 * about — it renders the server snapshot during hydration and swaps in the
 * client one straight after.
 */
export function EventsList({
  events,
  buildDate,
}: {
  events: Event[];
  buildDate: string;
}) {
  const [typeFilter, setTypeFilter] = useState<EventType | "all">("all");
  const [showUnverified, setShowUnverified] = useState(false);
  const [page, setPage] = useState(1);

  const readBuildDay = useCallback(
    () => startOfUtcDay(buildDate).getTime(),
    [buildDate],
  );
  const todayMs = useSyncExternalStore(
    NO_UPDATES,
    readClientDay,
    readBuildDay,
  );
  const today = useMemo(() => new Date(todayMs), [todayMs]);

  const filtered = useMemo(() => {
    return events.filter((event) => {
      if (typeFilter !== "all" && event.event_type !== typeFilter) return false;
      if (!showUnverified && event.verification_status !== "verified") return false;
      return true;
    });
  }, [events, typeFilter, showUnverified]);

  const ordered = useMemo(
    () => orderEventsByDate(filtered, (event) => event.dates, today),
    [filtered, today],
  );

  const groupCounts = useMemo(() => {
    const counts: Record<EventGroup, number> = {
      upcoming: 0,
      past: 0,
      undated: 0,
    };
    for (const entry of ordered) counts[entry.group] += 1;
    return counts;
  }, [ordered]);

  const totalPages = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  // Paginate the ordered list, not each group, so page size stays fixed and
  // the reading order never changes with the page break.
  const runs = toRuns(
    ordered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
  );

  function resetToFirstPage<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setPage(1);
    };
  }

  if (events.length === 0) {
    return (
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">
        No events yet — check back after the next weekly scan.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 font-mono text-xs uppercase tracking-[0.2em] text-muted">
        <label className="flex items-center gap-2">
          Type
          <select
            value={typeFilter}
            onChange={(e) =>
              resetToFirstPage(setTypeFilter)(e.target.value as EventType | "all")
            }
            className="border border-rule bg-background px-2 py-1 text-xs normal-case tracking-normal text-foreground"
          >
            <option value="all">All</option>
            <option value="workshop">Workshop</option>
            <option value="conference">Conference</option>
            <option value="cfp">CFP</option>
          </select>
        </label>
        <label className="flex items-center gap-2 normal-case tracking-normal">
          <input
            type="checkbox"
            checked={showUnverified}
            onChange={(e) => resetToFirstPage(setShowUnverified)(e.target.checked)}
          />
          Show unconfirmed (page blocked automated access)
        </label>
      </div>

      <p className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-muted">
        {ordered.length} event{ordered.length === 1 ? "" : "s"}
      </p>

      <div className={`mt-4 ${TABLE_WRAP}`}>
        {/*
          table-fixed with an explicit colgroup, because the automatic layout
          gave the wrong answer: `whitespace-nowrap` on Dates made that column
          claim whatever width its longest string needed, and Name — which
          carries the title and the description — got whatever was left. Fixed
          layout takes the widths below and ignores content, so a long date or
          a long single-word location can no longer squeeze the title column.
          Location and Organizer wrap on any character (`break-words`) so an
          unbroken string cannot spill outside its cell.
        */}
        <table className="w-full min-w-[48rem] table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-[42%]" />
            <col className="w-[9%]" />
            <col className="w-[15%]" />
            <col className="w-[17%]" />
            <col className="w-[17%]" />
          </colgroup>
          <thead>
            <tr className={TABLE_HEAD_ROW}>
              <th className="px-3 py-2 font-normal">Name</th>
              <th className="px-3 py-2 font-normal">Type</th>
              <th className="px-3 py-2 font-normal">Dates</th>
              <th className="px-3 py-2 font-normal">Location</th>
              <th className="px-3 py-2 font-normal">Organizer</th>
            </tr>
          </thead>
          {runs.map((run) => (
            // One tbody per run, so the heading is the group's own row header
            // rather than a row a screen reader reads as an event.
            <tbody key={`${run.group}-${run.entries[0].item.id}`}>
              <tr>
                <th
                  scope="rowgroup"
                  colSpan={5}
                  className="border-b border-rule px-3 pb-2 pt-8 text-left font-mono text-xs font-normal uppercase tracking-[0.2em] text-muted"
                >
                  {EVENT_GROUP_LABELS[run.group]} — {groupCounts[run.group]}
                </th>
              </tr>
              {run.entries.map(({ item: event, parsed }) => {
                const qualifiers = dateQualifiers(parsed);
                return (
                  <tr key={event.id} className={TABLE_ROW}>
                    <td className="px-3 py-3">
                      <a
                        href={event.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-serif text-base font-semibold transition-colors hover:text-accent"
                      >
                        {event.name}
                      </a>
                      {event.verification_status === "blocked" && (
                        <span className="ml-2 inline-block border border-accent px-1.5 py-0.5 align-middle font-mono text-[9px] uppercase tracking-widest text-accent">
                          Unverified
                        </span>
                      )}
                      {event.description && (
                        <p className="mt-1 text-foreground/70">
                          {event.description}
                        </p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-foreground/70">
                      {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
                    </td>
                    <td className="px-3 py-3 text-foreground/70">
                      {/* The source's own words stay. The qualifiers below
                          describe how this row was sorted; they do not
                          replace what the organiser stated. */}
                      {event.dates || "—"}
                      {qualifiers.map((note) => (
                        <span
                          key={note}
                          className="mt-1 block font-mono text-[9px] uppercase tracking-widest text-muted"
                        >
                          {note}
                        </span>
                      ))}
                    </td>
                    <td className="px-3 py-3 break-words text-foreground/70">
                      {event.location || "—"}
                    </td>
                    <td className="px-3 py-3 break-words text-foreground/70">
                      {event.organizer}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          ))}
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
  );
}
