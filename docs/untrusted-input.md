# Untrusted input on the contribute form

The contribute-a-source form takes a URL from anyone, with no account, and the
server then fetches that URL. That makes two things true, and both shape the
code in `lib/safe-fetch.ts` and `lib/sanitize.ts`:

1. **The server is the submitter's HTTP client.** Whatever it can reach, they
   can ask it to reach.
2. **The action is a public POST endpoint.** It is reachable directly, not only
   through the form, so the form's own `required` and `maxLength` attributes
   prove nothing.

## Where each check lives

| File | What it does |
|---|---|
| `lib/safe-fetch.ts` | Decides whether a URL may be fetched, and fetches it safely. |
| `lib/sanitize.ts` | Cleans and caps every string before it is stored. |
| `app/survey/actions.ts` | Applies both to the submitted fields. |
| `lib/source-metadata.ts` | Reads title and summary through `safeFetch` only. |

## The URL check

`assertPublicUrl` runs before any request is made:

- http and https only, on their standard ports;
- no credentials in the URL;
- internal-only names (`localhost`, `*.internal`, `*.local`) refused outright;
- the hostname is resolved, and **every** address it resolves to must be public.

That last point matters. Checking only the first address lets an attacker's DNS
return one public and one private answer. The address test covers private
ranges, loopback, link-local (`169.254.169.254`, the cloud metadata address),
carrier-grade NAT, and their IPv6 equivalents — including IPv4-mapped
(`::ffff:127.0.0.1`), NAT64 and 6to4 forms, which carry a v4 address inside a v6
one. Numeric spellings such as `http://2130706433/` need no special handling:
the hostname is resolved, and the answer is judged.

## The fetch

`safeFetch` follows redirects by hand and runs the whole URL check again at
every hop, because a public URL is free to redirect to a private one. It also
caps the response size, enforces a timeout, and refuses content types it cannot
parse.

## Stored text

Every field is cleaned by `sanitizeText` before it reaches Airtable: invisible
characters removed (zero-width, bidirectional overrides, and the Unicode Tags
block, which can hide instructions inside ordinary-looking text), control codes
removed, whitespace collapsed, length capped per `FIELD_LIMITS`.

Text read from a third-party page goes through `sanitizeHtmlText`, which decodes
HTML entities and *then* strips tags — that order matters, because decoding
turns `&lt;script&gt;` back into a real tag.

React escapes on render, so this is not the XSS defence. It stops junk from
being stored: a reviewer reads these values in Airtable, copies them into the
canon, and exports them to CSV, and none of those places escape anything.

## Error messages

Every rejected URL returns the same message. A specific reason ("resolves to a
private address") would turn the form into a network scanner for whoever is
probing it. The real reason goes to the server log.

## What is not covered

- **DNS rebinding.** Between the DNS check and the connection, an attacker
  controlling their own DNS can change the answer. Closing it properly needs the
  check inside the socket layer, below `fetch`. Two things bound it: the fetch
  only ever reads a title and summary, and nothing fetched is returned to the
  submitter — it goes to a queue a human reads.
- **Rate limiting.** There is none. The endpoint is anonymous, so a script can
  submit repeatedly, and each submission costs one outbound fetch and one
  Airtable write against a 1,000-call monthly quota. This needs a layer in front
  (a WAF rule or an edge rate limiter); an in-process counter would not survive
  serverless instances.
- **Content review.** A submitted URL may point at anything. The Pending Queue is
  reviewed by a human before anything reaches the canon, which is the control
  that matters here.

## Tests

```bash
npm test
```

23 tests, no network. They cover the address classification, every URL rejection
rule, the redirect-to-private case, the size cap, and the sanitizing rules.
