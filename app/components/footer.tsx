export function Footer() {
  return (
    <footer className="bg-foreground px-6 py-12 text-background md:px-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 text-sm md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-serif text-base font-semibold">
            LargeAgentSystems<span className="text-accent">.org</span>
          </p>
          <p className="mt-2 max-w-xs text-background/60">
            A project of Gigascale Labs.
          </p>
        </div>
        <div className="space-y-1 text-background/70">
          <p>Gigascale Labs</p>
          <p>
            <a
              href="https://www.gigascale-labs.org"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-background/30 underline-offset-4 hover:text-background"
            >
              gigascale-labs.org
            </a>
          </p>
        </div>
        <div className="space-y-2 text-background/40">
          <p>
            {new Date().getFullYear()} Gigascale Labs. Published under an MIT
            licence on{" "}
            <a
              href="https://github.com/Gigascale-Labs/las-largeagentsystems.org"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-background/30 underline-offset-4 hover:text-background"
            >
              GitHub
            </a>
            .
          </p>
          {/* Flaticon's free licence requires this credit wherever the icon is
              used. It is the site icon, so the credit goes on every page. */}
          <p>
            <a
              href="https://www.flaticon.com/free-icons/focus-group"
              title="focus group icons"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-background/30 underline-offset-4 hover:text-background"
            >
              Focus group icons created by Magnific - Flaticon
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
