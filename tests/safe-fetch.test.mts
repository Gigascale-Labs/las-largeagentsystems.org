/**
 * Tests for the checks between a public form and this server's network.
 *
 * Run with `npm test`. No network: every case is either address arithmetic or
 * a stubbed `fetch`.
 */

import assert from "node:assert/strict";
import { after, describe, it, mock } from "node:test";

import {
  assertPublicUrl,
  BlockedUrlError,
  isPublicAddress,
  isPublicIPv4,
  isPublicIPv6,
  safeFetch,
} from "../lib/safe-fetch.ts";
import { decodeAndStripTags, sanitizeHtmlText, sanitizeText } from "../lib/sanitize.ts";

describe("IPv4 classification", () => {
  it("accepts ordinary public addresses", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "193.60.1.1", "151.101.1.140"]) {
      assert.equal(isPublicIPv4(ip), true, ip);
    }
  });

  it("rejects every private and reserved range", () => {
    const blocked = [
      "0.0.0.0", // this network
      "127.0.0.1", // loopback
      "10.0.0.1", // private
      "172.16.0.1", // private
      "172.31.255.255", // private, top of range
      "192.168.1.1", // private
      "169.254.169.254", // cloud instance metadata
      "100.64.0.1", // carrier-grade NAT
      "192.0.0.1", // IETF assignments
      "198.18.0.1", // benchmarking
      "224.0.0.1", // multicast
      "255.255.255.255", // broadcast
    ];
    for (const ip of blocked) {
      assert.equal(isPublicIPv4(ip), false, ip);
    }
  });

  it("rejects addresses that are not addresses", () => {
    for (const bad of ["", "1.2.3", "1.2.3.4.5", "256.1.1.1", "a.b.c.d"]) {
      assert.equal(isPublicIPv4(bad), false, bad);
    }
  });
});

describe("IPv6 classification", () => {
  it("accepts a public address", () => {
    assert.equal(isPublicIPv6("2606:4700:4700::1111"), true);
  });

  it("rejects loopback, unique-local, link-local and multicast", () => {
    for (const ip of ["::", "::1", "fc00::1", "fd12:3456::1", "fe80::1", "ff02::1"]) {
      assert.equal(isPublicIPv6(ip), false, ip);
    }
  });

  it("looks through IPv4-mapped and tunnelled forms", () => {
    // A private v4 address inside a v6 one.
    assert.equal(isPublicIPv6("::ffff:127.0.0.1"), false);
    assert.equal(isPublicIPv6("::ffff:169.254.169.254"), false);
    assert.equal(isPublicIPv6("::ffff:7f00:1"), false);
    assert.equal(isPublicIPv6("64:ff9b::10.0.0.1"), false);
    assert.equal(isPublicIPv6("2002:a00:1::"), false); // 6to4 wrapping 10.0.0.1
    assert.equal(isPublicIPv6("::ffff:8.8.8.8"), true);
  });

  it("handles bracketed and zoned forms", () => {
    assert.equal(isPublicAddress("::1"), false);
    assert.equal(isPublicIPv6("fe80::1%eth0"), false);
  });
});

describe("assertPublicUrl", () => {
  it("accepts a normal https URL", async () => {
    const url = await assertPublicUrl("https://arxiv.org/abs/2502.14143");
    assert.equal(url.hostname, "arxiv.org");
  });

  it("rejects non-http protocols", async () => {
    for (const raw of [
      "file:///etc/passwd",
      "ftp://example.com/x",
      "gopher://example.com/",
      "data:text/html,hi",
    ]) {
      await assert.rejects(() => assertPublicUrl(raw), BlockedUrlError, raw);
    }
  });

  it("rejects credentials in the URL", async () => {
    await assert.rejects(
      () => assertPublicUrl("https://user:pass@example.com/"),
      BlockedUrlError,
    );
  });

  it("rejects non-standard ports", async () => {
    // A public hostname pointed at :6379 would reach internal services.
    await assert.rejects(() => assertPublicUrl("http://example.com:6379/"), BlockedUrlError);
  });

  it("rejects literal private addresses in every notation", async () => {
    for (const raw of [
      "http://127.0.0.1/",
      "http://169.254.169.254/latest/meta-data/",
      "http://10.0.0.1/",
      "http://[::1]/",
      "http://[::ffff:127.0.0.1]/",
      "http://2130706433/", // 127.0.0.1 as a decimal integer
      "http://0x7f000001/", // and as hex
    ]) {
      await assert.rejects(() => assertPublicUrl(raw), BlockedUrlError, raw);
    }
  });

  it("rejects internal-only hostnames", async () => {
    for (const raw of [
      "http://localhost/",
      "http://metadata.google.internal/",
      "http://printer.local/",
    ]) {
      await assert.rejects(() => assertPublicUrl(raw), BlockedUrlError, raw);
    }
  });
});

describe("safeFetch", () => {
  const originalFetch = globalThis.fetch;
  after(() => {
    globalThis.fetch = originalFetch;
  });

  function stubResponse(body: string, init: { status?: number; headers?: Record<string, string> } = {}) {
    return new Response(body, {
      status: init.status ?? 200,
      headers: { "content-type": "text/html", ...(init.headers ?? {}) },
    });
  }

  it("reads a normal page", async () => {
    globalThis.fetch = mock.fn(async () => stubResponse("<title>Hello</title>")) as typeof fetch;
    const result = await safeFetch("https://example.com/");
    assert.match(result.body, /Hello/);
    assert.equal(result.truncated, false);
  });

  it("blocks a redirect that points at a private address", async () => {
    // The case a check on the submitted URL alone would miss.
    globalThis.fetch = mock.fn(async () =>
      stubResponse("", { status: 302, headers: { location: "http://169.254.169.254/" } }),
    ) as typeof fetch;

    await assert.rejects(() => safeFetch("https://example.com/"), BlockedUrlError);
  });

  it("stops after too many redirects", async () => {
    globalThis.fetch = mock.fn(async () =>
      stubResponse("", { status: 302, headers: { location: "https://example.com/next" } }),
    ) as typeof fetch;

    await assert.rejects(() => safeFetch("https://example.com/"), /too many redirects/);
  });

  it("refuses a content type it cannot parse", async () => {
    globalThis.fetch = mock.fn(async () =>
      stubResponse("%PDF-1.4", { headers: { "content-type": "application/pdf" } }),
    ) as typeof fetch;

    await assert.rejects(() => safeFetch("https://example.com/"), /content type/);
  });

  it("stops reading at the byte cap", async () => {
    globalThis.fetch = mock.fn(async () => stubResponse("x".repeat(50_000))) as typeof fetch;
    const result = await safeFetch("https://example.com/", { maxBytes: 1024 });
    assert.equal(result.truncated, true);
    assert.equal(result.body.length, 1024);
  });
});

describe("sanitizing stored text", () => {
  it("removes invisible characters", () => {
    const hidden = String.fromCodePoint(0xe0049, 0xe0067, 0xe006e);
    assert.equal(sanitizeText(`Real title${hidden}`, 100), "Real title");
    assert.equal(sanitizeText("a\u200Bb\u202Ec", 100), "abc");
  });

  it("removes control characters but keeps ordinary text", () => {
    assert.equal(sanitizeText("line\u0000one\u0007two", 100), "line one two");
    assert.equal(sanitizeText("Agent-based models: a survey (2026)", 100),
      "Agent-based models: a survey (2026)");
  });

  it("caps length", () => {
    const capped = sanitizeText("y".repeat(900), 100);
    assert.equal(capped.length, 103);
    assert.ok(capped.endsWith("..."));
  });

  it("strips markup after decoding entities", () => {
    // Decoding alone would leave a live tag.
    assert.equal(
      sanitizeHtmlText("&lt;script&gt;alert(1)&lt;/script&gt;Title", 100),
      "alert(1) Title",
    );
    assert.equal(decodeAndStripTags("<b>bold</b>").trim(), "bold");
  });

  it("handles empty and missing values", () => {
    assert.equal(sanitizeText(undefined, 10), "");
    assert.equal(sanitizeText(null, 10), "");
    assert.equal(sanitizeHtmlText("", 10), "");
  });
});
