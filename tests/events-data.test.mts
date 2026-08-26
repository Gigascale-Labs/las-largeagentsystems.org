/**
 * Tests for reading and sanitizing the las-conferences events feed.
 *
 * Run with `npm test`. No network: every case reads/writes a temp file.
 */

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, afterEach, describe, it } from "node:test";

import { getEvents, getVerifiedEvents } from "../lib/events-data.ts";
import type { Event } from "../lib/events-schema.ts";

const dir = mkdtempSync(join(tmpdir(), "events-data-test-"));
const filePath = join(dir, "events.json");

after(() => {
  rmSync(dir, { recursive: true, force: true });
});

afterEach(() => {
  rmSync(filePath, { force: true });
});

function baseEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    date_scraped: "2026-08-26",
    name: "Test Workshop",
    event_type: "workshop",
    dates: "2027-01-01",
    location: "Online",
    description: "A workshop about testing.",
    organizer: "Test Org",
    url: "https://example.org/event",
    query: "test query",
    relevance_rationale: "relevant",
    reputability_rationale: "reputable",
    verification_status: "verified",
    verification_note: "1/1 name tokens found on page",
    ...overrides,
  };
}

function writeEvents(events: unknown) {
  writeFileSync(filePath, JSON.stringify(events));
}

describe("getEvents", () => {
  it("returns [] when the file does not exist", () => {
    assert.deepEqual(getEvents(join(dir, "missing.json")), []);
  });

  it("returns [] for malformed JSON", () => {
    writeFileSync(filePath, "not json");
    assert.deepEqual(getEvents(filePath), []);
  });

  it("returns [] when the parsed JSON is not an array", () => {
    writeFileSync(filePath, JSON.stringify({ not: "an array" }));
    assert.deepEqual(getEvents(filePath), []);
  });

  it("returns [] for an empty array", () => {
    writeEvents([]);
    assert.deepEqual(getEvents(filePath), []);
  });

  it("round-trips a well-formed event", () => {
    writeEvents([baseEvent()]);
    const events = getEvents(filePath);
    assert.equal(events.length, 1);
    assert.equal(events[0].name, "Test Workshop");
    assert.equal(events[0].verification_status, "verified");
  });

  it("strips invisible characters and caps length", () => {
    const longDescription = "A".repeat(600);
    const zeroWidthSpace = String.fromCharCode(0x200b);
    const nameWithZeroWidthSpaces = zeroWidthSpace + "title" + zeroWidthSpace;
    writeEvents([baseEvent({ name: nameWithZeroWidthSpaces, description: longDescription })]);
    const [event] = getEvents(filePath);
    assert.equal(event.name, "title");
    assert.equal(event.description.length, 503); // 500 + "..."
    assert.ok(event.description.endsWith("..."));
  });
});

describe("getVerifiedEvents", () => {
  it("excludes blocked events", () => {
    writeEvents([
      baseEvent({ id: "1", url: "https://example.org/a", verification_status: "verified" }),
      baseEvent({ id: "2", url: "https://example.org/b", verification_status: "blocked" }),
    ]);
    const events = getVerifiedEvents(filePath);
    assert.equal(events.length, 1);
    assert.equal(events[0].verification_status, "verified");
  });
});
