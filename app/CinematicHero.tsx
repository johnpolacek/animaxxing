"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  gsap,
  navigateWithPageTransition,
  prefersReducedMotion,
  useGSAP,
  type SplitText,
} from "@/components/motion";
import {
  beamSweep,
  cutToBlack,
  fadeUp,
  projector,
  runTimecode,
  subtitleIn,
  trackIn,
} from "@/lib/animation/effects/cinematic";
import { watchPageTransition } from "@/lib/animation/pageState";
import { CinematicGrit } from "./CinematicGrit";

/*
 * The front door, cinematic.
 *
 * A letterboxed frame holds the title card. Once the route has brought the
 * frame up, the projector's light finds it: a beam sweeps the screen and
 * settles, "Animaxxing presents" glows up, the title tracks in from wide
 * spacing while it pulls into focus, and the subtitle cuts in line by line.
 * The timecode in the corner runs the whole time. Below the frame, the calls
 * to action and the billing block fade up like end credits.
 *
 * Pressing either call to action cuts to black, and the cut hands off to the
 * route: Showcase leaves for the showcase, Get Animaxxed for the install page.
 */
type Action = "showcase" | "animaxx";
const HREF: Record<Action, string> = { showcase: "/showcase", animaxx: "/animaxx" };

/** Seconds into the cut at which the route swaps. */
const HANDOFF = 0.45;

const BUTTON_BASE =
  "inline-flex cursor-pointer items-center border px-7 py-4 font-mono text-[12px] uppercase tracking-[0.34em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus sm:px-9 sm:py-[18px]";
const BUTTON_PRIMARY = `${BUTTON_BASE} border-accent bg-accent font-normal text-inverse-foreground hover:border-accent-bright hover:bg-accent-bright`;
const BUTTON_SECONDARY = `${BUTTON_BASE} border-line font-light text-foreground hover:border-accent hover:text-accent-bright`;

const BILLING: [string, string][] = [
  ["Created by", "John Polacek"],
  ["Powered by", "GSAP"],
  ["Skills", "animaxxing-skills"],
  ["Source", "GitHub"],
  ["A", "Next.js production"],
];

export function CinematicHero() {
  const scope = useRef<HTMLDivElement>(null);
  const press = useRef<(action: Action) => void>(() => {});
  const router = useRouter();

  useEffect(() => {
    for (const href of Object.values(HREF)) {
      router.prefetch(href);
    }
  }, [router]);

  useGSAP(
    (_context, contextSafe) => {
      const root = scope.current;
      if (!root || !contextSafe) {
        return;
      }
      const q = gsap.utils.selector(root);
      const frame = q<HTMLElement>("[data-frame]")[0];
      const glow = q<HTMLElement>("[data-glow]")[0];
      const beam = q<HTMLElement>("[data-beam]")[0];
      const presents = q<HTMLElement>("[data-presents]")[0];
      const titleLine = q<HTMLElement>("[data-title-line]")[0];
      const titleEm = q<HTMLElement>("[data-title-em]")[0];
      const subtitleLines = q<HTMLElement>("[data-subtitle-line]");
      const timecode = q<HTMLElement>("[data-timecode]")[0];
      const ratio = q<HTMLElement>("[data-ratio]")[0];
      const ctas = q<HTMLElement>("[data-cta]");
      const billing = q<HTMLElement>("[data-billing]")[0];
      const shutter = q<HTMLElement>("[data-shutter]")[0];
      const below = q<HTMLElement>("[data-below]")[0];
      if (!frame || !glow || !beam || !presents || !titleLine || !titleEm || !timecode || !ratio || !billing || !shutter || !below) {
        return;
      }
      const intro = [presents, titleLine, titleEm, ...subtitleLines, timecode, ratio, ...ctas, billing];

      if (prefersReducedMotion()) {
        gsap.set(intro, { autoAlpha: 1 });
        gsap.set(beam, { autoAlpha: 1 });
        press.current = (action: Action) => navigateWithPageTransition(HREF[action]);
        return;
      }

      let sequence: gsap.core.Timeline | null = null;
      let split: SplitText | null = null;
      let flicker: gsap.core.Tween | null = null;
      let stopTimecode: (() => void) | null = null;
      let cut: gsap.core.Timeline | null = null;
      let departing = false;

      const settle = () => {
        flicker?.kill();
        flicker = null;
        stopTimecode?.();
        stopTimecode = null;
        split?.revert();
        split = null;
      };

      press.current = contextSafe((action: Action) => {
        if (cut) {
          return;
        }
        sequence?.progress(1);
        cut = cutToBlack(shutter, below);
        cut.call(
          () => {
            departing = true;
            settle();
            navigateWithPageTransition(HREF[action], { immediate: true });
          },
          [],
          HANDOFF,
        );
      });

      const unwatch = watchPageTransition(root, {
        onIdle: contextSafe(() => {
          const tl = gsap.timeline();
          sequence = tl;
          gsap.set(glow, { autoAlpha: 0 });
          tl.to(glow, { autoAlpha: 1, duration: 1.8, ease: "sine.out" }, 0);
          beamSweep(tl, beam, frame.offsetWidth, 0.1);
          tl.call(() => {
            stopTimecode = runTimecode(timecode, 1 / 24);
          }, [], 0);
          fadeUp(tl, [timecode, ratio], 0.2, { duration: 0.8 });
          fadeUp(tl, presents, 0.5, { duration: 1.4 });
          split = trackIn(tl, titleLine, { at: 1.0 });
          fadeUp(tl, titleEm, 1.9, { duration: 1.2, y: 10 });
          subtitleLines.forEach((line, index) => subtitleIn(tl, line, 2.5 + index * 0.9));
          fadeUp(tl, ctas, 2.8, { duration: 0.9, y: 8, stagger: 0.15 });
          fadeUp(tl, billing, 3.2, { duration: 1.2, y: 6 });
          tl.call(() => {
            flicker = projector(glow);
          }, [], 1.8);
        }),
        onExiting: () => {
          if (departing) {
            return;
          }
          sequence?.kill();
          sequence = null;
          settle();
        },
      });

      return () => {
        unwatch();
        sequence?.kill();
        cut?.kill();
        settle();
      };
    },
    { scope },
  );

  return (
    <div ref={scope} className="flex flex-col items-center">
      <CinematicGrit />
      <div
        data-page-transition
        data-frame
        className="relative aspect-[4/3] max-h-[66vh] w-full overflow-hidden bg-screen text-screen-ink sm:aspect-[2.39/1]"
      >
        <div
          data-glow
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_120%,rgba(185,152,90,0.35),transparent_55%),radial-gradient(ellipse_at_50%_40%,rgba(60,55,45,0.5),transparent_60%)]"
        />
        <div
          data-beam
          aria-hidden="true"
          className="absolute left-1/2 top-[-10%] h-[120%] w-0.5 -translate-x-1/2 bg-[linear-gradient(transparent,rgba(234,227,210,0.25),transparent)] opacity-0"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,transparent_40%,rgba(0,0,0,0.85)_100%)]"
        />
        <div className="absolute inset-0 z-[2] grid place-content-center px-6 text-center">
          <p
            data-presents
            data-screen-intro
            className="mb-5 font-mono text-[11px] font-light uppercase tracking-[0.34em] text-screen-gold [text-shadow:0_1px_3px_#000] sm:mb-8"
          >
            Animaxxing presents
          </p>
          <h1 className="m-0 font-sans text-[clamp(2.5rem,8.4vw,8.25rem)] font-light uppercase leading-[0.9] tracking-[0.16em] [padding-left:0.16em]">
            <span data-title-line data-screen-intro className="block">
              Motion to
            </span>
            <em
              data-title-em
              data-screen-intro
              className="mt-[0.12em] block text-[0.72em] normal-case italic tracking-normal text-screen-gold"
            >
              the Max
            </em>
          </h1>
        </div>
        <p className="absolute inset-x-0 bottom-7 z-[3] px-[8%] text-center font-mono text-[13px] font-light leading-[1.5] text-white [text-shadow:0_1px_2px_#000,0_0_12px_rgba(0,0,0,0.8)] sm:bottom-9 sm:text-base">
          <span data-subtitle-line data-screen-intro>
            Your static low rizz website is cooked. It has negative aura.
          </span>
          <br />
          <span data-subtitle-line data-screen-intro>
            Use agents to <b className="font-normal">animate the shit out of it.</b>
          </span>
        </p>
        <span
          data-timecode
          data-screen-intro
          className="absolute bottom-2.5 left-4 z-[3] font-mono text-[10px] font-light tracking-[0.2em] text-screen-ink/50 tabular-nums sm:bottom-[18px] sm:left-7 sm:text-[11px]"
        >
          TC 00:00:00:01
        </span>
        <span
          data-ratio
          data-screen-intro
          className="absolute bottom-2.5 right-4 z-[3] font-mono text-[10px] font-light tracking-[0.2em] text-screen-ink/50 sm:bottom-[18px] sm:right-7 sm:text-[11px]"
        >
          <span className="sm:hidden">4 : 3</span>
          <span className="hidden sm:inline">2.39 : 1</span>
        </span>
        <div data-shutter aria-hidden="true" className="pointer-events-none absolute inset-0 z-[4] bg-screen opacity-0" />
      </div>

      <div data-page-transition data-below className="mt-8 w-full max-w-[1100px] text-center sm:mt-12">
        <div className="mb-8 flex flex-wrap justify-center gap-4 sm:mb-11 sm:gap-7">
          <button
            type="button"
            data-cta
            data-screen-intro
            className={BUTTON_SECONDARY}
            onClick={() => press.current("showcase")}
          >
            Showcase
          </button>
          <button
            type="button"
            data-cta
            data-screen-intro
            className={BUTTON_PRIMARY}
            onClick={() => press.current("animaxx")}
          >
            Get Animaxxed
          </button>
        </div>
        <p
          data-billing
          data-screen-intro
          className="font-billing text-[13px] font-light uppercase leading-[2] tracking-[0.14em] text-foreground [transform:scaleY(1.45)] [word-spacing:0.3em] sm:text-[15px]"
        >
          {BILLING.map(([role, name], index) => (
            <span key={role} className="inline-block whitespace-nowrap">
              <b
                className={[
                  "text-[10px] font-light tracking-[0.24em] text-accent [vertical-align:0.08em]",
                  index === 0 ? "mr-[0.4em]" : "ml-[1.6em] mr-[0.4em]",
                ].join(" ")}
              >
                {role}
              </b>
              {name}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
