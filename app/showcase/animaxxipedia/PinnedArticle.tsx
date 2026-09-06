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
  blurIn,
  clipReveal,
  CLIPPED,
  countUp,
  fadeUp,
  flipScheme,
  linesDraw,
  numeralRise,
  pinStage,
  popIn,
  progressBar,
  pulseHearts,
  slideUnderline,
  swingIn,
  token,
  unpinAll,
  wordsLight,
  type Ink,
} from "@/lib/animation/effects/pinned";
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
 * The article, as a keynote.
 *
 * Every subsection is a stage: a full viewport held at the top of the screen
 * while the page scrolls past it, with everything inside played by the scroll
 * wheel. The reader turns the wheel and the chapter assembles — the outlined
 * number rises behind the prose, a card swings round to face them, a figure
 * counts up, three rules draw in sequence, a photograph is uncovered left to
 * right, and the paragraphs arrive one after another in their own slices of
 * the scroll. Above it all a frosted contents rail sticks under the site's
 * glass nav and an accent hairline slides between its cells as the chapters
 * hand over.
 *
 * The title stage is the same thing at poster scale: the photograph pushes in
 * with the route and then scrubs back and dims, the word shrinks to make room,
 * the lead is read to the reader a word at a time, and a strip of
 * classification comes up along the bottom.
 *
 * One stage is different. Camouflage turns the page over while it is held: a
 * plate of the other scheme washes in behind everything and every run of ink
 * walks to the colour it has over there, then both walk back before the stage
 * lets go — dark page to light, light page to dark.
 *
 * On a phone none of it is pinned. `gsap.matchMedia` swaps the whole
 * choreography for the same score played once, in real time, as each section
 * scrolls in; the stages are ordinary sections with the picture first.
 * Reduced motion keeps the sections and drops the motion entirely.
 */

/* --------------------------------------------------------------- typography */

const KICKER = "font-sans text-[13px] font-semibold uppercase tracking-[0.1em] text-accent";
const TRACKED = "font-sans text-[12px] font-medium uppercase tracking-[0.1em] text-muted";
const CAPTION = "font-sans text-[12px] leading-[1.45] text-muted";

/** How far a stage is held, as a percentage of the viewport height. */
const TITLE_LENGTH = 260;
const stageLength = (paragraphs: number) => 110 + 55 * paragraphs;

/** Where the contents rail sticks, and how far a jump has to clear the chrome. */
const RAIL_OFFSET = 112;

/**
 * A stage has to fit one viewport, with the glass nav and the contents rail
 * above it, on whatever screen the reader has. So the longer a subsection
 * runs the tighter it is set — three paragraphs also hand the text column a
 * bigger share of the stage — and every size on a held stage is a clamp
 * against `min(vh, vw)`: a short window and a narrow one both squeeze the
 * measure, and the type has to answer to both or the prose runs past the
 * fold. Below the pins none of that applies and the sizes are plain.
 */
function density(count: number) {
  if (count >= 3) {
    return {
      heading: "text-[1.95rem] md:text-[clamp(1.6rem,min(3.2vw,5.2vh),2.75rem)]",
      body: "text-[16px] leading-[1.55] md:text-[clamp(12px,min(1.62vh,1.55vw),15.5px)]",
      gap: "mt-3.5",
      columns: "md:grid-cols-[1.5fr_1fr]",
    };
  }
  if (count === 2) {
    return {
      heading: "text-[2.15rem] md:text-[clamp(1.85rem,min(4vw,6.5vh),3.5rem)]",
      body: "text-[16px] leading-[1.55] md:text-[clamp(13px,min(1.9vh,1.85vw),17px)]",
      gap: "mt-4",
      columns: "md:grid-cols-[1.1fr_1fr]",
    };
  }
  return {
    heading: "text-[2.4rem] md:text-[clamp(2rem,min(5vw,8vh),4.5rem)]",
    body: "text-[16px] leading-[1.5] md:text-[clamp(14px,min(2.1vh,2.2vw),19px)]",
    gap: "mt-5",
    columns: "md:grid-cols-[1.1fr_1fr]",
  };
}

/** Wraps the emphasised words of the lead so the light can find them. */
function emphasise(text: string, words: string[]): ReactNode[] {
  const pattern = new RegExp(
    `(${words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
  );
  return text.split(pattern).map((part, index) =>
    words.includes(part) ? (
      <b key={index} className="font-semibold">
        {part}
      </b>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

/**
 * "Hearts. The main one stops when it swims." becomes a tracked caption and a
 * line under it. A label split at a comma leaves the remainder lowercase, so
 * it is given back its capital: it is a sentence of its own now.
 */
function splitLabel(label: string): [string, string | null] {
  const match = /^(.+?)(?:\.|,)\s+(.+)$/.exec(label);
  if (!match) {
    return [label, null];
  }
  const rest = match[2] ?? "";
  return [match[1] ?? label, rest.charAt(0).toUpperCase() + rest.slice(1)];
}

/** Every subsection, flattened, with the chapter it belongs to. */
const STAGES = CHAPTERS.flatMap((chapter, index) =>
  chapter.subsections.map((subsection) => ({ chapter, subsection, index })),
);

/* ------------------------------------------------------------------ article */

export function PinnedArticle() {
  const scope = useRef<HTMLDivElement>(null);
  const jump = useRef<(index: number) => void>(() => {});

  useGSAP(
    (_context, contextSafe) => {
      const root = scope.current;
      if (!root || !contextSafe) {
        return;
      }
      const q = gsap.utils.selector(root);
      const one = (selector: string) => q<HTMLElement>(selector)[0];

      const titleStage = one("[data-title-stage]");
      const titlePin = one("[data-title-pin]");
      const titlePush = one("[data-title-push]");
      const titlePhoto = one("[data-title-photo]");
      const titleScale = one("[data-title-scale]");
      const titleWord = one("[data-title-word]");
      const titleCap = one("[data-title-cap]");
      const lead = one("[data-lead]");
      const metaCells = q<HTMLElement>("[data-meta]");
      const progress = one("[data-progress]");
      const railCells = q<HTMLElement>("[data-rail-cell]");
      const underline = one("[data-rail-underline]");
      const stages = q<HTMLElement>("[data-stage]");
      const sources = one("[data-sources]");
      const sourceItems = q<HTMLElement>("[data-source-item]");
      const hidden = q<HTMLElement>("[data-pin-intro]");

      if (
        !titleStage || !titlePin || !titlePush || !titlePhoto || !titleScale ||
        !titleWord || !titleCap || !lead || !progress || !underline || !sources
      ) {
        return;
      }

      /** The first stage of each chapter, for the rail's jumps. */
      const chapterStages = CHAPTERS.map(
        (_chapter, index) => q<HTMLElement>(`[data-chapter="${index}"]`)[0],
      );
      const chapterTriggers: (ScrollTrigger | undefined)[] = [];

      jump.current = (index: number) => {
        const trigger = chapterTriggers[index];
        if (trigger) {
          // A tenth of the way into the pin: far enough in that the stage
          // counts as speaking and its number and card are already arriving,
          // and short of the first paragraph, so nothing is skipped.
          window.scrollTo({
            top: trigger.start + (trigger.end - trigger.start) * 0.1,
            behavior: "auto",
          });
          return;
        }
        const target = index >= CHAPTERS.length ? sources : chapterStages[index];
        if (target) {
          window.scrollTo({
            top: target.getBoundingClientRect().top + window.scrollY - RAIL_OFFSET,
            behavior: "auto",
          });
        }
      };

      if (prefersReducedMotion()) {
        gsap.set(hidden, { autoAlpha: 1 });
        return;
      }

      /* ------------------------------- the state everything holds until idle */
      gsap.set(
        q<HTMLElement>(
          "[data-p], [data-read], [data-caption], [data-fact-cap], [data-numeral], [data-card], [data-lead], [data-meta], [data-heart]",
        ),
        { autoAlpha: 0 },
      );
      gsap.set(q<HTMLElement>("[data-bar]"), { scaleX: 0, transformOrigin: "left center" });
      gsap.set(q<HTMLElement>("[data-photo]"), { clipPath: CLIPPED });
      gsap.set(progress, { scaleX: 0, transformOrigin: "left center" });
      gsap.set(underline, { autoAlpha: 0, width: 0 });
      gsap.set(titlePush, { scale: 1.28 });

      /*
       * Which chapter is speaking. Every stage reports in, but a jump down the
       * page toggles a dozen of them in one update and the last to say "on" is
       * not necessarily the one that stayed on — so a toggle only asks for a
       * recount, and the count itself happens once, on the next frame, by
       * reading the triggers rather than trusting the order they fired in.
       */
      const probes: { trigger: ScrollTrigger; chapter: number }[] = [];

      let intro: gsap.core.Timeline | null = null;
      let media: ReturnType<typeof gsap.matchMedia> | null = null;
      let splits: SplitText[] = [];
      let loops: gsap.core.Timeline[] = [];
      let triggers: ScrollTrigger[] = [];

      const settle = () => {
        for (const loop of loops) {
          loop.kill();
        }
        loops = [];
        unpinAll(triggers);
        triggers = [];
        media?.revert();
        media = null;
        for (const split of splits) {
          split.revert();
        }
        splits = [];
        chapterTriggers.length = 0;
        probes.length = 0;
      };

      /* ------------------------------------------------------------ the rail */
      let active = -2;
      let counting = false;

      const setActive = (index: number) => {
        if (index === active) {
          return;
        }
        active = index;
        railCells.forEach((cell, i) => {
          cell.classList.toggle("text-foreground", i === index);
          cell.classList.toggle("text-muted", i !== index);
        });
        const cell = railCells[index];
        if (cell) {
          slideUnderline(underline, cell);
        } else {
          gsap.to(underline, { autoAlpha: 0, duration: 0.2, overwrite: "auto" });
        }
      };

      const recount = () => {
        if (counting) {
          return;
        }
        counting = true;
        requestAnimationFrame(() => {
          counting = false;
          if (probes.length === 0) {
            return;
          }
          const speaking = probes.find((probe) => probe.trigger.isActive);
          setActive(speaking ? speaking.chapter : -1);
        });
      };

      /* ------------------------------------------------- the camouflage flip */
      /** Every run of ink on the inverted stage, and where it has to walk to. */
      const flipInk = (stage: HTMLElement): Ink[] => {
        const s = gsap.utils.selector(stage);
        const runs: Ink[] = [
          {
            targets: s<HTMLElement>("[data-h2]"),
            from: token("--foreground", "#f5f5f7"),
            to: token("--flip-foreground", "#1d1d1f"),
          },
          {
            targets: s<HTMLElement>("[data-kicker]"),
            from: token("--accent", "#2997ff"),
            to: token("--flip-accent", "#0071e3"),
          },
          {
            targets: s<HTMLElement>("[data-p], [data-read], [data-caption]"),
            from: token("--muted", "#86868b"),
            to: token("--flip-muted", "#6e6e73"),
          },
          {
            targets: s<HTMLElement>("[data-numeral]"),
            from: token("--pinned-stroke", "rgba(245,245,247,0.3)"),
            to: token("--flip-stroke", "rgba(29,29,31,0.28)"),
          },
          {
            targets: s<HTMLElement>("[data-plate]"),
            from: token("--surface", "#1c1c1e"),
            to: token("--flip-surface", "#ffffff"),
            prop: "backgroundColor",
          },
          {
            targets: s<HTMLElement>("[data-plate]"),
            from: token("--line", "rgba(255,255,255,0.12)"),
            to: token("--flip-line", "rgba(0,0,0,0.1)"),
            prop: "borderColor",
          },
        ];
        return runs.filter((run) => (run.targets as HTMLElement[]).length > 0);
      };

      /* ----------------------------------------------------- a stage's score */
      /*
       * The same score serves both breakpoints: on a desktop it is written on
       * to a timeline whose duration is the stage's scroll, so every position
       * is a fraction of the pin; on a phone the identical timeline is played
       * once, slowed down, as the section arrives. `heading` is false where
       * the kicker and the title have already been brought on by a trigger of
       * their own, so the column is never a blank half when the stage pins.
       */
      const scoreStage = (
        stage: HTMLElement,
        timeline: gsap.core.Timeline,
        { heading, flip }: { heading: boolean; flip: boolean },
      ) => {
        const s = gsap.utils.selector(stage);
        const pick = (selector: string) => s<HTMLElement>(selector)[0];
        const numeral = pick("[data-numeral]");
        const kicker = pick("[data-kicker]");
        const title = pick("[data-h2]");
        const paragraphs = s<HTMLElement>("[data-p]");
        const read = pick("[data-read]");
        const card = pick("[data-card]");
        const digits = pick("[data-fact-digits]");
        const factCaps = s<HTMLElement>("[data-fact-cap]");
        const bars = s<HTMLElement>("[data-bar]");
        const hearts = s<HTMLElement>("[data-heart]");
        const photo = pick("[data-photo]");
        const caption = pick("[data-caption]");
        const wash = pick("[data-wash]");

        if (numeral) {
          numeralRise(timeline, numeral, 0, { span: 0.5, drift: 12 });
        }
        if (heading && kicker) {
          fadeUp(timeline, kicker, 0.01, { duration: 0.12, y: 14 });
        }
        if (heading && title) {
          blurIn(timeline, title, 0.05, { duration: 0.22, blur: 10, scale: 0.97 });
        }
        paragraphs.forEach((paragraph, index) => {
          fadeUp(timeline, paragraph, 0.14 + index * 0.15, {
            duration: 0.17,
            y: 24,
            ease: "power2.out",
          });
        });
        if (read) {
          fadeUp(timeline, read, 0.16 + paragraphs.length * 0.15, { duration: 0.12, y: 12 });
        }
        if (card) {
          swingIn(timeline, card, 0, { duration: 0.35 });
        }
        if (digits) {
          countUp(timeline, digits, 0.06, {
            to: Number.parseFloat(digits.dataset.value ?? "0"),
            decimals: Number(digits.dataset.decimals ?? "0"),
            duration: 0.32,
          });
        }
        if (factCaps.length > 0) {
          fadeUp(timeline, factCaps, 0.3, { duration: 0.14, y: 14, stagger: 0.06 });
        }
        if (bars.length > 0) {
          linesDraw(timeline, bars, 0.4, { span: 0.31, duration: 0.15 });
        }
        if (hearts.length > 0) {
          popIn(timeline, hearts, 0.4, { duration: 0.1, stagger: 0.07 });
        }
        if (photo) {
          clipReveal(timeline, photo, 0.35, { duration: 0.25 });
        }
        if (caption) {
          fadeUp(timeline, caption, 0.6, { duration: 0.12, y: 10 });
        }
        if (flip && wash) {
          flipScheme(timeline, wash, flipInk(stage), 0.08, { span: 0.16, until: 0.8 });
        }
      };

      /** The three hearts beat in real time, and only while they are on screen. */
      const beatHearts = (stage: HTMLElement, collect: ScrollTrigger[]) => {
        const dots = gsap.utils.selector(stage)<HTMLElement>("[data-beat]");
        if (dots.length === 0) {
          return;
        }
        const beat = pulseHearts(dots).pause();
        loops.push(beat);
        collect.push(
          ScrollTrigger.create({
            trigger: stage,
            start: "top bottom",
            end: "bottom top",
            onToggle: (self) => (self.isActive ? beat.play() : beat.pause()),
          }),
        );
      };

      /** The sources chapter is plain flow under every breakpoint. */
      const revealSources = (collect: ScrollTrigger[]) => {
        collect.push(
          ScrollTrigger.create({
            trigger: sources,
            start: "top 80%",
            once: true,
            onEnter: contextSafe(() => {
              fadeUp(gsap.timeline(), sourceItems, 0, {
                duration: 0.6,
                y: 22,
                stagger: 0.07,
              });
            }),
          }),
        );
        const speaking = ScrollTrigger.create({
          trigger: sources,
          start: "top 60%",
          // To the top, not the fold: the chapter is short enough that its
          // bottom clears the viewport long before the reader has left it.
          end: "bottom top",
          onToggle: recount,
        });
        collect.push(speaking);
        probes.push({ trigger: speaking, chapter: CHAPTERS.length });
      };

      const unwatch = watchPageTransition(root, {
        onIdle: contextSafe(() => {
          /* ------------------------------------------------- the entrance */
          const tl = gsap.timeline();
          intro = tl;
          blurIn(tl, titleWord, 0, { duration: 1.1, blur: 26, scale: 1.06 });
          fadeUp(tl, titleCap, 0.6, { duration: 0.7, y: 14 });
          // The photograph's first, slow push-in. It rides its own wrapper so
          // it never argues with the scrubbed pull-back on the picture itself.
          tl.to(titlePush, { scale: 1, duration: 2.6, ease: "power2.out" }, 0);

          media = gsap.matchMedia();

          /* ---------------------------------------- the desktop: pin and scrub */
          media.add("(min-width: 768px)", () => {
            const local: ScrollTrigger[] = [];

            const title = pinStage(titleStage, titlePin, {
              length: TITLE_LENGTH,
              scrub: 0.6,
              onToggle: recount,
            });
            local.push(title.trigger);
            probes.push({ trigger: title.trigger, chapter: -1 });
            const t = title.timeline;
            t.fromTo(
              titlePhoto,
              { scale: 1.15, autoAlpha: 1 },
              { scale: 1, autoAlpha: 0.4, duration: 0.6, ease: "none" },
              0,
            );
            t.fromTo(titleScale, { scale: 1 }, { scale: 0.55, duration: 0.45, ease: "none" }, 0);
            progressBar(t, progress, 0);
            fadeUp(t, lead, 0.4, { duration: 0.22, y: 26 });
            splits.push(wordsLight(t, lead, 0.44, { span: 0.2 }));
            fadeUp(t, metaCells, 0.6, { duration: 0.16, y: 20, stagger: 0.06 });

            for (const stage of stages) {
              const pin = gsap.utils.selector(stage)<HTMLElement>("[data-stage-pin]")[0];
              const chapter = Number(stage.dataset.chapter);
              if (!pin) {
                continue;
              }
              const held = pinStage(stage, pin, {
                length: Number(stage.dataset.length ?? "220"),
                scrub: 0.55,
                onToggle: recount,
              });
              local.push(held.trigger);
              probes.push({ trigger: held.trigger, chapter });
              chapterTriggers[chapter] ??= held.trigger;
              scoreStage(stage, held.timeline, { heading: false, flip: true });
              beatHearts(stage, local);

              // Anything that has to be readable the moment the stage pins is
              // brought on by a trigger of its own, well before the pin.
              const s = gsap.utils.selector(stage);
              const kicker = s<HTMLElement>("[data-kicker]")[0];
              const heading = s<HTMLElement>("[data-h2]")[0];
              local.push(
                ScrollTrigger.create({
                  trigger: stage,
                  start: "top 72%",
                  once: true,
                  onEnter: contextSafe(() => {
                    const arrive = gsap.timeline();
                    if (kicker) {
                      fadeUp(arrive, kicker, 0, { duration: 0.5, y: 16 });
                    }
                    if (heading) {
                      blurIn(arrive, heading, 0.08, { duration: 0.75, blur: 12, scale: 0.97 });
                    }
                  }),
                }),
              );
            }

            revealSources(local);
            triggers.push(...local);
            document.fonts?.ready.then(() => ScrollTrigger.refresh());
            return () => {
              unpinAll(local);
              triggers = triggers.filter((trigger) => !local.includes(trigger));
              chapterTriggers.length = 0;
              probes.length = 0;
            };
          });

          /* ------------------------------------- the phone: no pins, once each */
          media.add("(max-width: 767px)", () => {
            const local: ScrollTrigger[] = [];

            // The title stage is an ordinary section: the picture sits behind
            // at its resting weight and the rest arrives with the route.
            gsap.set(titlePhoto, { autoAlpha: 0.45, scale: 1 });
            fadeUp(tl, lead, 1.1, { duration: 0.7, y: 24 });
            fadeUp(tl, metaCells, 1.4, { duration: 0.6, y: 20, stagger: 0.1 });

            for (const stage of stages) {
              const chapter = Number(stage.dataset.chapter);
              // Camouflage has nowhere to walk to and back on a phone, so the
              // section simply is the other scheme.
              const wash = gsap.utils.selector(stage)<HTMLElement>("[data-wash]")[0];
              if (wash) {
                gsap.set(wash, { autoAlpha: 1 });
                for (const run of flipInk(stage)) {
                  gsap.set(run.targets, { [run.prop ?? "color"]: run.to });
                }
              }
              local.push(
                ScrollTrigger.create({
                  trigger: stage,
                  start: "top 78%",
                  once: true,
                  onEnter: contextSafe(() => {
                    const played = gsap.timeline();
                    scoreStage(stage, played, { heading: true, flip: false });
                    played.timeScale(0.55);
                  }),
                }),
              );
              beatHearts(stage, local);
              const speaking = ScrollTrigger.create({
                trigger: stage,
                start: "top 60%",
                end: "bottom 60%",
                onToggle: recount,
              });
              local.push(speaking);
              probes.push({ trigger: speaking, chapter });
            }

            revealSources(local);
            triggers.push(...local);
            document.fonts?.ready.then(() => ScrollTrigger.refresh());
            return () => {
              unpinAll(local);
              triggers = triggers.filter((trigger) => !local.includes(trigger));
              probes.length = 0;
            };
          });
        }),
        onExiting: () => {
          intro?.kill();
          intro = null;
          settle();
        },
      });

      return () => {
        unwatch();
        intro?.kill();
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
  const meta: [string, string, string][] = [
    ["Temporal range", `${TEMPORAL_RANGE.from} – ${TEMPORAL_RANGE.to}`, TEMPORAL_RANGE.fromAge],
    ["Kingdom · Phylum", `${kingdom} · ${phylum}`, `Class ${klass}`],
    ["Order", order?.name ?? "", `Suborders ${suborders}`],
  ];

  return (
    <div ref={scope} data-page-transition className="pinned-article">
      {/* -------------------------------------------------------- the title */}
      <section data-title-stage className="relative mx-[calc(50%-50vw)]">
        <div
          data-title-pin
          className="relative w-full overflow-hidden px-6 pb-14 pt-20 text-center motion-safe:md:h-screen motion-safe:md:px-0 motion-safe:md:py-0"
        >
          <div data-title-push aria-hidden="true" className="absolute inset-0">
            {/* Wikimedia Commons serves these; next/image would need the host allow-listed for no gain here. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              data-title-photo
              src={INFOBOX_FIGURE.src}
              alt=""
              loading="eager"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          </div>
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/80"
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 top-12 hidden h-0.5 motion-safe:md:block"
          >
            <span data-progress className="block h-full w-full bg-accent" />
          </div>

          <div
            data-title-scale
            className="relative z-[1] motion-safe:md:absolute motion-safe:md:left-1/2 motion-safe:md:top-[46%] motion-safe:md:w-full motion-safe:md:-translate-x-1/2 motion-safe:md:-translate-y-1/2"
          >
            <h1
              data-title-word
              data-pin-intro
              className="m-0 font-display text-[clamp(4.5rem,16vw,15rem)] font-extrabold leading-[0.85] tracking-[-0.06em] text-foreground md:text-[clamp(4rem,min(16vw,26vh),15rem)]"
            >
              Octopus
            </h1>
            <span
              data-title-cap
              data-pin-intro
              className="mt-10 block font-sans text-[12px] font-medium uppercase tracking-[0.16em] text-foreground/75"
            >
              Order Octopoda · Leach, 1818
            </span>
          </div>

          <p
            data-lead
            className="relative z-[1] mx-auto mt-8 max-w-[70ch] font-sans text-[16px] leading-[1.5] text-muted sm:text-[19px] motion-safe:md:absolute motion-safe:md:left-1/2 motion-safe:md:top-[calc(50%+56px)] motion-safe:md:mt-0 motion-safe:md:w-full motion-safe:md:-translate-x-1/2 motion-safe:md:px-8"
          >
            {emphasise(LEAD, LEAD_EMPHASIS)}
          </p>

          <div className="relative z-[1] mt-10 grid grid-cols-1 gap-5 border-t border-line pt-4 text-left sm:grid-cols-3 motion-safe:md:absolute motion-safe:md:inset-x-8 motion-safe:md:bottom-8 motion-safe:md:mt-0">
            {meta.map(([term, name, note]) => (
              <div key={term} data-meta className="font-sans text-[13px] text-muted">
                <span className={`${TRACKED} mb-1 block text-[11px] tracking-[0.12em]`}>{term}</span>
                <b className="block font-semibold text-foreground">{name}</b>
                {note}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------- the contents */}
      <nav
        aria-label="Contents"
        className="sticky top-12 z-30 mx-[calc(50%-50vw)] border-y border-line bg-canvas/70 backdrop-blur-xl backdrop-saturate-150"
      >
        <div className="relative flex overflow-x-auto">
          {[...CHAPTERS, SOURCES_CHAPTER].map((chapter, index) => (
            <button
              key={chapter.id}
              type="button"
              data-rail-cell
              onClick={() => jump.current(index)}
              className="flex flex-none items-center gap-2.5 border-r border-line px-4 py-[15px] font-sans text-[13px] text-muted transition-colors last:border-r-0 hover:text-foreground md:flex-1"
            >
              <b className="font-semibold text-foreground">{index + 1}</b>
              <span className="whitespace-nowrap">{chapter.short}</span>
            </button>
          ))}
          <span
            data-rail-underline
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-0 h-0.5 bg-accent"
          />
        </div>
      </nav>

      {/* ----------------------------------------------------- the chapters */}
      {STAGES.map(({ chapter, subsection, index }) => (
        <ChapterStage
          key={subsection.id}
          chapter={chapter}
          subsection={subsection}
          chapterIndex={index}
        />
      ))}

      {/* ------------------------------------------------------ the sources */}
      <section
        id={SOURCES_CHAPTER.id}
        data-sources
        className="mt-24 scroll-mt-[120px] border-t border-line pt-14 sm:mt-32"
      >
        <p data-source-item data-pin-intro className={KICKER}>
          {SOURCES_CHAPTER.number} · {SOURCES_CHAPTER.title}
        </p>
        <h2
          data-source-item
          data-pin-intro
          className="mt-4 font-display text-[clamp(2.25rem,4vw,3.5rem)] font-bold leading-[1.02] tracking-[-0.04em]"
        >
          Where this came from.
        </h2>
        <dl className="mt-10 grid max-w-[760px] grid-cols-1 gap-x-10 gap-y-0 sm:grid-cols-[160px_1fr]">
          {(
            [
              [
                "Source",
                <a
                  key="src"
                  href={SOURCE.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:underline"
                >
                  Octopus, Wikipedia
                </a>,
              ],
              [
                "Licence",
                <a
                  key="lic"
                  href={SOURCE.licenseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-accent hover:underline"
                >
                  {SOURCE.license}
                </a>,
              ],
              ["Citations", String(SOURCE.citations)],
              ["Languages", String(SOURCE.languages)],
              ["Retrieved", SOURCE.retrieved],
              [
                "Photographs",
                "Wikimedia Commons, under the licences named on each file page.",
              ],
              [
                "See also",
                <span key="see">
                  {SEE_ALSO.map((entry, index) => (
                    <Fragment key={entry}>
                      {index > 0 && <span aria-hidden="true"> · </span>}
                      <a
                        href={`https://en.wikipedia.org/wiki/${encodeURIComponent(entry.replace(/ /g, "_"))}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-accent hover:underline"
                      >
                        {entry}
                      </a>
                    </Fragment>
                  ))}
                </span>,
              ],
            ] as [string, ReactNode][]
          ).map(([term, detail]) => (
            <Fragment key={term}>
              <dt
                data-source-item
                data-pin-intro
                className={`${TRACKED} border-t border-line pb-1 pt-4 sm:pb-4`}
              >
                {term}
              </dt>
              <dd
                data-source-item
                data-pin-intro
                className="m-0 pb-4 font-sans text-[16px] text-muted sm:border-t sm:border-line sm:pt-4"
              >
                {detail}
              </dd>
            </Fragment>
          ))}
        </dl>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------- pieces */

function ChapterStage({
  chapter,
  subsection,
  chapterIndex,
}: {
  chapter: Chapter;
  subsection: Subsection;
  chapterIndex: number;
}) {
  const count = subsection.paragraphs.length;
  const set = density(count);
  const solo = !subsection.fact && !subsection.figure;

  return (
    <section
      id={subsection.id}
      data-stage
      data-chapter={chapterIndex}
      data-length={stageLength(count)}
      className="relative mx-[calc(50%-50vw)] scroll-mt-[120px]"
    >
      <div
        data-stage-pin
        className="relative isolate w-full overflow-hidden px-6 py-16 motion-safe:md:flex motion-safe:md:h-screen motion-safe:md:flex-col motion-safe:md:justify-center motion-safe:md:px-0 motion-safe:md:pb-8 motion-safe:md:pt-24"
      >
        {subsection.inverted && (
          <span
            data-wash
            aria-hidden="true"
            className="absolute inset-0 z-0 bg-[var(--flip-canvas)] opacity-0"
          />
        )}
        <b
          data-numeral
          aria-hidden="true"
          className="pinned-numeral pointer-events-none absolute bottom-[2vh] right-[4vw] z-0 font-display text-[7rem] font-extrabold leading-[0.8] tracking-[-0.08em] md:text-[clamp(9rem,min(26vw,42vh),23.75rem)]"
        >
          {Number(chapter.number)}
        </b>
        <div
          className={`relative z-[1] grid w-full items-center gap-10 md:gap-[5vw] md:px-[6vw] ${solo ? "" : set.columns}`}
        >
          <div className={`order-2 md:order-1 ${solo ? "mx-auto max-w-[60ch]" : ""}`}>
            <p data-kicker data-pin-intro className={KICKER}>
              {chapter.number} · {chapter.title}
            </p>
            <h2
              data-h2
              data-pin-intro
              className={`mt-4 text-balance font-display font-bold leading-[1.02] tracking-[-0.04em] ${set.heading}`}
            >
              {subsection.title}
            </h2>
            {subsection.paragraphs.map((paragraph, index) => (
              <p key={index} data-p className={`${set.gap} font-sans text-muted ${set.body}`}>
                {paragraph}
              </p>
            ))}
            <a
              data-read
              href={`${SOURCE.url}#${subsection.anchor}`}
              target="_blank"
              rel="noreferrer"
              className={`${TRACKED} mt-6 inline-block hover:text-accent`}
            >
              Read on Wikipedia ↗
            </a>
          </div>

          {!solo && (
            <div className="order-1 flex justify-center md:order-2">
              {subsection.fact ? (
                <FactCard fact={subsection.fact} figure={subsection.figure} />
              ) : (
                subsection.figure && <Plate figure={subsection.figure} />
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** The stage's one object: a number in the gradient, its caption, and its bars. */
function FactCard({ fact, figure }: { fact: Fact; figure: Figure | undefined }) {
  const [caption, line] = splitLabel(fact.label);
  const decimals = (fact.value.split(".")[1] ?? "").length;
  return (
    <div data-card className="pinned-card w-full max-w-[520px] p-7 md:p-[clamp(20px,3.2vh,36px)]">
      <b className="pinned-gradient block font-display text-[4.5rem] font-extrabold leading-[0.9] tracking-[-0.06em] tabular-nums md:text-[clamp(3.4rem,min(9vw,13.5vh),7.5rem)]">
        <span data-fact-digits data-value={fact.value} data-decimals={decimals}>
          {fact.value}
        </span>
        {fact.unit && <small className="text-[0.37em] font-bold">{fact.unit}</small>}
      </b>
      <span data-fact-cap className={`${TRACKED} mt-[18px] block`}>
        {caption}
      </span>
      {line && (
        <em data-fact-cap className="mt-1.5 block font-sans text-[17px] not-italic leading-[1.35]">
          {line}
        </em>
      )}
      {fact.hearts ? (
        // Three hearts: the systemic one, then the two branchial.
        <div aria-hidden="true" className="mt-6 flex gap-3">
          {[0, 1, 2].map((index) => (
            <span key={index} data-heart className="block">
              <i
                data-beat
                className={`block h-[22px] w-[22px] rounded-full ${index === 0 ? "bg-foreground" : "bg-glow-pink"}`}
              />
            </span>
          ))}
        </div>
      ) : (
        <div aria-hidden="true" className="mt-5 flex gap-2">
          {["bg-foreground", "bg-glow-pink", "bg-glow-pink"].map((fill, index) => (
            <i key={index} data-bar className={`h-1.5 flex-1 rounded-full ${fill}`} />
          ))}
        </div>
      )}
      {figure && (
        <figure className="m-0">
          {/* The wipe runs on the frame, not the picture: an <img> that is
              clipped away has nothing to paint and the browser is in no hurry
              to fetch it. */}
          <div data-photo className="mt-5 overflow-hidden rounded-xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={figure.src}
              alt={figure.alt}
              loading="lazy"
              referrerPolicy="no-referrer"
              className="block aspect-video w-full object-cover md:max-h-[30vh]"
            />
          </div>
          <figcaption data-caption className={`${CAPTION} mt-3`}>
            {figure.caption}
          </figcaption>
        </figure>
      )}
    </div>
  );
}

/** A photograph, framed as the stage's object in its own right. */
function Plate({ figure }: { figure: Figure }) {
  return (
    <figure data-card data-plate className="pinned-plate m-0 w-full max-w-[520px] p-3.5">
      <div data-photo className="overflow-hidden rounded-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={figure.src}
          alt={figure.alt}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="block aspect-video w-full object-cover md:max-h-[36vh]"
        />
      </div>
      <figcaption data-caption className={`${CAPTION} mt-3 px-1.5 pb-1`}>
        {figure.caption}
      </figcaption>
    </figure>
  );
}
