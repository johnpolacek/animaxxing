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
  barSwing,
  countUp,
  dropIn,
  heartbeat,
  kinetic,
  linesRise,
  marchIn,
  parallax,
  popIn,
  revealIn,
  riseIn,
  rollIn,
  spinIn,
  stampIn,
  tumbleIn,
  wipeIn,
  wordsRise,
} from "@/lib/animation/effects/bauhaus";
import { watchPageTransition } from "@/lib/animation/pageState";
import {
  CHAPTERS,
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
 * The article, Bauhaus.
 *
 * A poster set on a twelve-column grid: the title in two enormous lines
 * beside a composition of a yellow square, the photograph in an ink square,
 * and a red bar across both; a heavy rule; the lead with its red words; the
 * classification as three ruled cells. Then a contents band in ink, and
 * every chapter as a giant numeral with a shape behind it, its prose in the
 * columns beside, photographs in blue frames with a yellow dot at the
 * corner, and each big number carried on a shape of its own.
 *
 * Motion, all of it from the workshop:
 *  - the poster comes up with the route; then the rail draws down, the
 *    title rises line by line behind a mask, the square drops, the
 *    photograph is wiped on, the bar swings across, the rule wipes, the
 *    lead steps on word by word, and the cells march in. After that the
 *    composition keeps moving and leans toward the pointer.
 *  - each chapter plays once as it scrolls in: its shape arrives the way
 *    its geometry says (circles roll, squares drop, triangles rise), the
 *    numeral is stamped over it, the label tumbles on, headings rise,
 *    prose marches, photographs wipe, numbers count up, hearts beat. The
 *    numerals and their shapes drift against the scroll, and every shape
 *    keeps turning or breathing once it has landed.
 * Reduced motion snaps every one of these to its settled state.
 */

type Kind = "circle" | "square" | "triangle";
const KINDS: Kind[] = ["circle", "square", "triangle"];
const FILLS: Record<Kind, string> = {
  circle: "bg-shape-red text-shape-paper",
  square: "bg-shape-blue text-shape-paper",
  triangle: "bg-shape-yellow text-shape-ink",
};
const FACT_FILLS: Record<Kind, string> = {
  circle: "bg-shape-yellow text-shape-ink",
  square: "bg-shape-red text-shape-paper",
  triangle: "bg-shape-blue text-shape-paper",
};
const SHAPE_CLASS: Record<Kind, string> = {
  circle: "rounded-full",
  square: "",
  triangle: "shape-triangle",
};

const LABEL = "font-sans text-[12px] font-medium uppercase tracking-[0.28em]";
const GRID = "grid grid-cols-1 gap-x-6 md:grid-cols-12";

/** Wikipedia's fragment for a subsection, for the source link. */
function sourceHref(anchor: string): string {
  return `${SOURCE.url}#${anchor}`;
}

/** Wraps the emphasised words of the lead in red. */
function emphasise(text: string, words: string[]): ReactNode[] {
  const pattern = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`);
  return text.split(pattern).map((part, index) =>
    words.includes(part) ? (
      <b key={index} className="font-bold text-accent">
        {part}
      </b>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

/** "Hearts. The main one stops when it swims." becomes a caption and a line. */
function splitLabel(label: string): [string, string | null] {
  const match = /^(.+?)(?:\.|,)\s+(.+)$/.exec(label);
  return match ? [match[1] ?? label, match[2] ?? null] : [label, null];
}

/** Every fact and figure in reading order: shapes cycle across the article, plates are numbered. */
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

export function BauhausArticle() {
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
      const rail = one("[data-rail]");
      const railLabel = one("[data-rail-label]");
      const titleInners = q<HTMLElement>("[data-title-inner]");
      const titleLines = q<HTMLElement>("[data-title-line]");
      const stop = one("[data-stop]");
      const art = one("[data-art]");
      const artSquare = one("[data-art-square]");
      const artPhoto = one("[data-art-photo]");
      const artBar = one("[data-art-bar]");
      const artCap = one("[data-art-cap]");
      const rule = one("[data-rule]");
      const lead = one("[data-lead]");
      const metaRules = q<HTMLElement>("[data-meta-rule]");
      const metaCells = q<HTMLElement>("[data-meta]");
      const scenes = q<HTMLElement>("[data-scene]");
      if (
        !hero || !rail || !railLabel || !stop || !art || !artSquare || !artPhoto || !artBar ||
        !artCap || !rule || !lead || titleInners.length === 0
      ) {
        return;
      }
      const hidden = q<HTMLElement>("[data-form-intro]");

      if (prefersReducedMotion()) {
        gsap.set(hidden, { autoAlpha: 1 });
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

      /** A shape arrives the way its geometry says it should. */
      const enterShape = (tl: gsap.core.Timeline, el: HTMLElement, at: number) => {
        const kind = el.dataset.kind as Kind | undefined;
        const size = Math.max(el.offsetWidth, el.offsetHeight, 120);
        if (kind === "circle") {
          rollIn(tl, el, at, { fromX: -size * 2.5, duration: 1.3 });
        } else if (kind === "square") {
          dropIn(tl, el, at, { fromY: -size * 2.5, duration: 1.2 });
        } else if (kind === "triangle") {
          riseIn(tl, el, at, { fromY: size * 2, duration: 1.2 });
        } else {
          spinIn(tl, el, at);
        }
      };

      /** Once landed, a shape keeps moving: squares and triangles turn, circles breathe. */
      const keepMoving = (el: HTMLElement) => {
        const kind = el.dataset.kind as Kind | undefined;
        if (kind === "circle") {
          loops.push(gsap.to(el, { scale: 1.06, duration: 3, repeat: -1, yoyo: true, ease: "sine.inOut" }));
        } else if (kind === "square") {
          loops.push(gsap.to(el, { rotation: "+=360", duration: 60, repeat: -1, ease: "none" }));
        } else if (kind === "triangle") {
          loops.push(gsap.to(el, { rotation: 6, y: -10, duration: 3.4, repeat: -1, yoyo: true, ease: "sine.inOut" }));
        }
      };

      /** The scene's own timeline, played once when it scrolls in. */
      const playScene = (scene: HTMLElement) => {
        const s = gsap.utils.selector(scene);
        const tl = gsap.timeline();
        const band = s<HTMLElement>("[data-band]")[0];
        const cells = s<HTMLElement>("[data-cell]");
        const shapes = s<HTMLElement>("[data-shape]");
        const numeral = s<HTMLElement>("[data-numeral]")[0];
        const labels = s<HTMLElement>("[data-label]");
        const h2s = s<HTMLElement>("[data-h2]");
        const h3Rules = s<HTMLElement>("[data-h3-rule]");
        const h3s = s<HTMLElement>("[data-h3]");
        const paragraphs = s<HTMLElement>("[data-p]");
        const figDot = s<HTMLElement>("[data-fig-dot]")[0];
        const figImage = s<HTMLElement>("[data-fig-image]")[0];
        const figCap = s<HTMLElement>("[data-fig-cap]")[0];
        const factShape = s<HTMLElement>("[data-fact-shape]")[0];
        const factValue = s<HTMLElement>("[data-fact-value]")[0];
        const factDigits = s<HTMLElement>("[data-fact-digits]")[0];
        const factRule = s<HTMLElement>("[data-fact-rule]")[0];
        const factLabel = s<HTMLElement>("[data-fact-label]")[0];
        const hearts = s<HTMLElement>("[data-heart]");
        const trio = s<HTMLElement>("[data-trio]");

        if (band) {
          revealIn(tl, band, 0, { duration: 1 });
        }
        if (cells.length > 0) {
          marchIn(tl, cells, 0.3, { stagger: 0.05, y: 30 });
        }
        for (const shape of shapes) {
          enterShape(tl, shape, 0);
          tl.call(() => keepMoving(shape), [], 1.4);
        }
        if (numeral) {
          stampIn(tl, numeral, 0.25, { from: 2.6, duration: 0.8, rotate: -6 });
        }
        for (const label of labels) {
          splits.push(tumbleIn(tl, label, 0.5, { each: 0.012 }));
        }
        for (const h2 of h2s) {
          splits.push(linesRise(tl, h2, 0.35));
        }
        if (h3Rules.length > 0) {
          wipeIn(tl, h3Rules, 0.2, { stagger: 0.1, duration: 0.7 });
        }
        if (h3s.length > 0) {
          marchIn(tl, h3s, 0.25, { y: 14, stagger: 0.1 });
        }
        if (paragraphs.length > 0) {
          marchIn(tl, paragraphs, h2s.length > 0 ? 0.7 : 0.35, { y: 28, stagger: 0.12, duration: 0.8 });
        }
        if (figDot) {
          popIn(tl, figDot, 0.1);
        }
        if (figImage) {
          revealIn(tl, figImage, 0.15);
        }
        if (figCap) {
          marchIn(tl, figCap, 0.9, { y: 12 });
        }
        if (factShape) {
          enterShape(tl, factShape, 0);
          tl.call(() => keepMoving(factShape), [], 1.4);
        }
        if (factValue && factDigits) {
          tl.fromTo(factValue, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 }, 0.35);
          countUp(tl, factDigits, 0.35, factDigits.dataset.value ?? "0");
        }
        if (factRule) {
          wipeIn(tl, factRule, 0.4, { axis: "y", origin: "center top" });
        }
        if (factLabel) {
          marchIn(tl, factLabel, 0.55, { y: 20 });
        }
        if (hearts.length > 0) {
          popIn(tl, hearts, 0.6, { stagger: 0.12 });
          tl.call(() => loops.push(heartbeat(hearts)), [], 1.8);
        }
        if (trio.length > 0) {
          popIn(tl, trio, 0.3, { stagger: 0.12 });
          tl.call(
            () => {
              const [circle, square, triangle] = trio;
              const loop = gsap.timeline({ repeat: -1, repeatDelay: 1.2 });
              if (circle) {
                loop.to(circle, { y: -12, duration: 0.3, ease: "power2.out" }, 0).to(circle, { y: 0, duration: 0.6, ease: "bounce.out" }, 0.3);
              }
              if (square) {
                loop.to(square, { rotation: "+=90", duration: 0.6, ease: "back.out(1.6)" }, 0.2);
              }
              if (triangle) {
                loop.to(triangle, { rotation: 180, duration: 0.5, ease: "power2.inOut" }, 0.4).to(triangle, { rotation: 360, duration: 0.5, ease: "power2.inOut" }, 1.4);
              }
              loops.push(loop);
            },
            [],
            1.2,
          );
        }
        return tl;
      };

      const unwatch = watchPageTransition(root, {
        onIdle: contextSafe(() => {
          const tl = gsap.timeline();
          sequence = tl;
          const h = art.offsetHeight;

          // The rail and the title.
          wipeIn(tl, rail, 0, { axis: "y", origin: "center top", duration: 1.2 });
          splits.push(tumbleIn(tl, railLabel, 0.3, { each: 0.015 }));
          gsap.set(titleLines, { autoAlpha: 1 });
          tl.fromTo(
            titleInners,
            { yPercent: 110, willChange: "transform" },
            { yPercent: 0, duration: 1.1, ease: "power4.out", stagger: 0.16 },
            0.1,
          ).set(titleInners, { clearProps: "willChange" }, ">");
          popIn(tl, stop, 1.0);

          // The composition.
          dropIn(tl, artSquare, 0.2, { fromY: -h });
          revealIn(tl, artPhoto, 0.6, { duration: 1.2 });
          barSwing(tl, artBar, 1.1, { from: -100, to: -28, duration: 1.4, origin: "left center" });
          splits.push(tumbleIn(tl, artCap, 1.5, { each: 0.015 }));

          // The rule, the lead, and the cells.
          wipeIn(tl, rule, 0.9, { duration: 1.1 });
          splits.push(wordsRise(tl, lead, 1.1, { each: 0.018 }));
          if (metaRules.length > 0) {
            wipeIn(tl, metaRules, 2.0, { stagger: 0.12 });
          }
          if (metaCells.length > 0) {
            marchIn(tl, metaCells, 2.1, { y: 20, stagger: 0.12 });
          }

          // Then it never quite stops.
          tl.call(
            () => {
              loops.push(kinetic({ bar: artBar, square: artSquare }));
              loops.push(
                gsap.to(stop, { scale: 1.3, duration: 0.7, repeat: -1, yoyo: true, ease: "sine.inOut" }),
              );
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
          // Numerals and their shapes drift against the scroll.
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
          // Jost arrives after the first layout; measure again once it has.
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

  const kingdom = TAXONOMY.find((row) => row.rank === "Kingdom")?.name ?? "";
  const phylum = TAXONOMY.find((row) => row.rank === "Phylum")?.name ?? "";
  const klass = TAXONOMY.find((row) => row.rank === "Class")?.name ?? "";
  const order = TAXONOMY.find((row) => row.rank === "Order");
  const suborders = TAXONOMY.find((row) => row.rank === "Suborders")?.name ?? "";

  return (
    <div ref={scope} className="bauhaus-article">
      {/* ------------------------------------------------------------ poster */}
      <header data-page-transition data-hero className="relative pt-10 sm:pt-16">
        <div data-rail data-form-intro aria-hidden="true" className="absolute -left-9 bottom-10 top-20 hidden w-0.5 bg-foreground xl:block">
          <span
            data-rail-label
            className={`${LABEL} absolute -left-2 top-0 rotate-180 bg-canvas py-3 [writing-mode:vertical-rl]`}
          >
            order octopoda · leach 1818
          </span>
        </div>
        <div className={GRID}>
          <h1 className="relative z-[2] m-0 font-sans text-[clamp(6rem,17vw,15.25rem)] font-extrabold lowercase leading-[0.78] tracking-[-0.06em] md:col-start-1 md:col-end-9 md:row-start-1">
            <span data-title-line data-form-intro className="block overflow-hidden pb-[0.05em]">
              <span data-title-inner className="block">
                octo
              </span>
            </span>
            <span data-title-line data-form-intro className="block overflow-hidden pb-[0.05em]">
              <span data-title-inner className="block">
                pus
                <span
                  data-stop
                  data-form-intro
                  aria-hidden="true"
                  className="ml-[0.06em] inline-block h-[0.16em] w-[0.16em] bg-shape-red align-baseline"
                />
              </span>
            </span>
          </h1>
          <div data-art className="relative z-[1] mt-6 aspect-square md:col-start-8 md:col-end-13 md:row-start-1 md:row-end-4 md:mt-0">
            <div data-depth="0.5" className="absolute right-0 top-0 h-[78%] w-[78%]">
              <div data-art-square data-form-intro className="h-full w-full bg-shape-yellow" />
            </div>
            <div data-depth="1" className="absolute bottom-0 left-0 aspect-square w-[72%]">
              <div data-art-photo data-form-intro className="h-full w-full overflow-hidden bg-shape-ink">
                {/* Wikimedia Commons serves these; next/image would need the host allow-listed for no gain here. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={INFOBOX_FIGURE.src}
                  alt={INFOBOX_FIGURE.alt}
                  loading="eager"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover opacity-90 mix-blend-screen [filter:grayscale(1)_contrast(1.25)_brightness(1.05)]"
                />
              </div>
            </div>
            <div data-depth="0.3" className="absolute left-[-12%] top-[44%] h-3.5 w-[124%]">
              <div data-art-bar data-form-intro className="h-full w-full origin-left -rotate-[28deg] bg-shape-red" />
            </div>
            <p data-art-cap data-form-intro className={`${LABEL} absolute -bottom-9 right-0 m-0 tracking-[0.2em]`}>
              fig. 1 · {INFOBOX_FIGURE.caption.toLowerCase()}
            </p>
          </div>
          <div data-rule data-form-intro aria-hidden="true" className="mb-10 mt-16 h-2.5 bg-foreground md:col-start-1 md:col-end-8 md:row-start-2 md:mt-9" />
          <p data-lead data-form-intro className="m-0 font-sans text-[clamp(1.25rem,2vw,1.5625rem)] leading-[1.4] tracking-[-0.005em] md:col-start-1 md:col-end-7 md:row-start-3">
            {emphasise(LEAD, LEAD_EMPHASIS)}
          </p>
          <div className="mt-10 grid gap-x-12 gap-y-6 font-sans text-sm sm:grid-cols-3 md:col-start-1 md:col-end-8 md:row-start-4">
            {(
              [
                ["temporal range", `${TEMPORAL_RANGE.from} – ${TEMPORAL_RANGE.to}`, TEMPORAL_RANGE.fromAge],
                ["kingdom · phylum", `${kingdom} · ${phylum}`, `Class ${klass}`],
                ["order", order?.name ?? "", `Suborders ${suborders}`],
              ] as [string, string, string][]
            ).map(([term, name, note]) => (
              <div key={term} className="relative pt-2.5">
                <span data-meta-rule data-form-intro aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-foreground" />
                <div data-meta data-form-intro>
                  <span className={`${LABEL} mb-0.5 block tracking-[0.2em]`}>{term}</span>
                  <b className="block font-bold">{name}</b>
                  {note}
                </div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------- contents */}
      <nav data-page-transition data-scene aria-label="Contents" className="mt-24 sm:mt-28">
        <div data-band data-form-intro className="grid grid-cols-2 bg-inverse text-inverse-foreground sm:grid-cols-4 lg:grid-cols-8">
          {[...CHAPTERS, SOURCES_CHAPTER].map((chapter, index) => (
            <a
              key={chapter.id}
              href={`#${chapter.id}`}
              data-cell
              data-form-intro
              className={[
                "group block border-b border-r border-inverse-foreground/25 px-5 pb-4 pt-5 transition-colors hover:bg-shape-blue hover:text-shape-paper lg:border-b-0",
                index === 0 ? "bg-shape-red text-shape-paper" : "",
              ].join(" ")}
            >
              <b
                className={[
                  "block font-sans text-[44px] font-extrabold leading-none tracking-[-0.04em] transition-transform duration-300 group-hover:-translate-y-1",
                  index === 0 ? "text-shape-paper" : "text-shape-yellow group-hover:text-shape-yellow",
                ].join(" ")}
              >
                {index + 1}
              </b>
              <span className="font-sans text-sm font-medium lowercase">{chapter.short}</span>
            </a>
          ))}
        </div>
      </nav>

      {/* ---------------------------------------------------------- chapters */}
      {CHAPTERS.map((chapter, index) => (
        <ChapterBlock key={chapter.id} chapter={chapter} index={index} />
      ))}

      {/* ----------------------------------------------------------- sources */}
      <section id={SOURCES_CHAPTER.id} data-scene className="mt-32 scroll-mt-8 border-t-[10px] border-foreground pt-7 sm:mt-40">
        <div className={GRID}>
          <div className="relative md:col-span-4">
            <span
              data-shape
              data-kind="circle"
              data-form-intro
              data-drift="14"
              aria-hidden="true"
              className="absolute left-[40%] -top-6 z-0 h-32 w-32 rounded-full bg-shape-yellow sm:h-44 sm:w-44"
            />
            <b data-numeral data-form-intro className="relative z-[1] block font-sans text-[clamp(9rem,22vw,20rem)] font-extrabold leading-[0.75] tracking-[-0.08em]">
              {CHAPTERS.length + 1}
            </b>
            <span data-label data-form-intro className={`${LABEL} mt-7 block`}>
              sources
            </span>
          </div>
          <div className="mt-10 md:col-span-6 md:col-start-5 md:mt-0">
            <h2 data-h2 data-form-intro className="m-0 mb-8 font-sans text-[clamp(2.25rem,4.5vw,3.5rem)] font-extrabold lowercase leading-[0.95] tracking-[-0.035em]">
              where this
              <br />
              came from
            </h2>
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 font-sans text-[17px]">
              {(
                [
                  [
                    "source",
                    <a key="src" href={SOURCE.url} target="_blank" rel="noreferrer" className="font-bold hover:text-accent">
                      Octopus, Wikipedia
                    </a>,
                  ],
                  [
                    "licence",
                    <a key="lic" href={SOURCE.licenseUrl} target="_blank" rel="noreferrer" className="font-bold hover:text-accent">
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
                            className="font-bold hover:text-accent"
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
                  <dt data-p data-form-intro className={`${LABEL} pt-1 tracking-[0.2em]`}>
                    {term}
                  </dt>
                  <dd data-p data-form-intro className="m-0">
                    {detail}
                  </dd>
                </Fragment>
              ))}
            </dl>
            <div aria-hidden="true" className="mt-12 flex gap-3">
              <i data-trio data-form-intro className="block h-7 w-7 rounded-full bg-shape-red" />
              <i data-trio data-form-intro className="block h-7 w-7 bg-shape-blue" />
              <i data-trio data-form-intro className="shape-triangle block h-7 w-7 bg-shape-yellow" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* --------------------------------------------------------------- pieces */

function ChapterBlock({ chapter, index }: { chapter: Chapter; index: number }) {
  const first = chapter.subsections[0];
  const single = chapter.subsections.length === 1 && first !== undefined;
  const kind = KINDS[index % KINDS.length] ?? "circle";
  // The shape sits somewhere different behind each numeral.
  const offsets = ["left-[38%] -top-10", "left-[46%] top-16", "left-[30%] top-8"];
  return (
    <Fragment>
      <section id={chapter.id} data-scene className="scroll-mt-8 pt-28 sm:pt-32">
        <div className={GRID}>
          <div className="relative md:col-span-4">
            <div
              data-shape
              data-kind={kind}
              data-form-intro
              data-drift="16"
              aria-hidden="true"
              className={`absolute z-0 h-36 w-36 sm:h-44 sm:w-44 ${offsets[index % offsets.length]} ${SHAPE_CLASS[kind]} ${FILLS[kind]}`}
            />
            <b
              data-numeral
              data-form-intro
              data-drift="-6"
              className="relative z-[1] block font-sans text-[clamp(9rem,22vw,20rem)] font-extrabold leading-[0.75] tracking-[-0.08em]"
            >
              {index + 1}
            </b>
            <span data-label data-form-intro className={`${LABEL} mt-7 block`}>
              {chapter.title}
            </span>
          </div>
          <div className="mt-10 md:col-span-6 md:col-start-5 md:mt-0">
            <h2
              data-h2
              data-form-intro
              className="m-0 mb-8 font-sans text-[clamp(2.25rem,4.5vw,3.5rem)] font-extrabold lowercase leading-[0.95] tracking-[-0.035em] text-balance"
            >
              {single && first ? first.title : chapter.title}
            </h2>
            {single && first && <Prose subsection={first} />}
          </div>
        </div>
      </section>
      {single && first?.figure && <Plate figure={first.figure} />}
      {single && first?.fact && <Numeral fact={first.fact} />}
      {!single &&
        chapter.subsections.map((subsection) => (
          <Fragment key={subsection.id}>
            <section id={subsection.id} data-scene className="scroll-mt-8 pt-10 sm:pt-14">
              <div className={GRID}>
                <div className="md:col-span-6 md:col-start-5">
                  <h3 data-h3 data-form-intro className={`${LABEL} mb-2.5 flex items-center gap-3 text-accent`}>
                    <span data-h3-rule aria-hidden="true" className="inline-block h-0.5 w-7 bg-accent" />
                    {subsection.title}
                  </h3>
                  <Prose subsection={subsection} />
                </div>
              </div>
            </section>
            {subsection.figure && <Plate figure={subsection.figure} />}
            {subsection.fact && <Numeral fact={subsection.fact} />}
          </Fragment>
        ))}
    </Fragment>
  );
}

function Prose({ subsection }: { subsection: Subsection }) {
  return (
    <Fragment>
      {subsection.paragraphs.map((paragraph, index) => (
        <p key={index} data-p data-form-intro className="m-0 mb-4 max-w-[58ch] font-sans text-[17px] leading-[1.5]">
          {paragraph}
        </p>
      ))}
      <p data-p data-form-intro className="m-0">
        <a href={sourceHref(subsection.anchor)} target="_blank" rel="noreferrer" className={`${LABEL} tracking-[0.2em] hover:text-accent`}>
          source · wikipedia ↗
        </a>
      </p>
    </Fragment>
  );
}

/** A photograph in a blue frame, with a yellow dot at its corner. */
function Plate({ figure }: { figure: Figure }) {
  return (
    <figure data-scene className={`${GRID} m-0 mt-16`}>
      <div className="relative md:col-span-8 md:col-start-5">
        <span data-fig-dot data-form-intro aria-hidden="true" className="absolute -left-8 -top-8 z-[1] h-20 w-20 rounded-full bg-shape-yellow sm:-left-[52px] sm:-top-[52px] sm:h-[104px] sm:w-[104px]" />
        <div data-fig-image data-form-intro className="relative aspect-video overflow-hidden bg-shape-blue">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={figure.src}
            alt={figure.alt}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover opacity-90 mix-blend-screen [filter:grayscale(1)_contrast(1.3)_brightness(1.1)]"
          />
        </div>
        <figcaption data-fig-cap data-form-intro className={`${LABEL} mt-3 flex flex-wrap justify-between gap-x-6 gap-y-1 tracking-[0.2em]`}>
          <span>fig. {FIGURE_ORDER.get(figure) ?? "?"}</span>
          <span>{figure.caption}</span>
        </figcaption>
      </div>
    </figure>
  );
}

/** A big number carried on a shape, with its label ruled beside it. */
function Numeral({ fact }: { fact: Fact }) {
  const kind = KINDS[(FACT_ORDER.get(fact) ?? 0) % KINDS.length] ?? "circle";
  const [caption, line] = splitLabel(fact.label);
  return (
    <div data-scene className={`${GRID} mt-14 items-center`}>
      <div
        data-fact-shape
        data-kind={kind}
        data-form-intro
        className={`grid aspect-square w-[60%] max-w-[260px] place-items-center md:col-span-3 md:col-start-5 md:w-full ${SHAPE_CLASS[kind]} ${FACT_FILLS[kind]} ${kind === "triangle" ? "pt-[28%]" : ""}`}
      >
        <b data-fact-value data-form-intro className="font-sans text-[clamp(3.5rem,9vw,7.5rem)] font-extrabold leading-none tracking-[-0.06em] tabular-nums">
          <span data-fact-digits data-value={fact.value}>
            {fact.value}
          </span>
          {fact.unit && <small className="ml-0.5 text-[0.36em] font-medium tracking-normal">{fact.unit}</small>}
        </b>
      </div>
      <div className="relative mt-6 pl-6 font-sans text-[22px] leading-[1.25] md:col-span-4 md:col-start-8 md:mt-0">
        <span data-fact-rule data-form-intro aria-hidden="true" className="absolute bottom-0 left-0 top-0 w-0.5 bg-foreground" />
        <div data-fact-label data-form-intro>
          {fact.hearts && (
            <span aria-hidden="true" className="mb-2.5 flex gap-2.5">
              <i data-heart className="block h-[22px] w-[22px] rounded-full bg-foreground" />
              <i data-heart className="block h-[22px] w-[22px] rounded-full bg-shape-red" />
              <i data-heart className="block h-[22px] w-[22px] rounded-full bg-shape-red" />
            </span>
          )}
          <span className={`${LABEL} mb-2 block tracking-[0.24em]`}>
            {line ? caption : fact.unit ? "measure" : "count"}
          </span>
          {line ?? fact.label}
        </div>
      </div>
    </div>
  );
}
