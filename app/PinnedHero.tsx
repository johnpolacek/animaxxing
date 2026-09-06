"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  gsap,
  navigateWithPageTransition,
  prefersReducedMotion,
  ScrollTrigger,
  SplitText,
  useGSAP,
} from "@/components/motion";
import {
  blastUp,
  blurIn,
  countUp,
  fadeOut,
  fadeUp,
  gatherIn,
  glowShift,
  lettersRise,
  linesDraw,
  pinStage,
  progressBar,
  stepLight,
  swapWord,
  tiltIn,
  unpinAll,
  wordsLight,
  zoomThrough,
} from "@/lib/animation/effects/pinned";
import { watchPageTransition } from "@/lib/animation/pageState";
import { SKILL_COUNT } from "./animaxx/content";
import { DEMOS } from "./showcase/demos";

/*
 * The front door, as a keynote.
 *
 * Two stages, each held at the top of the viewport while the page scrolls
 * past it, and everything inside them played by the scroll wheel. On the
 * first the claim rewrites itself twice — static, then negative aura, then
 * Motion to the Max — a wash of light drifts from blue through purple to
 * pink behind it, the pitch is read to you a word at a time, and the two
 * calls to action arrive at the end. On the second a browser frame tilts up
 * off the table and animaxxes itself: the heading is typeset letter by
 * letter, the copy draws itself, the button assembles out of particles, and
 * then the whole thing blasts off — while the checklist on the left lights
 * one item at a time, exactly as each of those happens.
 *
 * Below the pins the page returns to normal flow: a band of counted numbers
 * and one last invitation.
 *
 * Pressing either call to action rushes the stage the reader is looking at
 * past them, out of focus, and hands off to the route mid-flight.
 */

type Action = "showcase" | "animaxx";
const HREF: Record<Action, string> = { showcase: "/showcase", animaxx: "/animaxx" };

/** Seconds into the zoom at which the route swaps. */
const HANDOFF = 0.45;

/** How far each stage is held, as a percentage of the viewport height. */
const STAGE_ONE = 280;
const STAGE_TWO = 260;

/* Pills, the keynote's only button. */
const PILL =
  "inline-flex cursor-pointer items-center gap-2 rounded-full px-[22px] py-[11px] font-sans text-[15px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus";
const PILL_PRIMARY = `${PILL} bg-accent text-inverse-foreground hover:-translate-y-px hover:bg-inverse-hover`;
const PILL_SECONDARY = `${PILL} border border-accent text-accent hover:bg-accent/10`;

/*
 * The three lines of the claim, each set the same. The size is the keynote's
 * — as big as the line can be and still hold on one line — so below the
 * first breakpoint, where no phone could hold it, the line is allowed to
 * wrap rather than shrink to nothing or run off the side.
 */
const LINE =
  "col-start-1 row-start-1 m-0 font-display text-[clamp(3.25rem,10vw,9.5rem)] font-extrabold leading-[0.92] tracking-[-0.05em] text-foreground sm:whitespace-nowrap";

const STEPS = [
  "Headline springs in, char by char",
  "Paragraph speaks word by word on scroll",
  "Button assembles from particles",
  "Route exit blasts off in 0.6s",
];

/** Numbers the site can stand behind: every one of them is counted, not claimed. */
const STATS: { value: number; label: string }[] = [
  { value: SKILL_COUNT, label: "skills, GSAP core to Next.js" },
  { value: DEMOS.filter((demo) => !demo.href).length, label: "showcase demos, animaxxed" },
  { value: 0, label: "cumulative layout shift" },
  { value: 60, label: "frames per second, transforms only" },
];

/** The site's mark, two play heads run together. */
function Marks() {
  return (
    <span aria-hidden="true" className="inline-flex items-center text-[0.8em] leading-none">
      <span className="inline-block">▶</span>
      <span className="-ml-[0.25em] inline-block">▶</span>
    </span>
  );
}

export function PinnedHero() {
  const scope = useRef<HTMLDivElement>(null);
  const press = useRef<(action: Action) => void>(() => {});
  const router = useRouter();

  // The zoom hands off to the route without a Link, so nothing has
  // prefetched the destinations; do it here so the swap is not kept waiting.
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

      const stages = q<HTMLElement>("[data-stage]");
      const pins = q<HTMLElement>("[data-stage-pin]");
      const zooms = q<HTMLElement>("[data-zoom]");
      const glows = q<HTMLElement>("[data-glow]");
      const lines = q<HTMLElement>("[data-line]");
      const sub = one("[data-sub]");
      const ctas = q<HTMLElement>("[data-cta]");
      const hint = one("[data-hint]");
      const hintInner = one("[data-hint-inner]");
      const progress = one("[data-progress]");
      const kicker = one("[data-kicker]");
      const heading = one("[data-heading]");
      const pitch = one("[data-pitch]");
      const steps = q<HTMLElement>("[data-step]");
      const frame = one("[data-frame]");
      const frameTitle = one("[data-frame-title]");
      const frameLines = q<HTMLElement>("[data-frame-line]");
      const frameButton = one("[data-frame-button]");
      const frameDots = q<HTMLElement>("[data-frame-dot]");
      const frameFps = one("[data-frame-fps]");
      const stats = one("[data-stats]");
      const cells = q<HTMLElement>("[data-cell]");
      const numerals = q<HTMLElement>("[data-numeral]");
      const end = one("[data-end]");
      const endHeading = one("[data-end-heading]");
      const endCtas = q<HTMLElement>("[data-end-cta]");
      const [stageOne, stageTwo] = stages;
      const [pinOne, pinTwo] = pins;
      const [lineOne, lineTwo, lineThree] = lines;

      if (
        !stageOne || !stageTwo || !pinOne || !pinTwo ||
        !lineOne || !lineTwo || !lineThree || !sub || !hint || !hintInner || !progress ||
        !kicker || !heading || !pitch || !frame || !frameTitle || !frameButton || !frameFps ||
        !stats || !end || !endHeading
      ) {
        return;
      }
      const hidden = q<HTMLElement>("[data-pin-intro]");
      const frameContents = [frameTitle, ...frameLines, frameButton, frameFps];

      if (prefersReducedMotion()) {
        // No pins, no scrub: the stages become ordinary sections, the claim
        // is only its last line, and everything is already where it lands.
        gsap.set(hidden, { autoAlpha: 1 });
        gsap.set([lineOne, lineTwo], { display: "none" });
        gsap.set([hint, ...q<HTMLElement>("[data-progress-track]")], { display: "none" });
        gsap.set(pins, { height: "auto", paddingTop: 96, paddingBottom: 96 });
        // The checklist has nothing to wait for, so it is already ticked.
        const lit = gsap.timeline();
        for (const step of steps) {
          stepLight(lit, step, 0, { span: 0.001 });
        }
        press.current = (action: Action) => navigateWithPageTransition(HREF[action]);
        return;
      }

      // The state the scrubbed elements hold from the first paint until the
      // route settles and the stages take them over.
      gsap.set([lineTwo, lineThree], { autoAlpha: 0 });
      gsap.set([sub, ...ctas], { autoAlpha: 0 });
      gsap.set(progress, { scaleX: 0, transformOrigin: "left center" });
      gsap.set([kicker, heading, pitch], { autoAlpha: 0 });
      gsap.set(frame, { autoAlpha: 0 });
      gsap.set([frameButton, ...frameDots], { autoAlpha: 0 });
      gsap.set(frameLines, { scaleX: 0, transformOrigin: "left center" });
      gsap.set([...cells, endHeading, ...endCtas], { autoAlpha: 0 });

      let intro: gsap.core.Timeline | null = null;
      let splits: SplitText[] = [];
      let triggers: ScrollTrigger[] = [];
      let loops: gsap.core.Tween[] = [];
      let outro: gsap.core.Timeline | null = null;
      let departing = false;

      const settle = () => {
        for (const loop of loops) {
          loop.kill();
        }
        loops = [];
        unpinAll(triggers);
        triggers = [];
        for (const split of splits) {
          split.revert();
        }
        splits = [];
      };

      press.current = contextSafe((action: Action) => {
        if (outro) {
          return;
        }
        intro?.progress(1);
        for (const loop of loops) {
          loop.kill();
        }
        loops = [];
        outro = zoomThrough(zooms, {
          handoffAt: HANDOFF,
          onHandoff: () => {
            departing = true;
            navigateWithPageTransition(HREF[action], { immediate: true });
            // The route has already sealed the page behind its barrier, so
            // the pins can come out now without the reader seeing the jump.
            settle();
          },
        });
      });

      const unwatch = watchPageTransition(root, {
        onIdle: contextSafe(() => {
          /* ------------------------------------------------- the entrance */
          const tl = gsap.timeline();
          intro = tl;
          blurIn(tl, lineOne, 0, { duration: 0.9, blur: 18, scale: 0.9 });
          tl.fromTo(hintInner, { autoAlpha: 0, y: -6 }, { autoAlpha: 1, y: 0, duration: 0.6 }, 0.5);
          tl.call(
            () => {
              loops.push(
                gsap.to(hintInner, {
                  y: 5,
                  duration: 1.1,
                  repeat: -1,
                  yoyo: true,
                  ease: "sine.inOut",
                }),
              );
              loops.push(
                gsap.to(frameFps, {
                  autoAlpha: 0.45,
                  duration: 0.8,
                  repeat: -1,
                  yoyo: true,
                  ease: "sine.inOut",
                }),
              );
            },
            [],
            1.1,
          );

          /* ------------------------------------------- stage one: the claim */
          const claim = pinStage(stageOne, pinOne, { length: STAGE_ONE, scrub: 0.5 });
          triggers.push(claim.trigger);
          const one1 = claim.timeline;
          if (glows[0]) {
            glowShift(one1, glows[0], 0);
          }
          progressBar(one1, progress, 0);
          fadeOut(one1, hint, 0, { duration: 0.08 });
          swapWord(one1, lineOne, lineTwo, 0.02);
          swapWord(one1, lineTwo, lineThree, 0.32, { duration: 0.14 });
          fadeUp(one1, sub, 0.6, { duration: 0.1 });
          splits.push(wordsLight(one1, sub, 0.64, { span: 0.21 }));
          fadeUp(one1, ctas, 0.78, { duration: 0.09, y: 18, stagger: 0.05 });

          /* --------------------------------------- stage two: the feature */
          const feature = pinStage(stageTwo, pinTwo, { length: STAGE_TWO, scrub: 0.5 });
          triggers.push(feature.trigger);
          const two = feature.timeline;
          if (glows[1]) {
            glowShift(two, glows[1], 0);
          }
          // The type on the left is not scrubbed: it arrives with the stage,
          // before the pin takes hold, so the column is never a blank half.
          triggers.push(
            ScrollTrigger.create({
              trigger: stageTwo,
              start: "top 72%",
              once: true,
              onEnter: contextSafe(() => {
                const arrive = gsap.timeline();
                fadeUp(arrive, kicker, 0, { duration: 0.5, y: 16 });
                blurIn(arrive, heading, 0.08, { duration: 0.8, blur: 12, scale: 0.96 });
                fadeUp(arrive, pitch, 0.26, { duration: 0.6, y: 20 });
              }),
            }),
          );

          tiltIn(two, frame, 0);
          splits.push(lettersRise(two, frameTitle, 0.2, { span: 0.25 }));
          linesDraw(two, frameLines, 0.45, { span: 0.2 });
          gatherIn(two, frameDots, frameButton, 0.65, { span: 0.2 });
          blastUp(two, frameContents, 0.88, { span: 0.12, distance: frame.offsetHeight || 480 });
          // Each item on the list lights exactly as its event plays in the frame.
          const cues = [0.2, 0.45, 0.66, 0.88];
          steps.forEach((step, index) => {
            stepLight(two, step, cues[index] ?? 0.2);
          });

          /* ---------------------------------- the bands, back in normal flow */
          triggers.push(
            ScrollTrigger.create({
              trigger: stats,
              start: "top 82%",
              once: true,
              onEnter: contextSafe(() => {
                const band = gsap.timeline();
                fadeUp(band, cells, 0, { duration: 0.6, y: 30, stagger: 0.12 });
                numerals.forEach((numeral, index) => {
                  const value = STATS[index]?.value ?? 0;
                  countUp(band, numeral, 0.15 + index * 0.12, { to: value, duration: 1.3 });
                });
              }),
            }),
          );
          triggers.push(
            ScrollTrigger.create({
              trigger: end,
              start: "top 80%",
              once: true,
              onEnter: contextSafe(() => {
                const last = gsap.timeline();
                const split = SplitText.create(endHeading, { type: "chars", aria: "auto" });
                splits.push(split);
                gsap.set(endHeading, { autoAlpha: 1 });
                blurIn(last, split.chars, 0, {
                  duration: 0.7,
                  blur: 14,
                  scale: 0.8,
                  stagger: 0.03,
                });
                fadeUp(last, endCtas, 0.5, { duration: 0.5, y: 18, stagger: 0.08 });
              }),
            }),
          );

          // Inter Tight arrives after the first layout; measure the pins
          // again once it has, or every stage ends in the wrong place.
          document.fonts?.ready.then(() => ScrollTrigger.refresh());
        }),
        onExiting: () => {
          if (departing) {
            return;
          }
          intro?.kill();
          intro = null;
          settle();
        },
      });

      return () => {
        unwatch();
        intro?.kill();
        outro?.kill();
        settle();
      };
    },
    { scope },
  );

  return (
    // The keynote is full bleed and starts under the glass: break out of the
    // page's gutters and cancel its padding, header included. Margins only —
    // a transform on an ancestor would break the pins.
    <div
      ref={scope}
      data-page-transition
      className="mx-[calc(50%-50vw)] -mb-10 mt-[calc(-1.5rem-48px)] sm:-mb-16 sm:mt-[calc(-2.5rem-48px)]"
    >
      {/* ------------------------------------------------------- the claim */}
      <section data-stage className="relative">
        <div
          data-stage-pin
          className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden px-gutter text-center sm:px-gutter-lg"
        >
          <div
            data-glow
            aria-hidden="true"
            className="pinned-glow pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[140vmax] -translate-x-1/2 -translate-y-1/2"
          />
          <div data-zoom className="relative flex w-full flex-col items-center">
            <div className="grid w-full place-items-center">
              <div data-line data-pin-intro aria-hidden="true" className={LINE}>
                Your site is static.
              </div>
              <div data-line aria-hidden="true" className={LINE}>
                It has negative aura.
              </div>
              <h1 data-line className={LINE}>
                Motion to <em className="pinned-gradient not-italic">the Max.</em>
              </h1>
            </div>
            <p
              data-sub
              className="mt-9 max-w-[60ch] font-sans text-[16px] leading-[1.45] text-muted sm:mt-11 sm:text-[19px]"
            >
              Your static <b className="font-semibold">low rizz</b> website is{" "}
              <b className="font-semibold">cooked</b>. Use agents to{" "}
              <b className="font-semibold">animate the shit out of it.</b> Agent skills for GSAP,
              pinned, scrubbed, sixty frames a second.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
              <button
                type="button"
                data-cta
                className={PILL_PRIMARY}
                onClick={() => press.current("animaxx")}
              >
                <Marks />
                Get Animaxxed
              </button>
              <button
                type="button"
                data-cta
                className={PILL_SECONDARY}
                onClick={() => press.current("showcase")}
              >
                Watch the showcase
              </button>
            </div>
          </div>

          <div data-hint className="absolute bottom-14 left-1/2 -translate-x-1/2">
            <span
              data-hint-inner
              data-pin-intro
              className="block font-sans text-[12px] uppercase tracking-[0.08em] text-muted"
            >
              Scroll
            </span>
          </div>
          <div
            data-progress-track
            aria-hidden="true"
            className="absolute bottom-5 left-6 right-6 h-px bg-line sm:left-10 sm:right-10"
          >
            <span data-progress className="block h-full w-full bg-foreground" />
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- the feature */}
      <section data-stage className="relative">
        <div
          data-stage-pin
          className="relative flex h-screen w-full items-center overflow-hidden px-gutter sm:px-gutter-lg"
        >
          <div
            data-glow
            aria-hidden="true"
            className="pinned-glow pointer-events-none absolute left-[70%] top-1/2 aspect-square w-[110vmax] -translate-x-1/2 -translate-y-1/2"
          />
          <div
            data-zoom
            className="relative mx-auto grid w-full max-w-7xl items-center gap-9 lg:grid-cols-2 lg:gap-[5vw]"
          >
            {/* The frame leads on a phone: it is the thing being shown. */}
            <div className="order-1 lg:order-2">
              <div
                data-frame
                className="pinned-frame relative mx-auto aspect-[4/3] w-full max-w-[560px] overflow-hidden [container-type:inline-size]"
              >
                <div className="flex h-[9%] items-center gap-[1.2cqw] border-b border-line px-[2.8%]">
                  {[0, 1, 2].map((dot) => (
                    <i
                      key={dot}
                      aria-hidden="true"
                      className="block h-[1.8cqw] w-[1.8cqw] rounded-full bg-surface-hover"
                    />
                  ))}
                </div>
                <div
                  data-frame-title
                  className="absolute left-[5.7%] top-[16%] font-display text-[7.9cqw] font-extrabold leading-[0.95] tracking-[-0.04em] text-foreground"
                >
                  Motion
                </div>
                <div className="absolute left-[5.7%] top-[41%] grid gap-[2.4cqw]">
                  {[46.4, 35.7, 41].map((width) => (
                    <i
                      key={width}
                      data-frame-line
                      aria-hidden="true"
                      className="block h-[1.5cqw] rounded-full bg-surface-hover"
                      style={{ width: `${width}cqw` }}
                    />
                  ))}
                </div>
                <div
                  data-frame-button
                  aria-hidden="true"
                  className="absolute bottom-[7.6%] left-[5.7%] h-[7.5cqw] w-[26.8cqw] rounded-full bg-accent"
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-[7.6%] left-[5.7%] h-[7.5cqw] w-[26.8cqw]"
                >
                  {Array.from({ length: 16 }, (_, dot) => (
                    <i
                      key={dot}
                      data-frame-dot
                      className="absolute left-1/2 top-1/2 block h-[1.1cqw] w-[1.1cqw] rounded-full bg-accent"
                    />
                  ))}
                </div>
                <div
                  data-frame-fps
                  className="absolute right-[3.6%] top-[12%] font-sans text-[2.4cqw] font-semibold tracking-[0.06em] text-accent"
                >
                  60 FPS
                </div>
              </div>
            </div>

            <div className="order-2 lg:order-1">
              <p
                data-kicker
                className="m-0 font-sans text-[13px] font-semibold uppercase tracking-[0.06em] text-accent"
              >
                One prompt
              </p>
              <h2
                data-heading
                className="mt-4 font-display text-[clamp(2.25rem,5vw,4.5rem)] font-bold leading-[1] tracking-[-0.04em]"
              >
                Watch a page
                <br />
                learn to move.
              </h2>
              <p data-pitch className="mt-5 max-w-[40ch] font-sans text-[16px] leading-[1.5] text-muted sm:text-[19px]">
                Point an agent at a route. It reads the skills, splits the headline, choreographs the
                entrance and the exit, and respects{" "}
                <b className="font-semibold text-foreground">reduced motion</b> without being asked.
              </p>
              <ul className="mt-7 grid list-none gap-2.5 p-0">
                {STEPS.map((step) => (
                  <li
                    key={step}
                    data-step
                    className="flex items-center gap-3 font-sans text-[14px] sm:text-[15px]"
                  >
                    <span
                      data-step-dot
                      aria-hidden="true"
                      className="flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border border-muted"
                    >
                      <svg
                        data-step-check
                        viewBox="0 0 12 12"
                        className="h-2.5 w-2.5 text-inverse-foreground opacity-0"
                        aria-hidden="true"
                      >
                        <path
                          d="M1.6 6.3 4.5 9.1 10.4 3"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <span data-step-text className="text-muted">
                      {step}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------------------------------- the count */}
      <div data-zoom>
        <section
          data-stats
          className="grid grid-cols-2 border-y border-line lg:grid-cols-4"
        >
          {STATS.map((stat, index) => (
            <div
              key={stat.label}
              data-cell
              className={[
                "px-gutter py-12 sm:px-gutter-lg sm:py-14",
                index % 2 === 0 ? "border-r border-line" : "",
                index < 2 ? "border-b border-line lg:border-b-0" : "",
                "lg:border-r lg:last:border-r-0",
              ].join(" ")}
            >
              <b
                data-numeral
                className="pinned-gradient block font-display text-[clamp(3rem,5vw,4rem)] font-bold leading-none tracking-[-0.05em]"
              >
                {stat.value}
              </b>
              <span className="mt-2.5 block font-sans text-[14px] text-muted">{stat.label}</span>
            </div>
          ))}
        </section>

        {/* ----------------------------------------------------------- the end */}
        <section data-end className="px-gutter py-[120px] text-center sm:px-gutter-lg sm:py-[140px]">
          <h2
            data-end-heading
            className="m-0 font-display text-[clamp(3rem,7vw,6.5rem)] font-extrabold leading-[0.95] tracking-[-0.05em]"
          >
            Get animaxxed.
          </h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <button
              type="button"
              data-end-cta
              className={PILL_PRIMARY}
              onClick={() => press.current("animaxx")}
            >
              <Marks />
              Get Animaxxed
            </button>
            <button
              type="button"
              data-end-cta
              className={PILL_SECONDARY}
              onClick={() => press.current("showcase")}
            >
              Watch the showcase
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
