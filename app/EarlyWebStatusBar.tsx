"use client";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { SKILLS_REPO } from "./animaxx/content";
import { FooterLink } from "./FooterLink";

/*
 * The bottom of the Navigator window.
 *
 * Document order runs page → rule → footer → status bar, because the footer
 * belongs to the page and the status bar belongs to the window. The bar is
 * the last thing in the flow and sticks to the bottom of the viewport, the
 * way Netscape's did: the document scrolls underneath it, and when the page
 * is scrolled to the end the bar is simply sitting where it already was, so
 * it can never cover the last line of the footer.
 *
 * Nothing here animates itself. Everything that moves is driven from
 * `EarlyWebChrome`, which owns the whole modem load and reaches these cells
 * by their `data-web-*` attributes; the markup is rendered in its settled
 * state so the first paint is a finished window rather than an empty one.
 */

/** Blocks in the transfer meter. 11 × 10px fits the 120px cell. */
const SEGMENTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export function EarlyWebStatusBar() {
  return (
    /*
     * Two siblings of the shell, not one wrapper: a sticky box can only ride
     * as far as its own containing block, so the bar has to be a child of the
     * full-height shell column to stay at the foot of the viewport from the
     * top of the page down. The footer keeps the `mt-auto` that pushes the
     * whole group to the bottom on a short page.
     */
    <>
      <div className="mt-auto">
        <hr className="web-hr mx-[14px] mt-3" />

        <footer className="px-[14px] pb-4 text-center web-ui text-[12px] text-foreground">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-between">
            <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[var(--web-link)] sm:flex-1 sm:justify-start">
              <FooterLink href="https://johnpolacek.com">Created by John Polacek</FooterLink>
              <span aria-hidden="true" className="text-foreground">
                |
              </span>
              <FooterLink href="https://gsap.com">Powered by GSAP</FooterLink>
              <span aria-hidden="true" className="text-foreground">
                |
              </span>
              <FooterLink href={SKILLS_REPO}>Grab the skills</FooterLink>
              <span aria-hidden="true" className="text-foreground">
                |
              </span>
              <FooterLink href="https://github.com/johnpolacek/animaxxing">
                View src on GitHub
              </FooterLink>
            </p>
            <ThemeToggle compact />
          </div>
          <p className="mt-2 text-[11px]">
            © 1997 Animaxxing. All rights reserved. This page is Y2K compliant.{" "}
            <span data-web-bytes className="web-mono whitespace-nowrap">
              [ 1.2 KB, 0:03 @ 28.8k ]
            </span>
          </p>
        </footer>
      </div>

      <div className="web-statusbar web-ui sticky bottom-0 z-20 flex gap-[6px] px-[10px] py-[3px] text-[11px]">
        {/* Chrome, not content: the messages are decoration, so they are not
            announced — a live region here would read four lines of modem
            chatter over every navigation. */}
        <span
          data-web-status
          aria-hidden="true"
          className="web-cell min-w-0 flex-1 truncate px-[6px] py-[2px]"
        >
          Document: Done
        </span>
        <span data-web-progress aria-hidden="true" className="web-cell web-progress shrink-0">
          {SEGMENTS.map((index) => (
            <i key={index} style={{ left: index * 10 + 1 }} />
          ))}
        </span>
        <span
          data-web-lock
          aria-hidden="true"
          className="web-cell grid shrink-0 place-items-center px-[6px] py-[2px]"
        >
          🔒
        </span>
      </div>
    </>
  );
}
