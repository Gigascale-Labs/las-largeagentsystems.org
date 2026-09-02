#!/usr/bin/env node
/**
 * Writes the 2026-09-02 retagging into Airtable, then verifies it.
 *
 * Ran once, on 2026-09-02: 90 records patched, 90 read back, 0 mismatches. It
 * is kept because it is re-runnable, and re-running it restores the canon's
 * seven dimension columns to the state the full-text pass put them in.
 *
 * The payload is derived from `docs/canon-tag-evidence.json`, which holds one
 * object per row with the quote behind every value. That file is the record,
 * so the script reads it rather than a second copy that could drift from it.
 *
 * Two things it cannot do, both measured:
 *
 * | Attempt | Result |
 * |---|---|
 * | create a field (`POST .../tables/{id}/fields`) | 200, with `schema.bases:write` |
 * | change an existing field's choices (`PATCH .../fields/{id}`) | 422 every time, n=5 |
 *
 * The PATCH refusal is an Airtable limit, not a permission: it returns
 * "Changing a field's type or number precision is not currently supported"
 * with the scope present, with and without `type` restated, and with unchanged
 * choices sent as bare ids. So a renamed choice cannot be renamed in place.
 * `typecast: true` on the record write adds the new name instead, and the old
 * one is left on the list with no row using it.
 *
 * Usage:
 *   AIRTABLE_API_KEY=... AIRTABLE_BASE_ID=... node scripts/apply-canon-retag.mjs [--go]
 *
 * Without `--go` it checks the three observability fields exist and writes
 * nothing.
 */

import { readFileSync } from "node:fs";

const KEY = process.env.AIRTABLE_API_KEY;
const BASE = process.env.AIRTABLE_BASE_ID;
const TABLE = process.env.AIRTABLE_CANON_TABLE_ID || "Canon";
const EVIDENCE =
  process.env.CANON_TAG_EVIDENCE ?? "docs/canon-tag-evidence.json";
const GO = process.argv.includes("--go");

if (!KEY || !BASE) {
  console.error("Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID. See .env.example.");
  process.exit(1);
}
const NEW_FIELDS = [
  "participant_observability",
  "operator_observability",
  "public_observability",
];

/** The seven dimension columns this writes. `claim_type` is not retagged. */
const DIMENSIONS = [
  "system_type",
  "participant_mix",
  "focus_area",
  "threat_model",
  ...NEW_FIELDS,
];

const rows = JSON.parse(readFileSync(EVIDENCE, "utf8")).map((entry) => {
  const fields = {
    tag_confidence: entry.read?.how === "full-text" ? "full-text" : "summary-only",
  };
  for (const dimension of DIMENSIONS) {
    fields[dimension] = (entry[dimension] ?? []).map((v) => v.value);
  }
  return { id: entry.id, title: entry.title, fields };
});

async function api(path, init = {}) {
  const res = await fetch(`https://api.airtable.com/v0/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  return res;
}

/** One record write is the cheapest way to learn whether a field exists. */
async function checkFields(sampleId) {
  const missing = [];
  for (const name of NEW_FIELDS) {
    const res = await api(`${BASE}/${encodeURIComponent(TABLE)}`, {
      method: "PATCH",
      body: JSON.stringify({ records: [{ id: sampleId, fields: { [name]: [] } }] }),
    });
    if (res.status === 422) {
      const body = await res.json();
      if (body?.error?.type === "UNKNOWN_FIELD_NAME") missing.push(name);
      else console.error(`${name}: unexpected 422`, JSON.stringify(body).slice(0, 200));
    } else if (!res.ok) {
      console.error(`${name}: ${res.status} ${(await res.text()).slice(0, 200)}`);
    }
  }
  return missing;
}

const missing = await checkFields(rows[0].id);
if (missing.length) {
  console.error(
    `Airtable is missing ${missing.length} field(s): ${missing.join(", ")}\n` +
      "Create them as Multiple select on the Canon table, then run again.\n" +
      "docs/airtable-spec-for-ai.md lists the exact options.",
  );
  process.exit(2);
}
console.log(`all ${NEW_FIELDS.length} new fields exist`);

if (!GO) {
  console.log(`DRY RUN: would patch ${rows.length} records. Pass --go to write.`);
  process.exit(0);
}

const batches = [];
for (let i = 0; i < rows.length; i += 10) batches.push(rows.slice(i, i + 10));

let written = 0;
for (const [i, batch] of batches.entries()) {
  const res = await api(`${BASE}/${encodeURIComponent(TABLE)}`, {
    method: "PATCH",
    body: JSON.stringify({
      records: batch.map((r) => ({ id: r.id, fields: r.fields })),
      // Adds the renamed participant_mix choice; the fields themselves must
      // already exist, which checkFields has confirmed.
      typecast: true,
    }),
  });
  if (!res.ok) {
    console.error(`batch ${i + 1} failed ${res.status}: ${(await res.text()).slice(0, 400)}`);
    process.exit(1);
  }
  written += (await res.json()).records.length;
  console.log(`batch ${i + 1}/${batches.length} ok`);
  await new Promise((r) => setTimeout(r, 250)); // Airtable allows 5 req/s
}
console.log(`patched ${written} records`);

// ---- verify: read every record back and compare field by field ----
const live = [];
let offset;
do {
  const url = new URL(`https://api.airtable.com/v0/${BASE}/${encodeURIComponent(TABLE)}`);
  if (offset) url.searchParams.set("offset", offset);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${KEY}` } });
  const body = await res.json();
  live.push(...body.records);
  offset = body.offset;
} while (offset);

const want = new Map(rows.map((r) => [r.id, r]));
let mismatches = 0;
for (const rec of live) {
  const expected = want.get(rec.id);
  if (!expected) continue;
  for (const [field, value] of Object.entries(expected.fields)) {
    const got = rec.fields[field] ?? (Array.isArray(value) ? [] : "");
    const a = JSON.stringify(Array.isArray(got) ? [...got].sort() : got);
    const b = JSON.stringify(Array.isArray(value) ? [...value].sort() : value);
    if (a !== b) {
      mismatches++;
      console.error(`MISMATCH ${expected.title} / ${field}: ${a} != ${b}`);
    }
  }
}
console.log(`verified ${live.length} records, ${mismatches} mismatches`);
process.exit(mismatches ? 1 : 0);
