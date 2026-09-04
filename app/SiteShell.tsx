"use client";

import Link from "next/link";
import { useRef, type ReactNode } from "react";
import {
  charsSpringIn,
  DURATION,
  EASE,
  gsap,
  PageTransition,
  prefersReducedMotion,
  useGSAP,
} from "@/components/motion";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { FooterLink } from "./FooterLink";

/** Persistent chrome: it enters once, then remains untouched by route motion. */
export function SiteShell({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = scope.current;
      if (!root) {
        return;
      }
      const items = gsap.utils.toArray<HTMLElement>("[data-shell-intro]", root);
      const footer = root.querySelector<HTMLElement>("[data-footer-intro]");
      const logo = root.querySelector<HTMLElement>("[data-logo-intro]");
      const logoText = root.querySelector<HTMLElement>("[data-logo-text]");
      const logoUnderline = root.querySelector<HTMLElement>("[data-logo-underline]");
      if (!footer || !logo || !logoText || !logoUnderline) {
        return;
      }
      const timeline = gsap.timeline({ defaults: { overwrite: "auto" } });

      if (prefersReducedMotion()) {
        timeline.set([...items, footer, logo], { autoAlpha: 1 });
        return;
      }

      timeline.addLabel("shell", 0);
      // The header has no secondary items yet; skip them rather than tween an empty list.
      if (items.length > 0) {
        timeline
          .set(items, { willChange: "transform, opacity" }, "shell")
          .fromTo(
            items,
            { autoAlpha: 0, y: 12 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.42,
              ease: "power3.out",
              stagger: 0.12,
            },
            "shell",
          )
          .set(items, { clearProps: "transform,willChange" }, ">");
      }
      timeline
        .fromTo(
          footer,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 4, ease: "sine.out" },
          "shell+=0.5",
        )
        .addLabel("logo", 0)
        .set(logo, { autoAlpha: 1 }, "logo")
        .set(
          logoUnderline,
          { scaleX: 0, transformOrigin: "left center", willChange: "transform" },
          "logo",
        )
        .add(charsSpringIn(logoText), "logo")
        .to(
          logoUnderline,
          { scaleX: 1, duration: DURATION.component, ease: EASE.entrance },
          "logo+=0.25",
        )
        .set(logoUnderline, { clearProps: "transform,transformOrigin,willChange" }, ">");
    },
    { scope },
  );

  return (
    // Particle canvases bleed past the elements they belong to. Clip them
    // here rather than on the body: clip never becomes a scroll container,
    // so sticky headers keep working, and the overflow never reaches the
    // viewport, so mobile browsers do not widen the page to fit the bleed.
    <div ref={scope} className="flex min-h-screen flex-col overflow-x-clip">
      <header className="px-gutter pt-gutter-lg sm:px-gutter-lg">
        <div className="mx-auto flex min-h-9 w-full max-w-7xl items-center justify-between gap-4">
          <div data-logo-intro>
            <Link
              href="/"
              className="relative inline-block font-mono text-base uppercase tracking-[0.08em] text-muted sm:text-lg"
            >
              <span data-logo-text>animaxxing</span>
              <span
                aria-hidden="true"
                data-logo-underline
                className="absolute -bottom-1 left-0 h-px w-full bg-current"
              />
            </Link>
          </div>
        </div>
      </header>

      <PageTransition>{children}</PageTransition>

      <footer
        data-footer-intro
        className="mt-auto border-t border-border px-gutter py-10 sm:px-gutter-lg"
      >
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-6">
          <p className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-caption uppercase text-muted">
            <FooterLink href="https://johnpolacek.com">created by John Polacek</FooterLink>
            <span aria-hidden="true">·</span>
            <FooterLink href="https://gsap.com">powered by GSAP</FooterLink>
          </p>
          <ThemeToggle compact />
        </div>
      </footer>
    </div>
  );
}
