"use client";

import Link from "next/link";
import { useLook } from "@/components/theme/LookProvider";

/**
 * The way back from a demo to the showcase. It takes part in the route
 * transition like any other page item, so it leaves and arrives with the page.
 *
 * 1997 had no pills: under the early web look it is a plain blue underlined
 * link inside square brackets, the way every "back" on a GeoCities page was.
 */
const LINK =
  "inline-flex items-center gap-2 font-mono text-caption uppercase text-muted underline decoration-1 underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus";
const WEB_LINK =
  "web-ui text-[13px] text-[var(--web-link)] underline visited:text-[var(--web-visited)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

export function ShowcaseBack() {
  const earlyweb = useLook() === "earlyweb";

  return (
    <p data-page-transition>
      <Link href="/showcase" className={earlyweb ? WEB_LINK : LINK}>
        {earlyweb ? (
          <>
            [ <span aria-hidden="true">&lt;&lt;</span> Back to Showcase ]
          </>
        ) : (
          <>
            <span aria-hidden="true">←</span> Back to showcase
          </>
        )}
      </Link>
    </p>
  );
}
