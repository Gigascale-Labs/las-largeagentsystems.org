#!/usr/bin/env node
/**
 * Pulls the Airtable "Canon" table down to a static JSON file.
 *
 * This is the sync half of docs/airtable-migration.md: Airtable's free-plan
 * API quota (1,000 calls/month) is sized for occasional use, not
 * page-view-driven traffic, so the site must never call the Airtable API
 * on a visitor's page load. Run this script instead (manually, on a
 * schedule, or from a webhook) and have the site read the JSON file it
 * writes.
 *
 * Not wired into `next build` yet — data/las-canon.csv is still the
 * source the site actually reads. See docs/airtable-migration.md for why.
 *
 * Usage: AIRTABLE_API_KEY=... AIRTABLE_BASE_ID=... node scripts/sync-airtable.mjs
 */

import { writeFile } from "node:fs/promises";
import path from "node:path";

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const CANON_TABLE_ID = process.env.AIRTABLE_CANON_TABLE_ID || "Canon";
const OUTPUT_PATH =
  process.env.AIRTABLE_SYNC_OUTPUT ||
  path.join(process.cwd(), "data", "las-canon.airtable.json");

if (!API_KEY || !BASE_ID) {
  console.error(
    "Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID. See .env.example."
  );
  process.exit(1);
}

async function fetchAllRecords(tableId) {
  const records = [];
  let offset;
  do {
    const url = new URL(
      `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(tableId)}`
    );
    if (offset) url.searchParams.set("offset", offset);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${API_KEY}` },
    });
    if (!res.ok) {
      throw new Error(
        `Airtable API error ${res.status}: ${await res.text()}`
      );
    }
    const body = await res.json();
    records.push(...body.records);
    offset = body.offset;
  } while (offset);
  return records;
}

function splitMultiValue(value) {
  return value
    .split(";")
    .map((v) => v.trim())
    .filter(Boolean);
}

function toCanonEntry(record) {
  const f = record.fields;
  return {
    title: f.title ?? "",
    itemType: f.itemType ?? "",
    creators: f.creators ?? "",
    date: f.date ?? "",
    url: f.url ?? "",
    tags: f.tags ?? "",
    summary: f.summary ?? "",
    system_type: f.system_type ?? [],
    participant_mix: f.participant_mix ?? [],
    participant_observability: f.participant_observability ?? [],
    operator_observability: f.operator_observability ?? [],
    public_observability: f.public_observability ?? [],
    focus_area: f.focus_area ?? [],
    threat_model: f.threat_model ?? [],
    claim_type: f.claim_type ?? [],
    tag_confidence: f.tag_confidence ?? "summary-only",
    institutions: f.institutions ? splitMultiValue(f.institutions) : [],
  };
}

const records = await fetchAllRecords(CANON_TABLE_ID);
const entries = records.map(toCanonEntry);

await writeFile(OUTPUT_PATH, JSON.stringify(entries, null, 2) + "\n");
console.log(`Wrote ${entries.length} records to ${OUTPUT_PATH}`);
