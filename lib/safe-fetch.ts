/**
 * Outbound fetch for URLs supplied by the public.
 *
 * The contribute form takes a URL from anyone and the server fetches it. That
 * makes this server the attacker's HTTP client: without a check, a submitted
 * URL can reach anything the server can reach -- cloud instance metadata on
 * 169.254.169.254, an admin service on localhost, a database inside the VPC.
 *
 * What this does about it:
 *
 *   - only http and https, and only on their standard ports;
 *   - no credentials embedded in the URL;
 *   - the hostname is resolved, and *every* address it resolves to must be a
 *     public one (checking every address matters: an attacker's DNS can return
 *     one public and one private address);
 *   - redirects are followed by hand, and every hop is checked the same way,
 *     because a public URL is free to redirect to a private one;
 *   - the body is read with a byte cap and a timeout, so a huge or slow
 *     response cannot exhaust the server.
 *
 * Known limit: between the DNS check and the connection, an attacker who
 * controls their own DNS can change the answer (DNS rebinding). Closing that
 * needs the check inside the socket layer. Two things bound it here: the fetch
 * only ever reads a title and summary, and nothing fetched is returned to the
 * submitter -- it goes to a queue a human reads.
 *
 * Requires the Node.js runtime (node:dns). That is the default for App Router
 * routes; `app/survey/page.tsx` states it explicitly.
 */

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export class BlockedUrlError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "BlockedUrlError";
  }
}

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const ALLOWED_PORTS = new Set(["", "80", "443"]);
const MAX_REDIRECTS = 3;

export interface SafeFetchOptions {
  timeoutMs?: number;
  maxBytes?: number;
  /** Content types that may be read. A prefix match on the header. */
  allowedContentTypes?: string[];
  userAgent?: string;
}

export interface SafeFetchResult {
  /** The URL actually read, after redirects. */
  url: string;
  contentType: string;
  body: string;
  truncated: boolean;
}

/** True only for addresses that are routable on the public internet. */
export function isPublicIPv4(address: string): boolean {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return false;
  }
  const [a, b, c] = parts;

  if (a === 0) return false; // 0.0.0.0/8, "this network"
  if (a === 10) return false; // private
  if (a === 127) return false; // loopback
  if (a === 100 && b >= 64 && b <= 127) return false; // carrier-grade NAT
  if (a === 169 && b === 254) return false; // link-local, incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return false; // private
  if (a === 192 && b === 0) return false; // IETF protocol assignments, TEST-NET-1
  if (a === 192 && b === 88 && c === 99) return false; // 6to4 relay anycast
  if (a === 192 && b === 168) return false; // private
  if (a === 198 && (b === 18 || b === 19)) return false; // benchmarking
  if (a === 198 && b === 51 && c === 100) return false; // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return false; // TEST-NET-3
  if (a >= 224) return false; // multicast, reserved, broadcast

  return true;
}

/** Expand any IPv6 form to its eight hextets. */
function expandIPv6(address: string): number[] | null {
  let text = address.toLowerCase().replace(/^\[|\]$/g, "");
  const zone = text.indexOf("%");
  if (zone !== -1) text = text.slice(0, zone);

  // An IPv4 tail (::ffff:127.0.0.1) becomes two hextets.
  const v4 = text.match(/(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (v4) {
    const octets = v4[1].split(".").map(Number);
    if (octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return null;
    const hi = ((octets[0] << 8) | octets[1]).toString(16);
    const lo = ((octets[2] << 8) | octets[3]).toString(16);
    text = `${text.slice(0, v4.index)}${hi}:${lo}`;
  }

  const [head, tail, ...rest] = text.split("::");
  if (rest.length) return null;

  const parse = (part: string) => (part ? part.split(":").map((h) => parseInt(h, 16)) : []);
  const left = parse(head);
  const right = tail === undefined ? [] : parse(tail);
  if (tail === undefined && left.length !== 8) return null;

  const groups = [...left, ...Array(8 - left.length - right.length).fill(0), ...right];
  if (groups.length !== 8 || groups.some((g) => !Number.isInteger(g) || g < 0 || g > 0xffff)) {
    return null;
  }
  return groups;
}

export function isPublicIPv6(address: string): boolean {
  const g = expandIPv6(address);
  if (!g) return false;

  const [g0, g1, g2, g3, g4, g5] = g;

  if (g.every((h) => h === 0)) return false; // ::
  if (g.slice(0, 7).every((h) => h === 0) && g[7] === 1) return false; // ::1 loopback
  if ((g0 & 0xfe00) === 0xfc00) return false; // fc00::/7 unique local
  if ((g0 & 0xffc0) === 0xfe80) return false; // fe80::/10 link local
  if ((g0 & 0xff00) === 0xff00) return false; // ff00::/8 multicast
  if (g0 === 0x2001 && g1 === 0x0db8) return false; // 2001:db8::/32 documentation

  // IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible: judge the embedded v4.
  const embedded = (hi: number, lo: number) =>
    `${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`;
  if (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0xffff) {
    return isPublicIPv4(embedded(g[6], g[7]));
  }
  if (g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0 && g5 === 0) {
    return isPublicIPv4(embedded(g[6], g[7]));
  }
  // 64:ff9b::/96 NAT64 and 2002::/16 6to4 both carry a v4 address.
  if (g0 === 0x0064 && g1 === 0xff9b) return isPublicIPv4(embedded(g[6], g[7]));
  if (g0 === 0x2002) return isPublicIPv4(embedded(g1, g2));

  return true;
}

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return isPublicIPv4(address);
  if (family === 6) return isPublicIPv6(address);
  return false;
}

/**
 * Parse and check one URL, including what its hostname resolves to.
 * Throws BlockedUrlError with a reason that is safe to log.
 */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new BlockedUrlError("not a valid URL");
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) {
    throw new BlockedUrlError(`protocol ${url.protocol} is not allowed`);
  }
  if (url.username || url.password) {
    throw new BlockedUrlError("URLs with embedded credentials are not allowed");
  }
  if (!ALLOWED_PORTS.has(url.port)) {
    throw new BlockedUrlError(`port ${url.port} is not allowed`);
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (!hostname) throw new BlockedUrlError("no hostname");

  // A literal IP needs no lookup, and must not get one: resolving it would
  // just hand back the same address.
  if (isIP(hostname)) {
    if (!isPublicAddress(hostname)) {
      throw new BlockedUrlError("address is not on the public internet");
    }
    return url;
  }

  // Names that only exist inside a network, before spending a DNS query.
  if (/\.(local|internal|localdomain|home\.arpa)$/i.test(hostname) || hostname === "localhost") {
    throw new BlockedUrlError("hostname is internal-only");
  }

  let addresses: { address: string }[];
  try {
    addresses = await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new BlockedUrlError("hostname does not resolve");
  }
  if (!addresses.length) throw new BlockedUrlError("hostname does not resolve");

  // Every answer must be public, not just the first one.
  const blocked = addresses.find((a) => !isPublicAddress(a.address));
  if (blocked) {
    throw new BlockedUrlError("hostname resolves to a non-public address");
  }

  return url;
}

/** Read a response body up to `maxBytes`, then stop. */
async function readCapped(
  response: Response,
  maxBytes: number,
): Promise<{ body: string; truncated: boolean }> {
  if (!response.body) return { body: "", truncated: false };

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > maxBytes) {
        chunks.push(value.subarray(0, value.byteLength - (total - maxBytes)));
        truncated = true;
        break;
      }
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }

  return { body: new TextDecoder().decode(Buffer.concat(chunks)), truncated };
}

/**
 * Fetch a public URL, checking the destination at every redirect.
 */
export async function safeFetch(
  raw: string,
  options: SafeFetchOptions = {},
): Promise<SafeFetchResult> {
  const {
    timeoutMs = 8000,
    maxBytes = 512 * 1024,
    allowedContentTypes = ["text/html", "application/xhtml+xml", "text/plain"],
    userAgent = "largeagentsystems.org-contribute-bot",
  } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let target = await assertPublicUrl(raw);

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const response = await fetch(target.toString(), {
        signal: controller.signal,
        redirect: "manual", // hand-followed, so every hop gets checked
        headers: { "User-Agent": userAgent, Accept: allowedContentTypes.join(", ") },
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (!location) throw new BlockedUrlError("redirect without a location");
        // Re-checked from scratch: this is the hop a blocklist on the original
        // URL would miss.
        target = await assertPublicUrl(new URL(location, target).toString());
        continue;
      }

      if (!response.ok) {
        throw new BlockedUrlError(`upstream returned ${response.status}`);
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!allowedContentTypes.some((t) => contentType.toLowerCase().startsWith(t))) {
        throw new BlockedUrlError(`content type ${contentType || "unknown"} is not allowed`);
      }

      const { body, truncated } = await readCapped(response, maxBytes);
      return { url: target.toString(), contentType, body, truncated };
    }

    throw new BlockedUrlError("too many redirects");
  } finally {
    clearTimeout(timer);
  }
}
