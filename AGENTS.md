<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Before you write

| Doing this | Read first |
|---|---|
| Adding a page over a dataset from another repo | `docs/synced-dataset-pattern.md` |
| Computing something from a synced dataset, or adding search | `docs/synced-dataset-pattern.md`, its last two sections |
| Writing any user-facing copy, or a commit, PR or comment | `docs/synced-dataset-pattern.md`, "Writing rules for page copy" |
| Handling text from outside this site | `docs/untrusted-input.md` |
| Touching `review/`, or anything that writes to Airtable | `review/README.md`, `docs/airtable-spec-for-ai.md` |
| Tagging a canon row on any dimension | `docs/canon-tagging-rubric.md` |
| Touching the canon | `docs/las-canon-addendum.md`, `docs/airtable-spec-for-ai.md` |

`/papers` is the current reference implementation of the dataset pattern:
`scripts/sync-las-new-papers.mjs`, `lib/papers-data.ts`,
`app/papers/page.tsx`, `app/components/papers-list.tsx`.

It is also the reference for three things built on a synced dataset: a
computed artifact (`scripts/build-papers-map.mjs`, the UMAP projection),
client-side search (`lib/papers-search.ts`), and a categorical colouring over
an upstream field (`lib/papers-anchors.ts`, the nearest canon paper). Each has
a section in `docs/synced-dataset-pattern.md`.

Two rules that are easy to get wrong: sync only the fields the page renders
(a field that never reaches `data/` cannot leak later), and never
reimplement a document the upstream pipeline already generates — serve it.

`review/` is not part of the site. It is a tailnet-only service that picks
papers for the canon and pushes the site, run from this checkout by a systemd
user unit and served by internal-site's Caddy. Vercel never builds it. It
renders HTML by concatenating strings, so every value it interpolates must go
through `escapeHtml` — React is not there to do it.
