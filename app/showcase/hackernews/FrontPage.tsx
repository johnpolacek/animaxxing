"use client";

import { useRef, useState } from "react";
import { Flip, gsap, prefersReducedMotion, ScrollTrigger, SplitText, useGSAP } from "@/components/motion";
import { watchPageTransition } from "@/lib/animation/pageState";
import { CHAPTERS, NAV, STORIES, TODAY, type Story } from "./content";

/*
 * The front page, animaxxed. Chapter 01, the front.
 *
 * Layout: a sticky strip of chrome (wordmark, the site links, the clock), then
 * a twelve-column grid with the four chapters set on their side in a rail one
 * column wide and the chapter itself in the other eleven. Inside the chapter
 * the top story is set as display type over its actions, and the other
 * twenty-nine are a hairline-ruled table: number, title, source, points,
 * comments, age. Below the large breakpoint the rail turns into a row of
 * chips and each table row folds its figures into a line under the title.
 *
 * Motion, all of it drawn from a live, ranked feed:
 *  - the lead's letters scatter in with the route; once settled the headline
 *    carries a bad signal, a letter or two dropping out and scrambling back
 *  - the wordmark and every figure resolve out of noise, like a wire coming up
 *  - the board prints row by row: each row wipes across as its hairline draws,
 *    its rank flips down like a split-flap card, its numbers settle out of
 *    digits. Rows below the fold print as they scroll into view
 *  - the feed is live: every few seconds a story's points tick up, the new
 *    number rolling in with the delta floating off it, and now and then a
 *    story climbs a rank, sliding up past the one above and flashing negative
 *    as it lands. The ranks never move; the stories move between them
 *  - the clock's colon blinks the seconds
 *  - a rank flips again under the pointer; pressing Upvote launches the arrow
 *    off the top of the chip, drops a new one in, and rolls the lead's score
 * Reduced motion snaps every one of these to its settled state.
 */

const MONO_LABEL = "font-mono text-caption font-bold uppercase tracking-[0.08em]";
const MONO_NOTE = "font-mono text-annotation uppercase tracking-[0.08em]";
const FIGURE = `${MONO_NOTE} tabular-nums`;

const CHIP =
  "inline-flex h-12 items-center gap-2.5 rounded-xl border-2 px-5 font-sans text-[13px] font-extrabold uppercase tracking-[0.04em] transition-colors";
const CHIP_SOLID = `${CHIP} border-inverse bg-inverse text-inverse-foreground hover:bg-inverse-hover`;
const CHIP_OUTLINE = `${CHIP} border-foreground text-foreground hover:bg-surface-hover`;
const CHIP_QUIET = `${CHIP} border-border text-muted hover:border-foreground hover:text-foreground`;

const SMALL_CHIP =
  "inline-flex h-10 items-center rounded-lg border-2 border-foreground px-4 font-sans text-caption font-extrabold uppercase tracking-[0.04em] text-foreground transition-colors hover:bg-surface-hover";

const RAIL_LINK = `${MONO_LABEL} inline-flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 transition-colors lg:py-2.5`;

const DISPLAY = "font-sans font-extrabold leading-[0.84] tracking-[-0.045em] [font-kerning:none]";

/*
 * A row is a grid with the rank in its first column. The story fills the rest
 * as a subgrid, so the story can move between rows while the rank stays put.
 */
const ROW =
  "grid grid-cols-[3rem_minmax(0,1fr)] items-start gap-x-6 border-b border-border py-3 lg:min-h-10 lg:grid-cols-[4rem_minmax(0,1fr)_14.5rem_5.5rem_5.5rem_4.5rem] lg:items-center lg:py-2.5";
const STORY =
  "col-start-2 -col-end-1 grid min-w-0 grid-cols-subgrid items-start bg-canvas lg:items-center";

const CURRENT = CHAPTERS[0];
const [lead, ...rest] = STORIES as [Story, ...Story[]];
const TOTAL = String(STORIES.length).padStart(2, "0");
const [CLOCK_HOURS, CLOCK_REST] = TODAY.time.split(":") as [string, string];

/** Seconds after the route starts entering before the board prints. */
const PRINT_DELAY = 1.15;
/** Seconds between rows as the board prints. */
const PRINT_STAGGER = 0.045;
/** Seconds between live events, low and high. */
const LIVE_GAP: [number, number] = [3.2, 6];
/** Share of live events that are a climb rather than a plain tick. */
const CLIMB_ODDS = 0.4;
/** Seconds between the headline's signal drops, low and high. */
const DROP_GAP: [number, number] = [1.8, 4.2];

type Feed = {
  /** Indices into `rest`, in board order: slot 0 is rank 02. */
  order: number[];
  /** Live points per story index; null for a job. */
  points: (number | null)[];
  event: FeedEvent | null;
};

type FeedEvent = {
  id: number;
  kind: "tick" | "climb";
  /** Index into `rest`. */
  story: number;
  delta: number;
};

const INITIAL_FEED: Feed = {
  order: rest.map((_, index) => index),
  points: rest.map((story) => (story.points ? Number(story.points) : null)),
  event: null,
};

const pad = (n: number) => String(n).padStart(2, "0");
const random = gsap.utils.random;

/* --------------------------------------------------------------- helpers */

/** A figure settling out of digits, or a word out of letters. */
function resolve(element: HTMLElement, at = 0, tl: gsap.core.Timeline): void {
  const kind = element.dataset.scramble;
  tl.to(
    element,
    {
      duration: kind === "word" ? 0.7 : 0.55,
      ease: "none",
      overwrite: "auto",
      scrambleText: {
        text: element.textContent ?? "",
        chars: kind === "word" ? "upperCase" : kind === "host" ? "lowerCase" : "0123456789",
        speed: 0.6,
        revealDelay: 0.12,
      },
    },
    at,
  );
}

/** A rank card flipping down into place. */
function flipRank(rank: Element, at = 0, tl?: gsap.core.Timeline): void {
  const vars: gsap.TweenVars = {
    rotationX: 0,
    duration: 0.5,
    ease: "back.out(1.7)",
    overwrite: "auto",
    clearProps: "transform",
  };
  const from: gsap.TweenVars = { rotationX: -90, transformOrigin: "50% 100%", transformPerspective: 360 };
  if (tl) {
    tl.fromTo(rank, from, vars, at);
  } else {
    gsap.fromTo(rank, from, { ...vars, delay: at });
  }
}

/** A row wiping across, its rank flipping, its figures settling. */
function printRow(row: HTMLElement, at: number, tl: gsap.core.Timeline): void {
  tl.fromTo(
    row,
    { autoAlpha: 1, clipPath: "inset(0% 100% 0% 0%)" },
    { clipPath: "inset(0% 0% 0% 0%)", duration: 0.5, ease: "power3.out", clearProps: "clipPath" },
    at,
  );
  const rank = row.querySelector("[data-rank]");
  if (rank) {
    flipRank(rank, at + 0.04, tl);
  }
  row.querySelectorAll<HTMLElement>("[data-scramble]").forEach((el) => resolve(el, at + 0.08, tl));
}

/** A number changing: the new value rolls up, heavy, and settles. */
function roll(element: HTMLElement, at = 0, tl = gsap.timeline({ defaults: { overwrite: "auto" } })): gsap.core.Timeline {
  return tl
    .fromTo(
      element,
      { yPercent: 80, autoAlpha: 0 },
      { yPercent: 0, autoAlpha: 1, duration: 0.32, ease: "power3.out", clearProps: "transform" },
      at,
    )
    .fromTo(
      element,
      { fontWeight: 700 },
      { fontWeight: 400, duration: 0.7, ease: "power2.out", clearProps: "fontWeight" },
      at + 0.15,
    );
}

/** The delta floating up off a figure. */
function float(delta: HTMLElement, text: string, at = 0, tl = gsap.timeline()): gsap.core.Timeline {
  delta.textContent = text;
  return tl
    .fromTo(delta, { y: 6, autoAlpha: 0 }, { y: -8, autoAlpha: 1, duration: 0.25, ease: "power2.out" }, at)
    .to(delta, { y: -18, autoAlpha: 0, duration: 0.5, ease: "power2.in" }, at + 0.5);
}

/** A block flashing negative, twice, as it lands. */
function flash(target: gsap.TweenTarget, at = 0, tl: gsap.core.Timeline): void {
  tl.to(target, { filter: "invert(1)", duration: 0.05, ease: "none" }, at)
    .to(target, { filter: "invert(0)", duration: 0.08, ease: "none" }, at + 0.07)
    .to(target, { filter: "invert(1)", duration: 0.05, ease: "none" }, at + 0.2)
    .to(target, { filter: "invert(0)", duration: 0.35, ease: "power2.out" }, at + 0.26)
    .set(target, { clearProps: "filter" });
}

function onScreen(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return rect.top >= 0 && rect.bottom <= window.innerHeight;
}

/* ------------------------------------------------------------------ page */

export function FrontPage() {
  const scope = useRef<HTMLDivElement>(null);
  const [feed, setFeed] = useState<Feed>(INITIAL_FEED);
  const [leadPoints, setLeadPoints] = useState(Number(lead.points ?? 0));
  const [voted, setVoted] = useState(false);

  const feedRef = useRef(feed);
  feedRef.current = feed;
  /** The board's layout just before a climb, for Flip. */
  const flipState = useRef<Flip.FlipState | null>(null);
  const eventId = useRef(0);
  const leadRolled = useRef(false);

  /* ------------------------------------------------ mount: the page */
  useGSAP(
    (_context, contextSafe) => {
      const root = scope.current;
      const board = root?.querySelector<HTMLElement>("[data-board]");
      if (!root || !board || !contextSafe) {
        return;
      }
      // The route splits the headline's letters and puts the text back after,
      // so the link is a new node by idle: always look it up fresh.
      const headline = () => root.querySelector<HTMLElement>("[data-headline]");
      const reduced = prefersReducedMotion();
      const q = gsap.utils.selector(root);
      const rows = q<HTMLElement>("[data-row]");
      const colon = root.querySelector<HTMLElement>("[data-colon]");
      const cleanups: (() => void)[] = [];

      // The board is blank until it prints.
      if (!reduced) {
        gsap.set(rows, { autoAlpha: 0 });
      }

      /* ------------------------------------------ the board prints */
      let printed = false;
      let boardOnScreen = false;
      let liveTimer: gsap.core.Tween | null = null;
      let live = false;

      const print = contextSafe(() => {
        if (printed || reduced) {
          return;
        }
        printed = true;
        const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
        q<HTMLElement>("[data-scramble]:not([data-row] [data-scramble])").forEach((el, i) =>
          resolve(el, i * 0.03, tl),
        );
        const visible = rows.filter(onScreen);
        const rest = rows.filter((row) => !visible.includes(row));
        visible.forEach((row, i) => printRow(row, 0.1 + i * PRINT_STAGGER, tl));
        if (rest.length > 0) {
          ScrollTrigger.batch(rest, {
            start: "top 94%",
            once: true,
            onEnter: (batch) => {
              const more = gsap.timeline({ defaults: { overwrite: "auto" } });
              (batch as HTMLElement[]).forEach((row, i) => printRow(row, i * PRINT_STAGGER, more));
            },
          });
        }
        tl.call(() => {
          live = true;
          scheduleLive();
        }, undefined, tl.duration() + 0.6);
      });

      /* ------------------------------------------- the live feed */
      const slotOf = (story: number) => feedRef.current.order.indexOf(story);

      const fire = contextSafe(() => {
        liveTimer = null;
        if (!live) {
          return;
        }
        if (!boardOnScreen) {
          scheduleLive();
          return;
        }
        const { order, points } = feedRef.current;
        const visibleSlots = order
          .map((story, slot) => ({ story, slot }))
          .filter(({ story, slot }) => points[story] !== null && rows[slot] && onScreen(rows[slot]!));
        if (visibleSlots.length === 0) {
          scheduleLive();
          return;
        }
        // A climb needs a story with a same-height story above it to pass.
        const climbable = visibleSlots.filter(({ slot }) => {
          const above = rows[slot - 1]?.querySelector<HTMLElement>("[data-story]");
          const here = rows[slot]?.querySelector<HTMLElement>("[data-story]");
          return slot > 0 && above && here && above.offsetHeight === here.offsetHeight;
        });
        const climbing = climbable.length > 0 && Math.random() < CLIMB_ODDS;
        const pool = climbing ? climbable : visibleSlots;
        const pick = pool[Math.floor(Math.random() * pool.length)]!;
        const delta = Math.max(1, Math.round(random(1, climbing ? 14 : 9) ** 1.2 / 2));
        const id = ++eventId.current;
        setFeed((current) => ({
          ...current,
          points: current.points.map((value, index) =>
            index === pick.story && value !== null ? value + delta : value,
          ),
          event: { id, kind: "tick", story: pick.story, delta },
        }));
        if (climbing) {
          gsap.delayedCall(0.75, contextSafe(() => climb(pick.story)));
        }
        scheduleLive();
      });

      const climb = (story: number) => {
        const slot = slotOf(story);
        if (!live || slot <= 0) {
          return;
        }
        flipState.current = Flip.getState(q("[data-story]"));
        setFeed((current) => {
          const order = [...current.order];
          const at = order.indexOf(story);
          if (at <= 0) {
            return current;
          }
          [order[at - 1], order[at]] = [order[at]!, order[at - 1]!];
          return { ...current, order, event: { id: ++eventId.current, kind: "climb", story, delta: 0 } };
        });
      };

      const scheduleLive = () => {
        if (reduced || !live || liveTimer) {
          return;
        }
        liveTimer = gsap.delayedCall(random(LIVE_GAP[0], LIVE_GAP[1]), fire);
      };

      const stopLive = () => {
        live = false;
        liveTimer?.kill();
        liveTimer = null;
      };

      ScrollTrigger.create({
        trigger: board,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => {
          boardOnScreen = self.isActive;
        },
      });

      /* ---------------------------------------- the headline's signal */
      let signal: SplitText | null = null;
      let dropTimer: gsap.core.Tween | null = null;
      let originals: string[] = [];

      const drop = contextSafe(() => {
        dropTimer = null;
        if (!signal) {
          return;
        }
        const chars = signal.chars as HTMLElement[];
        const count = Math.random() < 0.3 ? 2 : 1;
        for (let n = 0; n < count; n++) {
          const index = Math.floor(Math.random() * chars.length);
          const char = chars[index];
          const text = originals[index] ?? "";
          if (!char || !text.trim()) {
            continue;
          }
          gsap
            .timeline({ defaults: { overwrite: "auto" } })
            .to(char, { autoAlpha: 0.15, duration: 0.05, ease: "steps(1)" }, 0)
            .to(char, { autoAlpha: 1, duration: 0.05, ease: "steps(1)" }, 0.08)
            .to(char, { autoAlpha: 0.3, duration: 0.05, ease: "steps(1)" }, 0.16)
            .to(char, { autoAlpha: 1, duration: 0.05, ease: "steps(1)" }, 0.22)
            .fromTo(char, { x: -2 }, { x: 0, duration: 0.2, ease: "steps(3)", clearProps: "transform" }, 0)
            .to(
              char,
              { duration: 0.28, ease: "none", scrambleText: { text, chars: "upperAndLowerCase", speed: 1.4 } },
              0.04,
            );
        }
        dropTimer = gsap.delayedCall(random(DROP_GAP[0], DROP_GAP[1]), drop);
      });

      const startSignal = () => {
        const link = headline();
        if (reduced || signal || !link) {
          return;
        }
        signal = SplitText.create(link, { type: "chars", smartWrap: true, aria: "auto" });
        originals = (signal.chars as HTMLElement[]).map((char) => char.textContent ?? "");
        dropTimer = gsap.delayedCall(random(DROP_GAP[0], DROP_GAP[1]), drop);
      };

      // The route exit splits the headline again over these letters, so they
      // are left in place; only the text is put right and the timers stopped.
      const stopSignal = () => {
        dropTimer?.kill();
        dropTimer = null;
        if (!signal) {
          return;
        }
        const chars = signal.chars as HTMLElement[];
        gsap.killTweensOf(chars);
        chars.forEach((char, index) => {
          char.textContent = originals[index] ?? char.textContent;
        });
        gsap.set(chars, { autoAlpha: 1, clearProps: "transform" });
      };

      /* ------------------------------------------------- the clock */
      let blink: gsap.core.Tween | null = null;
      const startClock = () => {
        if (reduced || !colon || blink) {
          return;
        }
        blink = gsap.to(colon, { autoAlpha: 0, duration: 0.5, ease: "steps(1)", repeat: -1, yoyo: true });
      };
      const stopClock = () => {
        blink?.kill();
        blink = null;
        if (colon) {
          gsap.set(colon, { autoAlpha: 1 });
        }
      };

      /* ---------------------------------------- a rank under the pointer */
      let hovered: HTMLElement | null = null;
      const over = contextSafe((event: PointerEvent) => {
        const row = (event.target as Element).closest<HTMLElement>("[data-row]");
        if (!row || row === hovered) {
          return;
        }
        hovered = row;
        const rank = row.querySelector("[data-rank]");
        if (rank && !reduced && printed) {
          flipRank(rank);
        }
      });
      const out = (event: PointerEvent) => {
        const row = (event.target as Element).closest<HTMLElement>("[data-row]");
        const next = event.relatedTarget instanceof Element ? event.relatedTarget.closest("[data-row]") : null;
        if (row && row !== next) {
          hovered = null;
        }
      };
      board.addEventListener("pointerover", over);
      board.addEventListener("pointerout", out);
      cleanups.push(() => {
        board.removeEventListener("pointerover", over);
        board.removeEventListener("pointerout", out);
      });

      /* ------------------------------------------ the route's phases */
      let printTimer: gsap.core.Tween | null = null;
      const unwatch = watchPageTransition(root, {
        onEntering: () => {
          printTimer = gsap.delayedCall(PRINT_DELAY, print);
        },
        onIdle: contextSafe(() => {
          print();
          startSignal();
          startClock();
        }),
        onExiting: () => {
          printTimer?.kill();
          stopLive();
          stopSignal();
          stopClock();
        },
      });

      return () => {
        unwatch();
        printTimer?.kill();
        stopLive();
        stopSignal();
        stopClock();
        cleanups.forEach((fn) => fn());
      };
    },
    { scope },
  );

  /* ----------------------------------------- a live event lands */
  useGSAP(
    () => {
      const root = scope.current;
      const event = feed.event;
      if (!root || !event) {
        return;
      }
      const reduced = prefersReducedMotion();
      const q = gsap.utils.selector(root);
      const story = root.querySelector<HTMLElement>(`[data-story][data-flip-id="${rest[event.story]?.rank}"]`);
      if (!story) {
        return;
      }

      if (event.kind === "tick") {
        if (reduced) {
          return;
        }
        const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
        story.querySelectorAll<HTMLElement>("[data-points]").forEach((el) => roll(el, 0, tl));
        const delta = story.querySelector<HTMLElement>("[data-delta]");
        if (delta) {
          float(delta, `+${event.delta}`, 0.05, tl);
        }
        return;
      }

      // A climb: the two stories trade rows, the ranks flip, the climber flashes.
      const state = flipState.current;
      flipState.current = null;
      const stories = q<HTMLElement>("[data-story]");
      // The climber has already moved up; it and the story it passed flip their ranks.
      const slot = feed.order.indexOf(event.story);
      const ranks = [slot, slot + 1]
        .map((index) => root.querySelector(`[data-row]:nth-child(${index + 1}) [data-rank]`))
        .filter((rank): rank is Element => rank !== null);
      if (reduced || !state) {
        return;
      }
      gsap.set(story, { zIndex: 2, position: "relative" });
      const tl = gsap.timeline({
        defaults: { overwrite: "auto" },
        onComplete: () => gsap.set(story, { clearProps: "zIndex,position" }),
      });
      tl.add(
        Flip.from(state, {
          targets: stories,
          duration: 0.6,
          ease: "power3.inOut",
          clearProps: "transform",
        }),
        0,
      );
      ranks.forEach((rank) => flipRank(rank, 0.22, tl));
      flash(story, 0.5, tl);
    },
    { dependencies: [feed.event], scope },
  );

  /* ------------------------------------------- the lead's score */
  useGSAP(
    () => {
      const root = scope.current;
      if (!root) {
        return;
      }
      if (!leadRolled.current) {
        leadRolled.current = true;
        return;
      }
      const figure = root.querySelector<HTMLElement>("[data-lead-points]");
      if (figure && !prefersReducedMotion()) {
        roll(figure);
      }
    },
    { dependencies: [leadPoints], scope },
  );

  const vote = () => {
    const root = scope.current;
    const arrow = root?.querySelector<HTMLElement>("[data-arrow]");
    const button = root?.querySelector<HTMLElement>("[data-upvote]");
    const next = !voted;
    setVoted(next);
    setLeadPoints((value) => value + (next ? 1 : -1));
    if (!arrow || !button || prefersReducedMotion()) {
      return;
    }
    const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
    if (next) {
      // The arrow launches off the top of the chip; another drops in from below.
      tl.to(arrow, { y: -26, autoAlpha: 0, duration: 0.18, ease: "power2.in" }, 0)
        .fromTo(
          arrow,
          { y: 16, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.35, ease: "back.out(2.2)", clearProps: "transform" },
          0.2,
        )
        .fromTo(button, { scale: 0.94 }, { scale: 1, duration: 0.45, ease: "back.out(3)", clearProps: "transform" }, 0.02);
    } else {
      tl.fromTo(arrow, { y: -8 }, { y: 0, duration: 0.3, ease: "bounce.out", clearProps: "transform" }, 0);
    }
  };

  return (
    <div ref={scope} className="@container">
      {/* The chrome */}
      <header
        data-page-transition
        className="sticky top-0 z-30 -mx-gutter border-b border-border bg-canvas px-gutter sm:-mx-gutter-lg sm:px-gutter-lg"
      >
        <div className="flex min-h-14 items-center gap-x-8 py-2">
          <p className={`${MONO_LABEL} shrink-0 text-foreground`} data-scramble="word">
            The Feed
          </p>
          <nav aria-label="Site" className="hidden items-center gap-x-5 md:flex">
            {NAV.map((link) => (
              <a key={link} href="#top" className={`${MONO_NOTE} text-muted transition-colors hover:text-foreground`}>
                {link}
              </a>
            ))}
          </nav>
          <p className={`${FIGURE} ml-auto hidden text-muted lg:block`}>
            {TODAY.date} <span aria-hidden="true">—</span> {CLOCK_HOURS}
            <span data-colon>:</span>
            {CLOCK_REST}
          </p>
          <a href="#top" className={`${SMALL_CHIP} ml-auto lg:ml-0`}>
            Log in
          </a>
        </div>
      </header>

      <div className="mt-8 grid grid-cols-12 gap-x-6 gap-y-8">
        {/* The rail: the four chapters, on their side at the left edge */}
        {/* The transition moves the wrapper; the nav's own rotation must not be overwritten by it. */}
        <div data-page-transition className="col-span-12 lg:col-span-1">
          <nav
            aria-label="Chapters"
            className="lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)] lg:rotate-180 lg:border-l lg:border-border lg:pl-3 lg:[writing-mode:vertical-rl]"
          >
            <ol className="flex gap-2 overflow-x-auto lg:h-full lg:gap-4 lg:overflow-visible">
              {CHAPTERS.map((chapter) => {
                const active = chapter.id === CURRENT.id;
                return (
                  <li key={chapter.id} className="shrink-0">
                    <a
                      href={`#${chapter.id}`}
                      aria-current={active ? "page" : undefined}
                      className={
                        active
                          ? `${RAIL_LINK} bg-inverse text-inverse-foreground`
                          : `${RAIL_LINK} text-muted hover:text-foreground`
                      }
                    >
                      <span>{chapter.number}</span>
                      <span>{chapter.title}</span>
                    </a>
                  </li>
                );
              })}
              <li aria-hidden="true" className="hidden flex-1 lg:block" />
              <li className={`${MONO_NOTE} hidden shrink-0 px-2.5 text-muted lg:block`}>
                Ch {CURRENT.number} <span aria-hidden="true">/</span> {String(CHAPTERS.length).padStart(2, "0")}
              </li>
            </ol>
          </nav>
        </div>

        {/* The chapter */}
        <section id={CURRENT.id} className="col-span-12 scroll-mt-24 @container lg:col-span-11">
          {/* The lead */}
          <article>
            <p data-page-transition className="flex flex-wrap items-baseline gap-x-7 gap-y-1">
              <span className={`${FIGURE} font-bold text-foreground`}>
                <span data-scramble>{lead.rank}</span> <span aria-hidden="true">/</span> {TOTAL}
              </span>
              <span className={`${MONO_NOTE} text-muted`}>{CURRENT.title} page</span>
              <span className={`${FIGURE} text-muted`}>
                <span data-lead-points className="inline-block">
                  {leadPoints}
                </span>{" "}
                pts
              </span>
              {lead.comments ? (
                <span className={`${FIGURE} text-muted`}>
                  <span data-scramble>{lead.comments}</span> cmts
                </span>
              ) : null}
              <span className={`${FIGURE} text-muted`} data-scramble>
                {lead.age}
              </span>
              {lead.by ? <span className={`${MONO_NOTE} text-muted`}>By {lead.by}</span> : null}
            </p>
            <h1
              data-page-transition="letters"
              className={`${DISPLAY} mt-5 -ml-[0.04em] max-w-[11ch] text-[clamp(3.25rem,10.3cqi,7.5rem)] text-balance`}
            >
              <a href="#thread" data-headline className="transition-colors hover:text-muted">
                {lead.title}
              </a>
            </h1>
          </article>

          <div data-page-transition className="mt-6 grid grid-cols-12 items-end gap-x-6 gap-y-6">
            <ul aria-label="Actions" className="col-span-12 flex flex-wrap gap-3 lg:col-span-8">
              <li>
                <button type="button" data-upvote aria-pressed={voted} onClick={vote} className={CHIP_SOLID}>
                  <span data-arrow className="inline-flex">
                    <UpArrow />
                  </span>
                  {voted ? "Upvoted" : "Upvote"}
                </button>
              </li>
              {lead.comments ? (
                <li>
                  <a href="#thread" className={CHIP_OUTLINE}>
                    {lead.comments} comments
                  </a>
                </li>
              ) : null}
              {lead.source ? (
                <li>
                  <a href="#thread" className={CHIP_QUIET}>
                    {lead.source}
                  </a>
                </li>
              ) : null}
              <li>
                <a href="#thread" className={CHIP_QUIET}>
                  Hide
                </a>
              </li>
            </ul>
            {lead.summary ? (
              <p className="col-span-12 max-w-[34ch] font-sans text-[0.875rem] leading-5 text-muted text-pretty lg:col-span-4">
                {lead.summary}
              </p>
            ) : null}
          </div>

          {/* The board */}
          <div data-page-transition data-board className="mt-8">
            <div className={`${ROW} hidden text-muted lg:grid`} aria-hidden="true">
              <span className={MONO_NOTE}>No.</span>
              <span className={MONO_NOTE}>Title</span>
              <span className={MONO_NOTE}>Source</span>
              <span className={MONO_NOTE}>Points</span>
              <span className={MONO_NOTE}>Comments</span>
              <span className={MONO_NOTE}>Age</span>
            </div>
            <ol className="border-t border-border lg:border-t-0" aria-label="Stories">
              {feed.order.map((index, slot) => {
                const story = rest[index]!;
                return (
                  <li key={slot} data-row className={ROW}>
                    <span data-rank data-scramble className={`${FIGURE} pt-0.5 text-muted lg:pt-0`}>
                      {pad(slot + 2)}
                    </span>
                    <StoryCells key={story.rank} story={story} points={feed.points[index] ?? null} />
                  </li>
                );
              })}
            </ol>

            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
              <a href="#front" className={SMALL_CHIP}>
                More
              </a>
              <p className={`${FIGURE} text-muted`}>
                Showing {lead.rank}–{TOTAL} <span aria-hidden="true">·</span> Page 1
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

/** Everything in a row but its rank: the part that moves when a story climbs. */
function StoryCells({ story, points }: { story: Story; points: number | null }) {
  const job = points === null;
  return (
    <div data-story data-flip-id={story.rank} className={STORY}>
      <div className="min-w-0">
        <h2 className="font-sans text-[0.9375rem] leading-5 font-semibold text-pretty">
          <a href="#thread" className="transition-colors hover:text-muted">
            {story.title}
          </a>
        </h2>
        {/* Below the large breakpoint the figures fold into one line. */}
        <p className={`${FIGURE} mt-1.5 flex flex-wrap gap-x-3 text-muted lg:hidden`}>
          {story.source ? <span data-scramble="host">{story.source}</span> : null}
          {job ? (
            <span>Job</span>
          ) : (
            <>
              <span>
                <span data-points data-scramble className="inline-block">
                  {points}
                </span>{" "}
                pts
              </span>
              <span>
                <span data-scramble>{story.comments}</span> cmts
              </span>
            </>
          )}
          <span data-scramble>{story.age}</span>
        </p>
      </div>
      <span data-scramble="host" className={`${MONO_NOTE} hidden truncate text-muted lg:block`}>
        {story.source ?? "Self"}
      </span>
      <span className={`${FIGURE} hidden text-foreground lg:block`}>
        {job ? (
          "Job"
        ) : (
          <span className="relative inline-block">
            <span data-points data-scramble className="inline-block">
              {points}
            </span>
            <span
              data-delta
              aria-hidden="true"
              className={`${MONO_NOTE} invisible absolute top-0 left-full ml-1.5 text-muted`}
            />
          </span>
        )}
      </span>
      <span data-scramble className={`${FIGURE} hidden text-foreground lg:block`}>
        {job ? "" : story.comments}
      </span>
      <span data-scramble className={`${FIGURE} hidden text-muted lg:block`}>
        {story.age}
      </span>
    </div>
  );
}

function UpArrow() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="square"
      strokeLinejoin="miter"
    >
      <path d="M8 13V3M3.5 7.5L8 3l4.5 4.5" />
    </svg>
  );
}
