"use server";

import type { PendingSubmission } from "@/lib/canon-schema";
import { fetchSourceMetadata } from "@/lib/source-metadata";
import { addPendingSubmission } from "@/lib/submission-store";

export interface ContributeState {
  status: "idle" | "success" | "error";
  message: string;
}

export async function submitSource(
  _prevState: ContributeState,
  formData: FormData,
): Promise<ContributeState> {
  const rawUrl = String(formData.get("url") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const submittedBy = String(formData.get("submittedBy") ?? "").trim();

  let url: URL;
  try {
    url = new URL(rawUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("unsupported protocol");
    }
  } catch {
    return { status: "error", message: "Enter a valid http(s) URL." };
  }

  const metadata = await fetchSourceMetadata(url.toString());

  // Dimension tags are intentionally left blank: Task A's tagging is a
  // careful per-paper read, not a keyword heuristic, and faking it here
  // would put low-confidence tags in front of a reviewer as if they were
  // real ones. A human assigns these during review.
  const submission: PendingSubmission = {
    title: metadata.title || url.toString(),
    itemType: "webpage",
    creators: metadata.creators,
    date: metadata.date,
    url: url.toString(),
    tags: "",
    summary: metadata.summary,
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
