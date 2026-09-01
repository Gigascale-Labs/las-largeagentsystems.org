/**
 * Tests for the review queue's cross-site POST check.
 *
 * The case that actually broke, and the reason this module exists:
 * `Origin: null`. A response carrying `Referrer-Policy: no-referrer` makes the
 * browser send that literal string on its own same-origin form POST, and the
 * first version of the check read it as a cross-site request and refused every
 * form on the page.
 *
 * Run with `npm test`.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { checkSameOrigin } from "../review/csrf.mts";

const HOST = "system-1.blenny-ratio.ts.net";
const SELF = `https://${HOST}`;

describe("checkSameOrigin accepts", () => {
  it("a form this service's own page sent", () => {
    const v = checkSameOrigin({ host: HOST, origin: SELF, "sec-fetch-site": "same-origin" });
    assert.equal(v.ok, true);
    assert.equal(v.reason, "");
  });

  it("a typed address or bookmark, which carries sec-fetch-site: none", () => {
    assert.equal(checkSameOrigin({ host: HOST, "sec-fetch-site": "none" }).ok, true);
  });

  it("curl from the host, which sends neither header", () => {
    assert.equal(checkSameOrigin({ host: HOST }).ok, true);
  });

  it("a withheld origin backed by sec-fetch-site", () => {
    // This is the regression. `Referrer-Policy: no-referrer` produces it on a
    // same-origin POST, and the old check refused it.
    const v = checkSameOrigin({ host: HOST, origin: "null", "sec-fetch-site": "same-origin" });
    assert.equal(v.ok, true, v.reason);
  });

  it("a withheld origin with no sec-fetch-site at all", () => {
    // A browser too old for Sec-Fetch-Site cannot be judged on it. Accepting
    // is the documented trade: see the ASSUMED note in review/csrf.mts.
    assert.equal(checkSameOrigin({ host: HOST, origin: "null" }).ok, true);
  });

  it("an empty origin header", () => {
    assert.equal(checkSameOrigin({ host: HOST, origin: "" }).ok, true);
  });

  it("a non-default port, as long as both sides carry it", () => {
    assert.equal(
      checkSameOrigin({ host: "100.111.194.7:8789", origin: "http://100.111.194.7:8789" }).ok,
      true,
    );
  });
});

describe("checkSameOrigin refuses", () => {
  it("a cross-site POST, on sec-fetch-site alone", () => {
    const v = checkSameOrigin({ host: HOST, "sec-fetch-site": "cross-site" });
    assert.equal(v.ok, false);
    assert.match(v.reason, /cross-site/);
  });

  it("a cross-site POST that also withholds its origin", () => {
    // A sandboxed iframe sends Origin: null too. Sec-Fetch-Site is what
    // separates it from the accepted case above.
    assert.equal(
      checkSameOrigin({ host: HOST, origin: "null", "sec-fetch-site": "cross-site" }).ok,
      false,
    );
  });

  it("same-site, which is another host under the same registrable domain", () => {
    assert.equal(checkSameOrigin({ host: HOST, "sec-fetch-site": "same-site" }).ok, false);
  });

  it("an origin on another host", () => {
    const v = checkSameOrigin({ host: HOST, origin: "https://evil.example" });
    assert.equal(v.ok, false);
    assert.match(v.reason, /evil\.example/);
  });

  it("an origin on the same host but a different port", () => {
    assert.equal(
      checkSameOrigin({ host: "100.111.194.7:8789", origin: "http://100.111.194.7:9999" }).ok,
      false,
    );
  });

  it("an origin that is not a URL and not the withheld sentinel", () => {
    const v = checkSameOrigin({ host: HOST, origin: "not a url" });
    assert.equal(v.ok, false);
    assert.match(v.reason, /not a URL/);
  });

  it("an origin sent to a request carrying no host", () => {
    assert.equal(checkSameOrigin({ origin: SELF }).ok, false);
  });
});

describe("the reason", () => {
  it("is empty exactly when the check passes", () => {
    const cases: Array<[Parameters<typeof checkSameOrigin>[0], boolean]> = [
      [{ host: HOST, origin: SELF }, true],
      [{ host: HOST, origin: "https://evil.example" }, false],
      [{ host: HOST, "sec-fetch-site": "cross-site" }, false],
    ];
    for (const [headers, expected] of cases) {
      const v = checkSameOrigin(headers);
      assert.equal(v.ok, expected);
      assert.equal(v.reason === "", expected);
    }
  });
});
