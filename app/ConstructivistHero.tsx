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
  hammerIn,
  march,
  parallax,
  push,
  redWipe,
  ringDraw,
  shoveIn,
  slashIn,
  stampDown,
  turn,
  typeIn,
  wedgeIn,
  wireIn,
} from "@/lib/animation/effects/constructivist";
import { watchPageTransition } from "@/lib/animation/pageState";

/*
 * The front door, constructivist.
 *
 * A poster. A red wedge drives up from the bottom corner, an ink bar
 * slashes across it, and the ▶▶ sits in an ink circle with a ring drawn
 * round it. The title runs up the diagonal in wood type, the pitch comes
 * over the wire in stencilled capitals at the top, the buttons stand in
 * the corner and the credits sit on the red.
 *
 * Once the route has brought the poster up the press starts: the wedge
 * drives in, the bar slashes, the circle is stamped down and its ring
 * drawn, the arrow is shoved on, the title is hammered on a letter at a
 * time, the pitch comes over the wire, the shout is stamped in red, and
 * the buttons are shoved into place. Then the ▶▶ keeps marching, the ring
 * turns, the arrow keeps pushing, and the whole poster leans toward the
 * pointer.
 *
 * Pressing either button drives the wedge up over everything, a red wipe,
 * and the wipe hands off to the route.
 */
type Action = "showcase" | "animaxx";
const HREF: Record<Action, string> = { showcase: "/showcase", animaxx: "/animaxx" };

/** Seconds into the wipe at which the route swaps. */
const HANDOFF = 0.45;

const BUTTON_BASE =
  "group inline-flex cursor-pointer items-center gap-3.5 px-5 py-3 font-display text-[20px] uppercase tracking-[0.06em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus sm:px-[26px] sm:py-3.5 sm:text-[26px]";
const BUTTON_PRIMARY = `${BUTTON_BASE} bg-poster-ink text-poster-paper hover:bg-poster-red hover:text-poster-paper`;
const BUTTON_SECONDARY = `${BUTTON_BASE} bg-poster-paper text-poster-ink hover:bg-poster-ink hover:text-poster-paper`;

const LABEL = "font-mono text-[12px] font-medium uppercase tracking-[0.3em]";

export function ConstructivistHero() {
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
      const one = (selector: string) => q<HTMLElement>(selector)[0];
      const stage = one("[data-stage]");
      const wedge = one("[data-wedge]");
      const bar = one("[data-bar]");
      const circle = one("[data-circle]");
      const ring = root.querySelector<SVGCircleElement>("[data-ring]");
      const ringBox = one("[data-ring-box]");
      const heads = q<HTMLElement>("[data-head]");
      const arrow = one("[data-arrow]");
      const side = one("[data-side]");
      const title = one("[data-title]");
      const sub = one("[data-sub]");
      const shout = one("[data-shout]");
      const ctas = q<HTMLElement>("[data-cta]");
      const cap = one("[data-cap]");
      const type = q<HTMLElement>("[data-type]");
      if (!stage || !wedge || !bar || !circle || !ring || !ringBox || !arrow || !side || !title || !sub || !shout || !cap || heads.length === 0) {
        return;
      }
      const hidden = q<HTMLElement>("[data-form-intro]");

      if (prefersReducedMotion()) {
        gsap.set(hidden, { autoAlpha: 1 });
        gsap.set(ring, { autoAlpha: 1 });
        press.current = (action: Action) => navigateWithPageTransition(HREF[action]);
        return;
      }

      let sequence: gsap.core.Timeline | null = null;
      let splits: SplitText[] = [];
      let loops: (gsap.core.Tween | gsap.core.Timeline)[] = [];
      let unparallax: (() => void) | null = null;
      let wipe: gsap.core.Timeline | null = null;
      let departing = false;

      const settle = () => {
        unparallax?.();
        unparallax = null;
        for (const loop of loops) {
          loop.kill();
        }
        loops = [];
        for (const split of splits) {
          split.revert();
        }
        splits = [];
      };

      press.current = contextSafe((action: Action) => {
        if (wipe) {
          return;
        }
        sequence?.progress(1);
        settle();
        wipe = redWipe(wedge, [...type, circle, ringBox, arrow, bar]);
        wipe.call(
          () => {
            departing = true;
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

          // The press.
          wedgeIn(tl, wedge, 0);
          slashIn(tl, bar, 0.15, { duration: 0.9 });
          stampDown(tl, circle, 0.3, { from: 2.2, rotate: -10, duration: 0.5 });
          ringDraw(tl, ring, 0.7);
          shoveIn(tl, heads, 0.75, { x: -140, stagger: 0.12, skew: -20 });
          shoveIn(tl, arrow, 0.5, { x: -260, duration: 0.8 });

          // The type.
          splits.push(typeIn(tl, side, 0.2, { each: 0.02 }));
          splits.push(hammerIn(tl, title, 0.55, { each: 0.045 }));
          splits.push(wireIn(tl, sub, 1.2, { each: 0.04 }));
          stampDown(tl, shout, 2.0, { rotate: -4, from: 2 });
          shoveIn(tl, ctas, 2.15, { x: -60, stagger: 0.12 });
          splits.push(wireIn(tl, cap, 2.3, { each: 0.03 }));

          // Then it never quite stops.
          tl.call(
            () => {
              loops.push(march(heads));
              loops.push(turn(ringBox, { duration: 48 }));
              loops.push(push(arrow, { distance: 16, every: 2.6 }));
              loops.push(gsap.to(wedge, { y: 8, duration: 5, repeat: -1, yoyo: true, ease: "sine.inOut" }));
              unparallax = parallax(stage, q<HTMLElement>("[data-depth]"), 16);
            },
            [],
            2.9,
          );
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
        wipe?.kill();
        settle();
      };
    },
    { scope },
  );

  return (
    <div ref={scope} className="border-y-4 border-line">
      <div
        data-page-transition
        data-stage
        className="relative min-h-[600px] overflow-hidden sm:min-h-[680px] lg:min-h-[760px]"
      >
        {/* ---------------------------------------------------------- forms */}
        <div
          data-wedge
          data-form-intro
          aria-hidden="true"
          className="poster-wedge absolute bottom-[-6%] left-[-10%] z-[1] h-[80%] w-[120%] bg-poster-red"
        />
        <div data-depth="0.6" className="absolute right-[6%] top-[6%] z-[2] aspect-square w-[46vw] max-w-[500px] sm:right-[6%] sm:top-[4%] sm:w-[33vw]">
          <svg
            data-ring-box
            aria-hidden="true"
            viewBox="0 0 100 100"
            className="absolute inset-[-8%] h-[116%] w-[116%] overflow-visible"
          >
            <circle data-ring cx="50" cy="50" r="49" fill="none" stroke="var(--poster-ink)" strokeWidth="0.55" className="invisible" />
          </svg>
          <div
            data-circle
            data-form-intro
            className="grid h-full w-full place-items-center rounded-full bg-poster-ink text-poster-paper"
          >
            <span
              aria-hidden="true"
              className="flex -translate-y-[6%] items-center pl-[0.06em] font-display text-[min(220px,19vw)] leading-none sm:text-[min(220px,14.5vw)]"
            >
              <span data-head data-form-intro className="inline-block">▶</span>
              <span data-head data-form-intro className="-ml-[0.32em] inline-block text-poster-red">▶</span>
            </span>
          </div>
        </div>
        <div data-depth="0.3" className="absolute left-[-5%] top-[86%] z-[2] h-[18px] w-[110%] sm:top-[90%] sm:h-[26px]">
          <div data-bar data-form-intro aria-hidden="true" className="h-full w-full origin-left -rotate-[18deg] bg-poster-ink" />
        </div>
        <div data-depth="1.4" className="absolute left-[44%] top-[12%] z-[2] hidden sm:block">
          <div data-arrow data-form-intro aria-hidden="true" className="poster-arrow -rotate-[22deg] text-[40px] text-poster-ink sm:text-[64px]" />
        </div>

        {/* ----------------------------------------------------------- type */}
        <p
          data-type
          data-side
          data-form-intro
          className={`${LABEL} absolute left-4 top-10 z-[3] m-0 hidden rotate-180 text-foreground [writing-mode:vertical-rl] sm:left-6 sm:top-12 md:block`}
        >
          Agent skills for GSAP · Animate everything
        </p>
        <h1
          data-type
          data-title
          data-form-intro
          className="absolute left-5 top-[62%] z-[3] m-0 origin-bottom-left -rotate-[18deg] whitespace-nowrap font-display text-[clamp(2.75rem,8.6vw,8rem)] uppercase leading-[0.82] tracking-[-0.01em] text-foreground sm:left-[60px] sm:top-[60%] md:left-[100px]"
        >
          Motion to <span className="text-poster-red">the Max</span>
        </h1>
        <div className="absolute left-5 top-8 z-[4] max-w-[19ch] sm:left-[60px] sm:top-12 sm:max-w-[28ch] md:left-[100px] md:top-16">
          <p
            data-type
            data-sub
            data-form-intro
            className="m-0 font-mono text-[15px] uppercase leading-[1.35] tracking-[0.02em] text-foreground sm:text-[18px] lg:text-[20px]"
          >
            Your static <b className="font-bold text-poster-red">low rizz</b> website is{" "}
            <b className="font-bold text-poster-red">cooked</b>. It has{" "}
            <b className="font-bold text-poster-red">negative aura</b>. Use agents to
          </p>
          <p
            data-type
            data-shout
            data-form-intro
            className="m-0 mt-2 font-display text-[24px] uppercase leading-[1] tracking-[0.02em] text-foreground sm:text-[30px] lg:text-[34px]"
          >
            animate the shit out of it.
          </p>
        </div>
        <div data-type className="absolute bottom-6 left-5 z-[4] flex flex-wrap gap-3 sm:bottom-10 sm:left-12 sm:gap-4">
          <button type="button" data-cta data-form-intro className={BUTTON_SECONDARY} onClick={() => press.current("showcase")}>
            Showcase
            <span aria-hidden="true" className="poster-arrow text-[14px] text-poster-red transition-transform duration-300 group-hover:translate-x-1" />
          </button>
          <button type="button" data-cta data-form-intro className={BUTTON_PRIMARY} onClick={() => press.current("animaxx")}>
            Get Animaxxed
            <span aria-hidden="true" className="text-poster-red transition-colors duration-300 group-hover:text-poster-paper">
              !
            </span>
          </button>
        </div>
        <p
          data-type
          data-cap
          data-form-intro
          className={`${LABEL} absolute bottom-6 right-5 z-[4] m-0 hidden text-right leading-[1.6] tracking-[0.26em] text-poster-paper sm:bottom-10 sm:right-12 lg:block`}
        >
          Created by John Polacek · Powered by GSAP
          <br />
          Grab the skills · View src on GitHub
        </p>
      </div>
    </div>
  );
}
