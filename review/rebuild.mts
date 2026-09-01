/**
 * The "Sync and publish" button: refresh every synced dataset, commit what
 * changed, push to main.
 *
 * The site deploys from main through Vercel, so the push is the deploy. This
 * runs no build of its own.
 *
 * Order matters. The fast-forward comes first, because the three sync
 * workflows in `.github/workflows/` push to the same branch on their own
 * schedule and this checkout is usually behind them. The syncs then write onto
 * current data, and only `data/` is ever staged.
 *
 * | Step | Why it is here |
 * |---|---|
 * | `git fetch` + `git merge --ff-only` | the daily workflows push to main too |
 * | `sync:airtable` | picks made here land in Airtable, not in a file |
 * | `sync:las-new-papers` | the reading list the queue itself reads |
 * | `build:papers-map` | the UMAP projection over the papers just synced |
 * | `sync:las-conferences-events` | the third dataset, on the same button |
 * | `git add -- data` | nothing outside `data/` is ever committed by a button |
 * | `git commit` + `git push` | Vercel deploys the push |
 *
 * Three guards run before any of it, because this button pushes to a live
 * site from a working checkout:
 *
 * 1. **One run at a time.** A lock directory, created with `mkdir`, which is
 *    atomic. Never a read-then-write check — two callers who both read "not
 *    running" would both start.
 * 2. **On the expected branch.** A push from a feature branch would either
 *    fail or publish the wrong tree.
 * 3. **Nothing dirty outside `data/`.** Editing this repo and pressing the
 *    button would otherwise publish that edit. The run aborts and names the
 *    paths.
 */

import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

/** Kept per step. Long enough for a stack trace, short enough for a page. */
const OUTPUT_TAIL = 4000;

/** A step that has run, or failed to. */
export interface Step {
  name: string;
  /** The argv, joined for display. Never a shell string: see `exec`. */
  command: string;
  exit_code: number;
  output: string;
}

export interface RebuildRun {
  /** ISO 8601, UTC. */
  started_at: string;
  finished_at: string;
  /** "running" while in flight. */
  state: "running" | "ok" | "no-change" | "failed";
  steps: Step[];
  /** Why it failed, in one sentence. "" when it did not. */
  error: string;
}

export interface RebuildOptions {
  /** The checkout to run in. */
  repo: string;
  /** Where the lock and the last-run record live. */
  stateDir: string;
  /** The branch this button is allowed to push. */
  branch: string;
  /** The npm binary. The systemd unit sets it, because PATH there is minimal. */
  npm: string;
  /** Environment for the child processes. Carries `AIRTABLE_API_KEY`. */
  env: NodeJS.ProcessEnv;
}

export function lockPath(stateDir: string): string {
  return join(stateDir, "rebuild.lock");
}

export function lastRunPath(stateDir: string): string {
  return join(stateDir, "last-rebuild.json");
}

function tail(text: string): string {
  const trimmed = text.trimEnd();
  return trimmed.length > OUTPUT_TAIL
    ? `...\n${trimmed.slice(-OUTPUT_TAIL)}`
    : trimmed;
}

/**
 * Runs one argv and returns its exit code and combined output.
 *
 * An argv array, never a shell string: nothing here interpolates a value into
 * a command, so there is no quoting to get wrong.
 */
async function exec(
  name: string,
  argv: string[],
  options: RebuildOptions,
): Promise<Step> {
  const [file, ...args] = argv;
  try {
    const { stdout, stderr } = await run(file, args, {
      cwd: options.repo,
      env: options.env,
      maxBuffer: 16 * 1024 * 1024,
      // A sync that hangs on a network read must not hold the lock forever.
      timeout: 10 * 60 * 1000,
    });
    return { name, command: argv.join(" "), exit_code: 0, output: tail(stdout + stderr) };
  } catch (err) {
    const e = err as { code?: number; stdout?: string; stderr?: string; message?: string };
    return {
      name,
      command: argv.join(" "),
      exit_code: typeof e.code === "number" ? e.code : 1,
      output: tail(`${e.stdout ?? ""}${e.stderr ?? ""}${e.message ?? ""}`),
    };
  }
}

/**
 * Returns the paths that are dirty outside `data/`, or an empty list.
 *
 * `git status --porcelain` prints two status columns, a space, then the path.
 * A rename prints `old -> new`; both sides are checked, because staging a
 * rename out of `data/` would commit the destination.
 */
export function dirtyOutsideData(porcelain: string): string[] {
  const paths: string[] = [];
  for (const line of porcelain.split("\n")) {
    if (line.trim() === "") continue;
    const path = line.slice(3);
    for (const side of path.split(" -> ")) {
      const cleaned = side.replace(/^"|"$/g, "").trim();
      if (cleaned && !cleaned.startsWith("data/")) paths.push(cleaned);
    }
  }
  return [...new Set(paths)];
}

/** Reads the counts the commit message states. Returns "" for a file it cannot read. */
function dataCounts(repo: string): string {
  const read = (relative: string) => {
    try {
      return JSON.parse(readFileSync(join(repo, relative), "utf8"));
    } catch {
      return null;
    }
  };
  const canon = read("data/las-canon.airtable.json");
  const days = read("data/las-new-papers.json");
  const map = read("data/las-new-papers-map.json");
  const events = read("data/las-conferences-events.json");
  const papers = Array.isArray(days)
    ? days.reduce((n: number, d: { papers?: unknown[] }) => n + (d.papers?.length ?? 0), 0)
    : null;
  const parts = [
    Array.isArray(canon) ? `canon ${canon.length} rows` : "",
    Array.isArray(days) ? `papers ${papers} across ${days.length} days` : "",
    map && Array.isArray(map.points) ? `map ${map.points.length} points` : "",
    Array.isArray(events) ? `events ${events.length}` : "",
  ].filter(Boolean);
  return parts.join(", ");
}

/**
 * Takes the lock, or returns null when another run holds it.
 *
 * `mkdir` fails when the directory exists, in one system call. That is the
 * atomicity this needs.
 */
export function acquireLock(stateDir: string): (() => void) | null {
  const path = lockPath(stateDir);
  mkdirSync(stateDir, { recursive: true });
  try {
    mkdirSync(path);
  } catch {
    return null;
  }
  writeFileSync(
    join(path, "owner.json"),
    JSON.stringify({ pid: process.pid, started_at: new Date().toISOString() }) + "\n",
    "utf8",
  );
  return () => rmSync(path, { recursive: true, force: true });
}

/** Reads the last run, or null when there has not been one. */
export function readLastRun(stateDir: string): RebuildRun | null {
  const path = lastRunPath(stateDir);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as RebuildRun;
  } catch {
    return null;
  }
}

function saveRun(stateDir: string, run: RebuildRun): void {
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(lastRunPath(stateDir), JSON.stringify(run, null, 2) + "\n", "utf8");
}

/**
 * Runs the whole sequence. Writes the result to `last-rebuild.json` as it
 * goes, so the page can show a run in flight.
 *
 * Returns the finished run. Never throws: a failure is a `RebuildRun` with
 * `state: "failed"` and the step that failed.
 */
export async function runRebuild(options: RebuildOptions): Promise<RebuildRun> {
  const release = acquireLock(options.stateDir);
  const started = new Date().toISOString();
  const result: RebuildRun = {
    started_at: started,
    finished_at: "",
    state: "running",
    steps: [],
    error: "",
  };

  if (!release) {
    return {
      ...result,
      finished_at: started,
      state: "failed",
      error: "A rebuild is already running.",
    };
  }

  const fail = (error: string): RebuildRun => {
    const finished: RebuildRun = {
      ...result,
      finished_at: new Date().toISOString(),
      state: "failed",
      error,
    };
    saveRun(options.stateDir, finished);
    return finished;
  };

  try {
    saveRun(options.stateDir, result);

    if (!options.env.AIRTABLE_API_KEY) {
      return fail(
        "AIRTABLE_API_KEY is unset, so the canon sync would fail. Set it in review/.env.",
      );
    }

    const branch = await exec("branch", ["git", "rev-parse", "--abbrev-ref", "HEAD"], options);
    result.steps.push(branch);
    if (branch.exit_code !== 0) return fail("Could not read the current branch.");
    if (branch.output.trim() !== options.branch) {
      return fail(
        `The checkout is on ${branch.output.trim()}, not ${options.branch}. This button only publishes ${options.branch}.`,
      );
    }

    const status = await exec("status", ["git", "status", "--porcelain"], options);
    result.steps.push(status);
    if (status.exit_code !== 0) return fail("Could not read the working tree state.");
    const dirty = dirtyOutsideData(status.output);
    if (dirty.length > 0) {
      return fail(
        `The checkout has changes outside data/: ${dirty.join(", ")}. Commit or discard them first.`,
      );
    }

    const sequence: Array<[string, string[]]> = [
      ["fetch", ["git", "fetch", "origin", options.branch]],
      ["fast-forward", ["git", "merge", "--ff-only", `origin/${options.branch}`]],
      ["sync canon", [options.npm, "run", "sync:airtable"]],
      ["sync papers", [options.npm, "run", "sync:las-new-papers"]],
      ["build papers map", [options.npm, "run", "build:papers-map"]],
      ["sync events", [options.npm, "run", "sync:las-conferences-events"]],
      ["stage data", ["git", "add", "--", "data"]],
    ];

    for (const [name, argv] of sequence) {
      const step = await exec(name, argv, options);
      result.steps.push(step);
      saveRun(options.stateDir, result);
      if (step.exit_code !== 0) return fail(`Step "${name}" exited ${step.exit_code}.`);
    }

    const staged = await exec("check staged", ["git", "diff", "--cached", "--quiet"], options);
    result.steps.push(staged);
    if (staged.exit_code === 0) {
      const finished: RebuildRun = {
        ...result,
        finished_at: new Date().toISOString(),
        state: "no-change",
        error: "",
      };
      saveRun(options.stateDir, finished);
      return finished;
    }

    // No `[skip ci]` here, unlike the commits the sync workflows make.
    // Vercel honours that marker and would skip the deploy, which is the one
    // thing this button exists to cause. The three workflows in
    // `.github/workflows/` run on `schedule` and `workflow_dispatch` only, so
    // this push triggers none of them either way.
    const counts = dataCounts(options.repo);
    const message = counts
      ? `chore: sync data from the review queue (${counts})`
      : "chore: sync data from the review queue";

    for (const [name, argv] of [
      ["commit", ["git", "commit", "-m", message]],
      ["push", ["git", "push", "origin", options.branch]],
    ] as Array<[string, string[]]>) {
      const step = await exec(name, argv, options);
      result.steps.push(step);
      saveRun(options.stateDir, result);
      if (step.exit_code !== 0) return fail(`Step "${name}" exited ${step.exit_code}.`);
    }

    const finished: RebuildRun = {
      ...result,
      finished_at: new Date().toISOString(),
      state: "ok",
      error: "",
    };
    saveRun(options.stateDir, finished);
    return finished;
  } finally {
    release();
  }
}
