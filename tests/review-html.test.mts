/**
 * Tests for the review queue's escaping.
 *
 * This service builds HTML by concatenating strings, so `escapeHtml` is the
 * only thing between a paper's title and the browser. Every case here is a
 * string a paper could really carry: arXiv titles hold `<`, `>` and `&`, and
 * the summaries are model output.
 *
 * Run with `npm test`.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { escapeHtml, page, safeHref } from "../review/html.mts";

describe("escapeHtml", () => {
  it("escapes the five characters that change how markup parses", () => {
    assert.equal(
      escapeHtml(`<script>alert("x" + 'y' & 1)</script>`),
      "&lt;script&gt;alert(&quot;x&quot; + &#39;y&#39; &amp; 1)&lt;/script&gt;",
    );
  });

  it("escapes the ampersand before the rest, so nothing double-escapes", () => {
    assert.equal(escapeHtml("&lt;"), "&amp;lt;");
  });

  it("closes an attribute in neither quote style", () => {
    for (const quote of ['"', "'"]) {
      const attacked = `${quote} onload=alert(1) x=${quote}`;
      assert.ok(!escapeHtml(attacked).includes(quote));
    }
  });

  it("renders null and undefined as the empty string", () => {
    assert.equal(escapeHtml(null), "");
    assert.equal(escapeHtml(undefined), "");
  });

  it("passes ordinary paper text through unchanged", () => {
    const title = "Retrieval Collapses When AI Pollutes the Web";
    assert.equal(escapeHtml(title), title);
  });

  it("stringifies a number, which the step table passes it", () => {
    assert.equal(escapeHtml(0), "0");
    assert.equal(escapeHtml(128), "128");
  });
});

describe("safeHref", () => {
  it("keeps http and https", () => {
    assert.equal(safeHref("https://arxiv.org/abs/2608.26849"), "https://arxiv.org/abs/2608.26849");
    assert.equal(safeHref("http://example.org/x"), "http://example.org/x");
  });

  it("drops every other scheme", () => {
    for (const url of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "file:///etc/passwd",
      "//evil.example",
      "",
    ]) {
      assert.equal(safeHref(url), "", url);
    }
  });
});

describe("page", () => {
  it("escapes the title into the tag", () => {
    const out = page({ title: "</title><script>", body: "" });
    assert.ok(out.includes("&lt;/title&gt;&lt;script&gt;"));
    assert.ok(!out.includes("<script>"));
  });

  it("links relatively, so Caddy's stripped prefix resolves", () => {
    const out = page({ title: "x", body: "" });
    assert.ok(out.includes('href="."'));
    assert.ok(out.includes('href="rebuild"'));
    assert.ok(!out.includes('href="/'));
  });

  it("adds a meta refresh only when asked", () => {
    assert.ok(!page({ title: "x", body: "" }).includes("http-equiv"));
    assert.ok(
      page({ title: "x", body: "", refreshSeconds: 5 }).includes(
        '<meta http-equiv="refresh" content="5">',
      ),
    );
  });

  it("runs no script of its own", () => {
    assert.ok(!page({ title: "x", body: "" }).includes("<script"));
  });
});
