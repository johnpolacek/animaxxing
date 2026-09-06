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
import { useLook } from "@/components/theme/LookProvider";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { SKILLS_REPO } from "./animaxx/content";
import { FooterLink } from "./FooterLink";

/** Persistent chrome: it enters once, then remains untouched by route motion. */
export function SiteShell({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);
  const look = useLook();
  const bauhaus = look === "bauhaus";
  // The poster's chrome: wood type, a red arrowhead, and a heavy rule under the footer.
  const constructivist = look === "constructivist";

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
      <header className="px-gutter pt-5 sm:px-gutter-lg sm:pt-gutter-lg">
        <div className="mx-auto flex min-h-9 w-full max-w-7xl items-center justify-between gap-4">
          <div data-logo-intro>
            <Link
              href="/"
              className={
                bauhaus
                  ? "relative inline-block font-sans text-xl font-extrabold lowercase tracking-[-0.02em] text-foreground sm:text-[22px]"
                  : constructivist
                    ? "relative inline-block font-display text-xl uppercase tracking-[0.06em] text-foreground sm:text-[22px]"
                    : "relative inline-block font-[family-name:var(--font-jetbrains-mono)] text-base uppercase tracking-[0.08em] text-muted sm:text-lg"
              }
            >
              <span data-logo-text>
                <span
                  aria-hidden="true"
                  data-logo-mark
                  className={[
                    "-mr-[0.1em] inline-block leading-none origin-[0_calc(100%-0.3em)] [transform:translateY(calc(-0.05em_-_1px))_scale(0.8,1.225)]",
                    bauhaus ? "mr-[0.15em] text-shape-red" : "",
                    constructivist ? "mr-[0.2em] text-poster-red" : "",
                  ].join(" ")}
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
          </div>
          <div data-shell-intro>
            <ThemeSwitcher />
          </div>
        </div>
      </header>

      <PageTransition>{children}</PageTransition>

      <footer
        data-footer-intro
        className={[
          "mt-auto px-gutter py-10 sm:px-gutter-lg",
          bauhaus ? "border-t-[10px] border-foreground" : constructivist ? "border-t-4 border-foreground" : "border-t border-border",
        ].join(" ")}
      >
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-6">
          {look === "cinematic" ? (
            // The credits have already rolled in the billing block; the
            // footer only signs the picture off.
            <p className="font-mono text-[11px] font-light uppercase tracking-[0.34em] text-muted">
              Animaxxing · MMXXVI
            </p>
          ) : (
            <p
              className={[
                "flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-caption uppercase",
                bauhaus ? "font-medium tracking-[0.06em] text-foreground" : "",
                constructivist ? "font-medium tracking-[0.14em] text-foreground" : "",
                !bauhaus && !constructivist ? "text-muted" : "",
              ].join(" ")}
            >
              <span>
                created by <FooterLink href="https://johnpolacek.com">John Polacek</FooterLink>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                powered by <FooterLink href="https://gsap.com">GSAP</FooterLink>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <FooterLink href={SKILLS_REPO}>grab the skills</FooterLink>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <FooterLink href="https://github.com/johnpolacek/animaxxing">view src on GitHub</FooterLink>
              </span>
            </p>
          )}
          <div className="flex items-center gap-6">
            {bauhaus && (
              // The school's three shapes sign the page off.
              <span aria-hidden="true" className="flex gap-2.5">
                <i className="block h-[22px] w-[22px] rounded-full bg-shape-red" />
                <i className="block h-[22px] w-[22px] bg-shape-blue" />
                <i className="shape-triangle block h-[22px] w-[22px] bg-shape-yellow" />
              </span>
            )}
            {constructivist && (
              // The poster's arrowhead signs the page off.
              <span aria-hidden="true" className="poster-arrow text-[22px] text-poster-red" />
            )}
            <ThemeToggle compact />
          </div>
        </div>
      </footer>
    </div>
  );
}
