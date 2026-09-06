"use client";

import { Fragment, useRef } from "react";
import {
  gsap,
  prefersReducedMotion,
  ScrollTrigger,
  SplitText,
  useGSAP,
} from "@/components/motion";
import {
  bubbleIn,
  countUp,
  crtBoot,
  cursorBlink,
  heartbeatLoop,
  polaroidToss,
  punchIn,
  scanlineDrift,
  shake,
  slapDown,
  tabsRise,
  typeOut,
  wobble,
  wordsSlapIn,
  type TypeRun,
} from "@/lib/animation/effects/strongbad";
import { watchPageTransition } from "@/lib/animation/pageState";
import {
  CHAPTERS,
  INFOBOX_FIGURE,
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
 * The article, as an sbemail.
 *
 * Above the horizon it is all sky: the order on a yellow pill, OCTO / PUS
 * stickered on in two lines, three fact cards, and the Compy 386 sitting
 * beside them with the lead of the article on its screen, rewritten as an
 * email Strong Bad has decided to answer. On the black bar under all that
 * stand eight tabs, one per chapter, and the one you are reading is the
 * yellow one. Below the bar the page is grass, and every chapter is a giant
 * red numeral slapped onto it with a white card talking beside it. Between
 * the chapters, the facts: red boxing gloves with a number in the mitt
 * punching a yellow card, and photographs taped down like polaroids.
 *
 * Motion, all of it slapstick and all of it from lib/animation/effects/strongbad:
 *  - the hero waits for the route to reach idle, then the kicker and both
 *    title lines are slapped down, the fact cards pop out one after another,
 *    the Compy bubbles in, its screen boots on a line of light, and the three
 *    blocks of green text type themselves out at three different speeds. The
 *    tabs come up from behind the bar last.
 *  - every chapter plays once as it scrolls in: the numeral lands hard enough
 *    to shake the section, the pill and the card bubble out of the tail, the
 *    heading arrives a word at a time, the dots pop, the prose comes up, and
 *    Strong Bad's line types itself onto its scrap of glass.
 *  - a fact row is a punch: the glove comes in from off the left edge, the
 *    card squashes and rumbles, and the number counts up inside the mitt.
 *    Photographs are tossed on and taped down. Hearts beat only while they
 *    are on screen.
 *  - nothing then sits still: every numeral and the live tab wobble, the
 *    scanlines drift down the glass and the block cursor blinks.
 * Reduced motion snaps the whole page to its settled state and starts no loops.
 */

/* ----------------------------------------------------------------- copy */

/** Strong Bad's line at the foot of every chapter's card. */
const ASIDES: Record<string, string> = {
  etymology: 'If you say "octopi" I will personally come to your house. — SB',
  anatomy: "Three hearts and it STILL won't email me back.",
  "life-cycle": "Mates once, then dies. That is a rough inbox.",
  habitat: "Every ocean, no lakes. The dude has standards.",
  behaviour: "It opens jars. Homestar cannot open a door.",
  evolution: "170 million years old and still no email address.",
  humans: "People eat these. I respect the audacity.",
  sources: "I read the whole thing. On the Compy. Gloves on.",
};

/*
 * The headline on a chapter's card. Wikipedia's own section title is already
 * on the black pill beside the numeral, so the card gets to shout something
 * shorter instead, the way the mockup does with "Eight feet, three plurals"
 * and "A body without a skeleton".
 */
const HEADLINES: Record<string, string> = {
  etymology: "Eight feet, three plurals",
  anatomy: "A body without a skeleton",
  "life-cycle": "One shot at this",
  habitat: "Every ocean, every depth",
  behaviour: "Smarter than it looks",
  evolution: "Older than everything",
  humans: "Us and the dude",
};

/** A run of screen text, in one of the two voices the phosphor has. */
type Segment = { text: string; tone?: "dim" | "hi" };

const CRT_HEAD: Segment[] = [
  { text: "Compy 386 — animaxxipedia.exe — octopus.txt", tone: "dim" },
];

const CRT_LETTER: Segment[] = [
  { text: "Dear Strong Bad,", tone: "hi" },
  { text: "\nWhat even is an octopus?\n" },
  { text: "— Curious in Cephalopodville", tone: "dim" },
];

/*
 * The answer. The mockup's copy, word for word, with the lead's emphasised
 * words carried over as the bright phosphor: eight-limbed, 300 species,
 * squeeze, intelligent.
 */
const CRT_REPLY: Segment[] = [
  { text: ">", tone: "hi" },
  { text: " Ok, listen up. An octopus is a soft-bodied, " },
  { text: "eight-limbed", tone: "hi" },
  { text: " mollusc of the order Octopoda. Some " },
  { text: "300 species", tone: "hi" },
  {
    text:
      " share the class Cephalopoda with squid, cuttlefish and nautiloids. Two eyes and a beaked mouth sit in the middle of eight limbs, and the whole dude can ",
  },
  { text: "squeeze", tone: "hi" },
  { text: " through a gap way smaller than itself. It swims backwards on a jet of water. Also it is " },
  { text: "intelligent", tone: "hi" },
  { text: ". Like, smarter than Homestar. Easily." },
];

/* -------------------------------------------------------------- helpers */

const GRID = "grid grid-cols-1 gap-6 md:grid-cols-[3fr_7fr_2fr] md:gap-8";
const FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus";

/** Wikipedia's fragment for a subsection, for the source link. */
function sourceHref(anchor: string): string {
  return `${SOURCE.url}#${anchor}`;
}

function wikiHref(title: string): string {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
}

/**
 * The Commons file behind a thumbnail URL, so every photograph can carry its
 * credit back to the file page it came from. Same walk as the early web
 * article's, since the URLs are the same shape.
 */
function commonsFile(src: string): string {
  const tail = src.split("/commons/")[1] ?? "";
  const segments = tail.split("/");
  const name = segments[0] === "thumb" ? segments[3] : segments[2];
  try {
    return decodeURIComponent(name ?? "");
  } catch {
    return name ?? "";
  }
}

function commonsHref(src: string): string {
  return `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(commonsFile(src))}`;
}

/**
 * "Hearts. The main one stops when it swims." becomes a caption and a line.
 * The line is a sentence in its own right by the time it is printed, so it
 * starts with a capital even where the label ran it on after a comma.
 */
function splitLabel(label: string): [string, string | null] {
  const match = /^(.+?)(?:\.|,)\s+(.+)$/.exec(label);
  if (!match) {
    return [label, null];
  }
  const line = match[2] ?? "";
  return [match[1] ?? label, line ? `${line[0]?.toUpperCase() ?? ""}${line.slice(1)}` : null];
}

/**
 * A caption splits across the bottom of the polaroid: what it is on the left,
 * where it was taken on the right. Only a caption that is actually built that
 * way is split, though. A caption that runs to a second sentence, or whose
 * tail is a list rather than a place, stays in one piece on the left.
 */
function splitCaption(caption: string): [string, string] {
  const at = caption.indexOf(",");
  if (at < 0 || /\.\s/.test(caption)) {
    return [caption, ""];
  }
  const tail = caption.slice(at + 1).trim();
  return tail.length > 36 ? [caption, ""] : [caption.slice(0, at), tail];
}

/**
 * How wide a polaroid may be. A tall photograph printed 640px wide would run
 * a thousand pixels down the grass, so the width is capped by the height the
 * plate is allowed rather than only by the column.
 */
function plateWidth(aspect: string): number {
  const [w, h] = aspect.split("/").map((part) => Number.parseFloat(part));
  const ratio = w && h ? w / h : 1.5;
  return Math.min(640, Math.round(460 * ratio));
}

/** Plate numbers: the infobox photograph first, then every figure in reading order. */
const FIGURE_ORDER = new Map<Figure, number>([[INFOBOX_FIGURE, 1]]);
CHAPTERS.forEach((chapter) =>
  chapter.subsections.forEach((subsection) => {
    if (subsection.figure) {
      FIGURE_ORDER.set(subsection.figure, FIGURE_ORDER.size + 1);
    }
  }),
);

function Segments({ items }: { items: Segment[] }) {
  return (
    <Fragment>
      {items.map((segment, index) =>
        segment.tone ? (
          <span
            // Runs of screen text have no identity but their order, which is fixed.
            // biome-ignore lint/suspicious/noArrayIndexKey: static copy
            key={index}
            className={segment.tone === "hi" ? "sb-hi" : "sb-dim"}
          >
            {segment.text}
          </span>
        ) : (
          // biome-ignore lint/suspicious/noArrayIndexKey: static copy
          <Fragment key={index}>{segment.text}</Fragment>
        ),
      )}
    </Fragment>
  );
}

/* ------------------------------------------------------------ the page */

export function StrongBadArticle() {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    (_context, contextSafe) => {
      const root = scope.current;
      if (!root || !contextSafe) {
        return;
      }
      const q = gsap.utils.selector(root);
      const one = (selector: string) => q<HTMLElement>(selector)[0] ?? null;
      const hidden = q<HTMLElement>("[data-sb-art-intro]");

      if (prefersReducedMotion()) {
        // Everything settled at once: no slapping, no typing, no loops.
        gsap.set(hidden, { autoAlpha: 1, clearProps: "transform" });
        return;
      }

      let sequence: gsap.core.Timeline | null = null;
      let splits: SplitText[] = [];
      let runs: TypeRun[] = [];
      let loops: (gsap.core.Tween | gsap.core.Timeline)[] = [];
      let triggers: ScrollTrigger[] = [];
      let tabWobble: gsap.core.Tween | null = null;
      let refresh: gsap.core.Tween | null = null;
      let unwireImages: (() => void) | null = null;

      const settle = () => {
        unwireImages?.();
        unwireImages = null;
        refresh?.kill();
        refresh = null;
        tabWobble?.kill();
        tabWobble = null;
        for (const loop of loops.splice(0)) {
          loop.kill();
        }
        for (const trigger of triggers.splice(0)) {
          trigger.kill();
        }
        for (const run of runs.splice(0)) {
          run.revert();
        }
        for (const split of splits.splice(0)) {
          split.revert();
        }
      };

      /*
       * A chapter's numeral, played once when the chapter arrives. It is its
       * own trigger rather than part of the first card's, because the numeral
       * stands in a column that rides the whole chapter down and the cards
       * beside it each arrive on their own.
       */
      const playNumeral = (section: HTMLElement) => {
        const s = gsap.utils.selector(section);
        const tl = gsap.timeline();
        const numeral = s<HTMLElement>("[data-numeral]")[0];
        const pill = s<HTMLElement>("[data-pill]")[0];
        if (!numeral) {
          return tl;
        }
        slapDown(tl, numeral, 0, { from: 2.4, rotate: -14, duration: 0.32, shadow: "text" });
        // The landing is hard enough to move the ground it lands on. Only the
        // chapter's first beat gets this; the cards after it arrive quietly.
        shake(tl, section, 0.32, { amount: 10, duration: 0.4 });
        if (pill) {
          bubbleIn(tl, pill, 0.5, { origin: "0% 50%", duration: 0.6, rotate: -6 });
        }
        tl.call(
          () => {
            const idle = wobble(numeral, { angle: 1.6, duration: 3.2 });
            if (idle) {
              loops.push(idle);
            }
          },
          undefined,
          1.4,
        );
        return tl;
      };

      /*
       * One scene, played once when it arrives. A card, a fact row and a
       * photograph are all scenes; each one asks for the pieces it might have
       * and skips whatever it does not.
       */
      const playScene = (scene: HTMLElement) => {
        const s = gsap.utils.selector(scene);
        const tl = gsap.timeline();
        // A scene is sometimes the piece itself rather than a wrapper round it.
        const self = (selector: string): HTMLElement | undefined =>
          scene.matches(selector) ? scene : s<HTMLElement>(selector)[0];
        const card = self("[data-card]");
        const heading = s<HTMLElement>("[data-h2]")[0];
        const dots = s<HTMLElement>("[data-dot]");
        const paragraphs = s<HTMLElement>("[data-p]");
        const aside = s<HTMLElement>("[data-aside]")[0];
        const glove = s<HTMLElement>("[data-glove]")[0];
        const gloveNumber = s<HTMLElement>("[data-glove-num]")[0];
        const label = s<HTMLElement>("[data-fact-label]")[0];
        const polaroid = self("[data-polaroid]");
        const tape = s<HTMLElement>("[data-tape]")[0];

        if (card) {
          bubbleIn(tl, card, 0, { origin: "0px 48px", duration: 0.68, rotate: -2 });
        }
        if (heading) {
          const split = SplitText.create(heading, { type: "words", aria: "auto" });
          splits.push(split);
          tl.set(heading, { autoAlpha: 1 }, 0.18);
          wordsSlapIn(tl, split.words, 0.18);
        }
        if (dots.length > 0) {
          slapDown(tl, dots, 0.36, { from: 2.6, rotate: -20, duration: 0.26, stagger: 0.07 });
        }
        if (paragraphs.length > 0) {
          tl.fromTo(
            paragraphs,
            { autoAlpha: 0, y: 18, willChange: "transform, opacity" },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.45,
              ease: "power3.out",
              stagger: 0.06,
              clearProps: "transform,willChange",
            },
            0.4,
          );
        }
        if (aside) {
          const run = typeOut(tl, aside, 0.8, { cps: 42 });
          if (run) {
            runs.push(run);
          }
        }
        if (glove && label) {
          // The card is already lying there; the glove is what arrives.
          tl.set(label, { autoAlpha: 1 }, 0);
          punchIn(tl, glove, label, 0.05, {
            from: "left",
            distance: 900,
            duration: 0.3,
            amount: 9,
          });
          countUp(tl, gloveNumber ?? null, 0.35, gloveNumber?.dataset.value ?? "0", {
            duration: 0.85,
          });
        }
        if (polaroid) {
          polaroidToss(tl, polaroid, tape ?? null, 0, { distance: 140, rotate: 11 });
        }
        return tl;
      };

      const unwatch = watchPageTransition(root, {
        onIdle: contextSafe(() => {
          const tl = gsap.timeline();
          sequence = tl;

          const kicker = one("[data-kicker]");
          const titles = q<HTMLElement>("[data-title-line]");
          const metas = q<HTMLElement>("[data-meta]");
          const compy = one("[data-compy]");
          const crt = one("[data-crt]");
          const head = one("[data-crt-head]");
          const letter = one("[data-crt-letter]");
          const reply = one("[data-crt-reply]");
          const caret = one("[data-crt-cursor]");
          const tabs = q<HTMLElement>("[data-toc-tab]");

          // The sky.
          if (kicker) {
            slapDown(tl, kicker, 0, { from: 2, rotate: -10, duration: 0.3, shadow: "box" });
          }
          if (titles.length > 0) {
            slapDown(tl, titles, 0.14, {
              from: 2.3,
              rotate: -9,
              duration: 0.34,
              stagger: 0.14,
              shadow: "text",
            });
          }
          if (metas.length > 0) {
            bubbleIn(tl, metas, 0.7, { origin: "0% 100%", duration: 0.62, stagger: 0.09 });
          }
          if (compy) {
            bubbleIn(tl, compy, 0.35, { origin: "100% 50%", duration: 0.8, rotate: 3 });
          }
          crtBoot(tl, crt, 0.55);

          /*
           * The screen, strictly one thing at a time: the machine names the
           * file, the letter is read out, a beat, and then Strong Bad answers
           * it faster and harder than it was asked. Each block's start is the
           * end of the one before, worked out from how many characters it has
           * and how quickly they arrive, because two blocks typing at once
           * reads as two people talking over each other.
           */
          const HEAD_CPS = 90;
          const LETTER_CPS = 40;
          /*
           * The answer is 440 characters long, so the rate is what decides
           * how long the hero holds a half-empty screen: at 60 it would still
           * be typing eleven seconds in. Ninety-five is as fast as it can go
           * and still read as a person hammering a keyboard.
           */
          const REPLY_CPS = 95;
          const length = (el: HTMLElement | null) => el?.textContent?.length ?? 0;
          const headAt = 0.9;
          const letterAt = headAt + length(head) / HEAD_CPS + 0.2;
          const replyAt = letterAt + length(letter) / LETTER_CPS + 0.4;
          const typed = [
            typeOut(tl, head, headAt, { cps: HEAD_CPS }),
            typeOut(tl, letter, letterAt, { cps: LETTER_CPS }),
            typeOut(tl, reply, replyAt, { cps: REPLY_CPS, cursor: caret }),
          ];
          for (const run of typed) {
            if (run) {
              runs.push(run);
            }
          }

          if (tabs.length > 0) {
            tabsRise(tl, tabs, 1.2, { stagger: 0.06, distance: 34 });
          }

          // Then the glass never settles down again.
          tl.call(
            () => {
              const drift = scanlineDrift(crt);
              if (drift) {
                loops.push(drift);
              }
              const blink = cursorBlink(caret);
              if (blink) {
                loops.push(blink);
              }
            },
            undefined,
            2.6,
          );

          // A chapter's numeral lands as the chapter arrives.
          triggers = q<HTMLElement>("[data-numeral-scene]").map((section) =>
            ScrollTrigger.create({
              trigger: section,
              start: "top 85%",
              once: true,
              onEnter: contextSafe(() => {
                playNumeral(section);
              }),
            }),
          );

          // Scenes below the horizon play as they arrive, once each.
          const sceneTriggers = q<HTMLElement>("[data-scene]").map((scene) =>
            ScrollTrigger.create({
              trigger: scene,
              start: "top 85%",
              once: true,
              onEnter: contextSafe(() => {
                playScene(scene);
              }),
            }),
          );
          triggers.push(...sceneTriggers);

          /*
           * Hearts beat only while they are on the screen. The loop is built
           * on the way in and thrown away on the way out, so nothing is
           * ticking over in a part of the page nobody is looking at.
           */
          for (const row of q<HTMLElement>("[data-hearts]")) {
            const hearts = gsap.utils.toArray<HTMLElement>("[data-heart]", row);
            if (hearts.length === 0) {
              continue;
            }
            let beat: gsap.core.Timeline | null = null;
            triggers.push(
              ScrollTrigger.create({
                trigger: row,
                start: "top 92%",
                end: "bottom 8%",
                onToggle: (self) => {
                  if (self.isActive && !beat) {
                    beat = heartbeatLoop(hearts);
                    return;
                  }
                  if (!self.isActive && beat) {
                    beat.kill();
                    beat = null;
                    gsap.set(hearts, { clearProps: "transform" });
                  }
                },
              }),
            );
          }

          /*
           * The contents strip follows the reading. Only one tab is yellow,
           * and only that one rocks; the rest stand a few pixels lower on
           * the bar, which is the stylesheet's job, not this one's.
           */
          const marks = q<HTMLElement>("[data-toc-tab]");
          let live = -1;
          const light = (index: number) => {
            if (index === live) {
              return;
            }
            const previous = marks[live];
            if (previous) {
              tabWobble?.kill();
              gsap.set(previous, { clearProps: "transform" });
            }
            live = index;
            marks.forEach((tab, position) => {
              tab.dataset.on = position === index ? "true" : "false";
            });
            const current = marks[index];
            if (current) {
              tabWobble = wobble(current, { angle: 2.4, duration: 2.2 });
            }
          };
          light(0);
          q<HTMLElement>("[data-chapter-anchor]").forEach((section, index) => {
            triggers.push(
              ScrollTrigger.create({
                trigger: section,
                start: "top 55%",
                end: "bottom 55%",
                onEnter: () => light(index),
                onEnterBack: () => light(index),
              }),
            );
          });

          /*
           * Faces and photographs both land after the first layout, and both
           * move every trigger below them. Measure again when they do, once,
           * however many of them arrive at the same moment.
           */
          const measure = () => {
            refresh?.kill();
            refresh = gsap.delayedCall(0.25, () => ScrollTrigger.refresh());
          };
          document.fonts?.ready.then(measure);
          const images = q<HTMLImageElement>("img");
          for (const image of images) {
            image.addEventListener("load", measure);
            image.addEventListener("error", measure);
          }
          unwireImages = () => {
            for (const image of images) {
              image.removeEventListener("load", measure);
              image.removeEventListener("error", measure);
            }
          };
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
  const suborders = TAXONOMY.find((row) => row.rank === "Suborders");
  const klass = TAXONOMY.find((row) => row.rank === "Class")?.name ?? "Cephalopoda";
  const kingdom = TAXONOMY.find((row) => row.rank === "Kingdom")?.name ?? "Animalia";
  const phylum = TAXONOMY.find((row) => row.rank === "Phylum")?.name ?? "Mollusca";
  const tabs = [...CHAPTERS, SOURCES_CHAPTER];

  return (
    <div ref={scope} className="sb-art">
      {/* ------------------------------------------------------------- sky */}
      <header
        data-page-transition
        className="grid items-center gap-8 pt-4 lg:grid-cols-[5fr_6fr] lg:gap-8 lg:pt-9"
      >
        <div>
          <span data-kicker data-sb-art-intro className="sb-kick mb-4 [rotate:-2deg]">
            Order {order?.name ?? "Octopoda"} · {order?.note ?? "Leach, 1818"} · sbemail #8
          </span>
          <h1 className="sb-sticker sb-art-title">
            <span data-title-line data-sb-art-intro>
              Octo
            </span>
            <span data-title-line data-sb-art-intro>
              pus
            </span>
          </h1>
          <div className="mt-6 flex flex-wrap gap-2.5">
            <div data-meta data-sb-art-intro className="sb-art-meta">
              <span>Temporal range</span>
              <b>
                {TEMPORAL_RANGE.from} – {TEMPORAL_RANGE.to}
              </b>
              <br />
              {TEMPORAL_RANGE.fromAge}
            </div>
            <div data-meta data-sb-art-intro className="sb-art-meta">
              <span>Kingdom · Phylum</span>
              <b>
                {kingdom} · {phylum}
              </b>
              <br />
              Class {klass}
            </div>
            <div data-meta data-sb-art-intro className="sb-art-meta">
              <span>Order</span>
              <b>{order?.name ?? "Octopoda"}</b>
              <br />
              Suborders {suborders?.name ?? "Cirrina, Incirrina"}
            </div>
          </div>
        </div>

        <div data-compy data-sb-art-intro className="sb-art-compy">
          <div data-crt className="sb-crt px-4 pt-4 pb-5 sm:px-[22px] sm:pt-5 sm:pb-6">
            <pre className="sb-phosphor sb-art-pre">
              <span data-crt-head data-sb-art-intro>
                <Segments items={CRT_HEAD} />
              </span>
              {"\n\n"}
              <span data-crt-letter data-sb-art-intro>
                <Segments items={CRT_LETTER} />
              </span>
              {"\n\n"}
              <span data-crt-reply data-sb-art-intro>
                <Segments items={CRT_REPLY} />
              </span>
              <i aria-hidden="true" data-crt-cursor className="sb-cursor ml-[2px]" />
            </pre>
          </div>
          <span className="sb-art-brand">
            <b>COMPY</b> 386
          </span>
          <span aria-hidden="true" className="sb-art-vents">
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
        </div>
      </header>

      {/* -------------------------------------------------- tabs on the bar */}
      <nav data-page-transition aria-label="Contents" className="sb-art-toc mt-11">
        {tabs.map((chapter, index) => (
          <a
            key={chapter.id}
            href={`#${chapter.id}`}
            data-toc-tab
            data-sb-art-intro
            data-on={index === 0 ? "true" : "false"}
            className={`sb-tab ${FOCUS}`}
          >
            <b>{index + 1}</b>
            <span>{chapter.short}</span>
          </a>
        ))}
      </nav>

      {/* ---------------------------------------------------------- ground */}
      <div className="sb-art-ground -mb-16 pb-16 sm:pb-24">
        {/* The opening plate stands on the same three columns a chapter does. */}
        <div className={`${GRID} pt-9`}>
          <div aria-hidden="true" />
          <PhotoRow figure={INFOBOX_FIGURE} />
        </div>
        {CHAPTERS.map((chapter, index) => (
          <ChapterBlock key={chapter.id} chapter={chapter} index={index} />
        ))}
        <SourcesBlock index={CHAPTERS.length} />
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- pieces */

/*
 * A chapter: one numeral, and a stack of things beside it. Every subsection
 * gets its own card, and its photograph and its fact follow that card rather
 * than being piled up at the end of the chapter, so nothing on the way down
 * the page goes more than a screen without something arriving.
 *
 * The first card carries the chapter's headline and names its subsection on
 * the yellow-dot label; the cards after it are titled by their own subsection.
 */
function ChapterBlock({ chapter, index }: { chapter: Chapter; index: number }) {
  const last = chapter.subsections.length - 1;
  const headline = HEADLINES[chapter.id] ?? chapter.title;
  return (
    <section
      id={chapter.id}
      data-numeral-scene
      data-chapter-anchor
      className={`${GRID} scroll-mt-6 pt-14 sm:pt-[72px]`}
    >
      {/*
       * The numeral rides down beside its chapter. Anatomy runs to seven
       * subsections, and without this the left column would be two and a
       * half thousand pixels of empty grass.
       */}
      <div className="relative md:sticky md:top-10 md:self-start">
        <b data-numeral data-sb-art-intro className="sb-sticker sb-art-num">
          {index + 1}
        </b>
        <span data-pill data-sb-art-intro className="sb-pill-label sb-art-pill mt-6 inline-block">
          {chapter.title}
        </span>
      </div>

      <div className="flex min-w-0 flex-col gap-9">
        {chapter.subsections.map((subsection, position) => {
          const title = position === 0 ? headline : subsection.title;
          // Only label the body where the label would say something the
          // sticker above it has not already said.
          const label = subsection.title === title ? null : subsection.title;
          return (
            <Fragment key={subsection.id}>
              <div data-scene>
                <div
                  id={subsection.id}
                  data-card
                  data-sb-art-intro
                  className="sb-card sb-tail-left sb-art-card scroll-mt-6"
                >
                  <h2 data-h2 data-sb-art-intro className="sb-sticker sb-art-h2 text-balance">
                    {title}
                  </h2>
                  {label && (
                    <h3 data-p data-sb-art-intro className="sb-art-h3 mt-0">
                      <i data-dot data-sb-art-intro aria-hidden="true" className="sb-art-dot" />
                      {label}
                    </h3>
                  )}
                  <Prose subsection={subsection} />
                  {position === last && (
                    <div data-aside data-sb-art-intro className="sb-art-aside">
                      {ASIDES[chapter.id] ?? "Yeah. That happened."}
                    </div>
                  )}
                </div>
              </div>
              {subsection.figure && <PhotoRow figure={subsection.figure} />}
              {subsection.fact && <FactRow fact={subsection.fact} />}
            </Fragment>
          );
        })}
      </div>
    </section>
  );
}

function Prose({ subsection }: { subsection: Subsection }) {
  return (
    <Fragment>
      {subsection.paragraphs.map((paragraph, index) => (
        <p
          // Paragraphs of prose have no identity but their order; it never changes.
          // biome-ignore lint/suspicious/noArrayIndexKey: static prose
          key={index}
          data-p
          data-sb-art-intro
          className="sb-art-p"
        >
          {paragraph}
        </p>
      ))}
      <p data-p data-sb-art-intro className="m-0 mb-3.5">
        <a
          href={sourceHref(subsection.anchor)}
          target="_blank"
          rel="noreferrer"
          className={`sb-art-src ${FOCUS}`}
        >
          source · wikipedia ↗
        </a>
      </p>
    </Fragment>
  );
}

/** A number in a boxing glove, punching the card that explains it. */
function FactRow({ fact }: { fact: Fact }) {
  const [caption, line] = splitLabel(fact.label);
  return (
    <div data-scene>
      <div
        {...(fact.hearts ? { "data-hearts": "" } : {})}
        className="flex flex-wrap items-center gap-5 sm:gap-6"
      >
        <div data-glove data-sb-art-intro className="sb-art-glove">
          <i aria-hidden="true" className="sb-art-glove-thumb" />
          <i className="sb-art-glove-mitt">
            <b className="sb-sticker sb-art-glove-num">
              <span data-glove-num data-value={fact.value}>
                {fact.value}
              </span>
              {fact.unit && <small>{fact.unit}</small>}
            </b>
          </i>
        </div>
        <div data-fact-label data-sb-art-intro className="sb-art-fact-label">
          {fact.hearts && (
            <span aria-label="three hearts" className="sb-art-hearts">
              <i data-heart aria-hidden="true">
                ♥
              </i>
              <i data-heart aria-hidden="true">
                ♥
              </i>
              <i data-heart aria-hidden="true">
                ♥
              </i>
            </span>
          )}
          {/*
           * A label that never split into two carries the whole of itself as
           * the line, under a kicker that just says what it is. Half a card
           * with nothing under the red type reads as a card missing a line.
           */}
          <span>{line ? caption : "Fact"}</span>
          {line ?? caption}
        </div>
      </div>
    </div>
  );
}

/** A photograph, tossed onto the grass and taped down. */
function PhotoRow({ figure }: { figure: Figure }) {
  const plate = FIGURE_ORDER.get(figure) ?? 0;
  const [what, where] = splitCaption(figure.caption);
  return (
    <div data-scene>
      <figure
        data-polaroid
        data-sb-art-intro
        data-tilt={plate % 2 === 0 ? "left" : "right"}
        className="sb-art-polaroid"
        style={{ maxWidth: plateWidth(figure.aspect) }}
      >
        <i data-tape data-sb-art-intro aria-hidden="true" className="sb-art-tape" />
        <span className="sb-art-photo" style={{ aspectRatio: figure.aspect }}>
          {/* Wikimedia Commons serves these; next/image would need the host allow-listed for no gain here. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={figure.src} alt={figure.alt} loading="lazy" referrerPolicy="no-referrer" />
        </span>
        <figcaption>
          <span className="sb-art-cap">
            <span>
              Fig. {plate} · {what}
            </span>
            {where && <span>{where}</span>}
          </span>
          <span className="sb-art-credit">
            Credit:{" "}
            <a
              href={commonsHref(figure.src)}
              target="_blank"
              rel="noreferrer"
              className={FOCUS}
            >
              {commonsFile(figure.src)}
            </a>{" "}
            · Wikimedia Commons
          </span>
        </figcaption>
      </figure>
    </div>
  );
}

/** The last chapter: where all of this came from, in tabs on a card. */
function SourcesBlock({ index }: { index: number }) {
  return (
    <section
      id={SOURCES_CHAPTER.id}
      data-numeral-scene
      data-chapter-anchor
      className={`${GRID} scroll-mt-6 pt-14 sm:pt-[72px]`}
    >
      <div className="relative md:sticky md:top-10 md:self-start">
        <b data-numeral data-sb-art-intro className="sb-sticker sb-art-num">
          {index + 1}
        </b>
        <span data-pill data-sb-art-intro className="sb-pill-label sb-art-pill mt-6 inline-block">
          {SOURCES_CHAPTER.title}
        </span>
      </div>

      <div data-scene data-card data-sb-art-intro className="sb-card sb-tail-left sb-art-card">
        <h2 data-h2 data-sb-art-intro className="sb-sticker sb-art-h2">
          Where this came from
        </h2>
        <p data-p data-sb-art-intro className="sb-art-p">
          Every word up there is a condensed retelling of the English Wikipedia article
          &ldquo;Octopus&rdquo;, and every photograph comes from Wikimedia Commons. The originals
          carry the footnotes. This page carries the boxing gloves.
        </p>
        <dl data-p data-sb-art-intro className="sb-art-dl mt-5">
          <dt>Source</dt>
          <dd>
            <a href={SOURCE.url} target="_blank" rel="noreferrer" className={FOCUS}>
              Octopus, Wikipedia
            </a>
          </dd>
          <dt>Licence</dt>
          <dd>
            <a href={SOURCE.licenseUrl} target="_blank" rel="noreferrer" className={FOCUS}>
              {SOURCE.license}
            </a>
          </dd>
          <dt>Citations</dt>
          <dd>{SOURCE.citations}</dd>
          <dt>Languages</dt>
          <dd>{SOURCE.languages}</dd>
          <dt>Retrieved</dt>
          <dd>{SOURCE.retrieved}</dd>
          <dt>Plates</dt>
          <dd>{FIGURE_ORDER.size}, all Wikimedia Commons</dd>
        </dl>

        <h3 data-p data-sb-art-intro className="sb-art-h3">
          <i data-dot data-sb-art-intro aria-hidden="true" className="sb-art-dot" />
          See also
        </h3>
        <div data-p data-sb-art-intro className="flex flex-wrap gap-2">
          {SEE_ALSO.map((title) => (
            <a
              key={title}
              href={wikiHref(title)}
              target="_blank"
              rel="noreferrer"
              className={`sb-art-linktab ${FOCUS}`}
            >
              {title}
            </a>
          ))}
        </div>

        <div data-aside data-sb-art-intro className="sb-art-aside">
          {ASIDES[SOURCES_CHAPTER.id] ?? ""}
        </div>
      </div>
    </section>
  );
}
