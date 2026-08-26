"use client";

import { useMemo, useState } from "react";
import type { Event, EventType } from "@/lib/events-schema";

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  workshop: "Workshop",
  conference: "Conference",
  cfp: "CFP",
};

const PAGE_SIZE = 15;

export function EventsList({ events }: { events: Event[] }) {
  const [typeFilter, setTypeFilter] = useState<EventType | "all">("all");
  const [showUnverified, setShowUnverified] = useState(false);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    return events.filter((event) => {
      if (typeFilter !== "all" && event.event_type !== typeFilter) return false;
      if (!showUnverified && event.verification_status !== "verified") return false;
      return true;
    });
  }, [events, typeFilter, showUnverified]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
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
          Show unconfirmed (page blocked automated access, so existence was
          not checked)
        </label>
      </div>

      <p className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-muted">
        {filtered.length} event{filtered.length === 1 ? "" : "s"}
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[48rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-rule text-left font-mono text-[10px] font-normal uppercase tracking-widest text-muted">
              <th className="py-2 pr-4 font-normal">Name</th>
              <th className="py-2 pr-4 font-normal">Type</th>
              <th className="py-2 pr-4 font-normal">Dates</th>
              <th className="py-2 pr-4 font-normal">Location</th>
              <th className="py-2 font-normal">Organizer</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((event) => (
              <tr key={event.id} className="border-b border-rule align-top">
                <td className="py-3 pr-4">
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
                    <p className="mt-1 max-w-md text-foreground/70">
                      {event.description}
                    </p>
                  )}
                </td>
                <td className="py-3 pr-4 whitespace-nowrap text-foreground/70">
                  {EVENT_TYPE_LABELS[event.event_type] ?? event.event_type}
                </td>
                <td className="py-3 pr-4 whitespace-nowrap text-foreground/70">
                  {event.dates || "—"}
                </td>
                <td className="py-3 pr-4 text-foreground/70">
                  {event.location || "—"}
                </td>
                <td className="py-3 text-foreground/70">{event.organizer}</td>
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
  );
}
