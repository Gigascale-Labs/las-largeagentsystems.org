/**
 * Metadata lookup for a contribute-a-source submission.
 *
 * Never throws. A failed or partial fetch means a reviewer fills in more by
 * hand, which is the intended fallback.
 *
 * The URL comes from the public, so every request goes through `safeFetch`
 * (see lib/safe-fetch.ts). Everything read back is third-party text, so it is
 * cleaned and length-capped before it goes anywhere.
 */

import { safeFetch, BlockedUrlError } from "./safe-fetch";
import { FIELD_LIMITS, sanitizeHtmlText, sanitizeText } from "./sanitize";

export interface FetchedMetadata {
  title: string;
  creators: string;
  date: string;
  summary: string;
}

const EMPTY: FetchedMetadata = { title: "", creators: "", date: "", summary: "" };

const TIMEOUT_MS = 8000;
const MAX_HTML_BYTES = 512 * 1024;
const MAX_XML_BYTES = 256 * 1024;

function extractMetaContent(html: string, key: string): string | undefined {
  const tag = html.match(
    new RegExp(`<meta\\s+[^>]*(?:property|name)=["']${key}["'][^>]*>`, "i"),
  )?.[0];
  return tag?.match(/content=["']([^"']*)["']/i)?.[1];
}

async function fetchArxivMetadata(arxivId: string): Promise<FetchedMetadata> {
  const { body } = await safeFetch(
    `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(arxivId)}`,
    {
      timeoutMs: TIMEOUT_MS,
      maxBytes: MAX_XML_BYTES,
      allowedContentTypes: ["application/atom+xml", "application/xml", "text/xml"],
    },
  );

  const entry = body.match(/<entry>([\s\S]*?)<\/entry>/)?.[1] ?? "";
  const title = entry.match(/<title>([\s\S]*?)<\/title>/)?.[1];
  const summary = entry.match(/<summary>([\s\S]*?)<\/summary>/)?.[1];
  const published = entry.match(/<published>(\d{4})/)?.[1];
  const authors = [...entry.matchAll(/<author>\s*<name>([\s\S]*?)<\/name>/g)].map((m) =>
    sanitizeHtmlText(m[1], 120),
  );

  return {
    title: sanitizeHtmlText(title, FIELD_LIMITS.title),
    creators: sanitizeText(authors.filter(Boolean).join("; "), FIELD_LIMITS.creators),
    date: /^\d{4}$/.test(published ?? "") ? (published as string) : "",
    summary: sanitizeHtmlText(summary, FIELD_LIMITS.summary),
  };
}

async function fetchGenericMetadata(url: string): Promise<FetchedMetadata> {
  const { body } = await safeFetch(url, {
    timeoutMs: TIMEOUT_MS,
    maxBytes: MAX_HTML_BYTES,
    allowedContentTypes: ["text/html", "application/xhtml+xml"],
  });

  const titleTag = body.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const ogTitle = extractMetaContent(body, "og:title");
  const ogDescription =
    extractMetaContent(body, "og:description") ?? extractMetaContent(body, "description");

  return {
    title: sanitizeHtmlText(ogTitle ?? titleTag ?? "", FIELD_LIMITS.title),
    creators: "",
    date: "",
    summary: sanitizeHtmlText(ogDescription ?? "", FIELD_LIMITS.summary),
  };
}

export async function fetchSourceMetadata(rawUrl: string): Promise<FetchedMetadata> {
  try {
    const url = new URL(rawUrl);

    // arXiv has an API, so use it instead of scraping the abstract page. The
    // ID must match arXiv's own format, so nothing else reaches the query.
    const arxivId = /(^|\.)arxiv\.org$/i.test(url.hostname)
      ? url.pathname.match(/\/abs\/(\d{4}\.\d{4,5})(v\d+)?$/)?.[1]
      : undefined;

    return arxivId
      ? await fetchArxivMetadata(arxivId)
      : await fetchGenericMetadata(url.toString());
  } catch (err) {
    // A blocked URL belongs in the log: someone pointed the form somewhere it
    // should not go, or a site is misbehaving.
    if (err instanceof BlockedUrlError) {
      console.warn("Metadata lookup blocked:", err.message);
    }
    return EMPTY;
  }
}
