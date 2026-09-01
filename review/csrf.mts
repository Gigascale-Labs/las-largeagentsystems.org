/**
 * Decides whether a POST came from this service's own pages.
 *
 * This service is on the tailnet, which is not the same as unreachable: a page
 * a reviewer opens anywhere can post a form to a tailnet address. Two headers
 * settle it, and the order matters.
 *
 * | Header | Set by | Used for |
 * |---|---|---|
 * | `Sec-Fetch-Site` | the browser, not page script | the primary check |
 * | `Origin` | the browser | the fallback for clients that omit the first |
 *
 * ## The bug this module was extracted for
 *
 * OBSERVED 2026-09-01, n=1, Chromium 151 through Caddy: every form on the
 * queue page returned 403. The response carried `Referrer-Policy: no-referrer`,
 * which the fetch spec says serialises a request's origin as the literal string
 * `"null"`. `new URL("null")` throws, the old check caught the throw and
 * refused, and a same-origin POST from the service's own page was rejected.
 *
 * MEASURED, same browser and route, changing only the response header:
 *
 * | `Referrer-Policy` | `Origin` sent | POST /decide |
 * |---|---|---|
 * | `no-referrer` | `null` | 403 |
 * | `same-origin` | `https://system-1.blenny-ratio.ts.net` | 303 |
 *
 * Two changes came out of it. The response now sets `Referrer-Policy:
 * same-origin`, which still sends nothing to another site but leaves a usable
 * origin on the service's own requests. And `"null"` is read here as "the
 * browser withheld the origin", not as a mismatch — a request that withholds
 * it is judged on `Sec-Fetch-Site` alone.
 *
 * ASSUMED: every browser that withholds `Origin` sends `Sec-Fetch-Site`.
 * Chrome, Firefox and Safari have shipped it since 2020. A browser that sends
 * neither is accepted, which is also what `curl` from the host looks like.
 * NOT CHECKED: any browser other than Chromium 151.
 */

/** The headers this check reads. Node lower-cases every incoming header name. */
export interface RequestHeaders {
  host?: string;
  origin?: string;
  "sec-fetch-site"?: string;
}

export interface OriginVerdict {
  ok: boolean;
  /** Why it was refused, for the page and the log. "" when accepted. */
  reason: string;
}

/**
 * A browser sends this when it has an origin but will not disclose it. It is
 * not a URL, so it must never reach `new URL`.
 */
const WITHHELD = "null";

export function checkSameOrigin(headers: RequestHeaders): OriginVerdict {
  const site = headers["sec-fetch-site"];
  if (typeof site === "string" && site !== "") {
    // `none` is a typed address or a bookmark. `same-origin` is this page.
    // Anything else — `cross-site`, `same-site` — is another site's request.
    if (site !== "same-origin" && site !== "none") {
      return { ok: false, reason: `Sec-Fetch-Site was "${site}".` };
    }
  }

  const origin = headers.origin;
  if (typeof origin === "string" && origin !== "" && origin !== WITHHELD) {
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      return { ok: false, reason: `Origin "${origin}" is not a URL.` };
    }
    if (originHost !== headers.host) {
      return {
        ok: false,
        reason: `Origin host "${originHost}" is not the requested host "${headers.host ?? ""}".`,
      };
    }
  }

  return { ok: true, reason: "" };
}
