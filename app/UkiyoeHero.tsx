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
  blockIn,
  bokashiIn,
  brushIn,
  floatY,
  haloPulse,
  inkDrop,
  linesRise,
  parallax,
  paperShift,
  pourDown,
  rain,
  registerBlocks,
  sealStamp,
  sealWobble,
  underlineDraw,
  unroll,
  waveDrift,
  waveFlood,
  waveRise,
} from "@/lib/animation/effects/ukiyoe";
import { watchPageTransition } from "@/lib/animation/pageState";

/*
 * The front door, as a woodblock print.
 *
 * A single sheet: a graded indigo sky over toned paper, a beni sun coming up
 * behind the sea, a watermark 動 soaked into the fibre, the great wave rising
 * across the bottom with its foam thrown off the curl, a vertical cartouche
 * at the top right, and the publisher's year and seal down in the water.
 *
 * Once the route hands the sheet over, the print is pulled: the sky plate is
 * inked and wiped down, the water rises band by band and the crest curls and
 * throws foam, the sun comes up out of the sea and is re-layered over it,
 * the 動 spreads like a drop of ink, the cartouche unrolls and its kanji pour
 * down the column, the title is painted a stroke at a time, the pitch arrives
 * a line at a time with beni rules drawn under the loud words, and every seal
 * is stamped. Then it never quite stops: the sea drifts, rain falls through
 * the sky, the sun breathes a halo, the 動 floats, and the whole sheet leans
 * toward the pointer.
 *
 * Pressing either button floods the page: the sea climbs the sheet, the foam
 * scatters, and the flood hands off to the route half way up.
 */
type Action = "showcase" | "animaxx";
const HREF: Record<Action, string> = { showcase: "/showcase", animaxx: "/animaxx" };

/**
 * The flood, and the second into it at which the route swaps. The route hides
 * the page the moment it takes over, so the sea has to be over the sheet by
 * then: `waveFlood` accelerates hard out of `power3.in`, and these are the
 * numbers at which it has actually covered the print when the hand-off comes.
 */
const FLOOD = 0.62;
const HANDOFF = 0.5;

const BUTTON_BASE =
  "group ukiyoe-shadow inline-flex cursor-pointer items-center gap-3 border px-5 py-3 font-sans text-[15px] font-bold tracking-[0.14em] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus sm:px-6 sm:py-3.5 sm:text-[17px]";
const BUTTON_SECONDARY = `${BUTTON_BASE} border-ukiyoe-sumi bg-ukiyoe-paper text-ukiyoe-sumi`;
const BUTTON_PRIMARY = `${BUTTON_BASE} border-ukiyoe-beni bg-ukiyoe-beni text-[var(--ukiyoe-foam)]`;

export function UkiyoeHero() {
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
      const sky = one("[data-sky]");
      const skyPlate = one("[data-sky-plate]");
      const rainField = one("[data-rain-field]");
      const sun = one("[data-sun]");
      const sunDisc = one("[data-sun-disc]");
      const kanji = one("[data-kanji]");
      const waves = root.querySelector<SVGSVGElement>("[data-waves]");
      const flood = one("[data-flood]");
      const cartouche = one("[data-cartouche]");
      const cartoucheJp = one("[data-cartouche-jp]");
      const cartoucheEn = one("[data-cartouche-en]");
      const title = one("[data-title]");
      const sub = one("[data-sub]");
      const shout = one("[data-shout]");
      const ctas = q<HTMLElement>("[data-cta]");
      const seals = q<HTMLElement>("[data-seal]");
      const ctaSeals = q<HTMLElement>("[data-cta] [data-seal]");
      const pubSeal = one("[data-pub-seal]");
      const pubYear = one("[data-pub-year]");
      if (
        !stage ||
        !sky ||
        !skyPlate ||
        !rainField ||
        !sun ||
        !sunDisc ||
        !kanji ||
        !waves ||
        !flood ||
        !cartouche ||
        !cartoucheJp ||
        !cartoucheEn ||
        !title ||
        !sub ||
        !shout ||
        !pubSeal ||
        !pubYear ||
        ctas.length === 0
      ) {
        return;
      }
      const hidden = q<HTMLElement>("[data-print-intro]");

      if (prefersReducedMotion()) {
        gsap.set(hidden, { autoAlpha: 1 });
        // The watermark's settled state is a stain, not a solid.
        gsap.set(kanji, { autoAlpha: 0.14 });
        gsap.set(flood, { autoAlpha: 0 });
        press.current = (action: Action) => navigateWithPageTransition(HREF[action]);
        return;
      }

      let sequence: gsap.core.Timeline | null = null;
      let splits: SplitText[] = [];
      let loops: (gsap.core.Tween | gsap.core.Timeline)[] = [];
      let stopRain: (() => void) | null = null;
      let unparallax: (() => void) | null = null;
      const unhover: (() => void)[] = [];
      let outro: gsap.core.Timeline | null = null;
      let departing = false;

      const settle = () => {
        unparallax?.();
        unparallax = null;
        stopRain?.();
        stopRain = null;
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
        if (outro) {
          return;
        }
        sequence?.progress(1);
        settle();
        const foam = gsap.utils.toArray<SVGElement>("[data-wave-foam]", waves);
        /*
         * The sheet of indigo has to be over the print by the hand-off, not
         * on its way, so the flood is asked to land exactly as the route swaps.
         */
        outro = waveFlood(waves, flood, {
          duration: FLOOD,
          floodAt: 0.06,
          floodDuration: HANDOFF - 0.06,
          type: [title, sub, shout, cartouche, ...ctas, pubYear, pubSeal, kanji],
        });
        outro.to(
          foam,
          {
            y: () => gsap.utils.random(-120, -40, 1),
            autoAlpha: 0,
            duration: 0.45,
            ease: "power2.out",
            stagger: { each: 0.01, from: "random" },
          },
          0,
        );
        outro.call(
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

          // The press: the flat plates are inked, a hair out of register.
          registerBlocks(tl, [skyPlate, sunDisc], 0, { stagger: 0.3 });

          // The sheet.
          bokashiIn(tl, sky, 0);
          waveRise(tl, waves, 0.1);
          tl.set(sun, { zIndex: 1 }, 0).fromTo(
            sun,
            { y: () => stage.offsetHeight * 0.62 },
            { y: 0, duration: 1.4, ease: "power3.out" },
            0.3,
          );
          // Out of the sea and onto it: the sun's plate is pulled over the water.
          tl.set(sun, { zIndex: 3 }, 1.7);
          inkDrop(tl, kanji, 0.4);

          // The type.
          unroll(tl, cartouche, 0.6);
          splits.push(pourDown(tl, cartoucheJp, 1.05));
          splits.push(pourDown(tl, cartoucheEn, 1.35, { each: 0.02 }));
          splits.push(brushIn(tl, title, 0.9, { each: 0.04 }));
          splits.push(linesRise(tl, sub, 1.7));
          underlineDraw(tl, q<HTMLElement>("[data-underline]"), 2.2);
          sealStamp(tl, shout, 2.3, { from: 1.4, fromRotate: -3, rotate: 0 });

          // The seals.
          blockIn(tl, ctas, 2.5, { stagger: 0.12 });
          sealStamp(tl, ctaSeals, 2.75, { stagger: 0.1 });
          sealStamp(tl, pubSeal, 2.95);
          splits.push(pourDown(tl, pubYear, 2.95));

          // Then the sea, the rain and the sun carry on without us, and the
          // seals and buttons answer the pointer (not before: a hover during
          // the press would cut the entrance short).
          tl.call(
            () => {
              for (const seal of seals) {
                unhover.push(sealWobble(seal));
              }
              for (const cta of ctas) {
                unhover.push(paperShift(cta));
              }
              loops.push(waveDrift(waves));
              loops.push(haloPulse(sunDisc));
              loops.push(floatY(kanji));
              stopRain = rain(rainField, {
                colors: ["var(--ukiyoe-mizu)", "var(--ukiyoe-grey)"],
              });
              unparallax = parallax(stage, q<HTMLElement>("[data-depth]"), 14);
            },
            [],
            3.2,
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
        outro?.kill();
        for (const off of unhover) {
          off();
        }
        settle();
      };
    },
    { scope },
  );

  return (
    <div ref={scope} className="border-y border-line">
      <div
        data-page-transition
        data-stage
        className="relative min-h-[620px] overflow-hidden bg-ukiyoe-paper sm:min-h-[700px] lg:min-h-[760px]"
      >
        {/* ------------------------------------------------------- the sky */}
        <div data-sky data-print-intro aria-hidden="true" className="absolute inset-x-0 top-0 z-0 h-[46%] sm:h-[42%]">
          <div data-sky-plate data-print-intro className="ukiyoe-bokashi absolute inset-0" />
        </div>
        <div
          data-rain-field
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-[46%] overflow-hidden sm:h-[42%]"
        />

        {/* ------------------------------------------------------- the sun */}
        <div
          data-sun
          data-depth="0.7"
          aria-hidden="true"
          className="absolute top-[9%] z-[3] aspect-square w-[min(300px,22vw)]"
          style={{ left: "64%", marginLeft: "calc(min(300px, 22vw) / -2)" }}
        >
          <div data-sun-disc data-print-intro className="h-full w-full rounded-full bg-ukiyoe-beni opacity-[0.92]" />
        </div>

        {/* ------------------------------------------- the watermark kanji */}
        <div data-depth="1.2" aria-hidden="true" className="absolute left-[3%] top-[10%] z-[1]">
          <div
            data-kanji
            data-print-intro
            className="ukiyoe-watermark font-display text-[min(520px,60vh,78vw)] font-extrabold leading-none"
          >
            動
          </div>
        </div>

        {/* ------------------------------------------------------ the sea */}
        <div data-depth="0.35" className="absolute bottom-0 left-[-4%] z-[2] h-[38%] w-[108%] sm:h-[32%]">
          <svg
            data-waves
            data-print-intro
            aria-hidden="true"
            viewBox="0 0 1200 260"
            preserveAspectRatio="none"
            className="block h-full w-full"
          >
            <path
              data-wave-layer
              d="M0 260V150c110-30 190-90 320-84 90 4 150 60 240 58 100-2 150-64 260-70 130-8 240 40 380 26V260z"
              fill="var(--ukiyoe-mizu)"
            />
            <path
              data-wave-layer
              d="M0 260V186c130-40 210-96 330-90 100 6 160 62 250 60 96-2 156-56 250-62 120-8 240 36 370 24V260z"
              fill="var(--ukiyoe-indigo2)"
            />
            <path
              data-wave-layer
              d="M0 260v-50c150-30 240-80 350-70 90 8 150 54 230 54 90 0 150-44 240-48 110-6 230 30 380 18V260z"
              fill="var(--ukiyoe-indigo)"
            />
            <path
              data-wave-crest
              d="M620 220C660 130 750 48 880 42c90-4 170 46 176 116-30-38-84-58-136-46 46 8 80 44 82 88-34-40-96-56-150-38-58 20-96 66-116 110z"
              fill="var(--ukiyoe-indigo)"
            />
            <path
              data-wave-crest
              d="M678 218c34-72 104-128 196-124 56 3 104 34 116 76-28-26-70-40-108-32 32 10 56 38 60 68-30-32-80-44-124-28-46 16-78 50-96 84z"
              fill="var(--ukiyoe-indigo2)"
            />
            <path
              data-wave-crest
              d="M722 214c28-48 78-88 138-86 34 1 62 18 74 42-20-16-50-22-76-14 20 8 36 24 40 42-26-22-64-28-96-12-34 16-58 42-72 70z"
              fill="var(--ukiyoe-mizu)"
              opacity=".5"
            />
            <g fill="var(--ukiyoe-foam)">
              <circle data-wave-foam cx="1062" cy="160" r="8" />
              <circle data-wave-foam cx="1046" cy="184" r="7" />
              <circle data-wave-foam cx="1024" cy="202" r="6" />
              <circle data-wave-foam cx="1000" cy="216" r="5" />
              <circle data-wave-foam cx="976" cy="226" r="4" />
              <circle data-wave-foam cx="952" cy="232" r="3" />
              <circle data-wave-foam cx="1046" cy="126" r="6" />
              <circle data-wave-foam cx="1018" cy="98" r="6" />
              <circle data-wave-foam cx="986" cy="76" r="5" />
              <circle data-wave-foam cx="950" cy="60" r="4" />
              <circle data-wave-foam cx="914" cy="50" r="3" />
              <circle data-wave-foam cx="1006" cy="138" r="5" />
              <circle data-wave-foam cx="990" cy="160" r="4" />
              <circle data-wave-foam cx="968" cy="176" r="3" />
              <circle data-wave-foam cx="150" cy="176" r="4" />
              <circle data-wave-foam cx="124" cy="190" r="3" />
              <circle data-wave-foam cx="420" cy="150" r="4" />
              <circle data-wave-foam cx="446" cy="160" r="3" />
            </g>
            <g fill="none" stroke="var(--ukiyoe-foam)" strokeWidth="2" opacity=".7">
              <path data-wave-foam d="M40 206c60-20 110-40 170-30" />
              <path data-wave-foam d="M300 214c60-30 130-40 200-30" />
              <path data-wave-foam d="M420 228c40-14 80-18 120-12" />
              <path data-wave-foam d="M60 236c50-12 100-16 150-10" />
            </g>
          </svg>
        </div>

        {/* ---------------------------------------------------- the flood */}
        <div data-flood data-print-intro aria-hidden="true" className="absolute inset-0 z-[40] bg-ukiyoe-indigo" />

        {/* ------------------------------------------------- the cartouche */}
        <div data-depth="0.5" className="absolute right-[3%] top-8 z-[6] hidden md:block">
          <div data-cartouche data-print-intro className="ukiyoe-cartouche px-2.5 pb-5 pt-4">
            <div
              data-cartouche-jp
              data-print-intro
              className="ukiyoe-vertical font-display text-[40px] font-extrabold leading-none tracking-[0.14em] text-foreground"
            >
              動きの極
            </div>
            <div
              data-cartouche-en
              data-print-intro
              className="ukiyoe-vertical mt-3 font-sans text-[12px] font-medium uppercase tracking-[0.3em] text-foreground"
            >
              Motion to the Max
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------ the type */}
        <div data-depth="0.15" className="absolute left-[6%] top-[24%] z-[5] w-[88%] max-w-[46ch] sm:top-[16%]">
          <h1
            data-title
            data-print-intro
            className="m-0 whitespace-nowrap font-display text-[clamp(2.75rem,8.2vw,124px)] font-extrabold leading-[0.98] tracking-[-0.01em] text-foreground"
          >
            <span className="block">Motion to</span>
            <span className="block">the Max</span>
          </h1>
          <p
            data-sub
            data-print-intro
            className="m-0 mt-7 max-w-[46ch] font-sans text-[16px] leading-[1.6] text-foreground sm:text-[18px]"
          >
            Your static <em data-underline className="ukiyoe-underline">low rizz</em> website is{" "}
            <em data-underline className="ukiyoe-underline">cooked</em>. It has{" "}
            <em data-underline className="ukiyoe-underline">negative aura</em>. Use agents to
          </p>
          <p
            data-shout
            data-print-intro
            className="m-0 mt-1 font-display text-[20px] leading-[1.3] text-foreground sm:text-[24px]"
          >
            animate the shit out of it.
          </p>
        </div>

        {/* ------------------------------------------------------ the seals */}
        <div className="absolute bottom-8 left-[6%] z-[6] flex flex-wrap gap-4 sm:bottom-12">
          <button type="button" data-cta data-print-intro className={BUTTON_SECONDARY} onClick={() => press.current("showcase")}>
            <span data-seal data-print-intro aria-hidden="true" className="ukiyoe-seal h-6 w-6 text-[13px]">
              図
            </span>
            Showcase
          </button>
          <button type="button" data-cta data-print-intro className={BUTTON_PRIMARY} onClick={() => press.current("animaxx")}>
            <span data-seal data-print-intro aria-hidden="true" className="ukiyoe-seal ukiyoe-seal-inverse h-6 w-6 text-[13px]">
              動
            </span>
            Get Animaxxed
          </button>
        </div>

        <div
          data-depth="0.2"
          aria-hidden="true"
          className="absolute bottom-10 right-[3%] z-[6] hidden items-end gap-3 sm:flex"
        >
          <span
            data-pub-year
            data-print-intro
            className="ukiyoe-vertical ukiyoe-on-wave font-sans text-[13px] tracking-[0.24em]"
          >
            二〇二六年
          </span>
          <span data-pub-seal data-seal data-print-intro className="ukiyoe-seal ukiyoe-vertical h-16 w-11 text-[20px] tracking-[0.1em]">
            動画
          </span>
        </div>
      </div>
    </div>
  );
}
