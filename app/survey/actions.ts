"use server";

import type { PendingSubmission } from "@/lib/canon-schema";
import { assertPublicUrl, BlockedUrlError } from "@/lib/safe-fetch";
import { FIELD_LIMITS, sanitizeText } from "@/lib/sanitize";
import { fetchSourceMetadata } from "@/lib/source-metadata";
import { addPendingSubmission } from "@/lib/submission-store";

export interface ContributeState {
  status: "idle" | "success" | "error";
  message: string;
}

/**
 * Accepts a submission from the contribute form.
 *
 * This is a public POST endpoint, reachable directly and not only through the
 * form. It is meant to be open: anyone may contribute a source, with no
 * account. So nothing arriving here is trusted. Every field is length-capped
 * and stripped of invisible and control characters before storage, and the URL
 * is checked (lib/safe-fetch.ts) before the server requests it.
 */
export async function submitSource(
  _prevState: ContributeState,
  formData: FormData,
): Promise<ContributeState> {
  // Cap first. An oversized field then costs nothing.
  const rawUrl = sanitizeText(String(formData.get("url") ?? ""), FIELD_LIMITS.url);
  const note = sanitizeText(String(formData.get("note") ?? ""), FIELD_LIMITS.note);
  const submittedBy = sanitizeText(
    String(formData.get("submittedBy") ?? ""),
    FIELD_LIMITS.submittedBy,
  );

  let url: URL;
  try {
    url = await assertPublicUrl(rawUrl);
  } catch (err) {
    if (err instanceof BlockedUrlError) {
      console.warn("Contribute form rejected a URL:", err.message);
    }
    // One message for every rejection. A specific reason would turn this
    // form into a network scanner.
    return {
      status: "error",
      message: "Enter a valid, publicly reachable http(s) URL.",
    };
  }

  const metadata = await fetchSourceMetadata(url.toString());

  // Dimension tags are intentionally left blank: Task A's tagging is a
  // careful per-paper read, not a keyword heuristic, and faking it here
  // would put low-confidence tags in front of a reviewer as if they were
  // real ones. A human assigns these during review.
  const submission: PendingSubmission = {
    title: sanitizeText(metadata.title || url.toString(), FIELD_LIMITS.title),
    itemType: "webpage",
    creators: sanitizeText(metadata.creators, FIELD_LIMITS.creators),
    date: sanitizeText(metadata.date, FIELD_LIMITS.date),
    url: url.toString(),
    tags: "",
    summary: sanitizeText(metadata.summary, FIELD_LIMITS.summary),
    tag_confidence: "summary-only",
    submitted_by: submittedBy || "anonymous",
    submitter_note: note || undefined,
    status: "pending",
  };

  try {
    await addPendingSubmission(submission);
  } catch (err) {
    console.error("Failed to submit to Airtable Pending Queue:", err);
    return {
      status: "error",
      message: "Something went wrong submitting this - please try again.",
    };
  }

  return {
    status: "success",
    message:
      "Thanks - this is queued for review. A maintainer will tag it and merge it into the canon if it fits.",
  };
}
