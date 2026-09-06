"use client";

import { Fragment, useRef, type ReactNode } from "react";
import {
  gsap,
  prefersReducedMotion,
  ScrollTrigger,
  useGSAP,
  type SplitText,
} from "@/components/motion";
import {
  armsSway,
  bokashiIn,
  brushIn,
  countBrush,
  inkDrop,
  linesRise,
  parallax,
  paperShift,
  pourDown,
  rain,
  registerBlocks,
  sealStamp,
  sealWobble,
  strokeDraw,
  suckersPop,
  unroll,
  waveDrift,
  waveRise,
} from "@/lib/animation/effects/ukiyoe";
import { watchPageTransition } from "@/lib/animation/pageState";
import {
  CHAPTERS,
  HATNOTE,
  INFOBOX_FIGURE,
  LEAD,
  LEAD_EMPHASIS,
  SEE_ALSO,
  SOURCE,
  SOURCES_CHAPTER,
  TAXONOMY,
  TEMPORAL_RANGE,
  type Chapter,
  type Fact,
  type Figure,
  type Subsection,
} from "./content";

/** The retrieval date as the colophon prints it: "2 September 2026". */
const RETRIEVED = new Date(`${SOURCE.retrieved}T00:00:00Z`).toLocaleDateString("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/*
 * The article, ukiyo-e.
 *
 * A woodblock plate from an Edo encyclopaedia. The sheet opens with a
 * bokashi sky, rain falling through it, the wave rising out of the bottom
 * edge, and the octopus drawn in sumi key lines over flat indigo — a title
 * cartouche set vertically in the top corner, a red hanko under the name,
 * the publisher's seal down on the water. Below the print the page is a
 * printed book: a taxonomy column with kanji ranks, the lead under a
 * drop cap, a vertical table of contents, a seigaiha band, and then eight
 * chapters, each marked with its numeral on a seal and its title set
 * vertically beside it. Photographs are plates: the sky block, the indigo
 * wash and the key block pressed one after another inside a ruled frame,
 * signed 図 and numbered in kanji. The camouflage section is printed as a
 * night scene on indigo, with the moon coming up in the corner.
 *
 * Motion, all of it from the printing studio (lib/animation/effects/ukiyoe):
 *  - the print is pulled with the route: the sky washes in, the sea rises
 *    and throws foam, the ink drop spreads into the watermark kanji, the
 *    mantle presses down and the arms unfurl and grow their suckers, the
 *    cartouche unrolls and its kanji pour down it, the title is painted a
 *    stroke at a time, the seals are stamped. Then nothing stops: the sea
 *    drifts, the arms sway, the eyes blink, rain falls, and the sheet leans
 *    toward the pointer.
 *  - every scene below plays once as it arrives: numerals are stamped,
 *    vertical labels pour down, headings are painted, prose rises a line at
 *    a time, plates are pressed block by block, wave dividers draw
 *    themselves, facts count up under three beating hearts. Chapter
 *    numerals drift against the scroll and the seigaiha band slides with it.
 * Reduced motion snaps every one of these to its settled state.
 */

/** Fragment of the Wikipedia section a subsection retells. */
function sourceHref(anchor: string): string {
  return `${SOURCE.url}#${anchor}`;
}

const KANJI_DIGITS = ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

/** 1 → 一, 12 → 十二. Plate numbers and chapter numerals are set in kanji. */
function kanjiNumber(value: number): string {
  if (value < 10) {
    return KANJI_DIGITS[value] ?? String(value);
  }
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  const head = tens > 1 ? `${KANJI_DIGITS[tens] ?? ""}十` : "十";
  return ones > 0 ? `${head}${KANJI_DIGITS[ones] ?? ""}` : head;
}

/** The taxonomic ranks, as an Edo natural history would have labelled them. */
const RANK_KANJI: Record<string, string> = {
  Kingdom: "界",
  Phylum: "門",
  Class: "綱",
  Division: "部",
  Clade: "群",
  Superorder: "上目",
  Order: "目",
  Suborders: "亜目",
  Synonym: "異名",
};

/** Each chapter's mark and the line under its title. */
const CHAPTER_KANJI: Record<string, { mark: string; line: string }> = {
  etymology: { mark: "語源", line: "語源と複数形" },
  anatomy: { mark: "形態", line: "解剖と生理" },
  "life-cycle": { mark: "生活環", line: "生活環" },
  habitat: { mark: "生息地", line: "分布と生息地" },
  behaviour: { mark: "行動", line: "行動と生態" },
  evolution: { mark: "進化", line: "進化" },
  humans: { mark: "人間", line: "人間との関係" },
  sources: { mark: "出典", line: "出典と典拠" },
};

/** The head of a fact's vertical label, in the margin of the plate. */
const FACT_KANJI: Record<string, string> = {
  "etymology-plural": "複数形",
  size: "腕の長さ",
  external: "隙間",
  circulation: "心臓",
  respiration: "皮膚呼吸",
  nervous: "神経",
  lifespan: "寿命",
  danger: "猛毒",
};

const CH_GRID = "grid grid-cols-1 gap-x-11 gap-y-8 lg:grid-cols-[150px_minmax(0,1fr)_300px]";
const LABEL = "text-[12px] font-medium uppercase tracking-[0.24em]";

/** Every figure in reading order; the plates are numbered from the infobox. */
const FIGURE_ORDER = new Map<Figure, number>([[INFOBOX_FIGURE, 1]]);
for (const chapter of CHAPTERS) {
  for (const subsection of chapter.subsections) {
    if (subsection.figure) {
      FIGURE_ORDER.set(subsection.figure, FIGURE_ORDER.size + 1);
    }
  }
}

/**
 * The emphasised words of the lead are printed in beni and underlined with a
 * rule that draws itself once the lead has settled.
 */
function emphasise(text: string, words: string[]): ReactNode[] {
  const pattern = new RegExp(`(${words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`);
  return text.split(pattern).map((part, index) =>
    words.includes(part) ? (
      <em key={index} data-em className="relative inline-block not-italic ukiyoe-red">
        {part}
        <i
          data-em-rule
          data-print-intro
          aria-hidden="true"
          className="absolute -bottom-0.5 left-0 block h-[2px] w-full origin-left ukiyoe-red-bg"
        />
      </em>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

export function UkiyoeArticle() {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    (_context, contextSafe) => {
      const root = scope.current;
      if (!root || !contextSafe) {
        return;
      }
      const q = gsap.utils.selector(root);
      const one = (selector: string) => q<HTMLElement>(selector)[0];
      const hero = one("[data-hero]");
      const sky = one("[data-sky]");
      const rainField = one("[data-rain-field]");
      const kanji = one("[data-kanji]");
      const cartouche = one("[data-cartouche]");
      const cartoucheJp = one("[data-cartouche-jp]");
      const cartoucheEn = one("[data-cartouche-en]");
      const title = one("[data-title]");
      const sub = one("[data-sub]");
      const subSeal = one("[data-sub-seal]");
      const pubSeal = one("[data-pub-seal]");
      const pubText = one("[data-pub-text]");
      const octopus = root.querySelector<SVGSVGElement>("[data-octopus]");
      const waves = root.querySelector<SVGSVGElement>("[data-waves]");
      const band = one("[data-band]");
      const scenes = q<HTMLElement>("[data-scene]");
      if (
        !hero ||
        !sky ||
        !rainField ||
        !kanji ||
        !cartouche ||
        !cartoucheJp ||
        !cartoucheEn ||
        !title ||
        !sub ||
        !subSeal ||
        !pubSeal ||
        !pubText ||
        !octopus ||
        !waves
      ) {
        return;
      }

      if (prefersReducedMotion()) {
        gsap.set(q<HTMLElement>("[data-print-intro]"), { autoAlpha: 1 });
        gsap.set(kanji, { autoAlpha: 0.14 });
        return;
      }

      let sequence: gsap.core.Timeline | null = null;
      let splits: SplitText[] = [];
      let loops: (gsap.core.Tween | gsap.core.Timeline)[] = [];
      let triggers: ScrollTrigger[] = [];
      let cleanups: (() => void)[] = [];

      const settle = () => {
        for (const cleanup of cleanups) {
          cleanup();
        }
        cleanups = [];
        for (const loop of loops) {
          loop.kill();
        }
        loops = [];
        for (const trigger of triggers) {
          trigger.kill();
        }
        triggers = [];
        for (const split of splits) {
          split.revert();
        }
        splits = [];
      };

      /**
       * Justified prose, split into lines. CSS never stretches a last line,
       * and after the split every line is one — so the justification is
       * handed back to all but the paragraph's real last line and the split
       * reads exactly as the unsplit paragraph did.
       */
      const riseProse = (timeline: gsap.core.Timeline, el: HTMLElement, at: number) => {
        const split = linesRise(timeline, el, at, { each: 0.06 });
        split.lines.forEach((line, index) => {
          if (index < split.lines.length - 1) {
            (line as HTMLElement).style.textAlignLast = "justify";
          }
        });
        return split;
      };

      /**
       * The scene's own timeline, built and played once as it scrolls in.
       *
       * Scenes nest — a chapter's spread holds a scene for every subsection
       * and every plate in its margin — so a scene only ever animates the
       * pieces that belong to it and leaves the ones a scene of their own
       * has claimed.
       */
      const playScene = (scene: HTMLElement) => {
        const s = <T extends Element>(selector: string): T[] =>
          Array.from(scene.querySelectorAll<T>(selector)).filter(
            (el) => el.closest("[data-scene]") === scene,
          );
        const first = (selector: string) => s<HTMLElement>(selector)[0];
        const tl = gsap.timeline();

        // ---- the intro: the taxonomy column, the lead, the contents box.
        const sideRule = first("[data-side-rule]");
        const sideJp = first("[data-side-jp]");
        const hatnote = first("[data-hatnote]");
        const rows = s<HTMLElement>("[data-dl-row]");
        const rulerFill = first("[data-ruler-fill]");
        const dropCap = first("[data-dropcap]");
        const lead = first("[data-lead]");
        const hat = first("[data-hat]");
        const toc = first("[data-toc]");
        const tocEntries = s<HTMLElement>("[data-toc-entry]");
        if (sideRule) {
          tl.fromTo(
            sideRule,
            { autoAlpha: 1, scaleY: 0, transformOrigin: "center top" },
            { scaleY: 1, duration: 0.9, ease: "power3.inOut" },
            0,
          );
        }
        if (sideJp) {
          splits.push(brushIn(tl, sideJp, 0.15, { each: 0.05 }));
        }
        if (hatnote) {
          splits.push(linesRise(tl, hatnote, 0.4));
        }
        if (rows.length > 0) {
          tl.fromTo(
            rows,
            { autoAlpha: 0, y: 12, willChange: "transform, opacity" },
            { autoAlpha: 1, y: 0, duration: 0.4, ease: "power3.out", stagger: 0.045 },
            0.55,
          ).set(rows, { clearProps: "willChange" }, ">");
        }
        if (rulerFill) {
          tl.fromTo(
            rulerFill,
            { autoAlpha: 1, scaleX: 0, transformOrigin: "left center" },
            { scaleX: 1, duration: 0.8, ease: "power2.inOut" },
            1.1,
          );
        }
        if (dropCap) {
          splits.push(brushIn(tl, dropCap, 0.1, { duration: 0.7, each: 0.04 }));
        }
        if (lead) {
          splits.push(linesRise(tl, lead, 0.3, { each: 0.05 }));
          const rules = s<HTMLElement>("[data-em-rule]");
          if (rules.length > 0) {
            tl.fromTo(
              rules,
              { autoAlpha: 1, scaleX: 0, transformOrigin: "left center" },
              { scaleX: 1, duration: 0.45, ease: "power2.out", stagger: 0.09 },
              1.3,
            );
          }
        }
        if (hat) {
          splits.push(linesRise(tl, hat, 1.5));
        }
        if (toc) {
          unroll(tl, toc, 0.2, { duration: 0.8 });
        }
        tocEntries.forEach((entry, index) => {
          splits.push(pourDown(tl, entry, 0.6 + index * 0.08, { each: 0.03 }));
        });

        // ---- the seigaiha band's rule.
        const bandRule = first("[data-band-rule]");
        if (bandRule) {
          tl.fromTo(
            bandRule,
            { autoAlpha: 1, scaleX: 0, transformOrigin: "left center" },
            { scaleX: 1, duration: 1, ease: "power2.inOut" },
            0,
          );
        }

        // ---- the chapter mark and its heading.
        const numeral = first("[data-numeral]");
        const markLabel = first("[data-mark-label]");
        const h2 = first("[data-h2]");
        const jp = first("[data-jp]");
        const diamonds = s<HTMLElement>("[data-diamond]");
        const h3s = s<HTMLElement>("[data-h3]");
        const paragraphs = s<HTMLElement>("[data-p]");
        const chips = s<HTMLElement>("[data-chip]");
        if (numeral) {
          sealStamp(tl, numeral, 0.05);
        }
        if (markLabel) {
          splits.push(pourDown(tl, markLabel, 0.45, { each: 0.045 }));
        }
        if (h2) {
          splits.push(brushIn(tl, h2, 0.2, { each: 0.035 }));
        }
        if (jp) {
          splits.push(brushIn(tl, jp, 0.6, { duration: 0.35, each: 0.02 }));
        }
        if (diamonds.length > 0) {
          tl.fromTo(
            diamonds,
            { scale: 0, autoAlpha: 0, transformOrigin: "center center" },
            { scale: 1, autoAlpha: 1, duration: 0.4, ease: "back.out(2.4)", stagger: 0.1 },
            0.2,
          );
        }
        if (h3s.length > 0) {
          tl.fromTo(
            h3s,
            { autoAlpha: 0, x: -14, willChange: "transform, opacity" },
            { autoAlpha: 1, x: 0, duration: 0.5, ease: "power3.out", stagger: 0.1 },
            0.22,
          ).set(h3s, { clearProps: "willChange" }, ">");
        }
        paragraphs.forEach((paragraph, index) => {
          splits.push(riseProse(tl, paragraph, 0.4 + index * 0.14));
        });
        if (chips.length > 0) {
          tl.fromTo(
            chips,
            { autoAlpha: 0, y: 10 },
            { autoAlpha: 1, y: 0, duration: 0.4, ease: "power3.out", stagger: 0.08 },
            1.1,
          );
        }

        // ---- the facts in the margin.
        for (const [index, fact] of s<HTMLElement>("[data-fact]").entries()) {
          const f = gsap.utils.selector(fact);
          const at = 0.35 + index * 0.25;
          tl.fromTo(
            fact,
            { autoAlpha: 0, y: 22, willChange: "transform, opacity" },
            { autoAlpha: 1, y: 0, duration: 0.55, ease: "power3.out" },
            at,
          ).set(fact, { clearProps: "willChange" }, ">");
          cleanups.push(paperShift(fact));
          const value = f<HTMLElement>("[data-fact-value]")[0];
          if (value) {
            countBrush(tl, value, at + 0.15, { to: value.dataset.value ?? "0", duration: 0.9 });
          }
          const unit = f<HTMLElement>("[data-fact-unit]")[0];
          if (unit) {
            sealStamp(tl, unit, at + 0.9, { rotate: 0, fromRotate: -8, from: 1.5, bleed: false });
          }
          const label = f<HTMLElement>("[data-fact-label]")[0];
          if (label) {
            splits.push(pourDown(tl, label, at + 0.4, { each: 0.02 }));
          }
          const hearts = f<HTMLElement>("[data-heart]");
          if (hearts.length > 0) {
            sealStamp(tl, hearts, at + 0.35, { stagger: 0.14, duration: 0.3 });
            tl.call(
              () =>
                loops.push(
                  gsap
                    .timeline({ repeat: -1, repeatDelay: 0.75 })
                    .to(hearts, { scale: 1.3, duration: 0.13, ease: "power2.out", stagger: 0.13 })
                    .to(hearts, { scale: 1, duration: 0.5, ease: "elastic.out(1, 0.4)", stagger: 0.13 }, "-=0.4"),
                ),
              [],
              at + 1.5,
            );
          }
        }

        // ---- the plates, pressed one block at a time.
        for (const [index, plate] of s<HTMLElement>("[data-print]").entries()) {
          const p = gsap.utils.selector(plate);
          const at = 0.15 + index * 0.3;
          const blocks = p<HTMLElement>("[data-block]");
          if (blocks.length > 0) {
            registerBlocks(tl, blocks, at);
          }
          const seal = p<HTMLElement>("[data-fig-seal]")[0];
          if (seal) {
            sealStamp(tl, seal, at + 1.1);
          }
          const caption = p<HTMLElement>("[data-fig-cap]")[0];
          if (caption) {
            splits.push(linesRise(tl, caption, at + 1.25, { each: 0.06 }));
          }
        }

        // ---- the night band and its moon.
        const moon = first("[data-moon]");
        if (scene.dataset.night !== undefined) {
          tl.fromTo(
            scene,
            { autoAlpha: 1, clipPath: "inset(0 100% 0 0)", willChange: "clip-path" },
            { clipPath: "inset(0% 0% 0% 0%)", duration: 1, ease: "power3.inOut" },
            0,
          ).set(scene, { clearProps: "clipPath,willChange" }, ">");
        }
        if (moon) {
          tl.fromTo(
            moon,
            { autoAlpha: 0, y: 60, scale: 0.85 },
            { autoAlpha: 1, y: 0, scale: 1, duration: 1.4, ease: "power3.out" },
            0.5,
          );
        }

        // ---- a wave divider draws itself across the page.
        const dividers = s<SVGPathElement>("[data-divider]");
        if (dividers.length > 0) {
          strokeDraw(tl, dividers, 0);
        }

        // ---- the closing seals and the see-also cartouches.
        const stamps = s<HTMLElement>("[data-stamp]");
        if (stamps.length > 0) {
          sealStamp(tl, stamps, 0.4, { stagger: 0.14, rotate: -2, fromRotate: -12 });
          for (const stamp of stamps) {
            cleanups.push(sealWobble(stamp));
          }
        }
        return tl;
      };

      const unwatch = watchPageTransition(root, {
        onIdle: contextSafe(() => {
          const tl = gsap.timeline();
          sequence = tl;

          // The sheet: sky, sea, the ink drop that spreads into the kanji.
          bokashiIn(tl, sky, 0);
          waveRise(tl, waves, 0.1);
          inkDrop(tl, kanji, 0.3);

          // The animal: the head presses down, the arms unfurl from it and
          // grow their suckers, the spots come up, and it blinks.
          const arms = gsap.utils.toArray<SVGElement>("[data-arm]", octopus);
          const mantle = gsap.utils.toArray<SVGElement>("[data-mantle]", octopus);
          const eyes = gsap.utils.toArray<SVGElement>("[data-eye]", octopus);
          const spots = gsap.utils.toArray<SVGElement>("[data-spots]", octopus);
          gsap.set(octopus, { autoAlpha: 1 });
          tl.fromTo(
            mantle,
            { scale: 0.7, autoAlpha: 0, svgOrigin: "300 250" },
            { scale: 1, autoAlpha: 1, duration: 0.8, ease: "back.out(1.6)" },
            0.5,
          )
            .fromTo(
              arms,
              { scale: 0.2, autoAlpha: 0, svgOrigin: "300 250" },
              { scale: 1, autoAlpha: 1, duration: 0.9, ease: "back.out(1.2)", stagger: 0.09 },
              0.8,
            )
            .fromTo(spots, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, ease: "sine.out" }, 1.9);
          suckersPop(tl, octopus, 1.5);
          tl.to(eyes, { scaleY: 0.1, transformOrigin: "50% 50%", duration: 0.09, ease: "power2.in", yoyo: true, repeat: 1 }, 2.3);

          // The cartouche unrolls and its kanji pour down it.
          unroll(tl, cartouche, 0.6);
          splits.push(pourDown(tl, cartoucheJp, 1));
          splits.push(pourDown(tl, cartoucheEn, 1.3, { each: 0.02 }));

          // The type: the title is painted, the seals are brought down.
          splits.push(brushIn(tl, title, 0.9, { each: 0.05 }));
          sealStamp(tl, subSeal, 1.9);
          splits.push(linesRise(tl, sub, 2));
          sealStamp(tl, pubSeal, 2.6);
          splits.push(pourDown(tl, pubText, 2.7, { each: 0.03 }));

          // Then the print never quite settles.
          tl.call(
            () => {
              loops.push(waveDrift(waves));
              loops.push(armsSway(octopus));
              cleanups.push(rain(rainField));
              cleanups.push(parallax(hero, q<HTMLElement>("[data-depth]"), 12));
            },
            [],
            3,
          );

          // Scenes below the fold play as they arrive, once each.
          triggers = scenes.map((scene) =>
            ScrollTrigger.create({
              trigger: scene,
              start: "top 82%",
              once: true,
              onEnter: contextSafe(() => {
                playScene(scene);
              }),
            }),
          );

          // The numerals drift against the scroll.
          for (const drift of q<HTMLElement>("[data-drift]")) {
            const amount = Number.parseFloat(drift.dataset.drift ?? "0");
            const tween = gsap.fromTo(
              drift,
              { yPercent: amount },
              {
                yPercent: -amount,
                ease: "none",
                scrollTrigger: {
                  trigger: drift.closest("[data-scene]") ?? drift,
                  start: "top bottom",
                  end: "bottom top",
                  scrub: 0.6,
                },
              },
            );
            loops.push(tween);
            if (tween.scrollTrigger) {
              triggers.push(tween.scrollTrigger);
            }
          }

          // The sea in the seigaiha band slides as the page passes it.
          if (band) {
            const slide = gsap.fromTo(
              band,
              { backgroundPositionX: "0px" },
              {
                backgroundPositionX: "128px",
                ease: "none",
                scrollTrigger: { trigger: band, start: "top bottom", end: "bottom top", scrub: 0.5 },
              },
            );
            loops.push(slide);
            if (slide.scrollTrigger) {
              triggers.push(slide.scrollTrigger);
            }
          }

          // The faces arrive after the first layout; measure again once they have.
          document.fonts?.ready.then(() => ScrollTrigger.refresh());
        }),
        onExiting: () => {
          sequence?.kill();
          sequence = null;
          settle();
        },
      });

      return () => {
        unwatch();
        sequence?.kill();
        settle();
      };
    },
    { scope },
  );

  const order = TAXONOMY.find((row) => row.rank === "Order");
  const klass = TAXONOMY.find((row) => row.rank === "Class")?.name ?? "";

  return (
    <div ref={scope} className="ukiyoe-article">
      {/* ------------------------------------------------------------- print */}
      <header
        data-page-transition
        data-hero
        className="relative h-[calc(100vh-200px)] min-h-[640px] overflow-hidden border-y border-line"
      >
        <div
          data-sky
          data-print-intro
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[38%] ukiyoe-bokashi"
        />
        <div
          data-rain-field
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-[38%] overflow-hidden"
        />
        <div
          data-kanji
          data-print-intro
          data-depth="0.3"
          data-drift="8"
          aria-hidden="true"
          style={{ fontSize: "min(560px, 64vh)" }}
          className="absolute left-[3%] top-[10%] z-[1] ukiyoe-watermark font-display font-extrabold leading-none"
        >
          蛸
        </div>

        <div
          data-cartouche
          data-print-intro
          data-depth="0.5"
          className="ukiyoe-cartouche ukiyoe-vertical absolute right-[7%] top-8 z-[4] px-2.5 pb-5 pt-4 sm:top-10"
        >
          <div
            data-cartouche-jp
            data-print-intro
            className="font-display text-[30px] font-extrabold leading-none tracking-[0.14em] text-ukiyoe-sumi sm:text-[44px]"
          >
            蛸の図
          </div>
          <div
            data-cartouche-en
            data-print-intro
            className={`${LABEL} mt-3 tracking-[0.3em] text-ukiyoe-sumi`}
          >
            Octopus · Octopoda
          </div>
        </div>

        {/* The name and its seal travel together: one block, one position. */}
        <div data-depth="0.15" className="absolute left-[6%] right-[6%] top-[54%] z-[3] sm:top-[38%]">
          <h1
            data-title
            data-print-intro
            style={{ fontSize: "min(168px, 11.5vw)" }}
            className="m-0 font-display font-extrabold leading-[0.95] tracking-[-0.01em] text-foreground"
          >
            Octopus
          </h1>
          <div className="mt-2.5 flex items-center gap-4">
            <span
              data-sub-seal
              data-print-intro
              aria-hidden="true"
              className="ukiyoe-seal h-[34px] w-[34px] shrink-0 text-[18px] sm:h-[38px] sm:w-[38px] sm:text-[20px]"
            >
              蛸
            </span>
            <span data-sub data-print-intro className="text-[12px] tracking-[0.14em] sm:text-[15px]">
              {order?.name ?? "Octopoda"} · {order?.note ?? "Leach, 1818"} · Class {klass}
            </span>
          </div>
        </div>

        {/*
          The animal changes side with the sheet: on a narrow page it swims
          under the cartouche rather than behind it.
        */}
        <div
          data-depth="0.9"
          aria-hidden="true"
          className="absolute left-[2%] top-[12%] z-[2] w-[62vw] max-w-[540px] sm:left-auto sm:right-[4%] sm:top-[8%] sm:w-[36vw]"
        >
          <OctopusPlate />
        </div>

        <WavePlate />

        {/*
          The publisher's line is printed on the water, so it is kept short
          enough to break into two columns and stay off the paper above the
          wave, where paper-coloured type would not read.
        */}
        <div className="absolute bottom-6 left-[4%] z-[4] flex items-end gap-3 ukiyoe-on-wave">
          <span
            data-pub-seal
            data-print-intro
            aria-hidden="true"
            className="ukiyoe-seal ukiyoe-vertical h-[64px] w-[44px] text-[20px] tracking-[0.1em]"
          >
            百科
          </span>
          <span
            data-pub-text
            data-print-intro
            className="ukiyoe-vertical h-[104px] text-[13px] tracking-[0.24em] ukiyoe-on-wave"
          >
            百科版 · 二〇二六年
          </span>
        </div>
      </header>

      {/* -------------------------------------------------------------- intro */}
      <section
        data-page-transition
        data-scene
        className="grid items-start gap-9 py-12 lg:grid-cols-[1fr_3fr_250px] lg:py-16"
      >
        <aside className="relative lg:pr-8">
          <span
            data-side-rule
            data-print-intro
            aria-hidden="true"
            className="absolute right-0 top-0 hidden h-full w-px bg-ukiyoe-sumi lg:block"
          />
          <div
            data-side-jp
            data-print-intro
            className="mb-3 text-[20px] font-bold tracking-[0.1em] sm:text-[22px]"
          >
            蛸 — 八本の腕
          </div>
          <p data-hatnote data-print-intro className="m-0 text-[14px] leading-[1.9] text-muted">
            {HATNOTE}
          </p>
          <dl className="m-0 mt-6 grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1 text-[14px]">
            {TAXONOMY.map((row) => (
              <Fragment key={row.rank}>
                <dt
                  data-dl-row
                  data-print-intro
                  className="whitespace-nowrap font-medium tracking-[0.06em] ukiyoe-blue"
                >
                  <span aria-hidden="true">{RANK_KANJI[row.rank] ?? row.rank}</span>
                  <span className="sr-only">{row.rank}</span>
                </dt>
                <dd data-dl-row data-print-intro className="m-0">
                  {row.rank === "Order" ? <b>{row.name}</b> : row.name}
                  {row.note ? <span className="text-muted"> {row.note}</span> : null}
                </dd>
              </Fragment>
            ))}
            <dt
              data-dl-row
              data-print-intro
              className="whitespace-nowrap font-medium tracking-[0.06em] ukiyoe-blue"
            >
              <span aria-hidden="true">時代</span>
              <span className="sr-only">Temporal range</span>
            </dt>
            <dd data-dl-row data-print-intro className="m-0">
              {TEMPORAL_RANGE.from} – {TEMPORAL_RANGE.to}
              <span className="mt-1.5 block h-[7px] w-full border border-line bg-ukiyoe-paper2">
                <i
                  data-ruler-fill
                  data-print-intro
                  aria-hidden="true"
                  className="block h-full ukiyoe-blue-bg"
                  style={{
                    marginLeft: `${TEMPORAL_RANGE.start * 100}%`,
                    width: `${(1 - TEMPORAL_RANGE.start) * 100}%`,
                  }}
                />
              </span>
              <span className="mt-1 block text-[11px] tracking-[0.08em] text-muted">
                {TEMPORAL_RANGE.fromAge}
              </span>
            </dd>
          </dl>
          <div className="mt-7">
            <Plate figure={INFOBOX_FIGURE} />
          </div>
        </aside>

        <div>
          <span
            data-dropcap
            data-print-intro
            className="float-left mr-3 pt-2 font-display text-[clamp(56px,7vw,100px)] font-extrabold leading-[0.8] ukiyoe-blue"
          >
            {LEAD.slice(0, 1)}
          </span>
          <p data-lead data-print-intro className="m-0 text-[19px] leading-[1.75] sm:text-[23px]">
            {emphasise(LEAD.slice(1), LEAD_EMPHASIS)}
          </p>
          <p data-hat data-print-intro className="m-0 mt-6 text-[14px] text-muted">
            Retold from Wikipedia, {SOURCE.license} · {SOURCE.citations} citations ·{" "}
            {SOURCE.languages} languages
          </p>
        </div>

        <nav
          data-toc
          data-print-intro
          aria-label="Contents"
          className="flex h-[220px] flex-row-reverse justify-start gap-1 border border-line bg-ukiyoe-paper2 px-3 py-4 lg:h-[320px]"
        >
          <div className="ukiyoe-vertical border-r border-line pr-2 text-[13px] font-bold tracking-[0.14em] ukiyoe-red">
            目次
          </div>
          {[...CHAPTERS, SOURCES_CHAPTER].map((chapter, index) => (
            <a
              key={chapter.id}
              href={`#${chapter.id}`}
              data-toc-entry
              data-print-intro
              className="ukiyoe-vertical text-[13px] leading-none tracking-[0.14em] ukiyoe-red-hover"
            >
              <b className="font-display text-[19px] font-extrabold ukiyoe-blue">
                {kanjiNumber(index + 1)}
              </b>
              {chapter.short}
            </a>
          ))}
        </nav>
      </section>

      {/* --------------------------------------------------------- the band */}
      <div data-scene>
        <span
          data-band-rule
          data-print-intro
          aria-hidden="true"
          className="block h-px w-full bg-ukiyoe-sumi"
        />
        <div data-band aria-hidden="true" className="ukiyoe-band mt-6" />
      </div>

      {/* ----------------------------------------------------------- chapters */}
      {CHAPTERS.map((chapter, index) => (
        <ChapterBlock key={chapter.id} chapter={chapter} index={index} />
      ))}

      {/* ------------------------------------------------------------ sources */}
      <WaveDivider />
      <section id={SOURCES_CHAPTER.id} data-scene className={`${CH_GRID} scroll-mt-8 pt-14 sm:pt-20`}>
        <Mark index={7} kanji={CHAPTER_KANJI.sources?.mark ?? "出典"} />
        <div className="min-w-0">
          <h2
            data-h2
            data-print-intro
            className="m-0 mb-1.5 font-display text-[30px] font-extrabold leading-[1.15] sm:text-[40px]"
          >
            {SOURCES_CHAPTER.title}
          </h2>
          <div
            data-jp
            data-print-intro
            className="mb-7 text-[13px] font-bold tracking-[0.3em] ukiyoe-red sm:text-[15px]"
          >
            第八章 · {CHAPTER_KANJI.sources?.line ?? "出典"}
          </div>
          <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2.5 text-[16px] sm:text-[17px]">
            {(
              [
                [
                  "典拠",
                  <a
                    key="src"
                    href={SOURCE.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold underline decoration-ukiyoe-beni underline-offset-4 ukiyoe-red-hover"
                  >
                    Octopus, Wikipedia
                  </a>,
                ],
                [
                  "許諾",
                  <a
                    key="lic"
                    href={SOURCE.licenseUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold underline decoration-ukiyoe-beni underline-offset-4 ukiyoe-red-hover"
                  >
                    {SOURCE.license}
                  </a>,
                ],
                ["引用", `${SOURCE.citations} citations`],
                ["言語", `${SOURCE.languages} languages`],
                ["取得", RETRIEVED],
              ] as [string, ReactNode][]
            ).map(([term, detail]) => (
              <Fragment key={term}>
                <dt data-p data-print-intro className="whitespace-nowrap pt-1 text-[14px] tracking-[0.2em] ukiyoe-blue">
                  {term}
                </dt>
                <dd data-p data-print-intro className="m-0">
                  {detail}
                </dd>
              </Fragment>
            ))}
          </dl>
          <p className="m-0 mt-8 flex flex-wrap gap-3">
            {SEE_ALSO.map((entry) => (
              <a
                key={entry}
                href={`https://en.wikipedia.org/wiki/${encodeURIComponent(entry.replace(/ /g, "_"))}`}
                target="_blank"
                rel="noreferrer"
                data-stamp
                data-print-intro
                className="ukiyoe-cartouche inline-block px-3 py-1.5 text-[13px] tracking-[0.12em] ukiyoe-red-hover"
              >
                {entry} ↗
              </a>
            ))}
          </p>
        </div>
        <div className="flex flex-col gap-9">
          <div data-fact data-print-intro className="ukiyoe-shadow border border-line bg-ukiyoe-paper2 p-4">
            <div className="ukiyoe-vertical h-[150px] text-[13px] tracking-[0.2em]">
              <b className="text-[17px] font-bold ukiyoe-red">動きの極</b>
              Animaxxipedia · the octopus plate, printed from the Wikipedia article and set in motion.
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------- colophon */}
      <footer
        data-scene
        className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-line py-6 text-[13px] tracking-[0.08em]"
      >
        <span data-p data-print-intro className="m-0">
          Source: Wikipedia · {SOURCE.license} · Retrieved {RETRIEVED}
        </span>
        <span aria-hidden="true" className="flex gap-2">
          {["百", "科", "蛸"].map((seal) => (
            <span
              key={seal}
              data-stamp
              data-print-intro
              className="ukiyoe-seal h-[30px] w-[30px] text-[15px]"
            >
              {seal}
            </span>
          ))}
        </span>
      </footer>
    </div>
  );
}

/* ---------------------------------------------------------------- pieces */

/** The chapter's mark: its numeral on a seal, its title set down the side. */
function Mark({ index, kanji }: { index: number; kanji: string }) {
  const numeral = kanjiNumber(index + 1);
  return (
    <div className="flex flex-row items-center gap-4 lg:flex-col lg:items-center lg:gap-[18px]">
      <span
        data-numeral
        data-print-intro
        data-drift="14"
        aria-hidden="true"
        className="ukiyoe-seal h-[56px] w-[56px] text-[30px] lg:h-[72px] lg:w-[72px] lg:text-[40px]"
      >
        {numeral}
      </span>
      <span
        data-mark-label
        data-print-intro
        className="text-[13px] font-bold tracking-[0.24em] ukiyoe-blue lg:whitespace-nowrap lg:text-[15px] lg:[text-orientation:mixed] lg:[writing-mode:vertical-rl]"
      >
        第{numeral}章 {kanji}
      </span>
    </div>
  );
}

/**
 * A chapter is set as one spread: the mark down the left, the prose running
 * on in the middle, and the margin beside it carrying the facts and the
 * plates. Prose and margin are columns of the same grid rather than rows of
 * one, so a tall plate never opens a hole in the text. The camouflage
 * section is printed as night, which takes the whole width — so the
 * subsections are gathered into runs and the night one cuts the spread in
 * two, keeping the order of the article intact.
 */
type Run = { night: boolean; items: Subsection[] };

function runsOf(chapter: Chapter): Run[] {
  const runs: Run[] = [];
  for (const subsection of chapter.subsections) {
    const night = subsection.inverted === true;
    const last = runs[runs.length - 1];
    if (last && !last.night && !night) {
      last.items.push(subsection);
    } else {
      runs.push({ night, items: [subsection] });
    }
  }
  return runs;
}

function ChapterBlock({ chapter, index }: { chapter: Chapter; index: number }) {
  const kanji = CHAPTER_KANJI[chapter.id] ?? { mark: "図", line: "" };
  const first = chapter.subsections[0];
  const single = chapter.subsections.length === 1 && first !== undefined;
  return (
    <Fragment>
      <WaveDivider />
      {runsOf(chapter).map((run, runIndex) => {
        const head = runIndex === 0;
        return (
          <section
            key={run.items[0]?.id ?? runIndex}
            {...(head ? { id: chapter.id } : {})}
            {...(head || run.night ? { "data-scene": "" } : {})}
            {...(run.night ? { "data-night": "", "data-print-intro": "" } : {})}
            className={[
              CH_GRID,
              "scroll-mt-8",
              head ? "pt-14 sm:pt-20" : "pt-6",
              // The night band is printed to the edge of the sheet.
              run.night
                ? "ukiyoe-night relative left-1/2 mt-12 w-screen -translate-x-1/2 overflow-hidden pb-12 pt-12"
                : "",
            ].join(" ")}
          >
            {head ? (
              <Mark index={index} kanji={kanji.mark} />
            ) : run.night ? (
              <div>
                <span
                  data-moon
                  aria-hidden="true"
                  className="block h-14 w-14 rounded-full bg-[#ede2c6] opacity-90 shadow-[0_0_60px_rgba(237,226,198,0.35)] lg:ml-auto lg:h-20 lg:w-20"
                />
              </div>
            ) : (
              <div aria-hidden="true" className="hidden lg:block" />
            )}
            <div className="min-w-0">
              {head && (
                <Fragment>
                  <h2
                    data-h2
                    data-print-intro
                    className="m-0 mb-1.5 font-display text-[30px] font-extrabold leading-[1.15] text-balance sm:text-[40px]"
                  >
                    {single && first ? first.title : chapter.title}
                  </h2>
                  <div
                    data-jp
                    data-print-intro
                    className="mb-7 text-[13px] font-bold tracking-[0.3em] ukiyoe-red sm:text-[15px]"
                  >
                    第{kanjiNumber(index + 1)}章 · {kanji.line}
                  </div>
                </Fragment>
              )}
              {run.items.map((subsection, itemIndex) => (
                <div
                  key={subsection.id}
                  id={subsection.id}
                  data-scene
                  className={itemIndex > 0 || !head ? "scroll-mt-8 pt-7" : "scroll-mt-8"}
                >
                  {!single && (
                    <h3
                      data-h3
                      data-print-intro
                      className="m-0 mb-2.5 flex items-center gap-3 text-[15px] font-bold tracking-[0.2em] sm:text-[17px]"
                    >
                      <span data-diamond aria-hidden="true" className="text-[10px] ukiyoe-red">
                        ◆
                      </span>
                      {subsection.title}
                    </h3>
                  )}
                  <Prose subsection={subsection} />
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-9">
              {run.items.map((subsection) => (
                <Fragment key={subsection.id}>
                  {subsection.fact && (
                    <div data-scene>
                      <FactBox fact={subsection.fact} kanji={FACT_KANJI[subsection.id] ?? "図"} />
                    </div>
                  )}
                  {subsection.figure && !subsection.figure.bleed && (
                    <div data-scene>
                      <Plate figure={subsection.figure} />
                    </div>
                  )}
                </Fragment>
              ))}
            </div>
          </section>
        );
      })}
      {chapter.subsections.map((subsection) =>
        subsection.figure?.bleed ? (
          <BleedPlate key={subsection.id} figure={subsection.figure} />
        ) : null,
      )}
    </Fragment>
  );
}

function Prose({ subsection }: { subsection: Subsection }) {
  return (
    <Fragment>
      {subsection.paragraphs.map((paragraph, index) => (
        <p
          key={index}
          data-p
          data-print-intro
          className="m-0 mb-4 max-w-[68ch] text-[16px] leading-[1.75] sm:text-[18px]"
        >
          {paragraph}
        </p>
      ))}
      <p className="m-0 mt-1">
        <a
          href={sourceHref(subsection.anchor)}
          target="_blank"
          rel="noreferrer"
          data-chip
          data-print-intro
          className="inline-flex items-center gap-2 border border-line px-2.5 py-1 text-[11px] tracking-[0.2em] text-muted ukiyoe-red-hover"
        >
          出典 ↗
        </a>
      </p>
    </Fragment>
  );
}

/** A number in the margin, with its label set vertically beside it. */
function FactBox({ fact, kanji }: { fact: Fact; kanji: string }) {
  return (
    <div
      data-fact
      data-print-intro
      className="ukiyoe-shadow flex items-stretch gap-4 border border-line bg-ukiyoe-paper2 p-4"
    >
      <div>
        {fact.hearts && (
          <span aria-hidden="true" className="mb-2.5 flex gap-1.5">
            {[0, 1, 2].map((index) => (
              <i
                key={index}
                data-heart
                data-print-intro
                className="ukiyoe-seal h-[20px] w-[20px] text-[11px] not-italic"
              >
                心
              </i>
            ))}
          </span>
        )}
        <b className="block whitespace-nowrap font-display text-[64px] font-extrabold leading-[0.85] ukiyoe-blue sm:text-[80px]">
          <span data-fact-value data-value={fact.value} className="tabular-nums">
            {fact.value}
          </span>
          {fact.unit && (
            <small data-fact-unit data-print-intro className="ml-1 inline-block text-[24px] font-semibold">
              {fact.unit}
            </small>
          )}
        </b>
      </div>
      <div
        data-fact-label
        data-print-intro
        className="ukiyoe-vertical ml-auto h-[124px] border-l border-line pl-3 text-[12px] leading-[1.7] tracking-[0.14em]"
      >
        <b className="text-[15px] font-bold ukiyoe-red">{kanji}</b>
        {fact.label}
      </div>
    </div>
  );
}

/**
 * A plate in its frame: the sky block, the indigo wash and the key block,
 * pressed one after another, signed and numbered in kanji.
 */
function Plate({ figure }: { figure: Figure }) {
  const plate = FIGURE_ORDER.get(figure) ?? 0;
  return (
    <figure data-print className="ukiyoe-print-frame">
      {/*
        The blocks are pressed in the order they are written — the sky, the
        indigo wash, and the key block last, as on the bench. The washes are
        positioned, so they still print over the photograph whatever the
        order in the markup.
      */}
      <div className="ukiyoe-print-plate" style={{ aspectRatio: figure.aspect }}>
        <span data-block data-print-intro aria-hidden="true" className="ukiyoe-plate-sky" />
        <span data-block data-print-intro aria-hidden="true" className="ukiyoe-plate-wash" />
        {/* Wikimedia Commons serves these; next/image would need the host allow-listed for no gain here. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          data-block
          data-print-intro
          src={figure.src}
          alt={figure.alt}
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      </div>
      <span
        data-fig-seal
        data-print-intro
        aria-hidden="true"
        className="ukiyoe-seal absolute right-6 top-6 z-[3] h-[34px] w-[34px] text-[16px]"
      >
        図
      </span>
      <figcaption data-fig-cap data-print-intro className="mt-2.5 text-[12px] leading-[1.5] tracking-[0.08em]">
        図{kanjiNumber(plate)} · {figure.caption}
      </figcaption>
    </figure>
  );
}

/** The one plate that runs past the body column, across prose and margin. */
function BleedPlate({ figure }: { figure: Figure }) {
  return (
    <div data-scene className={`${CH_GRID} pt-10`}>
      <div aria-hidden="true" className="hidden lg:block" />
      <div className="lg:col-span-2">
        <Plate figure={figure} />
      </div>
    </div>
  );
}

/** The rule between chapters: a line of water, drawn as the page reaches it. */
function WaveDivider() {
  return (
    <div data-scene className="pt-12">
      <svg viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden="true" className="block h-10 w-full">
        <path
          data-divider
          data-print-intro
          d="M0 30c60-20 120-20 180 0s120 20 180 0 120-20 180 0 120 20 180 0 120-20 180 0 120 20 180 0 90-14 120-4"
          fill="none"
          stroke="var(--ukiyoe-indigo2)"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------- the plates */

/**
 * The octopus, drawn as the block cutter would: sumi key lines over flat
 * colour. Every arm, the mantle, the eyes and every sucker are tagged so the
 * studio's effects can find them.
 */
function OctopusPlate() {
  return (
    <svg data-octopus data-print-intro viewBox="0 0 600 640" aria-hidden="true" className="block h-auto w-full">
      <g stroke="var(--ukiyoe-sumi)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round">
        {/* the two arms that pass behind the head */}
        <path
          data-arm
          d="M215 280C170 270 120 250 100 210c-10-20 0-40 18-38 12 2 14 18 2 22-4 6 0 14 10 18 20 28 60 38 95 43z"
          fill="#6f8fa8"
        />
        <path
          data-arm
          d="M390 268c40-12 90-40 108-84 8-20-2-40-20-38-12 2-14 18-2 22 4 6 0 14-10 18-22 28-62 38-96 43z"
          fill="#6f8fa8"
        />
        {/* and the five that come forward */}
        <path
          data-arm
          d="M205 300C150 320 90 360 70 430c-15 50 0 110 40 130 20 10 40-5 35-22-5-16-27-18-33-3-12-15-12-40 0-65 18-40 58-90 123-130z"
          fill="#7f9db3"
        />
        <path
          data-arm
          d="M240 340c-30 60-50 130-40 200 5 40 30 70 62 66 18-2 26-21 14-32-12-10-30 0-26 14-15-8-24-33-24-58 0-60 24-120 56-174z"
          fill="#6f8fa8"
        />
        <path
          data-arm
          d="M285 352c0 68 15 128 45 188 15 30 40 50 66 45 16-3 20-23 8-30-12-7-24 5-18 17-20-6-34-27-42-52-16-50-24-100-14-162z"
          fill="#7f9db3"
        />
        <path
          data-arm
          d="M340 355c40 45 80 85 130 105 40 16 78 10 90-15 6-13-4-27-16-21-12 6-8 22 4 24-18 10-48 2-78-16-40-24-70-52-98-88z"
          fill="#6f8fa8"
        />
        <path
          data-arm
          d="M370 330c60 0 120 0 170-30 30-18 45-50 32-72-7-12-24-10-26 4-2 14 14 18 20 8 4 22-14 42-46 52-40 14-90 20-135 14z"
          fill="#7f9db3"
        />
        {/* the mantle, and the eyes that ride with it */}
        <g data-mantle>
          <path d="M300 34c92 0 152 92 148 194-3 72-52 112-148 112S156 300 152 228C148 126 208 34 300 34z" fill="#8aa6b8" />
          <path d="M300 34c92 0 152 92 148 194-3 72-52 112-148 112" fill="none" strokeWidth="5" />
          <g fill="none" strokeWidth="2" opacity=".55">
            <path d="M192 90c28-32 66-46 108-46" />
            <path d="M180 150c40-10 80-14 120-12" />
            <path d="M420 150c-40-10-80-14-120-12" />
            <path d="M200 210c30 8 64 12 100 12" />
            <path d="M400 210c-30 8-64 12-100 12" />
          </g>
          <g data-eye>
            <path d="M206 244c14-18 40-26 66-14 6 3 8 8 4 12-20 14-50 14-70 2z" fill="#ede2c6" />
            <path d="M226 240c12-5 28-5 40 0-12 7-28 7-40 0z" fill="var(--ukiyoe-sumi)" />
            <path d="M200 232c16-24 50-34 84-20" fill="none" strokeWidth="4" />
          </g>
          <g data-eye>
            <path d="M394 244c-14-18-40-26-66-14-6 3-8 8-4 12 20 14 50 14 70 2z" fill="#ede2c6" />
            <path d="M374 240c-12-5-28-5-40 0 12 7 28 7 40 0z" fill="var(--ukiyoe-sumi)" />
            <path d="M400 232c-16-24-50-34-84-20" fill="none" strokeWidth="4" />
          </g>
        </g>
      </g>
      <g data-suckers fill="#ede2c6" stroke="var(--ukiyoe-sumi)" strokeWidth="1.5">
        {[
          [160, 336, 6],
          [118, 386, 6],
          [92, 440, 5],
          [90, 496, 5],
          [104, 540, 4],
          [224, 402, 6],
          [210, 462, 6],
          [210, 522, 5],
          [226, 574, 4],
          [294, 420, 6],
          [308, 482, 6],
          [332, 536, 5],
          [366, 572, 4],
          [380, 406, 6],
          [424, 444, 6],
          [474, 466, 5],
          [520, 474, 4],
          [424, 328, 6],
          [476, 324, 6],
          [524, 302, 5],
          [556, 268, 4],
          [184, 266, 5],
          [150, 250, 4],
          [122, 230, 3],
          [420, 256, 5],
          [454, 240, 4],
          [482, 218, 3],
        ].map(([cx, cy, r], index) => (
          <circle key={index} data-sucker cx={cx} cy={cy} r={r} />
        ))}
      </g>
      <g data-spots data-print-intro fill="var(--ukiyoe-sumi)" fillOpacity=".32">
        {[
          [262, 120, 5],
          [300, 96, 4],
          [342, 118, 5],
          [222, 176, 4],
          [380, 176, 4],
          [300, 150, 3],
          [330, 196, 3],
          [270, 196, 3],
          [300, 280, 4],
          [250, 300, 3],
          [350, 300, 3],
        ].map(([cx, cy, r], index) => (
          <circle key={index} cx={cx} cy={cy} r={r} />
        ))}
      </g>
    </svg>
  );
}

/** The great wave: three flat bands, the crest, and the foam it throws. */
function WavePlate() {
  return (
    <svg
      data-waves
      data-print-intro
      viewBox="0 0 1200 260"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="absolute inset-x-0 bottom-0 z-[3] block h-[30%] w-full sm:h-auto"
    >
      <path
        data-wave-layer
        d="M0 260V150c110-30 190-90 320-84 90 4 150 60 240 58 100-2 150-64 260-70 130-8 240 40 380 26V260z"
        fill="#9dbccb"
      />
      <path
        data-wave-layer
        d="M0 260V186c130-40 210-96 330-90 100 6 160 62 250 60 96-2 156-56 250-62 120-8 240 36 370 24V260z"
        fill="#2d5787"
      />
      <path
        data-wave-layer
        d="M0 260v-50c150-30 240-80 350-70 90 8 150 54 230 54 90 0 150-44 240-48 110-6 230 30 380 18V260z"
        fill="#1e3a5f"
      />
      <path
        data-wave-crest
        d="M170 220C210 130 300 48 430 42c90-4 170 46 176 116-30-38-84-58-136-46 46 8 80 44 82 88-34-40-96-56-150-38-58 20-96 66-116 110z"
        fill="#1e3a5f"
      />
      <path
        data-wave-crest
        d="M228 218c34-72 104-128 196-124 56 3 104 34 116 76-28-26-70-40-108-32 32 10 56 38 60 68-30-32-80-44-124-28-46 16-78 50-96 84z"
        fill="#2d5787"
      />
      <path
        data-wave-crest
        d="M272 214c28-48 78-88 138-86 34 1 62 18 74 42-20-16-50-22-76-14 20 8 36 24 40 42-26-22-64-28-96-12-34 16-58 42-72 70z"
        fill="#9dbccb"
        opacity=".5"
      />
      <g fill="#ede2c6">
        {[
          [612, 160, 8],
          [596, 184, 7],
          [574, 202, 6],
          [550, 216, 5],
          [526, 226, 4],
          [502, 232, 3],
          [596, 126, 6],
          [568, 98, 6],
          [536, 76, 5],
          [500, 60, 4],
          [464, 50, 3],
          [556, 138, 5],
          [540, 160, 4],
          [518, 176, 3],
          [640, 150, 4],
          [654, 170, 3],
          [150, 176, 4],
          [124, 190, 3],
          [880, 118, 4],
          [906, 128, 3],
          [1090, 112, 4],
          [1118, 122, 3],
        ].map(([cx, cy, r], index) => (
          <circle key={index} data-wave-foam cx={cx} cy={cy} r={r} />
        ))}
      </g>
      <g fill="none" stroke="#ede2c6" strokeWidth="2" opacity=".7">
        {[
          "M40 206c60-20 110-40 170-30",
          "M660 196c60-30 130-40 200-30",
          "M900 214c70-20 140-30 220-24",
          "M700 228c40-14 80-18 120-12",
          "M60 236c50-12 100-16 150-10",
        ].map((d) => (
          <path key={d} data-wave-foam data-foam-line d={d} />
        ))}
      </g>
    </svg>
  );
}
