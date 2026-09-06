"use client";

import Link from "next/link";
import { type Look } from "@/components/theme/look";
import { useLook } from "@/components/theme/LookProvider";

/*
 * The site logo, the one thing every look draws the same way: the ▶▶ mark
 * and the wordmark set in JetBrains Mono, uppercase, at the same size, with
 * the hairline under it. A look may recolour the type and the mark — that is
 * the whole of what it may do — so the posterize shell intro (split letters,
 * the hairline drawn in) works on the same nodes under every chrome.
 */

const TYPE: Record<Look, string> = {
  posterize: "text-muted",
  cinematic: "text-muted",
  bauhaus: "text-foreground",
  constructivist: "text-foreground",
  pinned: "text-foreground",
  earlyweb: "text-black",
  strongbad: "text-[var(--sb-white)]",
  ukiyoe: "text-foreground",
};

const MARK: Record<Look, string> = {
  posterize: "",
  cinematic: "",
  bauhaus: "text-shape-red",
  constructivist: "text-poster-red",
  pinned: "text-accent",
  earlyweb: "text-[var(--web-red)]",
  strongbad: "text-[var(--sb-red)]",
  ukiyoe: "text-ukiyoe-beni",
};

export function SiteLogo({ intro = true }: { intro?: boolean }) {
  const look = useLook();
  const logo = (
    <Link
      href="/"
      className={`relative inline-block font-[family-name:var(--font-jetbrains-mono)] text-base uppercase tracking-[0.08em] sm:text-lg ${TYPE[look]}`}
    >
      <span data-logo-text>
        <span
          aria-hidden="true"
          data-logo-mark
          className={`-mr-[0.1em] inline-block leading-none origin-[0_calc(100%-0.3em)] [transform:translateY(calc(-0.05em_-_1px))_scale(0.8,1.225)] ${MARK[look]}`}
        >
          <span className="inline-block">▶</span>
          <span className="inline-block -ml-[0.2em]">▶</span>
        </span>
        animaxxing
      </span>
      <span
        aria-hidden="true"
        data-logo-underline
        className="absolute -bottom-1 left-0 h-px w-full bg-current"
      />
    </Link>
  );
  // A chrome that is painted settled (the early web window) opts out of the
  // intro hook, which would otherwise hide the logo and never show it.
  return intro ? <div data-logo-intro>{logo}</div> : logo;
}
