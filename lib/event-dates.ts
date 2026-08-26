/**
 * Reads the free-text `dates` field of a synced event into a sortable range.
 *
 * The upstream schema has no start or end date. `dates` is whatever the
 * organiser's page said, and `date_scraped` is the day this site found the
 * event, not the day it runs. So `/events` cannot order by date without
 * reading that text.
 *
 * Pure: no React, no I/O, no date library. Every date is UTC midnight, so one
 * string parses to one instant on the build machine and in a reader's
 * browser, whatever their zone.
 *
 * The parser never guesses. A string it cannot read returns
 * `{ kind: "unknown" }`, and the page lists it under "Date not stated".
 * Twenty-seven of the 32 values on file parse; the other five are empty.
 */

export type EventDateSource = "event" | "deadline";
export type EventDatePrecision = "day" | "month";

export type ParsedEventDate =
  | {
      kind: "dated";
      /** UTC midnight on the first day. This is the sort key. */
      start: Date;
      /** UTC midnight on the last day. This decides upcoming vs past. */
      end: Date;
      /**
       * "event" — the date came from an event segment.
       * "deadline" — no event date was stated, so a deadline stands in.
       */
      source: EventDateSource;
      /** "month" — only a month was stated; `start` is its 1st. */
      precision: EventDatePrecision;
    }
  | { kind: "unknown" };

/* -------------------------------------------------------------------------
 * Patterns
 * ---------------------------------------------------------------------- */

const MONTH_ABBREVIATIONS = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

/**
 * Full names and their usual abbreviations. Longest alternative first in each
 * group ("tember" before "t"), so "September" cannot match as "Sept" and
 * leave "ember" behind.
 */
const MONTH =
  "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|" +
  "aug(?:ust)?|sep(?:tember|t)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";

const ORDINAL = "(?:st|nd|rd|th)";

/**
 * What can sit between two day numbers. A dash of any width joins a range;
 * "or" and "and" offer two days. Either way the first day is the start and
 * the second is the end -- see daySpan for why the end takes the later day.
 */
const CONNECTOR =
  "(?:\\s*[-\\u2010-\\u2015]\\s*|\\s+(?:or|and|to|through)\\s+)";

/** "October 12-16, 2026", "June 1, 2026", "May 23-24th, 2026", "Feb 4, 2026". */
const MONTH_FIRST = new RegExp(
  `\\b(${MONTH})\\.?\\s+(\\d{1,2})${ORDINAL}?` +
    `(?:(${CONNECTOR})(\\d{1,2})${ORDINAL}?)?` +
    `\\s*,?\\s*(\\d{4})\\b`,
  "gi",
);

/** "09-10 October 2026", "3.-4. June 2026", "15 October 2026". */
const DAY_FIRST = new RegExp(
  `\\b(\\d{1,2})${ORDINAL}?\\.?` +
    `(?:(${CONNECTOR})(\\d{1,2})${ORDINAL}?\\.?)?` +
    `\\s+(${MONTH})\\.?\\s+(\\d{4})\\b`,
  "gi",
);

/** "December 2026" — a month with no day in it. */
const MONTH_ONLY = new RegExp(`\\b(${MONTH})\\.?\\s+(\\d{4})\\b`, "gi");

/** "(main conference)", "(AoE)", "(extended to Feb 11, 2026)", "(half-day, tentative)". */
const PARENTHETICAL = /\([^)]*\)/g;

/** A weekday and the comma after it: "Thursday, 15 October 2026". */
const WEEKDAY =
  /\b(?:mon|tues?|wed(?:nes)?|thur?s?|fri|sat(?:ur)?|sun)(?:day)?\b\.?,?/gi;

const DEADLINE_LABEL =
  /\b(?:deadlines?|submissions?|submit|notifications?|camera[-\s]?ready|due|registration)\b/i;

/* -------------------------------------------------------------------------
 * Calendar helpers
 * ---------------------------------------------------------------------- */

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/** UTC midnight, or null when the day does not exist (31 February). */
function utcDay(year: number, monthIndex: number, day: number): Date | null {
  if (monthIndex < 0 || monthIndex > 11) return null;
  if (year < 1900 || year > 2999) return null;
  if (day < 1 || day > daysInMonth(year, monthIndex)) return null;
  return new Date(Date.UTC(year, monthIndex, day));
}

/** First three letters name every English month without ambiguity. */
function monthIndexOf(name: string): number {
  return MONTH_ABBREVIATIONS.indexOf(name.slice(0, 3).toLowerCase());
}

/** Midnight UTC on the calendar day of a Date, or of a "YYYY-MM-DD" string. */
export function startOfUtcDay(value: Date | string): Date {
  if (typeof value === "string") {
    const parts = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
    if (!parts) {
      throw new Error(`startOfUtcDay: expected YYYY-MM-DD, got "${value}"`);
    }
    return new Date(
      Date.UTC(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])),
    );
  }
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
  );
}

/**
 * The reader's own calendar day, expressed as UTC midnight so it compares
 * with parsed dates. Call this in the browser: someone in Auckland on the
 * 27th must not be told an event on the 26th is still upcoming.
 */
export function localDayAsUtc(now: Date): Date {
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/* -------------------------------------------------------------------------
 * Date extraction
 * ---------------------------------------------------------------------- */

interface DateSpan {
  start: Date;
  end: Date;
  precision: EventDatePrecision;
  /** Where the text of this date sits in the segment. Used to find the label. */
  from: number;
  to: number;
}

function eachMatch(
  pattern: RegExp,
  text: string,
  handle: (match: RegExpExecArray) => void,
): void {
  pattern.lastIndex = 0;
  let match = pattern.exec(text);
  while (match !== null) {
    handle(match);
    match = pattern.exec(text);
  }
}

function daySpan(
  year: number,
  monthIndex: number,
  firstDay: number,
  connector: string | undefined,
  secondDay: number | undefined,
  from: number,
  to: number,
): DateSpan | null {
  const start = utcDay(year, monthIndex, firstDay);
  if (!start) return null;
  let end = start;
  // The second day extends the end however it was written: a range
  // ("11-12"), both days ("2 and 3"), or a choice ("11 or 12"). The start is
  // the first day in every case, and the end decides one thing only --
  // whether the event has finished. "2 and 3 December" runs on both days, and
  // "11 or 12 December" may turn out to be the 12th, so ending either on the
  // first day would file it as past while it was still to come.
  if (secondDay !== undefined) {
    const last = utcDay(year, monthIndex, secondDay);
    // A range that runs backwards is not a range this parser understands.
    // Keep the first day rather than invent an end before the start.
    if (last && last.getTime() >= start.getTime()) end = last;
  }
  return { start, end, precision: "day", from, to };
}

/**
 * Every date in one segment, in the order they appear.
 *
 * Order of the three patterns matters. "30 May 2026" is one day-first date,
 * but its tail also reads as the month-only date "May 2026". Day-first runs
 * first and claims the characters, so month-only cannot claim them again.
 */
function extractDateSpans(text: string): DateSpan[] {
  const spans: DateSpan[] = [];

  function claim(span: DateSpan | null): void {
    if (!span) return;
    const overlaps = spans.some(
      (taken) => span.from < taken.to && taken.from < span.to,
    );
    if (overlaps) return;
    spans.push(span);
  }

  eachMatch(MONTH_FIRST, text, (m) => {
    claim(
      daySpan(
        Number(m[5]),
        monthIndexOf(m[1]),
        Number(m[2]),
        m[3],
        m[4] === undefined ? undefined : Number(m[4]),
        m.index,
        m.index + m[0].length,
      ),
    );
  });

  eachMatch(DAY_FIRST, text, (m) => {
    claim(
      daySpan(
        Number(m[5]),
        monthIndexOf(m[4]),
        Number(m[1]),
        m[2],
        m[3] === undefined ? undefined : Number(m[3]),
        m.index,
        m.index + m[0].length,
      ),
    );
  });

  eachMatch(MONTH_ONLY, text, (m) => {
    const monthIndex = monthIndexOf(m[1]);
    const year = Number(m[2]);
    const start = utcDay(year, monthIndex, 1);
    if (!start) return;
    // A month with no day starts on the 1st, per rule 5, and ends on the last
    // of that month. Ending it on the 1st would file "December 2026" as past
    // on 2 December, when the event may not have happened yet.
    claim({
      start,
      end: new Date(Date.UTC(year, monthIndex + 1, 0)),
      precision: "month",
      from: m.index,
      to: m.index + m[0].length,
    });
  });

  spans.sort((a, b) => a.from - b.from);
  return spans;
}

function stripWeekdays(text: string): string {
  return text.replace(WEEKDAY, "");
}

/**
 * Rule 2, as one test. A label naming a deadline is a deadline; everything
 * else is the event.
 *
 * There is no second list of event words to check. A label naming an event
 * ("Workshop", "AAMAS Conference") and a segment with no label at all
 * ("October 12-16, 2026") both fall through to the same answer, so testing
 * for them would not change any result. Deadline is checked first on purpose:
 * "Workshop paper deadline" names both, and it is a date to submit by, not
 * the day the workshop runs.
 */
function classifySegment(label: string): EventDateSource {
  return DEADLINE_LABEL.test(label) ? "deadline" : "event";
}

/* -------------------------------------------------------------------------
 * The parser
 * ---------------------------------------------------------------------- */

export function parseEventDates(text: string): ParsedEventDate {
  if (!text || text.trim() === "") return { kind: "unknown" };

  const candidates: { span: DateSpan; source: EventDateSource }[] = [];

  for (const rawSegment of text.split(";")) {
    // Parentheses in this field qualify a date — "(extended)", "(AoE)",
    // "(main conference)", "(exact date TBD)", "(half-day, tentative)" — or
    // hold one that was superseded, "(extended to Feb 11, 2026)". Drop them
    // first. If that leaves no date at all, the parentheses held the only
    // date, so read the segment again with them.
    let segment = stripWeekdays(rawSegment.replace(PARENTHETICAL, " "));
    let spans = extractDateSpans(segment);
    if (spans.length === 0) {
      segment = stripWeekdays(rawSegment);
      spans = extractDateSpans(segment);
    }
    if (spans.length === 0) continue;

    // The label is what stands before the colon. When a segment has no colon,
    // it is whatever stands before the first date: "Submission deadline
    // September 5, 2026" carries a label without punctuating it.
    const colon = segment.indexOf(":");
    const labelEnd = colon >= 0 && colon < spans[0].from ? colon : spans[0].from;
    const source = classifySegment(segment.slice(0, labelEnd));

    for (const span of spans) candidates.push({ span, source });
  }

  const events = candidates.filter((entry) => entry.source === "event");
  // Rule 3: prefer the earliest event date. A CFP whose only dates are
  // deadlines still needs a place in the list, and the submission deadline is
  // the date its reader acts on, so fall back to the earliest deadline.
  const chosen = events.length > 0 ? events : candidates;
  if (chosen.length === 0) return { kind: "unknown" };

  const earliest = chosen.reduce((best, entry) =>
    entry.span.start.getTime() < best.span.start.getTime() ? entry : best,
  );

  return {
    kind: "dated",
    start: earliest.span.start,
    end: earliest.span.end,
    source: earliest.source,
    precision: earliest.span.precision,
  };
}

/* -------------------------------------------------------------------------
 * Grouping and order
 * ---------------------------------------------------------------------- */

export type EventGroup = "upcoming" | "past" | "undated";

/** Down the page: upcoming and current, then past, then undated. */
export const EVENT_GROUP_ORDER: readonly EventGroup[] = [
  "upcoming",
  "past",
  "undated",
];

export interface OrderedEvent<T> {
  item: T;
  parsed: ParsedEventDate;
  group: EventGroup;
}

/**
 * One flat list, already in the order the page shows it: upcoming and current
 * ascending by start, then past descending by start, then undated in the
 * order they arrived. Pagination slices this list, so a page break never
 * reorders anything.
 *
 * `today` is injected rather than read from the clock, so this is testable
 * and so the caller can hand it a build-time date for the first render and
 * the reader's real date after that.
 */
export function orderEventsByDate<T>(
  items: readonly T[],
  getDateText: (item: T) => string,
  today: Date,
): OrderedEvent<T>[] {
  const todayMs = startOfUtcDay(today).getTime();
  const upcoming: OrderedEvent<T>[] = [];
  const past: OrderedEvent<T>[] = [];
  const undated: OrderedEvent<T>[] = [];

  for (const item of items) {
    const parsed = parseEventDates(getDateText(item));
    if (parsed.kind === "unknown") {
      undated.push({ item, parsed, group: "undated" });
      continue;
    }
    // The END date decides the boundary, not the start. That is deliberate:
    // an event that began yesterday and finishes tomorrow is running right
    // now, and belongs at the top with the upcoming ones, not in Past.
    if (parsed.end.getTime() >= todayMs) {
      upcoming.push({ item, parsed, group: "upcoming" });
    } else {
      past.push({ item, parsed, group: "past" });
    }
  }

  const startOf = (entry: OrderedEvent<T>) =>
    entry.parsed.kind === "dated" ? entry.parsed.start.getTime() : 0;

  // Array.prototype.sort is stable, so events sharing a start date keep the
  // order they arrived in, and undated ones are never sorted at all.
  upcoming.sort((a, b) => startOf(a) - startOf(b));
  past.sort((a, b) => startOf(b) - startOf(a));

  return [...upcoming, ...past, ...undated];
}
