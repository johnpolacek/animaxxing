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
  barSwing,
  dropIn,
  flyApart,
  kinetic,
  orbit,
  parallax,
  popIn,
  riseIn,
  rollIn,
  stampIn,
  tumbleIn,
  wipeIn,
  wordsRise,
} from "@/lib/animation/effects/bauhaus";
import { watchPageTransition } from "@/lib/animation/pageState";

/*
 * The front door, Bauhaus.
 *
 * A poster in two columns. On the left the type: a tracked label, the
 * headline set a line at a time, a heavy rule, the pitch, and two blocks
 * for buttons. On the right a composition of the school's shapes.
 *
 * Once the route has brought the poster up the workshop starts: the rule
 * wipes and the label tumbles onto it; the headline rises line by line
 * behind a mask; the words of the pitch step on; the shout is stamped in
 * red. Meanwhile the shapes arrive the way their geometry says they
 * should: the square drops and bounces, the circle rolls in and squashes,
 * the triangle rises and rights itself, the bar swings in on a hinge, and
 * the dot pops. Then the whole composition keeps moving like a kinetic
 * sculpture and leans toward the pointer.
 *
 * Pressing either button sends everything flying apart along the lines it
 * arrived on, and the flight hands off to the route.
 */
type Action = "showcase" | "animaxx";
const HREF: Record<Action, string> = { showcase: "/showcase", animaxx: "/animaxx" };

/** Seconds into the flight at which the route swaps. */
const HANDOFF = 0.5;

const BUTTON_BASE =
  "group inline-flex cursor-pointer items-center gap-3.5 border-[3px] border-foreground px-5 py-3.5 font-sans text-lg font-extrabold lowercase tracking-[-0.02em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus sm:px-[26px] sm:py-4 sm:text-xl";
const BUTTON_PRIMARY = `${BUTTON_BASE} bg-inverse text-inverse-foreground hover:bg-inverse-hover`;
const BUTTON_SECONDARY = `${BUTTON_BASE} text-foreground hover:bg-surface-hover`;

const LABEL = "font-sans text-[12px] font-medium uppercase tracking-[0.28em]";

export function BauhausHero() {
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
      const tagRule = one("[data-tag-rule]");
      const tagText = one("[data-tag-text]");
      const lines = q<HTMLElement>("[data-line]");
      const inners = q<HTMLElement>("[data-line-inner]");
      const stop = one("[data-stop]");
      const rule = one("[data-rule]");
      const sub = one("[data-sub]");
      const shout = one("[data-shout]");
      const ctas = q<HTMLElement>("[data-cta]");
      const icons = q<HTMLElement>("[data-icon]");
      const art = one("[data-art]");
      const square = one("[data-square]");
      const circle = one("[data-circle]");
      const triangle = one("[data-triangle]");
      const bar = one("[data-bar]");
      const dot = one("[data-dot]");
      const label = one("[data-art-label]");
      const type = q<HTMLElement>("[data-type]");
      if (
        !tagRule || !tagText || !stop || !rule || !sub || !shout || !art ||
        !square || !circle || !triangle || !bar || !dot || !label ||
        lines.length === 0 || inners.length === 0
      ) {
        return;
      }
      const shapes = [square, circle, triangle, bar, dot];
      const intro = [tagRule, tagText, ...lines, stop, rule, sub, shout, ...ctas, ...icons, ...shapes, label];

      if (prefersReducedMotion()) {
        gsap.set(intro, { autoAlpha: 1 });
        press.current = (action: Action) => navigateWithPageTransition(HREF[action]);
        return;
      }

      let sequence: gsap.core.Timeline | null = null;
      let splits: SplitText[] = [];
      let sculpture: gsap.core.Timeline | null = null;
      let satellite: gsap.core.Tween | null = null;
      let pulse: gsap.core.Tween | null = null;
      let unparallax: (() => void) | null = null;
      let flight: gsap.core.Timeline | null = null;
      let departing = false;

      const settle = () => {
        sculpture?.kill();
        sculpture = null;
        satellite?.kill();
        satellite = null;
        pulse?.kill();
        pulse = null;
        unparallax?.();
        unparallax = null;
        for (const split of splits) {
          split.revert();
        }
        splits = [];
      };

      press.current = contextSafe((action: Action) => {
        if (flight) {
          return;
        }
        sequence?.progress(1);
        settle();
        const w = art.offsetWidth;
        const h = art.offsetHeight;
        flight = flyApart(
          [
            { el: square, y: -h, rotation: 25 },
            { el: circle, x: -w * 1.2, rotation: -540 },
            { el: triangle, y: h, rotation: 60 },
            { el: bar, x: w, rotation: -120 },
            { el: dot, x: -w * 0.6, y: h * 0.6 },
          ],
          [...type, label],
        );
        flight.call(
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
          const w = art.offsetWidth;
          const h = art.offsetHeight;

          // The type.
          wipeIn(tl, tagRule, 0, { duration: 0.7 });
          splits.push(tumbleIn(tl, tagText, 0.1));
          gsap.set(lines, { autoAlpha: 1 });
          tl.fromTo(
            inners,
            { yPercent: 110, willChange: "transform" },
            { yPercent: 0, duration: 1, ease: "power4.out", stagger: 0.14 },
            0.2,
          ).set(inners, { clearProps: "willChange" }, ">");
          popIn(tl, stop, 1.0);
          wipeIn(tl, rule, 0.75, { duration: 1 });
          splits.push(wordsRise(tl, sub, 0.9));
          stampIn(tl, shout, 1.7, { rotate: -4, from: 1.8 });
          stampIn(tl, ctas, 1.9, { stagger: 0.14, from: 1.3 });
          popIn(tl, icons, 2.2, { stagger: 0.08, duration: 0.7 });

          // The shapes.
          dropIn(tl, square, 0.2, { fromY: -h });
          rollIn(tl, circle, 0.35, { fromX: -w * 1.1 });
          riseIn(tl, triangle, 0.7, { fromY: h });
          barSwing(tl, bar, 1.0, { from: -110, to: -30, duration: 1.3 });
          popIn(tl, dot, 1.6);
          splits.push(tumbleIn(tl, label, 1.4, { each: 0.02 }));

          // Then it never quite stops.
          tl.call(
            () => {
              sculpture = kinetic({ bar, triangle, square, circle });
              satellite = orbit(dot, { radius: Math.min(w, h) * 0.06, duration: 14 });
              pulse = gsap.to(stop, { scale: 1.3, duration: 0.7, repeat: -1, yoyo: true, ease: "sine.inOut" });
              unparallax = parallax(root, q<HTMLElement>("[data-depth]"), 18);
            },
            [],
            2.6,
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
        flight?.kill();
        settle();
      };
    },
    { scope },
  );

  return (
    <div ref={scope} className="grid gap-8 border-y-2 border-line lg:grid-cols-[7fr_5fr] lg:gap-0">
      {/* ------------------------------------------------------------ type */}
      <section data-page-transition className="relative z-[2] flex flex-col justify-center py-10 lg:py-16 lg:pr-12">
        <p data-type className={`${LABEL} mb-7 flex items-center gap-3`}>
          <span data-tag-rule data-form-intro aria-hidden="true" className="inline-block h-0.5 w-10 bg-foreground" />
          <span data-tag-text data-form-intro>
            agent skills for gsap · 2026
          </span>
        </p>
        <h1
          data-type
          className="m-0 font-sans text-[clamp(4.25rem,10.5vw,8.25rem)] font-extrabold lowercase leading-[0.82] tracking-[-0.06em]"
        >
          {["motion", "to the"].map((line) => (
            <span key={line} data-line data-form-intro className="block overflow-hidden pb-[0.06em]">
              <span data-line-inner className="block">
                {line}
              </span>
            </span>
          ))}
          <span data-line data-form-intro className="block overflow-hidden pb-[0.06em] text-accent">
            <span data-line-inner className="block">
              max
              <span
                data-stop
                data-form-intro
                aria-hidden="true"
                className="ml-[0.08em] inline-block h-[0.16em] w-[0.16em] bg-foreground align-baseline"
              />
            </span>
          </span>
        </h1>
        <div data-type data-rule data-form-intro aria-hidden="true" className="mb-6 mt-7 h-2 w-[70%] bg-foreground" />
        <p data-type data-sub data-form-intro className="m-0 max-w-[34ch] font-sans text-[19px] leading-[1.35] sm:text-[21px]">
          Your static <b className="font-bold text-accent-cool">low rizz</b> website is{" "}
          <b className="font-bold text-accent-cool">cooked</b>. It has{" "}
          <b className="font-bold text-accent-cool">negative aura</b>. Use agents to
        </p>
        <p
          data-type
          data-shout
          data-form-intro
          className="m-0 mt-2 max-w-[20ch] font-sans text-[22px] font-extrabold uppercase leading-[1.1] tracking-[-0.01em] text-accent sm:text-[26px]"
        >
          animate the shit out of it.
        </p>
        <div data-type className="mt-8 flex flex-wrap gap-4">
          <button
            type="button"
            data-cta
            data-form-intro
            className={BUTTON_SECONDARY}
            onClick={() => press.current("showcase")}
          >
            <span
              data-icon
              data-form-intro
              aria-hidden="true"
              className="inline-block h-4 w-4 rounded-full bg-shape-red transition-transform duration-300 group-hover:scale-125"
            />
            showcase
          </button>
          <button
            type="button"
            data-cta
            data-form-intro
            className={BUTTON_PRIMARY}
            onClick={() => press.current("animaxx")}
          >
            <span aria-hidden="true" className="inline-flex items-center">
              <span
                data-icon
                data-form-intro
                className="inline-block border-y-[9px] border-l-[14px] border-y-transparent border-l-shape-yellow transition-transform duration-300 group-hover:translate-x-1"
              />
              <span
                data-icon
                data-form-intro
                className="-ml-2 inline-block border-y-[9px] border-l-[14px] border-y-transparent border-l-shape-yellow transition-transform delay-75 duration-300 group-hover:translate-x-1"
              />
            </span>
            get animaxxed
          </button>
        </div>
      </section>

      {/* ---------------------------------------------------------- shapes */}
      <aside
        data-page-transition
        data-art
        aria-hidden="true"
        className="relative min-h-[380px] overflow-hidden border-t-2 border-line lg:min-h-[560px] lg:border-l-2 lg:border-t-0"
      >
        {/* Each shape sits in a layer of its own: the layer leans toward the pointer, the shape moves on its own inside it. */}
        <div data-depth="0.6" className="absolute right-0 top-0 h-[56%] w-[70%]">
          <div data-square data-form-intro className="h-full w-full bg-shape-yellow" />
        </div>
        <div data-depth="1" className="absolute left-[-18%] top-[22%] aspect-square w-[78%]">
          <div data-circle data-form-intro className="h-full w-full rounded-full bg-shape-blue" />
        </div>
        <div data-depth="1.4" className="absolute bottom-[6%] right-[8%] aspect-square w-[44%]">
          <div data-triangle data-form-intro className="shape-triangle h-full w-full bg-shape-red" />
        </div>
        <div data-depth="0.4" className="absolute left-[-20%] top-[58%] h-3.5 w-[150%]">
          <div data-bar data-form-intro className="h-full w-full origin-left -rotate-[30deg] bg-foreground" />
        </div>
        <div data-depth="2" className="absolute bottom-[14%] left-[24%] h-[60px] w-[60px]">
          <div data-dot data-form-intro className="h-full w-full rounded-full bg-foreground" />
        </div>
        <p
          data-art-label
          data-form-intro
          className={`${LABEL} absolute left-6 top-6 m-0 rotate-180 [writing-mode:vertical-rl]`}
        >
          form follows motion
        </p>
      </aside>
    </div>
  );
}
