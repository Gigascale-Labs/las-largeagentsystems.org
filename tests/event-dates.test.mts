/**
 * Tests for reading the free-text `dates` field of a synced event.
 *
 * Run with `npm test`. Pure: no network, no files, no clock — every grouping
 * case injects its own "today".
 *
 * The `FIXTURES` table below is every distinct `dates` value in
 * `data/las-conferences-events.json` as of 2026-08-26: 32 values, of which 5
 * are empty. If the weekly sync brings in a shape this parser cannot read,
 * add the string here with what it should produce.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  localDayAsUtc,
  orderEventsByDate,
  parseEventDates,
  startOfUtcDay,
  type EventDatePrecision,
  type EventDateSource,
} from "../lib/event-dates.ts";

/** "2026-10-09" for a parsed Date, so a failure reads as a date. */
function day(value: Date): string {
  return value.toISOString().slice(0, 10);
}

interface Fixture {
  dates: string;
  start: string;
  end: string;
  source: EventDateSource;
  precision: EventDatePrecision;
}

/** The 27 values on file that carry a date. */
const FIXTURES: Fixture[] = [
  // Day first, with and without a range.
  {
    dates: "09-10 October 2026",
    start: "2026-10-09",
    end: "2026-10-10",
    source: "event",
    precision: "day",
  },
  {
    dates: "3.-4. June 2026",
    start: "2026-06-03",
    end: "2026-06-04",
    source: "event",
    precision: "day",
  },
  {
    dates: "Thursday, 15 October 2026",
    start: "2026-10-15",
    end: "2026-10-15",
    source: "event",
    precision: "day",
  },
  {
    dates: "Wednesday, 2 and Thursday, 3 December 2026",
    start: "2026-12-02",
    end: "2026-12-03",
    source: "event",
    precision: "day",
  },

  // Month first.
  {
    dates: "December 11 or 12, 2026",
    start: "2026-12-11",
    end: "2026-12-12",
    source: "event",
    precision: "day",
  },
  {
    dates: "December 11-12, 2026",
    start: "2026-12-11",
    end: "2026-12-12",
    source: "event",
    precision: "day",
  },
  {
    dates: "December 12, 2026",
    start: "2026-12-12",
    end: "2026-12-12",
    source: "event",
    precision: "day",
  },
  {
    dates: "June 1, 2026",
    start: "2026-06-01",
    end: "2026-06-01",
    source: "event",
    precision: "day",
  },
  {
    dates: "June 1-5, 2026",
    start: "2026-06-01",
    end: "2026-06-05",
    source: "event",
    precision: "day",
  },
  {
    dates: "June 23–24, 2026",
    start: "2026-06-23",
    end: "2026-06-24",
    source: "event",
    precision: "day",
  },
  {
    dates: "March 11-13, 2026",
    start: "2026-03-11",
    end: "2026-03-13",
    source: "event",
    precision: "day",
  },
  {
    dates: "March 2-6, 2026",
    start: "2026-03-02",
    end: "2026-03-06",
    source: "event",
    precision: "day",
  },
  {
    dates: "May 23-24th, 2026",
    start: "2026-05-23",
    end: "2026-05-24",
    source: "event",
    precision: "day",
  },
  {
    dates: "May 4-8, 2026",
    start: "2026-05-04",
    end: "2026-05-08",
    source: "event",
    precision: "day",
  },
  {
    dates: "November 4–6, 2026",
    start: "2026-11-04",
    end: "2026-11-06",
    source: "event",
    precision: "day",
  },
  {
    dates: "November 5–7, 2026",
    start: "2026-11-05",
    end: "2026-11-07",
    source: "event",
    precision: "day",
  },
  {
    dates: "October 12-16, 2026 (main conference)",
    start: "2026-10-12",
    end: "2026-10-16",
    source: "event",
    precision: "day",
  },
  {
    dates: "October 14-15, 2026",
    start: "2026-10-14",
    end: "2026-10-15",
    source: "event",
    precision: "day",
  },

  // Labelled segments.
  {
    dates:
      "Deadline for Submission: 30 May 2026; Workshop (half-day, tentative): 11 August 2026",
    start: "2026-08-11",
    end: "2026-08-11",
    source: "event",
    precision: "day",
  },
  {
    dates:
      "Paper Submission Deadline: 15 October 2026; Notification of Acceptance: 28 February 2027; Camera-Ready Submission: 25 March 2027",
    start: "2026-10-15",
    end: "2026-10-15",
    source: "deadline",
    precision: "day",
  },
  {
    dates:
      "Paper submission: February 23, 2026 (extended); Workshop: May 25, 2026",
    start: "2026-05-25",
    end: "2026-05-25",
    source: "event",
    precision: "day",
  },
  {
    dates: "Submission Deadline: 3 February 2026; Workshop Time: 26 April 2026",
    start: "2026-04-26",
    end: "2026-04-26",
    source: "event",
    precision: "day",
  },
  {
    dates:
      "Submission Deadline: August 29, 2026 (AoE); Workshop: December 12 or 13, 2026",
    start: "2026-12-12",
    end: "2026-12-13",
    source: "event",
    precision: "day",
  },
  {
    dates:
      "Submission Deadline: Feb 4, 2026 (extended to Feb 11, 2026); AAMAS Conference: May 25–29, 2026; GAIW Workshop: May 26, 2026",
    start: "2026-05-25",
    end: "2026-05-29",
    source: "event",
    precision: "day",
  },
  {
    dates:
      "Submission deadline September 5, 2026; Workshop December 2026 (exact date TBD)",
    start: "2026-12-01",
    end: "2026-12-31",
    source: "event",
    precision: "month",
  },
  {
    dates:
      "Submission deadline: October 10, 2026; Workshop Date: December 14, 2026",
    start: "2026-12-14",
    end: "2026-12-14",
    source: "event",
    precision: "day",
  },
  {
    dates: "Workshop: May 25th, 2026",
    start: "2026-05-25",
    end: "2026-05-25",
    source: "event",
    precision: "day",
  },
];

describe("parseEventDates: every dates value on file", () => {
  for (const fixture of FIXTURES) {
    it(fixture.dates, () => {
      const parsed = parseEventDates(fixture.dates);
      assert.equal(parsed.kind, "dated");
      if (parsed.kind !== "dated") return;
      assert.equal(day(parsed.start), fixture.start);
      assert.equal(day(parsed.end), fixture.end);
      assert.equal(parsed.source, fixture.source);
      assert.equal(parsed.precision, fixture.precision);
    });
  }

  it("covers 27 values, matching the 27 dated events on file", () => {
    assert.equal(FIXTURES.length, 27);
  });

  it("reads the 5 empty values as unknown, not as a date", () => {
    // The other five of the 32 are all the empty string.
    for (let i = 0; i < 5; i += 1) {
      assert.deepEqual(parseEventDates(""), { kind: "unknown" });
    }
  });
});

describe("parseEventDates: what it must not do", () => {
  it("returns unknown for the empty string", () => {
    assert.deepEqual(parseEventDates(""), { kind: "unknown" });
  });

  it("returns unknown for whitespace only", () => {
    assert.deepEqual(parseEventDates("   "), { kind: "unknown" });
  });

  it("returns unknown for a string with no date in it", () => {
    assert.deepEqual(parseEventDates("Dates to be announced"), {
      kind: "unknown",
    });
  });

  it("returns unknown for nonsense rather than a wrong date", () => {
    for (const nonsense of [
      "qwertyuiop",
      "Room 42, Building 7",
      "Spring semester",
      "13/14 Octobre",
      "the 2026 edition",
    ]) {
      assert.deepEqual(
        parseEventDates(nonsense),
        { kind: "unknown" },
        `expected unknown for ${JSON.stringify(nonsense)}`,
      );
    }
  });

  it("refuses a day that does not exist in its month", () => {
    assert.deepEqual(parseEventDates("February 31, 2026"), { kind: "unknown" });
  });

  it("refuses a year outside the calendar it is meant to read", () => {
    assert.deepEqual(parseEventDates("June 1, 0007"), { kind: "unknown" });
  });
});

describe("parseEventDates: the rules that decide which date wins", () => {
  it("takes the event date over an earlier deadline", () => {
    const parsed = parseEventDates(
      "Submission Deadline: 3 February 2026; Workshop Time: 26 April 2026",
    );
    assert.equal(parsed.kind, "dated");
    if (parsed.kind !== "dated") return;
    assert.equal(day(parsed.start), "2026-04-26");
    assert.equal(parsed.source, "event");
  });

  it("falls back to the earliest deadline when no segment is an event", () => {
    const parsed = parseEventDates(
      "Paper Submission Deadline: 15 October 2026; Notification of Acceptance: 28 February 2027; Camera-Ready Submission: 25 March 2027",
    );
    assert.equal(parsed.kind, "dated");
    if (parsed.kind !== "dated") return;
    assert.equal(day(parsed.start), "2026-10-15");
    assert.equal(parsed.source, "deadline");
  });

  it("takes the earliest of two event segments and that segment's end", () => {
    const parsed = parseEventDates(
      "Submission Deadline: Feb 4, 2026 (extended to Feb 11, 2026); AAMAS Conference: May 25–29, 2026; GAIW Workshop: May 26, 2026",
    );
    assert.equal(parsed.kind, "dated");
    if (parsed.kind !== "dated") return;
    assert.equal(day(parsed.start), "2026-05-25");
    assert.equal(day(parsed.end), "2026-05-29");
  });

  it("reads a label that has no colon after it", () => {
    const parsed = parseEventDates("Submission deadline September 5, 2026");
    assert.equal(parsed.kind, "dated");
    if (parsed.kind !== "dated") return;
    assert.equal(parsed.source, "deadline");
    assert.equal(day(parsed.start), "2026-09-05");
  });

  it("drops a trailing parenthetical and keeps the whole range", () => {
    const parsed = parseEventDates("October 12-16, 2026 (main conference)");
    assert.equal(parsed.kind, "dated");
    if (parsed.kind !== "dated") return;
    assert.equal(day(parsed.start), "2026-10-12");
    assert.equal(day(parsed.end), "2026-10-16");
  });

  it("ignores a superseded date inside a parenthetical", () => {
    const parsed = parseEventDates(
      "Submission Deadline: Feb 4, 2026 (extended to Feb 11, 2026)",
    );
    assert.equal(parsed.kind, "dated");
    if (parsed.kind !== "dated") return;
    assert.equal(day(parsed.start), "2026-02-04");
    assert.equal(day(parsed.end), "2026-02-04");
  });

  it("reads a date that only a parenthetical states", () => {
    const parsed = parseEventDates("Workshop (June 1-5, 2026)");
    assert.equal(parsed.kind, "dated");
    if (parsed.kind !== "dated") return;
    assert.equal(day(parsed.start), "2026-06-01");
    assert.equal(day(parsed.end), "2026-06-05");
  });

  it("flags month precision and runs it to the end of the month", () => {
    const parsed = parseEventDates("Workshop December 2026");
    assert.equal(parsed.kind, "dated");
    if (parsed.kind !== "dated") return;
    assert.equal(parsed.precision, "month");
    assert.equal(day(parsed.start), "2026-12-01");
    assert.equal(day(parsed.end), "2026-12-31");
  });

  it("does not read the tail of a day-first date as a month-only date", () => {
    const parsed = parseEventDates("30 May 2026");
    assert.equal(parsed.kind, "dated");
    if (parsed.kind !== "dated") return;
    assert.equal(parsed.precision, "day");
    assert.equal(day(parsed.start), "2026-05-30");
  });

  it("starts on the first day of 'D or D' and 'D and D', ends on the second", () => {
    // The start is the first day either way. The end is the later day,
    // because it decides only whether the event has finished: "2 and 3
    // December" runs on both days, and "11 or 12 December" may turn out to
    // be the 12th. Ending on the first would file either as past while it
    // was still to come.
    for (const [text, start, end] of [
      ["December 11 or 12, 2026", "2026-12-11", "2026-12-12"],
      ["Wednesday, 2 and Thursday, 3 December 2026", "2026-12-02", "2026-12-03"],
    ] as const) {
      const parsed = parseEventDates(text);
      assert.equal(parsed.kind, "dated");
      if (parsed.kind !== "dated") return;
      assert.equal(day(parsed.start), start);
      assert.equal(day(parsed.end), end);
    }
  });

  it("reads month abbreviations and ordinal suffixes", () => {
    for (const [text, expected] of [
      ["Feb 4, 2026", "2026-02-04"],
      ["Sept 5, 2026", "2026-09-05"],
      ["Sep 5, 2026", "2026-09-05"],
      ["May 25th, 2026", "2026-05-25"],
      ["1st June 2026", "2026-06-01"],
    ] as const) {
      const parsed = parseEventDates(text);
      assert.equal(parsed.kind, "dated", `failed on ${text}`);
      if (parsed.kind !== "dated") return;
      assert.equal(day(parsed.start), expected);
    }
  });

  it("reads an en dash and an em dash the same as a hyphen", () => {
    for (const text of [
      "June 23-24, 2026",
      "June 23–24, 2026",
      "June 23—24, 2026",
    ]) {
      const parsed = parseEventDates(text);
      assert.equal(parsed.kind, "dated");
      if (parsed.kind !== "dated") return;
      assert.equal(day(parsed.start), "2026-06-23");
      assert.equal(day(parsed.end), "2026-06-24");
    }
  });
});

describe("startOfUtcDay and localDayAsUtc", () => {
  it("reads a YYYY-MM-DD string as UTC midnight", () => {
    assert.equal(startOfUtcDay("2026-08-26").toISOString(), "2026-08-26T00:00:00.000Z");
  });

  it("drops the time from a Date", () => {
    const noon = new Date("2026-08-26T12:34:56.789Z");
    assert.equal(startOfUtcDay(noon).toISOString(), "2026-08-26T00:00:00.000Z");
  });

  it("rejects a string that is not a date", () => {
    assert.throws(() => startOfUtcDay("today"), /expected YYYY-MM-DD/);
  });

  it("takes the calendar day a reader sees, not the UTC one", () => {
    // 2026-08-26 23:00 local is still the 26th for that reader, whatever UTC
    // says. Constructed from local parts, so this holds in any test zone.
    const lateEvening = new Date(2026, 7, 26, 23, 0, 0);
    assert.equal(
      localDayAsUtc(lateEvening).toISOString(),
      "2026-08-26T00:00:00.000Z",
    );
  });
});

describe("orderEventsByDate", () => {
  const TODAY = new Date(Date.UTC(2026, 7, 26));

  /** id + dates, so an assertion reads as a list of ids. */
  function order(rows: { id: string; dates: string }[], today = TODAY) {
    return orderEventsByDate(rows, (row) => row.dates, today).map((entry) => ({
      id: entry.item.id,
      group: entry.group,
    }));
  }

  it("puts upcoming first, ascending by start", () => {
    assert.deepEqual(
      order([
        { id: "dec", dates: "December 12, 2026" },
        { id: "oct", dates: "October 14-15, 2026" },
        { id: "nov", dates: "November 4–6, 2026" },
      ]),
      [
        { id: "oct", group: "upcoming" },
        { id: "nov", group: "upcoming" },
        { id: "dec", group: "upcoming" },
      ],
    );
  });

  it("puts past after upcoming, descending by start", () => {
    assert.deepEqual(
      order([
        { id: "march", dates: "March 2-6, 2026" },
        { id: "october", dates: "October 14-15, 2026" },
        { id: "june", dates: "June 1-5, 2026" },
      ]),
      [
        { id: "october", group: "upcoming" },
        { id: "june", group: "past" },
        { id: "march", group: "past" },
      ],
    );
  });

  it("puts undated last, in the order received", () => {
    assert.deepEqual(
      order([
        { id: "blank-1", dates: "" },
        { id: "dated", dates: "October 14-15, 2026" },
        { id: "blank-2", dates: "" },
        { id: "blank-3", dates: "no idea" },
      ]),
      [
        { id: "dated", group: "upcoming" },
        { id: "blank-1", group: "undated" },
        { id: "blank-2", group: "undated" },
        { id: "blank-3", group: "undated" },
      ],
    );
  });

  it("counts an event running today as current, not past", () => {
    // Started the 24th, ends the 28th, today is the 26th. The END date
    // decides the boundary, which is the whole point of using it.
    const rows = [{ id: "running", dates: "August 24-28, 2026" }];
    assert.deepEqual(order(rows), [{ id: "running", group: "upcoming" }]);
  });

  it("counts an event that ends today as current", () => {
    assert.deepEqual(order([{ id: "ends-today", dates: "August 20-26, 2026" }]), [
      { id: "ends-today", group: "upcoming" },
    ]);
  });

  it("counts an event that ended yesterday as past", () => {
    assert.deepEqual(order([{ id: "ended", dates: "August 20-25, 2026" }]), [
      { id: "ended", group: "past" },
    ]);
  });

  it("keeps a month-precision event current for the whole month", () => {
    const rows = [{ id: "august", dates: "Workshop August 2026" }];
    assert.deepEqual(order(rows), [{ id: "august", group: "upcoming" }]);
    // Same event, read in September: now past.
    assert.deepEqual(order(rows, new Date(Date.UTC(2026, 8, 1))), [
      { id: "august", group: "past" },
    ]);
  });

  it("keeps the received order for events sharing a start date", () => {
    assert.deepEqual(
      order([
        { id: "second", dates: "October 14-15, 2026" },
        { id: "first", dates: "October 14, 2026" },
      ]),
      [
        { id: "second", group: "upcoming" },
        { id: "first", group: "upcoming" },
      ],
    );
  });

  it("re-groups the same list when today moves", () => {
    const rows = [
      { id: "a", dates: "October 14-15, 2026" },
      { id: "b", dates: "June 1-5, 2026" },
    ];
    assert.deepEqual(order(rows, new Date(Date.UTC(2026, 0, 1))), [
      { id: "b", group: "upcoming" },
      { id: "a", group: "upcoming" },
    ]);
    assert.deepEqual(order(rows, new Date(Date.UTC(2027, 0, 1))), [
      { id: "a", group: "past" },
      { id: "b", group: "past" },
    ]);
  });

  it("splits the 27 dated fixtures 14 upcoming, 13 past on 2026-08-26", () => {
    const rows = FIXTURES.map((fixture, index) => ({
      id: String(index),
      dates: fixture.dates,
    }));
    const grouped = order(rows);
    assert.equal(grouped.filter((row) => row.group === "upcoming").length, 14);
    assert.equal(grouped.filter((row) => row.group === "past").length, 13);
    assert.equal(grouped.filter((row) => row.group === "undated").length, 0);
    // Soonest first: 9 October 2026.
    assert.equal(FIXTURES[Number(grouped[0].id)].dates, "09-10 October 2026");
  });

  it("returns an empty list for an empty list", () => {
    assert.deepEqual(order([]), []);
  });
});
