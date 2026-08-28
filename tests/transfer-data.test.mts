/**
 * Tests for the transfer corpus loader.
 *
 * Run with `npm test`. No network: every case reads the committed CSV.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getTransferEntries } from "../lib/canon-data.ts";
import {
  CLAIM_TYPES,
  FOCUS_AREAS,
  OBSERVABILITY_LEVELS,
  SYSTEM_TYPES,
  THREAT_MODELS,
} from "../lib/canon-schema.ts";

describe("getTransferEntries", () => {
  it("reads the committed CSV", () => {
    const entries = getTransferEntries();
    assert.ok(entries.length > 0, "expected a non-empty transfer corpus");
  });

  it("gives every entry a title and a url", () => {
    for (const e of getTransferEntries()) {
      assert.ok(e.title && e.title.length > 0, `missing title: ${e.url}`);
      assert.ok(
        e.url?.startsWith("http"),
        `missing or non-http url: ${e.title}`,
      );
    }
  });

  it("has no duplicate urls", () => {
    const urls = getTransferEntries().map((e) => e.url);
    assert.equal(new Set(urls).size, urls.length, "duplicate url in corpus");
  });

  /**
   * The transfer corpus studies human and pre-AI systems, so neither
   * participant_mix value applies. An entry that acquires one is either
   * mis-tagged or belongs in the canon instead.
   */
  it("leaves participant_mix empty on every entry", () => {
    for (const e of getTransferEntries()) {
      assert.deepEqual(
        e.participant_mix ?? [],
        [],
        `participant_mix set on ${e.title}`,
      );
    }
  });

  it("uses only closed-set values in the dimension columns", () => {
    const closed = {
      system_type: SYSTEM_TYPES,
      observability: OBSERVABILITY_LEVELS,
      focus_area: FOCUS_AREAS,
      threat_model: THREAT_MODELS,
      claim_type: CLAIM_TYPES,
    } as const;

    for (const e of getTransferEntries()) {
      for (const [key, allowed] of Object.entries(closed)) {
        for (const v of e[key as keyof typeof closed] ?? []) {
          assert.ok(
            (allowed as readonly string[]).includes(v),
            `${e.title}: ${key} has off-list value ${JSON.stringify(v)}`,
          );
        }
      }
    }
  });

  /** Tags come from each summary, not the full text. */
  it("marks every entry summary-only", () => {
    for (const e of getTransferEntries()) {
      assert.equal(e.tag_confidence, "summary-only", `${e.title}`);
    }
  });
});
