/**
 * The paper review queue: a private page for picking which scraped papers go
 * to the canon, plus one button that syncs every dataset and publishes.
 *
 * It runs on the host as a systemd --user unit, binds the tailnet address, and
 * internal-site's Caddy serves it at `/las-papers/`. Nothing here is reachable
 * off the tailnet. Same arrangement as kb-gateway, which serves the Discord
 * archive's curation queue at `/kb/`.
 *
 * ## What it holds
 *
 * One file: `review/state/decisions.json`, the decision log. The papers come
 * from `data/las-new-papers.json`, which the daily sync writes. A pick becomes
 * an Airtable Pending Queue row, which is where the canon's intake already
 * lives — this service is a second door onto that queue, not a second queue.
 *
 * Airtable is never read. The free plan caps at 1,000 API calls a month, so
 * one call per pick is the entire budget this service spends.
 *
 * ## Why it renders HTML by hand
 *
 * The site next door is a Next.js app that deploys to Vercel. This is a
 * tailnet-only page with four routes and no client JavaScript, so it is a
 * `node:http` server that returns strings. Every interpolated value goes
 * through `escapeHtml`: paper text is written by a paper's authors and then
 * rewritten by a model, and nothing here escapes on this file's behalf.
 *
 * Usage:
 *   node --experimental-strip-types --env-file=review/.env review/server.mts
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { getPaperDays } from "../lib/papers-data.ts";
import { addPendingSubmission } from "../lib/submission-store.ts";
import { FIELD_LIMITS, sanitizeText } from "../lib/sanitize.ts";
import {
  decisionsPath,
  forgetDecision,
  readDecisions,
  recordDecision,
  type Decision,
} from "./decisions.mts";
import { checkSameOrigin } from "./csrf.mts";
import { escapeHtml, page, safeHref } from "./html.mts";
import { buildQueue, type DecidedItem, type QueueItem } from "./queue.mts";
import { readLastRun, runRebuild, type RebuildRun, type Step } from "./rebuild.mts";
import { toPendingSubmission } from "./submission.mts";

const HERE = dirname(fileURLToPath(import.meta.url));

/**
 * Every knob, with a default that runs from a checkout with no configuration.
 *
 * The bind address defaults to loopback, not the tailnet address. A service
 * that reaches the network by default is one typo away from reaching the wrong
 * one; the systemd unit sets the tailnet address explicitly.
 */
const CONFIG = {
  repo: resolve(process.env.LAS_REVIEW_REPO || join(HERE, "..")),
  bind: process.env.LAS_REVIEW_BIND || "127.0.0.1",
  port: Number(process.env.LAS_REVIEW_PORT || 8789),
  reviewer: process.env.LAS_REVIEW_REVIEWER || "papers-review",
  branch: process.env.LAS_REVIEW_BRANCH || "main",
  npm: process.env.LAS_REVIEW_NPM || "npm",
};
const STATE_DIR = resolve(
  process.env.LAS_REVIEW_STATE_DIR || join(CONFIG.repo, "review", "state"),
);
const PAPERS_PATH = join(CONFIG.repo, "data", "las-new-papers.json");
const LOG_PATH = decisionsPath(STATE_DIR);

/** Bodies are two short fields. Anything larger is not a form this page sent. */
const MAX_BODY = 64 * 1024;

/** Fixed messages, looked up by code. The query string never reaches the page. */
const FLASH: Record<string, { text: string; bad?: boolean }> = {
  added: { text: "Added to the Airtable Pending Queue. Tag it there, then approve it." },
  skipped: { text: "Skipped." },
  undone: { text: "Put back in the queue. Any Airtable row it made is still there." },
  "airtable-failed": {
    text: "Airtable rejected the write. The paper is still in the queue. The reason is below.",
    bad: true,
  },
  "unknown-paper": { text: "No paper on file with that id.", bad: true },
  busy: { text: "A rebuild is already running.", bad: true },
  started: { text: "Rebuild started." },
};

// ---- helpers --------------------------------------------------------------

function html(res: ServerResponse, status: number, body: string): void {
  res.writeHead(status, {
    "content-type": "text/html; charset=utf-8",
    // This page is a view of state that changes on every POST.
    "cache-control": "no-store",
    // same-origin, not no-referrer. `no-referrer` also makes the browser send
    // `Origin: null`, which the CSRF check then reads as a cross-site POST.
    // See review/csrf.mts. This still sends nothing to another site.
    "referrer-policy": "same-origin",
    "x-content-type-options": "nosniff",
  });
  res.end(body);
}

function redirect(res: ServerResponse, to: string): void {
  res.writeHead(303, { location: to, "cache-control": "no-store" });
  res.end();
}

async function readBody(req: IncomingMessage): Promise<URLSearchParams | null> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY) return null;
    chunks.push(chunk as Buffer);
  }
  return new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
}

/** Every paper on file, by arXiv id, with the day it was kept. */
function papersById(): Map<string, QueueItem> {
  const index = new Map<string, QueueItem>();
  for (const day of getPaperDays(PAPERS_PATH)) {
    for (const paper of day.papers) {
      if (!index.has(paper.arxiv_id)) index.set(paper.arxiv_id, { paper, date: day.date });
    }
  }
  return index;
}

// ---- rendering ------------------------------------------------------------

function flashHtml(code: string | null, detail: string): string {
  if (!code) return "";
  const flash = FLASH[code];
  if (!flash) return "";
  const extra = detail ? `<p>${escapeHtml(detail)}</p>` : "";
  return flash.bad
    ? `<div class="banner">${escapeHtml(flash.text)}${extra}</div>`
    : `<p class="counts">${escapeHtml(flash.text)}</p>`;
}

function paperCardHtml(item: QueueItem): string {
  const { paper, date } = item;
  const href = safeHref(paper.url);
  const title = href
    ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(paper.title)}</a>`
    : escapeHtml(paper.title);
  const anchor = paper.nearest_anchor_title
    ? ` · nearest in the canon: ${escapeHtml(paper.nearest_anchor_title)}`
    : "";
  const authors = paper.authors.length
    ? `<p class="summary">${escapeHtml(paper.authors.join(", "))}</p>`
    : "";
  const questions = paper.open_questions.length
    ? `<ul class="questions">${paper.open_questions
        .map((q) => `<li>${escapeHtml(q)}</li>`)
        .join("")}</ul>`
    : "";
  return `<article class="card">
  <p class="title">${title}</p>
  <p class="meta">${escapeHtml(paper.arxiv_id)} · kept ${escapeHtml(date)}${anchor}</p>
  ${authors}
  <p class="summary">${escapeHtml(paper.one_sentence)}</p>
  ${questions}
  <form class="row" method="post" action="decide">
    <input type="hidden" name="arxiv_id" value="${escapeHtml(paper.arxiv_id)}">
    <input type="text" name="note" maxlength="${FIELD_LIMITS.note}" placeholder="Note for whoever tags it (optional)">
    <button class="primary" type="submit" name="action" value="add">Add to canon queue</button>
    <button type="submit" name="action" value="skip">Skip</button>
  </form>
</article>`;
}

function decidedRowHtml(item: DecidedItem): string {
  const state =
    item.decision.decision === "added"
      ? item.decision.airtable_ok
        ? `<span class="ok">added</span>`
        : `<span class="bad">added, Airtable failed</span>`
      : "skipped";
  return `<tr>
  <td>${state}</td>
  <td>${escapeHtml(item.paper.title)}</td>
  <td>${escapeHtml(item.decision.decided_at.slice(0, 16).replace("T", " "))}</td>
  <td><form method="post" action="undo"><input type="hidden" name="arxiv_id" value="${escapeHtml(item.paper.arxiv_id)}"><button type="submit">Undo</button></form></td>
</tr>`;
}

function queuePageHtml(flash: string): string {
  const days = getPaperDays(PAPERS_PATH);
  const queue = buildQueue(days, readDecisions(LOG_PATH));
  const missingKey = !process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID;

  const keyBanner = missingKey
    ? `<div class="banner">AIRTABLE_API_KEY or AIRTABLE_BASE_ID is unset. Picks cannot be written and the canon sync will fail. Set both in review/.env, then restart the service.</div>`
    : "";

  const counts = `<p class="counts">${queue.undecided.length} to review · ${queue.added} added · ${queue.skipped} skipped · ${queue.total} papers on file across ${days.length} days${
    queue.offWindow ? ` · ${queue.offWindow} decided papers have dropped off the 60-day window` : ""
  }</p>`;

  const body = queue.undecided.length
    ? queue.undecided.map(paperCardHtml).join("\n")
    : `<div class="done">Nothing left to review. New papers appear here after the daily sync, which the button on the next page also runs.</div>`;

  const recent = queue.recent.length
    ? `<h2>Recently decided</h2>
<p class="counts">Undo puts a paper back in this queue. It does not delete an Airtable row.</p>
<table><thead><tr><th>State</th><th>Paper</th><th>Decided (UTC)</th><th></th></tr></thead>
<tbody>${queue.recent.map(decidedRowHtml).join("")}</tbody></table>`
    : "";

  return page({
    title: "Paper review queue",
    body: `<h1>Paper review queue</h1>
<p class="sub">Pick which scraped papers go to the canon. A pick becomes an Airtable Pending Queue row, tagged and approved there.</p>
${keyBanner}${flash}${counts}
${body}
${recent}`,
  });
}

function stepRowHtml(step: Step): string {
  const code =
    step.exit_code === 0
      ? `<span class="ok">0</span>`
      : `<span class="bad">${escapeHtml(step.exit_code)}</span>`;
  const output = step.output
    ? `<pre>${escapeHtml(step.output)}</pre>`
    : `<span class="counts">no output</span>`;
  return `<tr><td>${escapeHtml(step.name)}</td><td>${code}</td><td><code>${escapeHtml(step.command)}</code>${output}</td></tr>`;
}

function rebuildPageHtml(flash: string): string {
  const last = readLastRun(STATE_DIR);
  const running = last?.state === "running";

  const stateLine = last
    ? (() => {
        const label: Record<RebuildRun["state"], string> = {
          running: "running",
          ok: "pushed",
          "no-change": "no change to publish",
          failed: "failed",
        };
        const started = last.started_at.slice(0, 19).replace("T", " ");
        const seconds = last.finished_at
          ? Math.round(
              (Date.parse(last.finished_at) - Date.parse(last.started_at)) / 1000,
            )
          : Math.round((Date.now() - Date.parse(last.started_at)) / 1000);
        const klass = last.state === "failed" ? "bad" : last.state === "ok" ? "ok" : "";
        return `<p>Last run started ${escapeHtml(started)} UTC, ${escapeHtml(seconds)} s, <span class="${klass}">${escapeHtml(label[last.state])}</span>.</p>`;
      })()
    : `<p class="counts">No run yet.</p>`;

  const error = last?.error
    ? `<div class="banner">${escapeHtml(last.error)}</div>`
    : "";

  const steps = last?.steps.length
    ? `<table><thead><tr><th>Step</th><th>Exit</th><th>Command and output</th></tr></thead>
<tbody>${last.steps.map(stepRowHtml).join("")}</tbody></table>`
    : "";

  const button = `<form class="row" method="post" action="rebuild">
  <button class="primary" type="submit"${running ? " disabled" : ""}>${running ? "Running…" : "Sync and publish"}</button>
</form>`;

  return page({
    title: "Sync and publish",
    // While a run is in flight the page reloads itself. A meta refresh, not a
    // script: no page here runs JavaScript.
    refreshSeconds: running ? 5 : undefined,
    body: `<h1>Sync and publish</h1>
<p class="sub">Fast-forwards <code>${escapeHtml(CONFIG.branch)}</code>, refreshes the canon, the reading list, the papers map and the events, commits whatever changed under <code>data/</code>, and pushes. Vercel deploys the push.</p>
${flash}${error}${stateLine}
${button}
${steps}`,
  });
}

// ---- actions --------------------------------------------------------------

/** The last Airtable failure, shown once on the page that follows it. */
let lastAirtableError = "";
/** The rebuild in flight, if any. One per process; the lock guards the rest. */
let inFlight: Promise<RebuildRun> | null = null;

async function decide(params: URLSearchParams): Promise<string> {
  const arxivId = sanitizeText(params.get("arxiv_id"), 40);
  const action = params.get("action");
  const note = params.get("note") ?? "";
  const item = papersById().get(arxivId);
  if (!item) return "unknown-paper";

  if (action === "skip") {
    recordDecision(LOG_PATH, {
      arxiv_id: arxivId,
      decision: "skipped",
      decided_at: new Date().toISOString(),
      note: sanitizeText(note, FIELD_LIMITS.note),
      airtable_ok: true,
      airtable_error: "",
    });
    return "skipped";
  }

  if (action !== "add") return "unknown-paper";

  const submission = toPendingSubmission(item.paper, item.date, {
    reviewer: CONFIG.reviewer,
    note,
  });

  const decision: Decision = {
    arxiv_id: arxivId,
    decision: "added",
    decided_at: new Date().toISOString(),
    note: sanitizeText(note, FIELD_LIMITS.note),
    airtable_ok: true,
    airtable_error: "",
  };

  try {
    await addPendingSubmission(submission);
  } catch (err) {
    // The paper stays in the queue: a failed write must not look like a pick.
    // The reason goes on the page so the cause is visible, not guessed at.
    lastAirtableError = err instanceof Error ? err.message : String(err);
    return "airtable-failed";
  }

  recordDecision(LOG_PATH, decision);
  return "added";
}

function startRebuild(): string {
  if (inFlight) return "busy";
  inFlight = runRebuild({
    repo: CONFIG.repo,
    stateDir: STATE_DIR,
    branch: CONFIG.branch,
    npm: CONFIG.npm,
    env: process.env,
  }).finally(() => {
    inFlight = null;
  });
  return "started";
}

// ---- routing --------------------------------------------------------------

async function handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const method = req.method ?? "GET";

  if (path === "/healthz") {
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    res.end("ok\n");
    return;
  }

  if (method === "POST") {
    const verdict = checkSameOrigin(req.headers as Parameters<typeof checkSameOrigin>[0]);
    if (!verdict.ok) {
      // The reason goes on the page, not only into the log. This service has
      // one reviewer on a tailnet, and a refusal with no reason cost an hour
      // once already — see the header comment in csrf.mts.
      console.warn("refused a POST:", verdict.reason);
      html(
        res,
        403,
        page({
          title: "Refused",
          body: `<h1>Refused</h1>
<p>This looks like a form sent from another site, so nothing was written.</p>
<p class="counts">${escapeHtml(verdict.reason)}</p>
<p><a href=".">Back to the queue</a></p>`,
        }),
      );
      return;
    }
    const params = await readBody(req);
    if (!params) {
      html(res, 413, page({ title: "Too large", body: "<h1>Too large</h1><p>That body is bigger than this page sends.</p>" }));
      return;
    }

    if (path === "/decide") {
      redirect(res, `.?msg=${await decide(params)}`);
      return;
    }
    if (path === "/undo") {
      const arxivId = sanitizeText(params.get("arxiv_id"), 40);
      forgetDecision(LOG_PATH, arxivId);
      redirect(res, ".?msg=undone");
      return;
    }
    if (path === "/rebuild") {
      redirect(res, `rebuild?msg=${startRebuild()}`);
      return;
    }
  }

  if (method === "GET" || method === "HEAD") {
    const code = url.searchParams.get("msg");
    // Read once and clear: the reason belongs to the redirect that follows the
    // failure, not to every later page load.
    const detail = code === "airtable-failed" ? lastAirtableError : "";
    if (detail) lastAirtableError = "";
    const flash = flashHtml(code, detail);
    if (path === "/") {
      html(res, 200, queuePageHtml(flash));
      return;
    }
    if (path === "/rebuild") {
      html(res, 200, rebuildPageHtml(flash));
      return;
    }
  }

  html(res, 404, page({ title: "Not found", body: `<h1>Not found</h1><p><a href=".">Back to the queue</a></p>` }));
}

const server = createServer((req, res) => {
  handle(req, res).catch((err) => {
    // One bad request must not take the process down. The reviewer sees a
    // page; the console keeps the trace.
    console.error("request failed:", err);
    if (!res.headersSent) {
      html(res, 500, page({ title: "Error", body: "<h1>Error</h1><p>The server log has the trace.</p>" }));
    } else {
      res.end();
    }
  });
});

server.listen(CONFIG.port, CONFIG.bind, () => {
  console.log(
    `paper review queue on http://${CONFIG.bind}:${CONFIG.port}  repo=${CONFIG.repo}  state=${STATE_DIR}`,
  );
});
