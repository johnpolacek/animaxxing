"use client";

import Link from "next/link";
import { useLook } from "@/components/theme/LookProvider";

/**
 * The way back from a demo to the showcase. It takes part in the route
 * transition like any other page item, so it leaves and arrives with the page.
 *
 * 1997 had no pills: under the early web look it is a plain blue underlined
 * link inside square brackets, the way every "back" on a GeoCities page was.
 * Strong Bad has no pills either: there it is a white cartoon button, outlined
 * in ink and dropped on a hard shadow, that lifts when you point at it.
 */
const LINK =
  "inline-flex items-center gap-2 font-mono text-caption uppercase text-muted underline decoration-1 underline-offset-4 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus";
const WEB_LINK =
  "web-ui text-[13px] text-[var(--web-link)] underline visited:text-[var(--web-visited)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
const SB_LINK =
  "sb-art-btn sb-art-btn-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus";

export function ShowcaseBack() {
  const look = useLook();
  const earlyweb = look === "earlyweb";
  const strongbad = look === "strongbad";

  return (
    <p data-page-transition>
      <Link
        href="/showcase"
        className={strongbad ? SB_LINK : earlyweb ? WEB_LINK : LINK}
        // The cartoon button drops the tail of its label on a phone, where
        // three of these share one row; the name it announces does not.
        aria-label={strongbad ? "Back to showcase" : undefined}
      >
        {earlyweb ? (
          <>
            [ <span aria-hidden="true">&lt;&lt;</span> Back to Showcase ]
          </>
        ) : strongbad ? (
          <>
            <span aria-hidden="true">←</span> Back
            <span className="hidden sm:inline">to showcase</span>
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
