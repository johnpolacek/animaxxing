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
  chunkLoad,
  equalizer,
  interlaceIn,
  lcdFlicker,
  letterWave,
  linesRender,
  marquee,
  odometer,
  stampIn,
  typeIn,
} from "@/lib/animation/effects/earlyweb";
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
 * The article, 1997.
 *
 * A GeoCities page inside the Netscape window the shell draws: the
 * >>ANIMAXXIPEDIA banner over a yellow marquee, a 210px sidebar of sunken
 * boxes (contents, see also, a hit counter, award badges, a MIDI panel) and,
 * beside it, the whole encyclopedia article on a cream panel — every chapter,
 * every subsection, every figure floated in a gray bevel frame, every fact in
 * a table with a lime LCD number, and the sources chapter under a construction
 * banner. Light is the gray tiled page; dark is the same page in its starfield
 * version, the panel #101010 and the copy lime.
 *
 * Motion, all of it over a 28.8k modem:
 *  - `onIdle` loads the header region: the banner, sidebar boxes and article
 *    top arrive in bursty chunks top-to-bottom (no fades — 1997 had no
 *    compositor), the marquee starts, OCTOPUS types in one letter at a time
 *    behind a block cursor and then waves forever in rainbow, the rules draw
 *    left to right, the infobox photograph interlaces in over its gray
 *    placeholder, the hit counter's digits spin like an odometer and then roll
 *    over by one, the badges stamp on, the lead paints itself line by line,
 *    the equalizer bounces and the ✳ and NEW! blink and spin from CSS.
 *  - every chapter below loads once as it scrolls into view: the heading
 *    arrives in chunks, paragraphs render line by line, figures interlace,
 *    fact numbers flicker through random digits before landing on their value
 *    and then keep an LCD flicker, ♥♥♥ beats forever, rules draw.
 *  - scroll progress is written to `--web-scroll` and announced on a
 *    `web-scroll` CustomEvent so the shell's status bar can read
 *    "Transferring data... 43%".
 * Reduced motion snaps all of it to the settled state: visible, numbers final,
 * images loaded, status Done.
 */

/** The hit counter, before it ticks over for you. */
const VISITORS = "001818";
const EQ_BARS = [0, 1, 2, 3, 4, 5, 6, 7];

/**
 * The event the shell's status bar listens for. Fired from the article's
 * scroll ScrollTrigger on every update:
 *
 *   window.addEventListener("web-scroll", (event) => {
 *     const { progress, label } = event.detail; // 0..1, "Transferring data... 43%"
 *   });
 *
 * `--web-scroll` on <html> carries the same number for anything CSS-driven.
 * The shell may or may not consume either; both are cleaned up on exit.
 */
const SCROLL_EVENT = "web-scroll";

const ARIAL = "font-mono";
const NAVY_BAR =
  "m-0 mb-[6px] bg-[var(--web-navy)] px-[5px] py-[2px] font-mono text-[13px] font-bold text-white";
const LINK = "text-[var(--web-link)] visited:text-[var(--web-visited)]";

/** Wikipedia's fragment for a subsection, for the source link. */
function sourceHref(anchor: string): string {
  return `${SOURCE.url}#${anchor}`;
}

/** An external title link, the way the sidebar and the sources box want it. */
function wikiHref(title: string): string {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;
}

/**
 * The Commons file behind a thumbnail URL, so every photograph can carry its
 * credit back to the file page it came from.
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

/** "34 KB", stable per figure, because every 1997 caption said how long it would take. */
function weight(index: number): number {
  return 14 + ((index * 37) % 63);
}

/** "Hearts. The main one stops when it swims." becomes a label and a line. */
function splitLabel(label: string): [string, string | null] {
  const match = /^(.+?)(?:\.|,)\s+(.+)$/.exec(label);
  return match ? [match[1] ?? label, match[2] ?? null] : [label, null];
}

/** The lead's emphasised words, each in its own `<font color>` bold. */
const EMPHASIS_COLOR: Record<string, string> = {
  "eight-limbed": "var(--web-red)",
  "300": "var(--web-link)",
  squeeze: "var(--web-green)",
  intelligent: "var(--web-visited)",
};

function emphasise(text: string, words: string[]): ReactNode[] {
  const pattern = new RegExp(
    `(${words.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
  );
  return text.split(pattern).map((part, index) =>
    words.includes(part) ? (
      <b key={index} className="font-bold" style={{ color: EMPHASIS_COLOR[part] ?? "inherit" }}>
        {part}
      </b>
    ) : (
      <Fragment key={index}>{part}</Fragment>
    ),
  );
}

/** Plate numbers, the infobox first, then every figure in reading order. */
const FIGURE_ORDER = new Map<Figure, number>([[INFOBOX_FIGURE, 1]]);
CHAPTERS.forEach((chapter) =>
  chapter.subsections.forEach((subsection) => {
    if (subsection.figure) {
      FIGURE_ORDER.set(subsection.figure, FIGURE_ORDER.size + 1);
    }
  }),
);

/* --------------------------------------------------------------- motion */

/**
 * A fact's LCD landing on its number: the digits flicker through random values
 * for a moment — the way a seven-segment display settles — and then land. The
 * element carries its final value on `data-value`.
 */
function lcdCountUp(
  timeline: gsap.core.Timeline,
  el: HTMLElement | null,
  at: number,
  { duration = 0.9, steps = 12 }: { duration?: number; steps?: number } = {},
): void {
  if (!el) {
    return;
  }
  const final = el.dataset.value ?? el.textContent ?? "";
  if (prefersReducedMotion()) {
    timeline.call(
      () => {
        el.textContent = final;
      },
      undefined,
      at,
    );
    return;
  }
  const scramble = () =>
    final.replace(/\d/g, () => String(Math.floor(Math.random() * 10)));
  for (let step = 0; step < steps; step += 1) {
    timeline.call(
      () => {
        el.textContent = scramble();
      },
      undefined,
      at + (step * duration) / steps,
    );
  }
  timeline.call(
    () => {
      el.textContent = final;
    },
    undefined,
    at + duration,
  );
}

/** A two-tone rule drawing itself left to right, in visible steps. */
function drawRule(timeline: gsap.core.Timeline, el: HTMLElement | null, at: number): void {
  if (!el) {
    return;
  }
  if (prefersReducedMotion()) {
    timeline.set(el, { autoAlpha: 1, clipPath: "none" }, at);
    return;
  }
  timeline.set(el, { autoAlpha: 1 }, at);
  timeline.fromTo(
    el,
    { clipPath: "inset(0 100% 0 0)" },
    { clipPath: "inset(0 0% 0 0)", duration: 0.5, ease: "steps(12)" },
    at,
  );
}

/** ♥♥♥, beating. */
function heartbeat(hearts: HTMLElement[]): gsap.core.Tween | null {
  if (hearts.length === 0 || prefersReducedMotion()) {
    return null;
  }
  return gsap.to(hearts, {
    scale: 1.35,
    transformOrigin: "50% 60%",
    duration: 0.2,
    ease: "power1.inOut",
    repeat: -1,
    yoyo: true,
    repeatDelay: 0.55,
    stagger: { each: 0.08 },
  });
}

/* ------------------------------------------------------------ the page */

export function EarlyWebArticle() {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    (_context, contextSafe) => {
      const root = scope.current;
      if (!root || !contextSafe) {
        return;
      }
      const q = gsap.utils.selector(root);
      const one = (selector: string) => q<HTMLElement>(selector)[0] ?? null;

      const hidden = q<HTMLElement>("[data-web-intro]");
      const title = one("[data-title]");

      if (prefersReducedMotion()) {
        // Everything visible and settled at once: no bursts, no scroll gates.
        gsap.set(hidden, { autoAlpha: 1 });
        const settle = gsap.timeline();
        for (const wrapper of q<HTMLElement>("[data-fig], [data-infobox]")) {
          interlaceIn(settle, wrapper, 0);
        }
        odometer(settle, q<HTMLElement>("[data-digit]"), VISITORS, 0);
        window.dispatchEvent(
          new CustomEvent(SCROLL_EVENT, { detail: { progress: 1, label: "Document: Done" } }),
        );
        return;
      }

      let sequence: gsap.core.Timeline | null = null;
      let splits: (SplitText | null)[] = [];
      let loops: (gsap.core.Tween | gsap.core.Timeline | null)[] = [];
      let teardowns: (() => void)[] = [];
      let triggers: ScrollTrigger[] = [];
      let wave: ReturnType<typeof letterWave> | null = null;

      const settle = () => {
        for (const teardown of teardowns.splice(0)) {
          teardown();
        }
        for (const loop of loops.splice(0)) {
          loop?.kill();
        }
        for (const trigger of triggers.splice(0)) {
          trigger.kill();
        }
        wave?.tween?.kill();
        wave?.split?.revert();
        wave = null;
        for (const split of splits.splice(0)) {
          split?.revert();
        }
        document.documentElement.style.removeProperty("--web-scroll");
      };

      /** A chapter arriving, once, as it scrolls into view. */
      const playChapter = (section: HTMLElement, index: number) => {
        const s = gsap.utils.selector(section);
        const tl = gsap.timeline();

        chunkLoad(tl, s<HTMLElement>("[data-chunk]"), 0, {
          batch: 2,
          gap: 0.13,
          jitter: 0.2,
          seed: 11 + index * 5,
        });
        s<HTMLElement>("[data-rule]").forEach((rule, i) => drawRule(tl, rule, 0.15 + i * 0.12));
        s<HTMLElement>("[data-p]").forEach((paragraph, i) => {
          splits.push(linesRender(tl, paragraph, 0.3 + i * 0.16, { seed: 17 + i * 3 }));
        });
        s<HTMLElement>("[data-fig]").forEach((wrapper, i) => {
          interlaceIn(tl, wrapper, 0.5 + i * 0.3, { wait: 0.35, step: 0.22 });
        });
        s<HTMLElement>("[data-fact-value]").forEach((value, i) => {
          lcdCountUp(tl, value, 0.55 + i * 0.25);
          tl.call(
            () => {
              loops.push(lcdFlicker(value));
            },
            undefined,
            1.7 + i * 0.25,
          );
        });
        const hearts = s<HTMLElement>("[data-heart]");
        if (hearts.length > 0) {
          tl.call(
            () => {
              loops.push(heartbeat(hearts));
            },
            undefined,
            1.2,
          );
        }
        return tl;
      };

      const unwatch = watchPageTransition(root, {
        onIdle: contextSafe(() => {
          const tl = gsap.timeline();
          sequence = tl;

          // The header region comes down the wire in bursts, document order.
          chunkLoad(tl, q<HTMLElement>("[data-load]"), 0, { batch: 2, gap: 0.15, jitter: 0.22 });

          // The marquee is running before the rest of the page has arrived.
          tl.call(
            () => {
              teardowns.push(marquee(one("[data-marquee]"), { amount: 5, fps: 20 }));
            },
            undefined,
            0.35,
          );

          q<HTMLElement>("[data-head-rule]").forEach((rule, index) =>
            drawRule(tl, rule, 0.9 + index * 0.2),
          );

          // OCTOPUS types itself in. The rainbow goes back on afterwards:
          // `background-clip: text` cannot paint split characters, so the
          // gradient is moved onto each letter by `letterWave`.
          let typed: SplitText | null = null;
          if (title) {
            title.classList.remove("web-rainbow");
            typed = typeIn(tl, title, 0.8, { cps: 13 });
            splits.push(typed);
          }

          interlaceIn(tl, one("[data-infobox]"), 1.2, { wait: 0.45, step: 0.3 });
          odometer(tl, q<HTMLElement>("[data-digit]"), VISITORS, 1.35);
          splits.push(linesRender(tl, one("[data-lead]"), 1.9, { gap: 0.08 }));
          splits.push(linesRender(tl, one("[data-welcome]"), 2.5, { gap: 0.09, seed: 33 }));
          stampIn(tl, q<HTMLElement>("[data-stamp]"), 2.1);

          // Once it is all in, nothing on the page sits still again.
          tl.call(
            () => {
              if (title) {
                // Put the heading back together before splitting it again,
                // so the wave rides one layer of characters, not two.
                typed?.revert();
                typed = null;
                title.classList.add("web-rainbow");
                wave = letterWave(title, { amount: 6, rotate: 24, each: 0.06 });
              }
              teardowns.push(equalizer(q<HTMLElement>("[data-bar]")));
              loops.push(lcdFlicker(one("[data-counter]")));
            },
            undefined,
            2.3,
          );

          // Each chapter loads once, as it arrives.
          triggers = q<HTMLElement>("[data-chapter]").map((section, index) =>
            ScrollTrigger.create({
              trigger: section,
              start: "top 88%",
              once: true,
              onEnter: contextSafe(() => {
                playChapter(section, index);
              }),
            }),
          );

          // Scroll progress, for the shell's status bar.
          const progress = ScrollTrigger.create({
            trigger: root,
            start: "top top",
            end: "bottom bottom",
            onUpdate: (self) => {
              const value = self.progress;
              document.documentElement.style.setProperty("--web-scroll", value.toFixed(4));
              window.dispatchEvent(
                new CustomEvent(SCROLL_EVENT, {
                  detail: {
                    progress: value,
                    label:
                      value >= 0.999
                        ? "Document: Done"
                        : `Transferring data... ${Math.round(value * 100)}%`,
                  },
                }),
              );
            },
          });
          triggers.push(progress);
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

  const species = "c. 300";

  return (
    <div
      ref={scope}
      className="earlyweb-article font-sans text-[16px] leading-[1.4] text-foreground"
    >
      {/* ----------------------------------------------------------- banner */}
      <header data-page-transition className="px-[6px] pt-4 pb-1 text-center">
        <div
          data-web-intro
          data-load
          className="font-code text-[34px] leading-none font-bold tracking-[0.06em]"
        >
          <span className="text-[var(--web-red)]">&gt;&gt;</span>ANIMAXXIPEDIA
        </div>
        <div data-web-intro data-load className={`${ARIAL} mt-[3px] text-[12px] text-muted`}>
          The Free Online Encyclopedia on the World Wide Web!{" "}
          <span aria-hidden="true">·</span>{" "}
          <a className={LINK} href="#top">
            Article
          </a>{" "}
          |{" "}
          <a className={LINK} href={`${SOURCE.url}#Talk`} target="_blank" rel="noreferrer">
            Talk
          </a>{" "}
          |{" "}
          <a
            className={LINK}
            href="https://en.wikipedia.org/w/index.php?title=Octopus&action=history"
            target="_blank"
            rel="noreferrer"
          >
            History
          </a>{" "}
          |{" "}
          <a className={LINK} href="https://en.wikipedia.org/wiki/Special:Search" target="_blank" rel="noreferrer">
            Search
          </a>
        </div>
        <div
          data-web-intro
          data-load
          className="mt-[10px] overflow-hidden border border-black bg-[var(--web-yellow)] py-[2px]"
        >
          <div
            data-marquee
            className={`${ARIAL} flex w-max whitespace-nowrap text-[13px] font-bold text-[var(--web-navy)]`}
          >
            <span className="px-6">
              *** NOW WITH 8 SECTIONS *** OCTOPUS PAGE UPDATED 09/02/1997 *** THREE HEARTS!!! ***
              BLUE BLOOD!!! *** SIGN MY GUESTBOOK *** BEST VIEWED IN NETSCAPE 3.0 ***
            </span>
            <span className="px-6" aria-hidden="true">
              *** NOW WITH 8 SECTIONS *** OCTOPUS PAGE UPDATED 09/02/1997 *** THREE HEARTS!!! ***
              BLUE BLOOD!!! *** SIGN MY GUESTBOOK *** BEST VIEWED IN NETSCAPE 3.0 ***
            </span>
          </div>
        </div>
      </header>

      {/*
       * The 1997 layout table, as a grid: the same 210px sidebar beside the
       * article, but it stacks on a narrow screen instead of forcing a
       * horizontal scroll the way a real <table> would. Under 700px the two
       * swap with `order`, so the prose is one scroll from the banner and the
       * boxes follow it; the DOM stays sidebar-first, as the source did.
       */}
      <div
        data-page-transition
        className="grid grid-cols-1 gap-2 p-2 min-[700px]:grid-cols-[210px_minmax(0,1fr)]"
      >
        {/* -------------------------------------------------------- sidebar */}
        <div className="order-2 min-w-0 min-[700px]:order-1">
          <SideBox title="Contents">
            <ol className="m-0 list-decimal pl-[22px]">
              {[...CHAPTERS, SOURCES_CHAPTER].map((chapter, index) => (
                <li key={chapter.id} className="my-[3px]">
                  <a className={LINK} href={`#${chapter.id}`}>
                    {chapter.short}
                  </a>
                  {index === 1 && (
                    <span className={`${ARIAL} web-blink ml-1 text-[11px] font-bold text-[var(--web-red)]`}>
                      NEW!
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </SideBox>

          <SideBox title="See Also" teal>
            <ul className="m-0 list-disc pl-[18px]">
              {["Squid", "Cuttlefish", "Nautilus", "Cephalopoda", "Mollusca", ...SEE_ALSO].map(
                (title) => (
                  <li key={title} className="my-[3px]">
                    <a className={LINK} href={wikiHref(title)} target="_blank" rel="noreferrer">
                      {title}
                    </a>
                  </li>
                ),
              )}
            </ul>
          </SideBox>

          <SideBox title="Visitors">
            <div data-counter className="my-[6px] flex justify-center gap-[2px]">
              {VISITORS.split("").map((digit, index) => (
                <b
                  // Digit slots, not values: index is the only identity they have.
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length slots
                  key={index}
                  data-web-intro
                  data-digit
                  className="web-lcd text-[20px]"
                >
                  {digit}
                </b>
              ))}
            </div>
            <div className={`${ARIAL} text-center text-[11px]`}>octopus fans since 1997</div>
          </SideBox>

          <SideBox title="Awards" center>
            {[
              ["Netscape NOW!", "bg-[linear-gradient(#0a4a9a,#031f4a)] text-white"],
              ["800x600", "bg-black font-code text-[var(--web-lime)]"],
              ["Sea Life Ring", "bg-[linear-gradient(#11aaaa,#003366)] text-white"],
              ["GSAP inside", "bg-[#0ae448] text-black"],
              ["Cool Site of the Day", "bg-[linear-gradient(#ff00ff,#880088)] text-white"],
            ].map(([label, tone]) => (
              <span
                key={label}
                data-web-intro
                data-stamp
                className={`web-badge web-gleam m-[3px] ${tone}`}
              >
                {label}
              </span>
            ))}
          </SideBox>

          <SideBox title="Now playing">
            <div className={`${ARIAL} mb-[6px] text-[11px] font-bold`}>
              <span className="web-blink text-[var(--web-red)]">►</span> octopus.mid
            </div>
            <div className="flex h-[34px] items-end gap-[3px]" aria-hidden="true">
              {EQ_BARS.map((bar) => (
                <span key={bar} data-bar className="block h-full w-full bg-[var(--web-lime)]" />
              ))}
            </div>
            <div className={`${ARIAL} mt-[6px] text-[10px] text-muted`}>
              MIDI · 4.2 KB · sequenced 1997
            </div>
          </SideBox>
        </div>

        {/* -------------------------------------------------------- article */}
        <div className="order-1 min-w-0 border-[2px] border-[var(--web-light)] [border-style:inset] bg-[var(--web-cream)] px-4 pt-[14px] pb-[22px] min-[700px]:order-2 sm:px-[22px]">
          <span data-web-intro data-load className={`${ARIAL} float-right ml-3 text-[11px]`}>
            [ <TopLink /> ] [{" "}
            <a className={LINK} href="#top">
              Printer friendly
            </a>{" "}
            ] [{" "}
            <a className={LINK} href="#top">
              Text only
            </a>{" "}
            ]
          </span>

          <h1 className="m-0 mt-[6px] mb-[2px] text-[clamp(38px,8vw,54px)] leading-none font-bold">
            <span data-web-intro data-title className="web-rainbow inline-block">
              OCTOPUS
            </span>
            <small
              data-web-intro
              data-load
              className="mt-1 block text-[15px] font-normal text-accent-cool italic"
            >
              Order Octopoda · Leach, 1818 ·{" "}
              {/* The starred award breaks as one phrase, never mid-way. */}
              <span className="whitespace-nowrap">
                <span className="web-spin">✳</span> Featured Article{" "}
                <span className="web-spin">✳</span>
              </span>
            </small>
          </h1>

          <hr data-web-intro data-head-rule className="web-hr" />

          {/* The fact file, floated right the way every infobox was. */}
          <table
            data-web-intro
            data-load
            className="mb-3 w-full border-[2px] border-[var(--web-light)] [border-collapse:separate] [border-spacing:1px] [border-style:outset] bg-[var(--web-gray)] font-mono text-[13px] sm:float-right sm:ml-[18px] sm:w-[280px]"
          >
            <tbody>
              <tr>
                <th
                  colSpan={2}
                  className="bg-[var(--web-navy)] p-1 text-left font-bold text-white"
                >
                  Octopus (fact file)
                </th>
              </tr>
              <tr>
                <td colSpan={2} className="bg-surface p-[6px] text-center text-foreground">
                  <Interlaced
                    figure={INFOBOX_FIGURE}
                    attr="data-infobox"
                    kb={weight(1)}
                    className="mx-auto block max-w-[240px] border border-black"
                    eager
                  />
                  <span className="mt-1 block text-[11px]">
                    Fig. 1 — Common octopus, <i>O. vulgaris</i> ({weight(1)} KB, please wait...)
                  </span>
                  <Credit figure={INFOBOX_FIGURE} />
                </td>
              </tr>
              <InfoRow term="Temporal range">
                {TEMPORAL_RANGE.from} – {TEMPORAL_RANGE.to} ({TEMPORAL_RANGE.fromAge})
              </InfoRow>
              {TAXONOMY.map((row) => (
                <InfoRow key={row.rank} term={row.rank}>
                  {row.rank === "Order" ? <b>{row.name}</b> : row.name}
                  {row.note && <span className="text-muted"> ({row.note})</span>}
                </InfoRow>
              ))}
              <InfoRow term="Species">{species}</InfoRow>
            </tbody>
          </table>

          <p data-web-intro data-lead className="mt-0 mb-3 text-[18px]">
            {emphasise(LEAD, LEAD_EMPHASIS)}
          </p>

          <p data-web-intro data-welcome className="mt-0 mb-3 font-billing text-[14px]">
            Welcome to my Octopus Page!!! I have loved octopuses ever since I saw one at the
            aquarium in 1994. Please{" "}
            <a className={LINK} href="#sources">
              sign my guestbook
            </a>{" "}
            and check back often, I add new sections every week!!! 🐙
          </p>

          <div className="clear-both" />

          {/* ------------------------------------------------------ chapters */}
          {CHAPTERS.map((chapter, index) => (
            <ChapterBlock key={chapter.id} chapter={chapter} index={index} />
          ))}

          {/* ------------------------------------------------------- sources */}
          <section id={SOURCES_CHAPTER.id} data-chapter className="scroll-mt-6">
            <ChapterHeading
              index={CHAPTERS.length}
              title={SOURCES_CHAPTER.title}
              href={`${SOURCE.url}#References`}
            />
            <h3 data-web-intro data-chunk className={`${ARIAL} mt-[18px] mb-1 text-[16px] font-bold`}>
              Where this came from
            </h3>
            <p data-web-intro data-p className="mt-0 mb-3">
              Every word above is a condensed retelling of the English Wikipedia article
              &ldquo;Octopus&rdquo;, and every photograph comes from Wikimedia Commons. The
              originals carry the footnotes; this page carries the animated GIFs.
            </p>
            <table
              data-web-intro
              data-chunk
              className="my-3 w-full border-[2px] border-[var(--web-light)] [border-collapse:separate] [border-spacing:1px] [border-style:outset] bg-[var(--web-gray)] font-mono text-[13px]"
            >
              <tbody>
                <InfoRow term="Source">
                  <a className={LINK} href={SOURCE.url} target="_blank" rel="noreferrer">
                    Octopus, Wikipedia
                  </a>
                </InfoRow>
                <InfoRow term="Licence">
                  <a className={LINK} href={SOURCE.licenseUrl} target="_blank" rel="noreferrer">
                    {SOURCE.license}
                  </a>
                </InfoRow>
                <InfoRow term="Citations">{SOURCE.citations}</InfoRow>
                <InfoRow term="Languages">{SOURCE.languages}</InfoRow>
                <InfoRow term="Retrieved">{SOURCE.retrieved}</InfoRow>
                <InfoRow term="See also">
                  {SEE_ALSO.map((title, index) => (
                    <Fragment key={title}>
                      {index > 0 && <span aria-hidden="true"> · </span>}
                      <a className={LINK} href={wikiHref(title)} target="_blank" rel="noreferrer">
                        {title}
                      </a>
                    </Fragment>
                  ))}
                </InfoRow>
                <InfoRow term="Images">
                  {FIGURE_ORDER.size} plates, all{" "}
                  <a
                    className={LINK}
                    href="https://commons.wikimedia.org/wiki/Category:Octopoda"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Wikimedia Commons
                  </a>
                </InfoRow>
              </tbody>
            </table>

            <hr data-web-intro data-rule className="web-hr" />

            <div
              data-web-intro
              data-chunk
              className="web-stripes my-3 py-[6px] text-center"
              aria-hidden="true"
            >
              <span className={`${ARIAL} bg-[var(--web-yellow)] px-3 py-[2px] text-[12px] font-bold text-black`}>
                UNDER CONSTRUCTION
              </span>
            </div>

            <p data-web-intro data-chunk className={`${ARIAL} m-0 text-[12px] text-muted`}>
              Sections coming soon!!! <span className="web-blink">🚧</span> This page is under
              construction. Last updated: Tuesday, September 2, 1997. Source:{" "}
              <a className={LINK} href={SOURCE.url} target="_blank" rel="noreferrer">
                Wikipedia
              </a>{" "}
              ·{" "}
              <a className={LINK} href={SOURCE.licenseUrl} target="_blank" rel="noreferrer">
                {SOURCE.license}
              </a>{" "}
              · {SOURCE.citations} citations · {SOURCE.languages} languages. Retrieved{" "}
              {SOURCE.retrieved}.
            </p>
            <p data-web-intro data-chunk className={`${ARIAL} mt-2 mb-0 text-[11px]`}>
              [ <TopLink /> ]
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- pieces */

/** "[ Top ⬆ ]" — the arrow bounces out of the link on hover. */
function TopLink() {
  return (
    <a className={`${LINK} group relative`} href="#top">
      Top
      {/* Out of flow, so the link keeps its width whether or not it is hovered. */}
      <span
        aria-hidden="true"
        className="web-bounce absolute top-0 left-full ml-[3px] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        ⬆
      </span>
    </a>
  );
}

/** A sunken sidebar box under its navy (or teal) heading bar. */
function SideBox({
  title,
  teal = false,
  center = false,
  children,
}: {
  title: string;
  teal?: boolean;
  center?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      data-web-intro
      data-load
      className={`web-inset mb-2 p-2 text-[14px] ${center ? "text-center" : ""}`}
    >
      <h3 className={`${NAVY_BAR} ${teal ? "bg-[var(--web-teal)]" : ""}`}>{title}</h3>
      {children}
    </div>
  );
}

/** A row of the fact-file table: bold term on gray, value on white. */
function InfoRow({ term, children }: { term: string; children: ReactNode }) {
  return (
    <tr>
      <td className="w-[42%] bg-surface-hover px-[5px] py-[3px] font-bold text-foreground">
        {term}
      </td>
      <td className="bg-surface px-[5px] py-[3px] text-foreground">{children}</td>
    </tr>
  );
}

/** Where a photograph came from, in the smallest type on the page. */
function Credit({ figure }: { figure: Figure }) {
  return (
    <span className="mt-[2px] block text-[10px] break-words text-muted">
      Credit:{" "}
      <a
        className={LINK}
        href={commonsHref(figure.src)}
        target="_blank"
        rel="noreferrer"
      >
        {commonsFile(figure.src)}
      </a>{" "}
      · Wikimedia Commons
    </span>
  );
}

/**
 * The `.web-interlace` contract: a coarse copy behind, the sharp copy masked
 * into widening bands, and a gray placeholder with a broken-image glyph over
 * both until the first pass lands. Both copies are lazy below the fold —
 * the browser starts the fetch long before the chapter's ScrollTrigger fires,
 * so the coarse copy is there when the effect runs.
 */
function Interlaced({
  figure,
  kb,
  attr,
  className = "",
  eager = false,
}: {
  figure: Figure;
  kb: number;
  attr: "data-fig" | "data-infobox";
  className?: string;
  eager?: boolean;
}) {
  const flag = attr === "data-fig" ? { "data-fig": "" } : { "data-infobox": "" };
  return (
    <span
      data-web-intro
      {...flag}
      className={`web-interlace ${className}`}
      style={{ aspectRatio: figure.aspect }}
    >
      {/* Wikimedia Commons serves these; next/image would need the host allow-listed for no gain here. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        data-web-img-coarse
        aria-hidden="true"
        src={figure.src}
        alt=""
        loading={eager ? "eager" : "lazy"}
        referrerPolicy="no-referrer"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        data-web-img-sharp
        src={figure.src}
        alt={figure.alt}
        loading={eager ? "eager" : "lazy"}
        referrerPolicy="no-referrer"
      />
      <span data-web-placeholder>
        <span className="text-[15px]">⊠</span>
        {figure.alt} ({kb} KB, please wait...)
      </span>
    </span>
  );
}

/** A photograph in a floated gray bevel frame, alternating sides. */
function FigureFrame({ figure, side }: { figure: Figure; side: "left" | "right" }) {
  const number = FIGURE_ORDER.get(figure) ?? 0;
  const kb = weight(number);
  const float =
    side === "left"
      ? "sm:float-left sm:mr-[18px] sm:w-[260px]"
      : "sm:float-right sm:ml-[18px] sm:w-[300px]";
  return (
    <div
      data-web-intro
      data-chunk
      className={`my-2 w-full border-[2px] border-[var(--web-light)] [border-style:outset] bg-canvas p-[6px] text-center font-mono text-[11px] ${float}`}
    >
      <Interlaced figure={figure} kb={kb} attr="data-fig" className="mb-1 border border-black" />
      Fig. {number} — {figure.caption} ({kb} KB, please wait...)
      <Credit figure={figure} />
    </div>
  );
}

/** A fact: a lime LCD beside an uppercase label and its line. */
function FactTable({ fact }: { fact: Fact }) {
  const [caption, line] = splitLabel(fact.label);
  return (
    <table
      data-web-intro
      data-chunk
      className="my-3 w-full border-[2px] border-[var(--web-light)] [border-collapse:separate] [border-spacing:2px] [border-style:outset] bg-[var(--web-gray)]"
    >
      <tbody>
        <tr>
          <td className="w-[104px] bg-black text-center align-middle font-code text-[34px] leading-none font-bold text-[var(--web-lime)] sm:w-[120px] sm:text-[40px]">
            <span data-fact-value data-value={fact.value}>
              {fact.value}
            </span>
            {fact.unit && <small className="text-[18px]">{fact.unit}</small>}
          </td>
          <td className="bg-surface px-[10px] py-[6px] align-middle text-[15px] text-foreground">
            <b className={`${ARIAL} block text-[12px] font-bold tracking-[0.06em] text-accent-cool uppercase`}>
              {caption}
            </b>
            {fact.hearts && (
              <span className="mr-1 text-[var(--web-red)]" aria-label="three hearts">
                {[0, 1, 2].map((index) => (
                  <span key={index} data-heart className="inline-block">
                    ♥
                  </span>
                ))}
              </span>
            )}
            {line ?? ""}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** `N. Title` in navy, the numeral in rainbow, with NEW! on the second one. */
function ChapterHeading({
  index,
  title,
  href,
}: {
  index: number;
  title: string;
  href: string;
}) {
  return (
    <h2 className="mt-[26px] mb-2 text-[clamp(20px,4.4vw,24px)] font-bold text-accent-cool">
      <span
        data-web-intro
        data-chunk
        className="web-rainbow mr-[6px] inline-block font-bold"
        style={{ animationDelay: `${-index * 0.42}s` }}
      >
        {index + 1}.
      </span>
      <a
        data-web-intro
        data-chunk
        className="inline text-accent-cool no-underline hover:underline"
        href={href}
        target="_blank"
        rel="noreferrer"
      >
        {title}
      </a>
      {index === 1 && (
        <span
          data-web-intro
          data-chunk
          className={`${ARIAL} web-blink ml-2 align-middle text-[11px] font-bold text-[var(--web-red)]`}
        >
          NEW!
        </span>
      )}
    </h2>
  );
}

function ChapterBlock({ chapter, index }: { chapter: Chapter; index: number }) {
  return (
    <section id={chapter.id} data-chapter className="scroll-mt-6">
      <ChapterHeading
        index={index}
        title={chapter.title}
        href={sourceHref(chapter.subsections[0]?.anchor ?? "")}
      />
      {chapter.subsections.map((subsection, position) => (
        <SubsectionBlock
          key={subsection.id}
          subsection={subsection}
          side={(index + position) % 2 === 0 ? "right" : "left"}
        />
      ))}
      <div className="clear-both" />
      <hr data-web-intro data-rule className="web-hr" />
      <p data-web-intro data-chunk className={`${ARIAL} m-0 text-right text-[11px]`}>
        [ <TopLink /> ]
      </p>
    </section>
  );
}

function SubsectionBlock({
  subsection,
  side,
}: {
  subsection: Subsection;
  side: "left" | "right";
}) {
  return (
    <section id={subsection.id} className="scroll-mt-6">
      <h3
        data-web-intro
        data-chunk
        // Each subsection starts its own float context, so a tall figure
        // cannot leave the next subsection's prose stranded around it.
        className={`${ARIAL} mt-[18px] mb-1 clear-both text-[16px] font-bold`}
      >
        {subsection.title}
      </h3>
      {subsection.figure && <FigureFrame figure={subsection.figure} side={side} />}
      {subsection.paragraphs.map((paragraph, index) => (
        <p
          // Paragraphs of prose have no id but their order; it never changes.
          // biome-ignore lint/suspicious/noArrayIndexKey: static prose
          key={index}
          data-web-intro
          data-p
          className="mt-0 mb-3"
        >
          {paragraph}
        </p>
      ))}
      <p data-web-intro data-chunk className={`${ARIAL} mt-0 mb-3 text-[11px]`}>
        [{" "}
        <a className={LINK} href={sourceHref(subsection.anchor)} target="_blank" rel="noreferrer">
          source: Wikipedia ↗
        </a>{" "}
        ]
      </p>
      {subsection.fact && <FactTable fact={subsection.fact} />}
    </section>
  );
}
