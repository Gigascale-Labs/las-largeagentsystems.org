/**
 * The Atom feed link that sits at the top of a list page.
 *
 * Shared so /papers and /events cannot drift into looking like two different
 * affordances. Rendered as a link, not a button element: it navigates to a
 * URL, and a feed reader's "subscribe" bookmarklet and a right-click "copy
 * link" both need a real href.
 */
export function FeedButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      className="inline-flex shrink-0 items-center gap-2 border border-rule px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-muted transition-colors hover:border-accent hover:text-accent"
    >
      {/* Decorative: the word "RSS" beside it already names the thing. */}
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="h-3 w-3 fill-current"
      >
        <circle cx="3" cy="13" r="2" />
        <path d="M2 8.2a5.8 5.8 0 0 1 5.8 5.8h2.4A8.2 8.2 0 0 0 2 5.8z" />
        <path d="M2 3.4A10.6 10.6 0 0 1 12.6 14H15A13 13 0 0 0 2 1z" />
      </svg>
      RSS
    </a>
  );
}
