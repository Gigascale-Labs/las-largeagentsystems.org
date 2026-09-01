/**
 * HTML for the review queue: the escape function, and the page shell.
 *
 * This service renders HTML by string concatenation, not React, so nothing
 * escapes on its behalf. Every paper title, author list, summary and question
 * on the page is third-party text twice over — written by a paper's authors,
 * then rewritten by a model — and `lib/papers-data.ts` cleans it for storage
 * but does not escape it for markup. `escapeHtml` is the only thing between
 * that text and the browser. Call it on every interpolated value.
 *
 * The palette matches internal-site, which this page is served beside.
 *
 * Every link and form action is relative. Caddy serves this app under
 * `/las-papers/` with the prefix stripped, so an absolute `/rebuild` would
 * resolve at the internal-site root and 404. Same rule kb-gateway follows.
 */

/**
 * Escapes the five characters that change how markup parses.
 *
 * `'` is escaped as well as `"`: an attribute written with single quotes is
 * legal HTML, and this function should not depend on which quote its callers
 * chose.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Returns `url` when it is an http(s) URL, and "" otherwise.
 *
 * Same rule as `safeUrl` in `lib/papers-data.ts`: these values become `href`s,
 * so the scheme is the check that matters. `javascript:` and `data:` never
 * reach an attribute.
 */
export function safeHref(value: string): string {
  return /^https?:\/\//i.test(value) ? value : "";
}

const STYLE = `
:root {
  --bg: #f4f1ea; --card: #fffdf8; --ink: #2b2118; --muted: #7a6a58;
  --accent: #b5651d; --accent-ink: #fffdf8; --line: #e3dace;
  --ok: #2f6b3a; --bad: #8a3a12; --alert-bg: #fdf0e7; --alert-line: #e0b394;
  --log-bg: #f6f2ea;
  color-scheme: light;
}
* { box-sizing: border-box; }
body {
  margin: 0; padding: 2rem 1.5rem 4rem; background: var(--bg); color: var(--ink);
  font: 15px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}
main { max-width: 54rem; margin: 0 auto; }
h1 { font-size: 1.5rem; margin: 0 0 .25rem; }
h2 { font-size: 1.05rem; margin: 2rem 0 .75rem; }
a { color: var(--accent); }
p { margin: .4rem 0; }
.sub { color: var(--muted); margin: 0 0 1.5rem; }
nav { margin: 0 0 1.5rem; font-size: .9rem; }
nav a { margin-right: 1rem; }
.card {
  background: var(--card); border: 1px solid var(--line); border-radius: 6px;
  padding: 1rem 1.15rem; margin: 0 0 1rem;
}
.title { font-size: 1.05rem; font-weight: 600; margin: 0 0 .3rem; }
.meta { color: var(--muted); font-size: .82rem; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; margin: 0 0 .6rem; }
.summary { margin: 0 0 .7rem; }
ul.questions { margin: .4rem 0 .8rem; padding-left: 1.1rem; color: var(--muted); font-size: .9rem; }
ul.questions li { margin: .2rem 0; }
form.row { display: flex; flex-wrap: wrap; gap: .5rem; align-items: center; margin: .6rem 0 0; }
input[type=text] {
  flex: 1 1 16rem; min-width: 12rem; padding: .45rem .6rem; font: inherit;
  border: 1px solid var(--line); border-radius: 4px; background: var(--bg); color: var(--ink);
}
button {
  font: inherit; padding: .45rem .9rem; border-radius: 4px; cursor: pointer;
  border: 1px solid var(--line); background: var(--card); color: var(--ink);
}
button.primary { background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }
button:disabled { opacity: .5; cursor: not-allowed; }
.counts { color: var(--muted); font-size: .9rem; }
.banner {
  background: var(--alert-bg); border: 1px solid var(--alert-line); color: var(--bad);
  border-radius: 6px; padding: .8rem 1rem; margin: 0 0 1.25rem;
}
.done { background: var(--card); border: 1px solid var(--line); border-radius: 6px; padding: 1.25rem; color: var(--muted); }
table { border-collapse: collapse; width: 100%; font-size: .9rem; }
th, td { text-align: left; padding: .4rem .6rem; border-bottom: 1px solid var(--line); vertical-align: top; }
th { color: var(--muted); font-weight: 600; }
pre {
  background: var(--log-bg); border: 1px solid var(--line); border-radius: 4px;
  padding: .7rem .8rem; overflow-x: auto; font-size: .82rem; margin: .4rem 0 0;
  white-space: pre-wrap; word-break: break-word;
}
.ok { color: var(--ok); }
.bad { color: var(--bad); }
`;

/**
 * Wraps `body` in the page shell.
 *
 * `refreshSeconds` adds a meta refresh, which the rebuild page uses while a
 * run is in flight. It is a meta tag and not a script: this page runs no
 * JavaScript, the same rule internal-site's own pages hold to.
 */
export function page({
  title,
  body,
  refreshSeconds,
}: {
  title: string;
  body: string;
  refreshSeconds?: number;
}): string {
  const refresh =
    refreshSeconds && refreshSeconds > 0
      ? `<meta http-equiv="refresh" content="${Math.round(refreshSeconds)}">`
      : "";
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
${refresh}
<style>${STYLE}</style>
</head><body><main>
<nav><a href=".">Queue</a><a href="rebuild">Sync and publish</a></nav>
${body}
</main></body></html>
`;
}
