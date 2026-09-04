import Link from "next/link";

/**
 * The way back from a demo to the showcase. It takes part in the route
 * transition like any other page item, so it leaves and arrives with the page.
 */
export function ShowcaseBack() {
  return (
    <p data-page-transition>
      <Link
        href="/showcase"
        className="inline-flex items-center gap-2 font-mono text-caption uppercase text-muted underline decoration-1 underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus"
      >
        <span aria-hidden="true">←</span> Back to showcase
      </Link>
    </p>
  );
}
