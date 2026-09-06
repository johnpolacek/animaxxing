"use client";

import Link from "next/link";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { SKILLS_REPO } from "./animaxx/content";

/*
 * The Strong Bad header: the logo stickered on at an angle, four coloured
 * tabs standing on the horizon, and the Themes switcher as a fifth. Under the
 * lot of it runs the 6px black bar that every cartoon in this world stands on.
 *
 * The tabs are open at the bottom, so the bar closes them: nothing sits on
 * the horizon, everything grows out of it. `SiteShell` animates the row with
 * `tabsRise`, which brings the tabs up from below their resting line, and the
 * `clip-path` on their wrapper is cut exactly at the bar so the travel
 * happens out of sight behind it. The insets on the other three sides are
 * negative and generous, so the switcher's particles still throw sideways.
 *
 * On a phone the row wraps, and a tab that has wrapped is no longer standing
 * on anything: below 640px the recipe closes their bottoms and rounds all
 * four corners, so they read as a row of cartoon buttons rather than as tabs
 * hanging off nothing. See `.sb-tab` in strongbad.css.
 */

const GITHUB = "https://github.com/johnpolacek/animaxxing";

/** The nav, in the mockup's four colours. External links leave the site. */
const TABS = [
  {
    label: "Showcase",
    href: "/showcase",
    external: false,
    tone: "bg-[var(--sb-red)] text-[var(--sb-white)]",
  },
  {
    label: "Animaxx",
    href: "/animaxx",
    external: false,
    tone: "bg-[var(--sb-blue)] text-[var(--sb-white)]",
  },
  {
    label: "Skills",
    href: SKILLS_REPO,
    external: true,
    tone: "bg-[var(--sb-yellow)] text-[var(--sb-ink)]",
  },
  {
    label: "GitHub",
    href: GITHUB,
    external: true,
    tone: "bg-[var(--sb-grass)] text-[var(--sb-white)]",
  },
] as const;

/*
 * A tab's own shape and type. The padding lives here rather than in the
 * `.sb-tab` recipe because a nav tab is smaller on a phone than on a desk,
 * and the recipe is shared with the article's chapter tabs.
 */
const TAB =
  "sb-tab font-display px-3 pb-1.5 pt-2 text-[14px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus sm:px-[18px] sm:pb-[6px] sm:pt-[10px] sm:text-[19px]";

export function StrongBadChrome() {
  return (
    <header className="px-gutter pt-4 sm:px-gutter-lg sm:pt-5">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <Link
          href="/"
          data-logo-intro
          className="font-display text-[26px] leading-none text-[var(--sb-white)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus sm:text-[34px]"
        >
          {/* The tilt is the logo's own; GSAP works around it, not through it. */}
          <span className="flex items-center gap-2 [transform:rotate(-3deg)]">
            <span aria-hidden="true" className="flex items-center">
              <i className="sb-arrow block" />
              <i className="sb-arrow -ml-[0.26em] block" />
            </span>
            <span className="[-webkit-text-stroke:0.06em_var(--sb-ink)] [paint-order:stroke_fill] [text-shadow:0.09em_0.09em_0_var(--sb-ink)]">
              Animaxxing
            </span>
          </span>
        </Link>

        <div className="flex flex-wrap items-end justify-end gap-1.5 [clip-path:inset(-400px_-400px_0_-400px)]">
          {TABS.map((tab) =>
            tab.external ? (
              <a
                key={tab.label}
                href={tab.href}
                data-sb-tab
                data-sb-intro
                className={`${TAB} ${tab.tone}`}
              >
                {tab.label}
              </a>
            ) : (
              <Link
                key={tab.label}
                href={tab.href}
                data-sb-tab
                data-sb-intro
                className={`${TAB} ${tab.tone}`}
              >
                {tab.label}
              </Link>
            ),
          )}
          <span data-sb-tab data-sb-intro className="flex items-end">
            <ThemeSwitcher />
          </span>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl">
        <i
          aria-hidden="true"
          data-sb-bar
          data-sb-intro
          className="sb-bar mt-0 block w-full"
        />
      </div>
    </header>
  );
}
