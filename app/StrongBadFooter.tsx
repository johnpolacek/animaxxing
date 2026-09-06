"use client";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { SKILLS_REPO } from "./animaxx/content";
import { FooterLink } from "./FooterLink";

/*
 * The Strong Bad footer: a band of ink across the bottom of the cartoon, the
 * credits in Nunito Black, the scheme toggle, and the chant off to the right
 * in green phosphor, typed out by `SiteShell` and typed out again every few
 * seconds after that. It is the only thing on the page that is never done.
 *
 * `data-sb-footer` flips the semantic tokens to their black-band values (see
 * strongbad.css), so the shared `FooterLink` and `ThemeToggle` come out white
 * here instead of drawing the day scheme's ink on ink.
 */
export function StrongBadFooter() {
  return (
    <footer
      data-sb-footer
      data-footer-intro
      className="mt-auto bg-[var(--sb-ink)] px-gutter py-4 text-[var(--sb-white)] sm:px-gutter-lg"
    >
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <p className="flex flex-wrap items-center gap-x-6 gap-y-2 font-sans text-[14px] font-black">
          <span>
            Created by <FooterLink href="https://johnpolacek.com">John Polacek</FooterLink>
          </span>
          <span>
            Powered by <FooterLink href="https://gsap.com">GSAP</FooterLink>
          </span>
          <span>
            Grab <FooterLink href={SKILLS_REPO}>the skills</FooterLink>
          </span>
          <span>
            Demo src <FooterLink href="https://github.com/johnpolacek/animaxxing">on GitHub</FooterLink>
          </span>
        </p>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <ThemeToggle compact />
          <span className="flex items-baseline text-[20px] leading-none">
            <span data-sb-chant className="sb-phosphor tracking-[0.04em]">
              checkin&apos; emails, checkin&apos; emails, oh oh oh
            </span>
            <i aria-hidden="true" data-sb-chant-cursor className="sb-cursor ml-[2px]" />
          </span>
        </div>
      </div>
    </footer>
  );
}
