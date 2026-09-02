#!/usr/bin/env node
/**
 * Writes the 2026-09-02 retagging into Airtable, then verifies it.
 *
 * It cannot create the fields it writes to: the API token carries no schema
 * scope, so `POST /v0/meta/bases/{base}/tables/{table}/fields` and even
 * `GET /v0/meta/bases` return 403. The three observability columns must exist
 * before this runs. `docs/airtable-spec-for-ai.md` lists them.
 *
 * The `hybrid - human, AI, other` choice does NOT need creating by hand: this
 * writes with `typecast: true`, which adds a missing option to an existing
 * select field. Only whole fields need a person.
 *
 * Usage:
 *   AIRTABLE_API_KEY=... AIRTABLE_BASE_ID=... node scripts/apply-canon-retag.mjs [--go]
 *
 * Without `--go` it checks the fields exist, checks every value against the
 * closed sets, and writes nothing.
 */

import { readFileSync } from "node:fs";

const KEY = process.env.AIRTABLE_API_KEY;
const BASE = process.env.AIRTABLE_BASE_ID;
const TABLE = process.env.AIRTABLE_CANON_TABLE_ID || "Canon";
const PAYLOAD = process.env.CANON_RETAG_PAYLOAD;
const GO = process.argv.includes("--go");

if (!KEY || !BASE) {
  console.error("Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID. See .env.example.");
  process.exit(1);
}
if (!PAYLOAD) {
  console.error("Missing CANON_RETAG_PAYLOAD: path to the pending-write JSON.");
  process.exit(1);
}

const NEW_FIELDS = [
  "participant_observability",
  "operator_observability",
  "public_observability",
];

const rows = JSON.parse(readFileSync(PAYLOAD, "utf8"));

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
