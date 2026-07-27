"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { submitSource, type ContributeState } from "@/app/survey/actions";

const initialContributeState: ContributeState = { status: "idle", message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 inline-block bg-foreground px-8 py-3.5 text-sm font-medium uppercase tracking-wide text-background transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Submitting…" : "Submit source"}
    </button>
  );
}

export function ContributeForm() {
  const [state, formAction] = useActionState(submitSource, initialContributeState);

  return (
    <form action={formAction} className="max-w-xl">
      <div>
        <label
          htmlFor="url"
          className="font-mono text-xs uppercase tracking-[0.2em] text-muted"
        >
          URL
        </label>
        <input
          id="url"
          name="url"
          type="url"
          required
          placeholder="https://arxiv.org/abs/..."
          className="mt-2 w-full border-b border-rule bg-transparent py-2 text-base text-foreground outline-none focus:border-accent"
        />
      </div>

      <div className="mt-6">
        <label
          htmlFor="note"
          className="font-mono text-xs uppercase tracking-[0.2em] text-muted"
        >
          Note (optional)
        </label>
        <textarea
          id="note"
          name="note"
          rows={3}
          placeholder="Why does this belong in the canon?"
          className="mt-2 w-full resize-none border-b border-rule bg-transparent py-2 text-base text-foreground outline-none focus:border-accent"
        />
      </div>

      <div className="mt-6">
        <label
          htmlFor="submittedBy"
          className="font-mono text-xs uppercase tracking-[0.2em] text-muted"
        >
          Your name or email (optional)
        </label>
        <input
          id="submittedBy"
          name="submittedBy"
          type="text"
          placeholder="So we can follow up if needed"
          className="mt-2 w-full border-b border-rule bg-transparent py-2 text-base text-foreground outline-none focus:border-accent"
        />
      </div>

      <SubmitButton />

      {state.status !== "idle" && (
        <p
          role="status"
          className={`mt-4 text-sm leading-relaxed ${
            state.status === "error" ? "text-accent" : "text-foreground/70"
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
