"use client";

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
import { cursorBlink, slapDown, tabsRise, typeOut } from "@/lib/animation/effects/strongbad";
import { SKILLS_REPO } from "./animaxx/content";
import { EarlyWebChrome } from "./EarlyWebChrome";
import { EarlyWebStatusBar } from "./EarlyWebStatusBar";
import { FooterLink } from "./FooterLink";
import { SiteLogo } from "./SiteLogo";
import { StrongBadChrome } from "./StrongBadChrome";
import { StrongBadFooter } from "./StrongBadFooter";

/** Persistent chrome: it enters once, then remains untouched by route motion. */
export function SiteShell({ children }: { children: ReactNode }) {
  const scope = useRef<HTMLDivElement>(null);
  const look = useLook();
  const bauhaus = look === "bauhaus";
  // The poster's chrome: wood type, a red arrowhead, and a heavy rule under the footer.
  const constructivist = look === "constructivist";
  // The keynote's chrome: a 48px bar of frosted glass the stages run under.
  const pinned = look === "pinned";
  /*
   * The early web look does not hang a header and a footer around the page:
   * it puts the page inside a Netscape Navigator window, which brings its own
   * title bar, menubar, toolbar and status bar, and its own dial-up load-in.
   * The posterize shell intro below is skipped for it — the window is chrome,
   * and chrome is painted before the document, not sprung in after it.
   */
  const earlyweb = look === "earlyweb";
  /*
   * Strong Bad brings his own chrome too: the logo slapped onto the sky, four
   * coloured tabs standing on a black horizon, and a band of ink at the bottom with
   * the chant running across it. None of the posterize shell's motion suits
   * a cartoon, so that look gets its own intro below rather than the one
   * underneath it.
   */
  const strongbad = look === "strongbad";
  /*
   * The print's chrome: a hairline of sumi over a footer signed with three
   * seals. It keeps the posterize shell intro — only the two looks above opt
   * out of that. (The logo itself is the same under every look: see SiteLogo.)
   */
  const ukiyoe = look === "ukiyoe";

  useGSAP(
    () => {
      const root = scope.current;
      if (!root || earlyweb) {
        return;
      }

      if (strongbad) {
        const logo = root.querySelector<HTMLElement>("[data-logo-intro]");
        const tabs = gsap.utils.toArray<HTMLElement>("[data-sb-tab]", root);
        const bar = root.querySelector<HTMLElement>("[data-sb-bar]");
        const band = root.querySelector<HTMLElement>("[data-footer-intro]");
        const chant = root.querySelector<HTMLElement>("[data-sb-chant]");
        const caret = root.querySelector<HTMLElement>("[data-sb-chant-cursor]");
        const settled = [logo, bar, band, ...tabs].filter(
          (el): el is HTMLElement => el instanceof HTMLElement,
        );

        if (prefersReducedMotion()) {
          gsap.set(settled, { autoAlpha: 1 });
          return;
        }

        const timeline = gsap.timeline({ defaults: { overwrite: "auto" } });
        timeline.addLabel("chrome", 0);
        if (logo) {
          // The logo is slapped onto the sky, shadow and all, on the first beat.
          slapDown(timeline, logo, "chrome", { from: 1.9, rotate: -14, duration: 0.34 });
        }
        if (bar) {
          // The horizon is slashed in from the left, under everything else.
          timeline
            .fromTo(
              bar,
              { autoAlpha: 1, scaleX: 0, transformOrigin: "left center", willChange: "transform" },
              { scaleX: 1, duration: 0.55, ease: "power4.out" },
              "chrome+=0.1",
            )
            .set(bar, { clearProps: "transform,willChange" }, ">");
        }
        if (tabs.length > 0) {
          tabsRise(timeline, tabs, "chrome+=0.34");
        }
        if (band) {
          timeline.fromTo(
            band,
            { autoAlpha: 0, y: 18 },
            { autoAlpha: 1, y: 0, duration: 0.5, ease: "power3.out", clearProps: "transform" },
            "chrome+=0.5",
          );
        }

        /*
         * The chant. It is typed out once the band is up, and then, after a
         * pause, typed out again, and again: Strong Bad is still checking his
         * email and he is not going to stop while you are reading this.
         */
        const chantLoop = gsap.timeline({ repeat: -1, repeatDelay: 3.5, delay: 1.2 });
        const run = typeOut(chantLoop, chant, 0, { cps: 22, cursor: caret });
        const blink = cursorBlink(caret);
        blink?.delay(1.2);

        return () => {
          chantLoop.kill();
          blink?.kill();
          run?.revert();
        };
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
      // Only the Strong Bad branch above has anything to tear down; the rest
      // of the shell's motion is owned by the hook's own context.
      return undefined;
    },
    // The look decides which chrome is in the tree, so the intro has to be
    // able to run again when the switcher swaps one set of nodes for another.
    { scope, dependencies: [earlyweb, strongbad] },
  );

  if (earlyweb) {
    return (
      <div ref={scope} className="flex min-h-screen flex-col overflow-x-clip">
        <EarlyWebChrome />
        <PageTransition>{children}</PageTransition>
        <EarlyWebStatusBar />
      </div>
    );
  }

  if (strongbad) {
    return (
      <div ref={scope} className="flex min-h-screen flex-col overflow-x-clip">
        <StrongBadChrome />
        <PageTransition>{children}</PageTransition>
        <StrongBadFooter />
      </div>
    );
  }

  return (
    // Particle canvases bleed past the elements they belong to. Clip them
    // here rather than on the body: clip never becomes a scroll container,
    // so sticky headers keep working, and the overflow never reaches the
    // viewport, so mobile browsers do not widen the page to fit the bleed.
    <div ref={scope} className="flex min-h-screen flex-col overflow-x-clip">
      <header
        className={[
          "px-gutter sm:px-gutter-lg",
          pinned
            ? "sticky top-0 z-40 border-b border-line bg-canvas/60 backdrop-blur-xl backdrop-saturate-150"
            : "pt-5 sm:pt-gutter-lg",
        ].join(" ")}
      >
        <div
          className={[
            "mx-auto flex w-full max-w-7xl items-center justify-between gap-4",
            pinned ? "h-12" : "min-h-9",
          ].join(" ")}
        >
          <SiteLogo />
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
          bauhaus
            ? "border-t-[10px] border-foreground"
            : constructivist
              ? "border-t-4 border-foreground"
              : ukiyoe
                ? "border-t border-ukiyoe-sumi"
                : "border-t border-border",
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
                "flex flex-wrap items-center gap-x-4 gap-y-2",
                pinned
                  ? "font-sans text-[12px] text-muted"
                  : ukiyoe
                    ? "font-sans text-[13px] tracking-[0.08em] text-foreground"
                    : "font-mono text-caption uppercase",
                bauhaus ? "font-medium tracking-[0.06em] text-foreground" : "",
                constructivist ? "font-medium tracking-[0.14em] text-foreground" : "",
                !bauhaus && !pinned && !constructivist && !ukiyoe ? "text-muted" : "",
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
                grab <FooterLink href={SKILLS_REPO}>the skills</FooterLink>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                demo src <FooterLink href="https://github.com/johnpolacek/animaxxing">on GitHub</FooterLink>
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
            {ukiyoe && (
              // Three hanko sign the print off: 動 画 極, motion picture, the utmost.
              <span aria-hidden="true" className="flex gap-2">
                {["動", "画", "極"].map((kanji) => (
                  <span key={kanji} className="ukiyoe-seal h-[28px] w-[28px] text-[14px]">
                    {kanji}
                  </span>
                ))}
              </span>
            )}
            <ThemeToggle compact />
          </div>
        </div>
      </footer>
    </div>
  );
}
