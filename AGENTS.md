<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Before you write

| Doing this | Read first |
|---|---|
| Adding a page over a dataset from another repo | `docs/synced-dataset-pattern.md` |
| Writing any user-facing copy, or a commit, PR or comment | `docs/synced-dataset-pattern.md`, "Writing rules for page copy" |
| Handling text from outside this site | `docs/untrusted-input.md` |
| Touching the canon | `docs/las-canon-addendum.md`, `docs/airtable-spec-for-ai.md` |

`/papers` is the current reference implementation of the dataset pattern:
`scripts/sync-las-new-papers.mjs`, `lib/papers-data.ts`,
`app/papers/page.tsx`, `app/components/papers-list.tsx`.

Two rules that are easy to get wrong: sync only the fields the page renders
(a field that never reaches `data/` cannot leak later), and never
reimplement a document the upstream pipeline already generates — serve it.
