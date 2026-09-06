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
  fadeUp,
  formatTimecode,
  projector,
  runTimecode,
  subtitleIn,
  trackIn,
} from "@/lib/animation/effects/cinematic";
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
 * The article, cinematic.
 *
 * The page is cut like a feature: a letterboxed title frame, an opening line,
 * the billing block, a scene selection, then every chapter as a title card
 * followed by its scenes, and a credits roll at the end. Photographs sit in
 * 2.39 frames with a subtitle and a timecode, and every big number is a
 * numeral held between two hairlines.
 *
 * Motion, all of it from the projection booth:
 *  - the title frame comes up with the route; then the light finds it, the
 *    title tracks in out of soft focus, the caption cuts in like a subtitle,
 *    and the timecode runs while the projector flickers
 *  - each scene below plays once as it scrolls into view: title cards track
 *    in, prose fades up, numerals count up from nothing, a shot's timecode
 *    runs only while it is on screen, and the credits rise line by line
 * Reduced motion snaps every one of these to its settled state.
 */

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

const CAP = "font-mono text-[11px] font-light uppercase leading-none tracking-[0.34em] text-accent";
const CAP_DIM = "font-mono text-[11px] font-light uppercase leading-none tracking-[0.3em] text-muted";
const CAP_SCREEN =
  "font-mono text-[11px] font-light uppercase leading-none tracking-[0.34em] text-screen-gold";

/** Wikipedia's fragment for a subsection, for the source link. */
function sourceHref(anchor: string): string {
  return `${SOURCE.url}#${anchor}`;
}

/** The scene selection lists every chapter and the credits. */
const REEL: { id: string; short: string; scenes: number }[] = [
  ...CHAPTERS.map((chapter) => ({ id: chapter.id, short: chapter.short, scenes: chapter.subsections.length })),
  { id: SOURCES_CHAPTER.id, short: "Credits", scenes: 1 },
];

/** Fake running time for the scene selection: chapters fill the reel by scene count. */
function chapterTimes(): string[] {
  let seconds = 1;
  return REEL.map((chapter) => {
    const time = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
    seconds += chapter.scenes * 3 + 1;
    return time;
  });
}

/** Wraps the emphasised words of the lead in gold. */
function emphasise(text: string, words: string[]): ReactNode[] {
  const pattern = new RegExp(`(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`);
  return text.split(pattern).map((part, index) =>
    words.includes(part) ? (
      <em key={index} className="whitespace-nowrap not-italic text-accent">
        {part}
      </em>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

export function CinematicArticle() {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    (_context, contextSafe) => {
      const root = scope.current;
      if (!root || !contextSafe) {
        return;
      }
      const q = gsap.utils.selector(root);
      const frame = q<HTMLElement>("[data-frame]")[0];
      const glow = q<HTMLElement>("[data-glow]")[0];
      const presents = q<HTMLElement>("[data-presents]")[0];
      const title = q<HTMLElement>("[data-title]")[0];
      const sub = q<HTMLElement>("[data-sub]")[0];
      const caption = q<HTMLElement>("[data-caption]")[0];
      const timecode = q<HTMLElement>("[data-timecode]")[0];
      const ratio = q<HTMLElement>("[data-ratio]")[0];
      const scenes = q<HTMLElement>("[data-scene]");
      if (!frame || !glow || !presents || !title || !sub || !caption || !timecode || !ratio) {
        return;
      }
      const hidden = q<HTMLElement>("[data-screen-intro]");

      if (prefersReducedMotion()) {
        gsap.set(hidden, { autoAlpha: 1 });
        return;
      }

      let sequence: gsap.core.Timeline | null = null;
      let split: SplitText | null = null;
      let flicker: gsap.core.Tween | null = null;
      let stopTimecode: (() => void) | null = null;
      const cardSplits: SplitText[] = [];
      const shotStops = new Map<HTMLElement, () => void>();
      let triggers: ScrollTrigger[] = [];

      const settle = () => {
        flicker?.kill();
        flicker = null;
        stopTimecode?.();
        stopTimecode = null;
        split?.revert();
        split = null;
        for (const stop of shotStops.values()) {
          stop();
        }
        shotStops.clear();
        for (const trigger of triggers) {
          trigger.kill();
        }
        triggers = [];
        for (const s of cardSplits) {
          s.revert();
        }
        cardSplits.length = 0;
      };

      /** The scene's own timeline, played once when it scrolls in. */
      const playScene = (scene: HTMLElement) => {
        const s = gsap.utils.selector(scene);
        const tl = gsap.timeline();
        const caps = s<HTMLElement>("[data-cap]");
        const cardTitle = s<HTMLElement>("[data-card-title]")[0];
        const fades = s<HTMLElement>("[data-fade]");
        const rows = s<HTMLElement>("[data-row]");
        const cuts = s<HTMLElement>("[data-cut]");
        const counts = s<HTMLElement>("[data-count]");
        const rules = s<HTMLElement>("[data-rule]");
        if (caps.length > 0) {
          fadeUp(tl, caps, 0, { duration: 1 });
        }
        if (cardTitle) {
          cardSplits.push(
            trackIn(tl, cardTitle, { at: 0.2, from: "0.18em", to: "-0.01em", duration: 1.6, stagger: 0.03 }),
          );
        }
        if (rules.length > 0) {
          tl.fromTo(
            rules,
            { autoAlpha: 1, scaleX: 0, transformOrigin: "center" },
            { scaleX: 1, duration: 1.2, ease: "power3.out" },
            0.1,
          );
        }
        if (fades.length > 0) {
          fadeUp(tl, fades, cardTitle ? 0.9 : 0.15, { duration: 1, y: 14, stagger: 0.12 });
        }
        if (rows.length > 0) {
          fadeUp(tl, rows, 0.2, { duration: 0.7, y: 10, stagger: 0.07 });
        }
        cuts.forEach((cut, index) => subtitleIn(tl, cut, 0.9 + index * 0.6));
        for (const count of counts) {
          const target = count.dataset.count ?? "0";
          const decimals = (target.split(".")[1] ?? "").length;
          const value = Number.parseFloat(target);
          const counter = { n: 0 };
          const digits = count.querySelector<HTMLElement>("[data-digits]") ?? count;
          tl.fromTo(count, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, ease: "sine.out" }, 0.3).to(
            counter,
            {
              n: value,
              duration: 1.6,
              ease: "power3.out",
              onUpdate: () => {
                digits.textContent = counter.n.toFixed(decimals);
              },
            },
            0.3,
          );
        }
        return tl;
      };

      const unwatch = watchPageTransition(root, {
        onIdle: contextSafe(() => {
          const tl = gsap.timeline();
          sequence = tl;
          gsap.set(glow, { autoAlpha: 0 });
          tl.to(glow, { autoAlpha: 1, duration: 1.8, ease: "sine.out" }, 0);
          tl.call(
            () => {
              stopTimecode = runTimecode(timecode, 1 / 24);
            },
            [],
            0,
          );
          fadeUp(tl, [timecode, ratio], 0.2, { duration: 0.8 });
          fadeUp(tl, presents, 0.5, { duration: 1.4 });
          split = trackIn(tl, title, { at: 1.0, from: "0.6em", to: "0.18em" });
          fadeUp(tl, sub, 1.9, { duration: 1.2, y: 10 });
          subtitleIn(tl, caption, 2.5);
          tl.call(
            () => {
              flicker = projector(glow);
            },
            [],
            1.8,
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
          // A shot's clock runs only while it is on screen.
          for (const shot of q<HTMLElement>("[data-shot]")) {
            const clock = shot.querySelector<HTMLElement>("[data-shot-tc]");
            if (!clock) {
              continue;
            }
            const from = Number.parseFloat(clock.dataset.from ?? "0");
            triggers.push(
              ScrollTrigger.create({
                trigger: shot,
                start: "top bottom",
                end: "bottom top",
                onToggle: contextSafe((self) => {
                  if (self.isActive) {
                    shotStops.get(shot)?.();
                    shotStops.set(shot, runTimecode(clock, from));
                  } else {
                    shotStops.get(shot)?.();
                    shotStops.delete(shot);
                  }
                }),
              }),
            );
          }
          // Cormorant arrives after the first layout; measure again once it has.
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

  const times = chapterTimes();

  return (
    <div ref={scope} className="cinematic-article">
      {/* ------------------------------------------------------ title frame */}
      <header
        data-page-transition
        data-frame
        className="relative aspect-[4/5] max-h-[78vh] w-full overflow-hidden bg-screen text-screen-ink sm:aspect-[2.39/1]"
      >
        <div className="absolute inset-0">
          {/* Wikimedia Commons serves these; next/image would need the host allow-listed for no gain here. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={INFOBOX_FIGURE.src}
            alt={INFOBOX_FIGURE.alt}
            loading="eager"
            referrerPolicy="no-referrer"
            className="absolute inset-0 h-full w-full scale-[1.02] object-cover [object-position:50%_60%] [filter:grayscale(0.55)_contrast(1.12)_brightness(0.62)_sepia(0.15)]"
          />
        </div>
        <div
          data-glow
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_55%,transparent_35%,rgba(7,7,6,0.85)_100%),linear-gradient(180deg,rgba(7,7,6,0.5),transparent_30%,transparent_60%,rgba(7,7,6,0.9))]"
        />
        <div className="absolute inset-0 z-[2] grid place-content-center px-6 text-center">
          <p
            data-presents
            data-screen-intro
            className={`${CAP_SCREEN} mb-5 [text-shadow:0_1px_3px_#000] sm:mb-8`}
          >
            Animaxxipedia presents
          </p>
          <h1
            data-title
            data-screen-intro
            className="m-0 whitespace-nowrap font-sans text-[clamp(2.25rem,9.5vw,12.5rem)] font-light uppercase leading-[0.86] tracking-[0.18em] [padding-left:0.18em] sm:text-[clamp(3rem,13vw,12.5rem)]"
          >
            Octopus
          </h1>
          <p
            data-sub
            data-screen-intro
            className="mt-5 font-sans text-lg font-light italic text-screen-ink/80 sm:mt-8 sm:text-2xl"
          >
            A natural history in eight chapters
          </p>
        </div>
        <p
          data-caption
          data-screen-intro
          className="absolute inset-x-0 bottom-7 z-[3] px-[8%] text-center font-mono text-[13px] font-light leading-[1.4] tracking-[0.02em] text-white [text-shadow:0_1px_2px_#000,0_0_12px_rgba(0,0,0,0.8)] sm:bottom-9 sm:text-[15px]"
        >
          {INFOBOX_FIGURE.caption}, at rest on the sea floor
        </p>
        <span
          data-timecode
          data-screen-intro
          className="absolute bottom-2.5 left-4 z-[3] font-mono text-[10px] font-light tracking-[0.2em] text-screen-ink/55 tabular-nums sm:bottom-5 sm:left-8 sm:text-[11px]"
        >
          TC 00:00:00:01
        </span>
        <span
          data-ratio
          data-screen-intro
          className="absolute bottom-2.5 right-4 z-[3] font-mono text-[10px] font-light tracking-[0.2em] text-screen-ink/55 sm:bottom-5 sm:right-8 sm:text-[11px]"
        >
          2.39 : 1
        </span>
      </header>

      {/* ---------------------------------------------------- opening line */}
      <section data-page-transition className="px-4 pb-16 pt-20 text-center sm:px-14 sm:pb-28 sm:pt-32">
        <div className="mx-auto h-px w-12 bg-accent" />
        <p className="mx-auto mt-8 max-w-[36ch] font-sans text-[clamp(1.375rem,2.3vw,2rem)] font-light italic leading-[1.32] sm:mt-9">
          {emphasise(LEAD, LEAD_EMPHASIS)}
        </p>
        <p className="mt-9 font-sans text-[15px] italic text-muted sm:mt-11">{HATNOTE}</p>
      </section>

      {/* --------------------------------------------------------- billing */}
      <section
        data-scene
        className="overflow-hidden border-y border-line px-4 py-9 text-center sm:px-14 sm:py-11"
      >
        <Billing
          big
          entries={TAXONOMY.slice(0, 4).map((row) => [row.rank, row.name])}
        />
        <Billing
          entries={TAXONOMY.slice(4).map((row) => [row.rank, row.note ? `${row.name}, ${row.note}` : row.name])}
        />
        <Billing
          entries={[
            ["Temporal range", `${TEMPORAL_RANGE.from} to ${TEMPORAL_RANGE.to}, ${TEMPORAL_RANGE.fromAge}`],
            ["Based on", "the article by Wikipedia"],
          ]}
        />
      </section>

      {/* -------------------------------------------------- scene selection */}
      <section data-scene className="mx-auto max-w-[880px] px-4 pb-10 pt-20 sm:px-14 sm:pt-32">
        <p data-cap data-screen-intro className={`${CAP} mb-9 block text-center sm:mb-11`}>
          Chapters
        </p>
        <ol className="m-0 list-none border-t border-faint p-0">
          {REEL.map((chapter, index) => (
            <li
              key={chapter.id}
              data-row
              data-screen-intro
              className="grid grid-cols-[3rem_1fr_auto] items-baseline gap-4 border-b border-faint py-4 font-sans text-xl font-light sm:grid-cols-[4.5rem_1fr_auto] sm:gap-6 sm:text-[28px]"
            >
              <span className={CAP}>{ROMAN[index]}</span>
              <a href={`#${chapter.id}`} className="hover:text-accent-bright">
                {chapter.short}
                {chapter.scenes > 1 && (
                  <em className="ml-3 hidden text-[0.8em] italic text-muted sm:inline">
                    {chapter.scenes} scenes
                  </em>
                )}
              </a>
              <span className={`${CAP_DIM} tabular-nums`}>{times[index]}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* -------------------------------------------------------- chapters */}
      {CHAPTERS.map((chapter, index) => (
        <ChapterBlock key={chapter.id} chapter={chapter} index={index} />
      ))}

      {/* --------------------------------------------------------- credits */}
      <section
        id={SOURCES_CHAPTER.id}
        data-scene
        className="scroll-mt-8 px-4 pb-20 pt-24 text-center sm:px-14 sm:pb-28 sm:pt-40"
      >
        <p data-cap data-screen-intro className={`${CAP} mb-10 block`}>
          Chapter {ROMAN[CHAPTERS.length]} · Credits
        </p>
        <dl className="mx-auto grid max-w-[640px] grid-cols-[auto_1fr] gap-x-6 gap-y-3 sm:grid-cols-2 sm:gap-x-14">
          {(
            [
              ["Presented by", "Animaxxipedia"],
              [
                "Based on",
                <a key="src" href={SOURCE.url} target="_blank" rel="noreferrer" className="hover:text-accent-bright">
                  Octopus, Wikipedia
                </a>,
              ],
              [
                "Licence",
                <a key="lic" href={SOURCE.licenseUrl} target="_blank" rel="noreferrer" className="hover:text-accent-bright">
                  {SOURCE.license}
                </a>,
              ],
              ["Citations", String(SOURCE.citations)],
              ["Languages", String(SOURCE.languages)],
              ["Retrieved", SOURCE.retrieved],
              [
                "See also",
                <span key="see">
                  {SEE_ALSO.map((title, index) => (
                    <Fragment key={title}>
                      {index > 0 && <span aria-hidden="true"> · </span>}
                      <a
                        href={`https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-accent-bright"
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
              <dt data-row data-screen-intro className={`${CAP_DIM} pt-2.5 text-right`}>
                {term}
              </dt>
              <dd data-row data-screen-intro className="m-0 text-left font-sans text-xl sm:text-2xl">
                {detail}
              </dd>
            </Fragment>
          ))}
        </dl>
        <p data-card-title data-screen-intro className="mt-20 font-sans text-3xl font-light italic sm:mt-24">
          Fin
        </p>
        <div data-rule data-screen-intro className="mx-auto mt-10 h-px w-12 bg-accent" />
        <p data-fade data-screen-intro className={`${CAP_DIM} mt-16 tracking-[0.34em]`}>
          Animaxxipedia · Article · Talk · History
        </p>
      </section>
    </div>
  );
}

/* --------------------------------------------------------------- pieces */

/** One row of the billing block: roles in small gold caps, names in condensed capitals. */
function Billing({ entries, big = false }: { entries: [string, string][]; big?: boolean }) {
  return (
    <p
      data-row
      data-screen-intro
      className={[
        "my-2 font-billing font-light uppercase leading-[1.9] tracking-[0.14em] [word-spacing:0.3em] sm:my-3 sm:leading-[2] sm:[transform:scaleY(1.45)] sm:[transform-origin:center]",
        big ? "text-[15px] sm:text-lg" : "text-[13px] sm:text-[15px]",
      ].join(" ")}
    >
      {entries.map(([role, name], index) => (
        <Fragment key={role}>
          {index > 0 && " "}
          <span className="mx-[0.6em]">
            <b className="whitespace-nowrap text-[10px] font-light tracking-[0.24em] text-accent [vertical-align:0.08em]">
              {role}
            </b>
            {"\u00a0"}
            <span className="sm:whitespace-nowrap">{name}</span>
          </span>
        </Fragment>
      ))}
    </p>
  );
}

function ChapterBlock({ chapter, index }: { chapter: Chapter; index: number }) {
  const first = chapter.subsections[0];
  const single = chapter.subsections.length === 1 && first !== undefined;
  return (
    <Fragment>
      <section
        id={chapter.id}
        data-scene
        className="grid min-h-[62vh] scroll-mt-8 place-content-center px-4 pb-16 pt-24 text-center sm:px-14 sm:pb-24 sm:pt-32"
      >
        <p data-cap data-screen-intro className={`${CAP} mb-8 block sm:mb-10`}>
          Chapter {ROMAN[index]}
        </p>
        <h2
          data-card-title
          data-screen-intro
          className="m-0 font-sans text-[clamp(2.75rem,7vw,6.75rem)] font-light italic leading-[0.98] tracking-[-0.01em] text-balance"
        >
          {single && first ? first.title : chapter.title}
        </h2>
        <p data-fade data-screen-intro className={`${CAP_DIM} mt-7 tracking-[0.3em] sm:mt-8`}>
          {single ? chapter.title : `${chapter.subsections.length} scenes`}
        </p>
      </section>
      {chapter.subsections.map((subsection) => (
        <Scene key={subsection.id} subsection={subsection} heading={!single} />
      ))}
    </Fragment>
  );
}

function Scene({ subsection, heading }: { subsection: Subsection; heading: boolean }) {
  return (
    <Fragment>
      <section id={subsection.id} data-scene className="mx-auto max-w-[640px] scroll-mt-8 px-4 pb-14 sm:px-14">
        {heading && (
          <h3 data-cap data-screen-intro className={`${CAP} mb-6 mt-14 block text-center`}>
            {subsection.title}
          </h3>
        )}
        {subsection.paragraphs.map((paragraph, index) => (
          <p
            key={index}
            data-fade
            data-screen-intro
            className={[
              "mb-6 font-sans text-lg leading-[1.65] text-foreground/88 sm:text-xl",
              index === 0 ? "[&::first-line]:[font-variant:small-caps] [&::first-line]:tracking-[0.06em]" : "",
            ].join(" ")}
          >
            {paragraph}
          </p>
        ))}
        <p data-fade data-screen-intro className="text-center">
          <a
            href={sourceHref(subsection.anchor)}
            target="_blank"
            rel="noreferrer"
            className={`${CAP_DIM} hover:text-accent-bright`}
          >
            Source · Wikipedia
          </a>
        </p>
      </section>
      {subsection.figure && <Shot figure={subsection.figure} id={subsection.id} />}
      {subsection.fact && <Numeral fact={subsection.fact} />}
    </Fragment>
  );
}

/** A photograph in a 2.39 frame, subtitled, with a running clock. */
function Shot({ figure, id }: { figure: Figure; id: string }) {
  // Each shot starts its clock somewhere on the reel, so no two read alike.
  const from = (id.split("").reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 50) * 7.3;
  return (
    <figure data-scene data-shot className="relative m-0 bg-screen py-8 text-screen-ink sm:py-12">
      <div
        data-fade
        data-screen-intro
        className="relative aspect-[4/3] w-full overflow-hidden sm:aspect-[2.39/1]"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={figure.src}
          alt={figure.alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover [filter:grayscale(0.6)_contrast(1.15)_brightness(0.7)_sepia(0.12)]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,transparent_40%,rgba(0,0,0,0.75)_100%)]"
        />
      </div>
      <figcaption
        data-cut
        data-screen-intro
        className="absolute inset-x-0 bottom-16 z-[2] px-[8%] text-center font-mono text-[13px] font-light leading-[1.4] text-white [text-shadow:0_1px_2px_#000,0_0_14px_rgba(0,0,0,0.9)] sm:bottom-[88px] sm:text-base"
      >
        {figure.caption}
      </figcaption>
      <span
        data-shot-tc
        data-from={from}
        data-fade
        data-screen-intro
        className="absolute bottom-10 right-4 z-[2] font-mono text-[10px] font-light tracking-[0.2em] text-screen-ink/50 tabular-nums sm:bottom-16 sm:right-8 sm:text-[11px]"
      >
        TC {formatTimecode(from)}
      </span>
    </figure>
  );
}

/** A big number between two hairlines, counted up from nothing. */
function Numeral({ fact }: { fact: Fact }) {
  return (
    <section data-scene className="px-4 py-14 text-center sm:py-16">
      <p data-cap data-screen-intro className={`${CAP} mb-7 block`}>
        {fact.label}
      </p>
      <div
        data-count={fact.value}
        data-screen-intro
        className="flex items-center justify-center gap-5 font-sans text-[clamp(6rem,20vw,17.5rem)] font-light leading-[0.82] tracking-[-0.02em] text-foreground [font-variant-numeric:lining-nums] sm:gap-10"
      >
        <span aria-hidden="true" className="h-px w-[min(200px,14vw)] bg-line" />
        <span>
          <span data-digits>{fact.value}</span>
          {fact.unit && <small className="ml-3 text-[0.32em] italic text-accent">{fact.unit}</small>}
        </span>
        <span aria-hidden="true" className="h-px w-[min(200px,14vw)] bg-line" />
      </div>
    </section>
  );
}
