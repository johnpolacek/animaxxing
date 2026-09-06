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
  bangIn,
  countUp,
  cutIn,
  hammerIn,
  linesShove,
  parallax,
  push,
  rattle,
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

/*
 * The article, constructivist.
 *
 * A poster first: the red wedge, the ink bar across it, the photograph in
 * a circle cut by a red diagonal with a ring drawn round it, the title
 * running up the diagonal in wood type with a red bang, the number eight
 * and its facts standing on the red, the figure caption in the corner.
 * Then a lead band in three columns, a contents strip of eight cells, and
 * every chapter as a giant red numeral with its title stencilled down the
 * side, the prose beside it under a wood-type heading, and a fact carried
 * on a circle in the margin. Photographs are montages: the picture cut on
 * a diagonal and printed through red, an ink block with the plate number,
 * a paper strip slashed across both.
 *
 * Motion, all of it from the agitprop press:
 *  - the poster comes up with the route; then the wedge drives in, the
 *    bar slashes, the circle is stamped down, the red cuts across the
 *    photograph, the ring is drawn, the arrow is shoved on, the title is
 *    hammered on a letter at a time and the bang drops, the eight is
 *    stamped and its facts come over the wire. After that the ring turns,
 *    the arrow keeps pushing, the bang rattles, and the poster leans
 *    toward the pointer.
 *  - each scene plays once as it scrolls in: numerals are stamped, labels
 *    typed, headings shoved in on the diagonal, prose shoved up, circles
 *    stamped, numbers counted, bangs dropped, photographs cut on, blocks
 *    shoved in, strips slashed. Numerals drift against the scroll.
 * Reduced motion snaps every one of these to its settled state.
 */

type Kind = "ink" | "red" | "outline";
const KINDS: Kind[] = ["ink", "red", "outline"];
const FACT_FILLS: Record<Kind, string> = {
  ink: "bg-poster-ink text-poster-paper",
  red: "bg-poster-red text-poster-paper",
  outline: "border-4 border-poster-ink text-foreground",
};
const BANG_FILLS: Record<Kind, string> = {
  ink: "text-poster-red",
  red: "text-poster-ink",
  outline: "text-poster-red",
};

const LABEL = "font-mono text-[12px] font-medium uppercase tracking-[0.26em]";
const GRID = "grid grid-cols-1 gap-x-6 md:grid-cols-12";
const ARROW = "poster-arrow inline-block text-[12px] text-poster-red";

/** Wikipedia's fragment for a subsection, for the source link. */
function sourceHref(anchor: string): string {
  return `${SOURCE.url}#${anchor}`;
}

/** Wraps the emphasised words of the lead in stencilled capitals, every other one red. */
function emphasise(text: string, words: string[]): ReactNode[] {
  const pattern = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`);
  return text.split(pattern).map((part, index) => {
    const which = words.indexOf(part);
    return which >= 0 ? (
      <b key={index} className={`font-bold uppercase tracking-[0.02em] ${which % 2 ? "text-poster-red" : ""}`}>
        {part}
      </b>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    );
  });
}

/** The last word of a heading is set in red. */
function redLast(title: string): ReactNode {
  const words = title.split(" ");
  const last = words.pop();
  return (
    <Fragment>
      {words.join(" ")} <span className="text-poster-red">{last}</span>
    </Fragment>
  );
}

/** "Hearts. The main one stops when it swims." becomes a caption and a line. */
function splitLabel(label: string): [string, string | null] {
  const match = /^(.+?)(?:\.|,)\s+(.+)$/.exec(label);
  return match ? [match[1] ?? label, match[2] ?? null] : [label, null];
}

/** Every fact and figure in reading order: circles cycle across the article, plates are numbered. */
const FACT_ORDER = new Map<Fact, number>();
const FIGURE_ORDER = new Map<Figure, number>([[INFOBOX_FIGURE, 1]]);
CHAPTERS.forEach((chapter) =>
  chapter.subsections.forEach((subsection) => {
    if (subsection.fact) {
      FACT_ORDER.set(subsection.fact, FACT_ORDER.size);
    }
    if (subsection.figure) {
      FIGURE_ORDER.set(subsection.figure, FIGURE_ORDER.size + 1);
    }
  }),
);

export function ConstructivistArticle() {
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
      const wedge = one("[data-wedge]");
      const bar = one("[data-bar]");
      const circle = one("[data-circle]");
      const cut = one("[data-cut]");
      const ring = root.querySelector<SVGCircleElement>("[data-ring]");
      const ringBox = one("[data-ring-box]");
      const arrow = one("[data-arrow]");
      const side = one("[data-side]");
      const title = one("[data-title]");
      const bang = one("[data-title-bang]");
      const eight = one("[data-eight]");
      const eightText = one("[data-eight-text]");
      const cap = one("[data-cap]");
      const scenes = q<HTMLElement>("[data-scene]");
      if (!hero || !wedge || !bar || !circle || !cut || !ring || !ringBox || !arrow || !side || !title || !bang || !eight || !eightText || !cap) {
        return;
      }
      const hidden = q<HTMLElement>("[data-form-intro]");

      if (prefersReducedMotion()) {
        gsap.set(hidden, { autoAlpha: 1 });
        gsap.set(q("[data-ring]"), { autoAlpha: 1 });
        return;
      }

      let sequence: gsap.core.Timeline | null = null;
      let splits: SplitText[] = [];
      let loops: (gsap.core.Tween | gsap.core.Timeline)[] = [];
      let triggers: ScrollTrigger[] = [];
      let unparallax: (() => void) | null = null;

      const settle = () => {
        unparallax?.();
        unparallax = null;
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

      /** The scene's own timeline, played once when it scrolls in. */
      const playScene = (scene: HTMLElement) => {
        const s = gsap.utils.selector(scene);
        const tl = gsap.timeline();
        const kLines = s<HTMLElement>("[data-k]")[0];
        const lead = s<HTMLElement>("[data-lead]")[0];
        const hat = s<HTMLElement>("[data-hat]")[0];
        const hatRule = s<HTMLElement>("[data-hat-rule]")[0];
        const cells = s<HTMLElement>("[data-cell]");
        const numeral = s<HTMLElement>("[data-numeral]")[0];
        const rotRule = s<HTMLElement>("[data-rot-rule]")[0];
        const rotText = s<HTMLElement>("[data-rot-text]")[0];
        const h2s = s<HTMLElement>("[data-h2]");
        const h3Arrows = s<HTMLElement>("[data-h3-arrow]");
        const h3s = s<HTMLElement>("[data-h3]");
        const paragraphs = s<HTMLElement>("[data-p]");
        const factShape = s<HTMLElement>("[data-fact-shape]")[0];
        const factValue = s<HTMLElement>("[data-fact-value]")[0];
        const factDigits = s<HTMLElement>("[data-fact-digits]")[0];
        const factLabel = s<HTMLElement>("[data-fact-label]")[0];
        const factBang = s<HTMLElement>("[data-fact-bang]")[0];
        const hearts = s<HTMLElement>("[data-heart]");
        const photo = s<HTMLElement>("[data-ph]")[0];
        const block = s<HTMLElement>("[data-blk]")[0];
        const blockNum = s<HTMLElement>("[data-blk-num]")[0];
        const blockText = s<HTMLElement>("[data-blk-text]")[0];
        const strip = s<HTMLElement>("[data-strip]")[0];
        const figCap = s<HTMLElement>("[data-fig-cap]")[0];
        const bangs = s<HTMLElement>("[data-bang]");

        if (kLines) {
          splits.push(linesShove(tl, kLines, 0, { stagger: 0.14 }));
        }
        if (lead) {
          splits.push(wireIn(tl, lead, 0.2, { each: 0.018 }));
        }
        if (hatRule) {
          tl.fromTo(
            hatRule,
            { autoAlpha: 1, scaleY: 0, transformOrigin: "center top" },
            { scaleY: 1, duration: 0.6, ease: "power3.out" },
            0.5,
          );
        }
        if (hat) {
          shoveIn(tl, hat, 0.6, { x: -20 });
        }
        if (cells.length > 0) {
          shoveIn(tl, cells, 0, { x: 0, y: 40, stagger: 0.06, duration: 0.5 });
        }
        if (numeral) {
          stampDown(tl, numeral, 0.1, { from: 2.4, rotate: -8, duration: 0.55 });
        }
        if (rotRule) {
          slashIn(tl, rotRule, 0.35, { origin: "left center" });
        }
        if (rotText) {
          splits.push(typeIn(tl, rotText, 0.45, { each: 0.02 }));
        }
        for (const h2 of h2s) {
          splits.push(linesShove(tl, h2, 0.25));
        }
        if (h3Arrows.length > 0) {
          shoveIn(tl, h3Arrows, 0.2, { x: -24, stagger: 0.1 });
        }
        if (h3s.length > 0) {
          shoveIn(tl, h3s, 0.25, { x: -16, stagger: 0.1 });
        }
        if (paragraphs.length > 0) {
          shoveIn(tl, paragraphs, h2s.length > 0 ? 0.6 : 0.35, { x: 0, y: 26, stagger: 0.1, duration: 0.7 });
        }
        if (factShape) {
          stampDown(tl, factShape, 0.3, { from: 2, rotate: -12, duration: 0.5 });
        }
        if (factValue && factDigits) {
          tl.fromTo(factValue, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, 0.75);
          countUp(tl, factDigits, 0.75, factDigits.dataset.value ?? "0");
        }
        if (factLabel) {
          splits.push(wireIn(tl, factLabel, 1.0, { each: 0.04 }));
        }
        if (factBang) {
          bangIn(tl, factBang, 1.1);
          tl.call(() => loops.push(rattle(factBang, { every: 5 })), [], 2.2);
        }
        if (hearts.length > 0) {
          stampDown(tl, hearts, 1.0, { from: 2.4, stagger: 0.12, duration: 0.35 });
          tl.call(
            () =>
              loops.push(
                gsap
                  .timeline({ repeat: -1, repeatDelay: 0.7 })
                  .to(hearts, { scale: 1.35, duration: 0.12, ease: "power2.out", stagger: 0.12 })
                  .to(hearts, { scale: 1, duration: 0.45, ease: "elastic.out(1, 0.4)", stagger: 0.12 }, "-=0.36"),
              ),
            [],
            2,
          );
        }
        if (photo) {
          cutIn(tl, photo, 0, { duration: 1.1, to: "polygon(0 0, 100% 0, 78% 100%, 0 100%)" });
        }
        if (block) {
          shoveIn(tl, block, 0.3, { x: 140, duration: 0.8 });
        }
        if (blockNum) {
          stampDown(tl, blockNum, 0.9, { from: 2, rotate: -6 });
        }
        if (blockText) {
          splits.push(wireIn(tl, blockText, 1.2, { each: 0.04 }));
        }
        if (strip) {
          slashIn(tl, strip, 0.7, { duration: 0.9, origin: "left center" });
        }
        if (figCap) {
          splits.push(wireIn(tl, figCap, 1.3, { each: 0.025 }));
        }
        if (bangs.length > 0) {
          bangIn(tl, bangs, 0.8, { stagger: 0.12 });
          tl.call(() => loops.push(rattle(bangs, { every: 6 })), [], 2.4);
        }
        return tl;
      };

      const unwatch = watchPageTransition(root, {
        onIdle: contextSafe(() => {
          const tl = gsap.timeline();
          sequence = tl;

          // The press.
          wedgeIn(tl, wedge, 0);
          slashIn(tl, bar, 0.15, { duration: 0.9 });
          stampDown(tl, circle, 0.3, { from: 2.2, rotate: -10, duration: 0.5 });
          cutIn(tl, cut, 0.85, {
            duration: 0.9,
            from: "polygon(100% 0, 100% 0, 100% 100%, 100% 100%)",
            to: "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
          });
          ringDraw(tl, ring, 0.8);
          shoveIn(tl, arrow, 0.5, { x: -260, duration: 0.8 });

          // The type.
          splits.push(typeIn(tl, side, 0.2, { each: 0.02 }));
          splits.push(hammerIn(tl, title, 0.55, { each: 0.07 }));
          bangIn(tl, bang, 1.35);
          stampDown(tl, eight, 1.5, { from: 2.6, rotate: -8, duration: 0.5 });
          splits.push(wireIn(tl, eightText, 1.9, { each: 0.05 }));
          splits.push(wireIn(tl, cap, 2.1, { each: 0.03 }));

          // Then it never quite stops.
          tl.call(
            () => {
              loops.push(turn(ringBox, { duration: 48 }));
              loops.push(push(arrow, { distance: 16, every: 2.6 }));
              loops.push(rattle(bang, { every: 4.5 }));
              loops.push(gsap.to(wedge, { y: 8, duration: 5, repeat: -1, yoyo: true, ease: "sine.inOut" }));
              unparallax = parallax(hero, q<HTMLElement>("[data-depth]"), 14);
            },
            [],
            2.8,
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
          // Numerals drift against the scroll.
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
    <div ref={scope} className="constructivist-article">
      {/* ------------------------------------------------------------ poster */}
      <header
        data-page-transition
        data-hero
        className="relative min-h-[620px] overflow-hidden border-y-4 border-line sm:min-h-[720px] lg:min-h-[820px]"
      >
        <div
          data-wedge
          data-form-intro
          aria-hidden="true"
          className="poster-wedge absolute bottom-[-6%] left-[-10%] z-[1] h-[78%] w-[120%] bg-poster-red"
        />
        <div data-depth="0.6" className="absolute right-[6%] top-[5%] z-[2] aspect-square w-[50vw] max-w-[520px] sm:right-[8%] sm:top-[6%] sm:w-[36vw]">
          <svg data-ring-box aria-hidden="true" viewBox="0 0 100 100" className="absolute inset-[-8%] h-[116%] w-[116%] overflow-visible">
            <circle data-ring cx="50" cy="50" r="49" fill="none" stroke="var(--poster-ink)" strokeWidth="0.55" className="invisible" />
          </svg>
          <div data-circle data-form-intro className="relative h-full w-full overflow-hidden rounded-full bg-poster-ink">
            {/* Wikimedia Commons serves these; next/image would need the host allow-listed for no gain here. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={INFOBOX_FIGURE.src}
              alt={INFOBOX_FIGURE.alt}
              loading="eager"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover object-[50%_45%] [filter:grayscale(1)_contrast(1.6)_brightness(1.05)]"
            />
            <div
              data-cut
              data-form-intro
              aria-hidden="true"
              className="absolute inset-0 bg-[linear-gradient(115deg,transparent_52%,var(--poster-red)_52%)] mix-blend-multiply"
            />
          </div>
        </div>
        <div data-depth="0.3" className="absolute left-[-5%] top-[86%] z-[2] h-[18px] w-[110%] sm:top-[88%] sm:h-[26px]">
          <div data-bar data-form-intro aria-hidden="true" className="h-full w-full origin-left -rotate-[18deg] bg-poster-ink" />
        </div>
        <div data-depth="1.4" className="absolute left-[20%] top-[18%] z-[2] hidden sm:block">
          <div data-arrow data-form-intro aria-hidden="true" className="poster-arrow -rotate-[22deg] text-[64px] text-poster-ink" />
        </div>
        <p
          data-side
          data-form-intro
          className={`${LABEL} absolute left-4 top-10 z-[3] m-0 hidden rotate-180 text-foreground [writing-mode:vertical-rl] sm:left-6 sm:top-14 md:block`}
        >
          {order?.name ?? "Order Octopoda"} · {order?.note ?? "Leach 1818"} · Class {klass}
        </p>
        <h1
          className="absolute left-5 top-[52%] z-[3] m-0 origin-bottom-left -rotate-[18deg] whitespace-nowrap font-display text-[clamp(4.5rem,15vw,14rem)] uppercase leading-[0.82] tracking-[-0.01em] text-foreground sm:left-[70px] sm:top-[54%] md:left-[120px]"
        >
          <span data-title data-form-intro>
            Octopus
          </span>
          <span data-title-bang data-form-intro className="inline-block text-poster-red">
            !
          </span>
        </h1>
        <div className="absolute bottom-6 left-5 z-[3] flex items-center gap-3 text-poster-paper sm:left-[40%] sm:bottom-8 sm:gap-4">
          <b data-eight data-form-intro className="font-display text-[72px] leading-none sm:text-[120px]">
            8
          </b>
          <span data-eight-text data-form-intro className="whitespace-nowrap font-mono text-[13px] uppercase leading-[1.35] tracking-[0.14em] sm:text-[15px]">
            arms · one beak
            <br />
            three hearts · blue blood
          </span>
        </div>
        <p
          data-cap
          data-form-intro
          className={`${LABEL} absolute bottom-6 right-5 z-[3] m-0 hidden text-right leading-[1.6] text-poster-paper sm:bottom-8 sm:right-10 lg:block`}
        >
          Fig. 1 · {INFOBOX_FIGURE.caption}
          <br />
          {TEMPORAL_RANGE.from} – {TEMPORAL_RANGE.to}
        </p>
      </header>

      {/* -------------------------------------------------------------- lead */}
      <section data-page-transition data-scene className="grid gap-8 border-b-4 border-line py-12 md:grid-cols-[3fr_7fr_2fr] md:gap-12 md:py-16">
        <h2 data-k data-form-intro className="m-0 font-display text-[clamp(2.25rem,4vw,2.75rem)] uppercase leading-[0.95] text-foreground">
          Soft body.
          <br />
          <span className="text-poster-red">No skeleton.</span>
          <br />
          Eight arms.
        </h2>
        <p data-lead data-form-intro className="m-0 font-sans text-[19px] leading-[1.4] sm:text-[21px]">
          {emphasise(LEAD, LEAD_EMPHASIS)}
        </p>
        <div className="relative pl-3.5 md:self-end">
          <span data-hat-rule data-form-intro aria-hidden="true" className="absolute bottom-0 left-0 top-0 w-[3px] bg-poster-red" />
          <p data-hat data-form-intro className="m-0 font-sans text-[13px] leading-[1.4] text-muted">
            {HATNOTE}
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------- contents */}
      <nav data-page-transition data-scene aria-label="Contents" className="grid grid-cols-2 border-b-4 border-line sm:grid-cols-4 lg:grid-cols-8">
        {[...CHAPTERS, SOURCES_CHAPTER].map((chapter, index) => (
          <a
            key={chapter.id}
            href={`#${chapter.id}`}
            data-cell
            data-form-intro
            className={[
              "group block border-r-2 border-line px-3.5 pb-4 pt-[18px] transition-colors last:border-r-0 hover:bg-poster-red hover:text-poster-paper",
              index === 0 ? "bg-poster-red text-poster-paper" : "",
              index === 1 ? "bg-poster-ink text-poster-paper hover:bg-poster-red" : "",
            ].join(" ")}
          >
            <b className="block font-display text-[54px] leading-[0.9] transition-transform duration-300 group-hover:-translate-y-1">
              {index + 1}
            </b>
            <span className="font-mono text-[13px] font-medium uppercase tracking-[0.2em]">{chapter.short}</span>
          </a>
        ))}
      </nav>

      {/* ---------------------------------------------------------- chapters */}
      {CHAPTERS.map((chapter, index) => (
        <ChapterBlock key={chapter.id} chapter={chapter} index={index} />
      ))}

      {/* ----------------------------------------------------------- sources */}
      <section id={SOURCES_CHAPTER.id} data-scene className="mt-28 scroll-mt-8 border-t-4 border-line pt-10 sm:mt-36 sm:pt-14">
        <div className={GRID}>
          <NumeralColumn number={CHAPTERS.length + 1} label={SOURCES_CHAPTER.title} />
          <div className="mt-8 md:col-span-5 md:col-start-4 md:mt-0">
            <h2 data-h2 data-form-intro className="m-0 mb-7 font-display text-[clamp(2.5rem,5vw,4rem)] uppercase leading-[0.9] text-foreground">
              Where this
              <br />
              <span className="text-poster-red">came from</span>
            </h2>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 font-sans text-[17px]">
              {(
                [
                  [
                    "source",
                    <a key="src" href={SOURCE.url} target="_blank" rel="noreferrer" className="font-bold uppercase hover:text-poster-red">
                      Octopus, Wikipedia
                    </a>,
                  ],
                  [
                    "licence",
                    <a key="lic" href={SOURCE.licenseUrl} target="_blank" rel="noreferrer" className="font-bold uppercase hover:text-poster-red">
                      {SOURCE.license}
                    </a>,
                  ],
                  ["citations", String(SOURCE.citations)],
                  ["languages", String(SOURCE.languages)],
                  ["retrieved", SOURCE.retrieved],
                  [
                    "see also",
                    <span key="see">
                      {SEE_ALSO.map((title, i) => (
                        <Fragment key={title}>
                          {i > 0 && <span aria-hidden="true"> · </span>}
                          <a
                            href={`https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-bold uppercase hover:text-poster-red"
                          >
                            {title}
                          </a>
                        </Fragment>
                      ))}
                    </span>,
                  ],
                ] as [string, ReactNode][]
              ).map(([term, detail]) => (
                <Fragment key={term}>
                  <dt data-p data-form-intro className={`${LABEL} pt-1 text-poster-red`}>
                    {term}
                  </dt>
                  <dd data-p data-form-intro className="m-0">
                    {detail}
                  </dd>
                </Fragment>
              ))}
            </dl>
          </div>
          <div className="relative mt-10 md:col-span-4 md:col-start-9 md:mt-0" aria-hidden="true">
            <div className="grid aspect-square w-[60%] max-w-[240px] place-items-center rounded-full border-4 border-poster-ink md:w-full">
              <span data-bang data-form-intro className="font-display text-[clamp(5rem,12vw,10rem)] leading-[0.85] text-poster-red">
                !
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* --------------------------------------------------------------- pieces */

/** The giant red numeral with the chapter's title stencilled down its side. */
function NumeralColumn({ number, label }: { number: number; label: string }) {
  return (
    <div className="relative md:col-span-3">
      <b
        data-numeral
        data-form-intro
        data-drift="-6"
        className="relative z-[1] block font-display text-[clamp(8rem,20vw,18.75rem)] leading-[0.8] text-poster-red"
      >
        {number}
      </b>
      <div className="mt-5 flex items-start gap-3 md:mt-6">
        <span data-rot-rule data-form-intro aria-hidden="true" className="mt-[7px] block h-[3px] w-10 shrink-0 bg-poster-ink" />
        <span data-rot-text data-form-intro className={`${LABEL} block max-w-[18ch] leading-[1.5] text-foreground`}>
          {label}
        </span>
      </div>
    </div>
  );
}

function ChapterBlock({ chapter, index }: { chapter: Chapter; index: number }) {
  const first = chapter.subsections[0];
  const single = chapter.subsections.length === 1 && first !== undefined;
  return (
    <Fragment>
      <section id={chapter.id} data-scene className="scroll-mt-8 pt-24 sm:pt-32">
        <div className={GRID}>
          <NumeralColumn number={index + 1} label={chapter.title} />
          <div className="mt-8 md:col-span-5 md:col-start-4 md:mt-0">
            <h2
              data-h2
              data-form-intro
              className="m-0 mb-7 font-display text-[clamp(2.5rem,5vw,4rem)] uppercase leading-[0.9] text-foreground text-balance"
            >
              {redLast(single && first ? first.title : chapter.title)}
            </h2>
            {single && first && <Prose subsection={first} />}
          </div>
          {single && first?.fact && <Circle fact={first.fact} />}
        </div>
      </section>
      {single && first?.figure && <Montage figure={first.figure} />}
      {!single &&
        chapter.subsections.map((subsection) => (
          <Fragment key={subsection.id}>
            <section id={subsection.id} data-scene className="scroll-mt-8 pt-10 sm:pt-14">
              <div className={GRID}>
                <div className="md:col-span-5 md:col-start-4">
                  <h3 data-h3 data-form-intro className={`${LABEL} mb-2.5 flex items-center gap-2.5 text-foreground`}>
                    <span data-h3-arrow aria-hidden="true" className={ARROW} />
                    {subsection.title}
                  </h3>
                  <Prose subsection={subsection} />
                </div>
                {subsection.fact && <Circle fact={subsection.fact} />}
              </div>
            </section>
            {subsection.figure && <Montage figure={subsection.figure} />}
          </Fragment>
        ))}
    </Fragment>
  );
}

function Prose({ subsection }: { subsection: Subsection }) {
  return (
    <Fragment>
      {subsection.paragraphs.map((paragraph, index) => (
        <p key={index} data-p data-form-intro className="m-0 mb-3.5 max-w-[62ch] text-justify font-sans text-[17px] leading-[1.55] [hyphens:auto]">
          {paragraph}
        </p>
      ))}
      <p data-p data-form-intro className="m-0">
        <a href={sourceHref(subsection.anchor)} target="_blank" rel="noreferrer" className={`${LABEL} inline-flex items-center gap-2 hover:text-poster-red`}>
          <span aria-hidden="true" className={ARROW} />
          source · wikipedia
        </a>
      </p>
    </Fragment>
  );
}

/** A big number carried on a circle in the margin, with a bang where the number is a count. */
function Circle({ fact }: { fact: Fact }) {
  const kind = KINDS[(FACT_ORDER.get(fact) ?? 0) % KINDS.length] ?? "ink";
  const [caption, line] = splitLabel(fact.label);
  const bang = !fact.unit;
  return (
    <div className="relative mt-10 md:col-span-4 md:col-start-9 md:mt-0">
      <div className="relative mx-auto aspect-square w-[70%] max-w-[300px] md:mx-0 md:w-full">
        <div
          data-fact-shape
          data-form-intro
          className={`grid h-full w-full place-items-center rounded-full text-center ${FACT_FILLS[kind]}`}
        >
          <div className="px-[12%]">
            {fact.hearts && (
              <span aria-hidden="true" className="mb-3 flex justify-center gap-2.5">
                <i data-heart data-form-intro className="block h-[18px] w-[18px] rounded-full bg-poster-red" />
                <i data-heart data-form-intro className="block h-[18px] w-[18px] rounded-full bg-poster-red" />
                <i data-heart data-form-intro className="block h-[18px] w-[18px] rounded-full bg-poster-red" />
              </span>
            )}
            <b data-fact-value data-form-intro className="block font-display text-[clamp(3.5rem,9vw,7.5rem)] leading-[0.85] tabular-nums">
              <span data-fact-digits data-value={fact.value}>
                {fact.value}
              </span>
              {fact.unit && <small className="text-[0.32em]">{fact.unit}</small>}
            </b>
            <span data-fact-label data-form-intro className={`${LABEL} mt-3 block max-w-[20ch] leading-[1.4]`}>
              {line ? `${caption}. ${line}` : fact.label}
            </span>
          </div>
        </div>
        {bang && (
          <span
            data-fact-bang
            data-form-intro
            aria-hidden="true"
            className={`absolute -right-[6%] -top-[4%] font-display text-[clamp(5rem,12vw,10rem)] leading-[0.8] ${BANG_FILLS[kind]}`}
          >
            !
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * A montage: the photograph cut on a diagonal and printed through red, an
 * ink block beside it carrying the plate number, and a paper strip slashed
 * across both.
 */
function Montage({ figure }: { figure: Figure }) {
  const plate = FIGURE_ORDER.get(figure) ?? 0;
  return (
    <figure data-scene className={`${GRID} m-0 mb-14 mt-16 sm:mt-20`}>
      <div className="relative h-[320px] sm:h-[440px] md:col-span-9 md:col-start-4 lg:h-[520px]">
        <div
          data-ph
          data-form-intro
          className="absolute left-0 top-0 h-full w-[62%] overflow-hidden [clip-path:polygon(0_0,100%_0,78%_100%,0_100%)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={figure.src}
            alt={figure.alt}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover [filter:grayscale(1)_contrast(1.5)_brightness(1.3)]"
          />
          <div aria-hidden="true" className="absolute inset-0 bg-poster-red opacity-80 mix-blend-multiply" />
        </div>
        <div
          data-blk
          data-form-intro
          className="absolute right-0 top-0 h-full w-[44%] bg-poster-ink text-poster-paper [clip-path:polygon(28%_0,100%_0,100%_100%,0_100%)]"
        >
          <div className="absolute right-5 top-6 text-right sm:right-8 sm:top-10">
            <b data-blk-num data-form-intro className="block font-display text-[64px] leading-[0.85] sm:text-[120px]">
              {plate}
            </b>
            <span data-blk-text data-form-intro className={`${LABEL} ml-auto mt-3 block whitespace-nowrap leading-[1.5]`}>
              plate {plate} of {FIGURE_ORDER.size}
            </span>
          </div>
        </div>
        <div data-strip data-form-intro aria-hidden="true" className="absolute left-[-6%] top-[64%] h-3 w-[112%] origin-left -rotate-[14deg] bg-poster-paper sm:h-[18px]" />
        <figcaption data-fig-cap data-form-intro className={`${LABEL} absolute -bottom-8 left-0 text-muted`}>
          Fig. {plate} · {figure.caption}
        </figcaption>
      </div>
    </figure>
  );
}
