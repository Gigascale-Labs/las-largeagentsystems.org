# Untrusted input on the contribute form

The contribute form takes a URL from anyone, with no account, and the server
fetches it. Two things follow:

1. **The server is the submitter's HTTP client.** Whatever it can reach, they
   can ask it to reach.
2. **The action is a public POST endpoint.** It is reachable directly, not only
   through the form, so the form's own `required` and `maxLength` prove
   nothing.

## Where each check lives

| File | What it does |
|---|---|
| `lib/safe-fetch.ts` | Decides whether a URL may be fetched, and fetches it. |
| `lib/sanitize.ts` | Cleans and caps every string before storage. |
| `app/survey/actions.ts` | Applies both to the submitted fields. |
| `lib/source-metadata.ts` | Reads title and summary through `safeFetch` only. |

## The URL check

`assertPublicUrl` runs before any request:

- http and https only, on their standard ports;
- no credentials in the URL;
- internal-only names (`localhost`, `*.internal`, `*.local`) refused;
- the hostname is resolved, and **every** address it resolves to must be
  public.

The last rule matters. Checking only the first address lets an attacker's DNS
return one public and one private answer.

The address test covers private ranges, loopback, link-local
(`169.254.169.254`, the cloud metadata address), carrier-grade NAT, and their
IPv6 equivalents. That includes the forms that carry a v4 address inside a v6
one: IPv4-mapped (`::ffff:127.0.0.1`), NAT64 and 6to4. Numeric spellings such
as `http://2130706433/` need no special case, because the hostname is resolved
and the answer is judged.

## The fetch

`safeFetch` follows redirects by hand and repeats the whole URL check at every
hop, because a public URL can redirect to a private one. It also caps the
response size, sets a timeout, and refuses content types it cannot parse.

## Stored text

Every field goes through `sanitizeText` before it reaches Airtable: invisible
characters removed (zero-width, bidirectional overrides, and the Unicode Tags
block, which hides instructions inside ordinary-looking text), control codes
removed, whitespace collapsed, length capped per `FIELD_LIMITS`.

Text read from a third-party page goes through `sanitizeHtmlText`, which
decodes HTML entities and then strips tags. That order matters: decoding turns
`&lt;script&gt;` back into a real tag.

React escapes on render, so none of this is the XSS defence. It stops junk from
being stored. A reviewer reads these values in Airtable, copies them into the
canon, and exports them to CSV. None of those places escape anything.

## Error messages

Every rejected URL returns the same message. A specific reason would turn the
form into a network scanner. The real reason goes to the server log.

## What is not covered

- **DNS rebinding.** Between the DNS check and the connection, an attacker
  controlling their own DNS can change the answer. Closing that needs the check
  inside the socket layer, below `fetch`. Two things limit it: the fetch only
  reads a title and a summary, and nothing fetched is returned to the
  submitter.
- **Rate limiting.** There is none. The endpoint is anonymous, and each
  submission costs one outbound fetch and one Airtable write against a
  1,000-call monthly quota. This needs a layer in front, such as a WAF rule or
  an edge rate limiter. An in-process counter would not survive serverless
  instances.
- **Content review.** A submitted URL can point at anything. A human reviews
  the Pending Queue before anything reaches the canon, which is the control
  that matters here.

## Tests

```bash
npm test
```

23 tests, no network. They cover the address classification, every URL
rejection rule, the redirect-to-private case, the size cap, and the cleaning
rules.
