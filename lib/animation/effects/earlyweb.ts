"use client";

import { gsap, prefersReducedMotion, SplitText } from "@/components/motion";

/*
 * Early web.
 *
 * The motion vocabulary of a page arriving over a 28.8k modem, and of a 1997
 * homepage once it has arrived, which is to say: never still.
 *
 * Two rules run through all of it.
 *
 * 1. **Nothing fades.** 1997 had no compositor. Things snap on in bursts
 *    (`chunkLoad`), paint a line at a time (`linesRender`), a character at a
 *    time (`typeIn`), or a band of rows at a time (`interlaceIn`). Where a
 *    tween is used at all it is stepped or eased hard, never a soft opacity
 *    ramp.
 * 2. **The timing is irregular.** A modem does not deliver at a constant
 *    rate, so the pauses between bursts are jittered from a seeded random
 *    number generator: irregular, but the same on every run, so a reload
 *    looks like the same page loading again rather than a different one.
 *
 * Shape of the API, following lib/animation/effects/bauhaus.ts: the
 * timeline-building functions take `(timeline, target, at, options)`, add
 * themselves to the timeline at `at`, and return whatever the caller has to
 * hand back later (a SplitText to revert). The loop functions take a target
 * and return a tween, timeline or teardown function to kill on unmount.
 *
 * Every one of them checks `prefersReducedMotion()` and, when it is true,
 * snaps to the settled state instead: everything visible, counters on their
 * final number, marquees still, no sparkles, no loops. That makes each of
 * them safe to call unconditionally from `useGSAP`.
 */

type At = number | string;

/* -------------------------------------------------------------- helpers */

/**
 * A small deterministic generator (an LCG). The load-in wants irregular
 * gaps, not random ones: the same page should load the same way twice.
 */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

let anchorCount = 0;

/**
 * Pins a label at `at` so the rest of an effect can be placed relative to it
 * with plain numbers, whether the caller passed a number, a label, or a
 * relative string.
 */
function anchor(timeline: gsap.core.Timeline, at: At): string {
  const label = `ew-${(anchorCount += 1)}`;
  timeline.addLabel(label, at);
  return label;
}

/** `label+=1.25`, the position parameter for `seconds` after an anchor. */
function after(label: string, seconds: number): string {
  return `${label}+=${Math.max(0, seconds).toFixed(4)}`;
}

function elements(input: Iterable<Element | null | undefined>): HTMLElement[] {
  return Array.from(input).filter((el): el is HTMLElement => el instanceof HTMLElement);
}

/* ------------------------------------------------------------- the load */

export type ChunkOptions = {
  /** Average number of elements in a burst. */
  batch?: number;
  /** Base pause between bursts, in seconds. */
  gap?: number;
  /** How much of that pause is thrown away or doubled at random. */
  jitter?: number;
  /** Seed for the jitter, so two calls can differ but each stays stable. */
  seed?: number;
};

/**
 * The page arriving. Elements are revealed in document order in bursts —
 * three or four snap on at once, then the connection stalls for a moment,
 * then the next lot. No fade at any point: `set` puts each burst straight
 * from hidden to visible.
 */
export function chunkLoad(
  timeline: gsap.core.Timeline,
  targets: Iterable<Element | null | undefined>,
  at: At,
  { batch = 3, gap = 0.16, jitter = 0.24, seed = 7 }: ChunkOptions = {},
): void {
  const els = elements(targets);
  if (els.length === 0) {
    return;
  }
  if (prefersReducedMotion()) {
    timeline.set(els, { autoAlpha: 1 }, at);
    return;
  }
  const label = anchor(timeline, at);
  const random = seededRandom(seed);
  let cursor = 0;
  let time = 0;
  while (cursor < els.length) {
    // A burst is the nominal batch give or take one packet.
    const size = Math.max(1, batch + Math.round(random() * 2) - 1);
    timeline.set(els.slice(cursor, cursor + size), { autoAlpha: 1 }, after(label, time));
    cursor += size;
    time += gap + random() * jitter;
  }
}

/**
 * The page leaving, on the way to another route: the same bursts, bottom-up,
 * turning things off instead of on.
 */
export function chunkUnload(
  timeline: gsap.core.Timeline,
  targets: Iterable<Element | null | undefined>,
  at: At,
  { batch = 4, gap = 0.08, jitter = 0.1, seed = 13 }: ChunkOptions = {},
): void {
  const els = elements(targets).reverse();
  if (els.length === 0) {
    return;
  }
  if (prefersReducedMotion()) {
    timeline.set(els, { autoAlpha: 0 }, at);
    return;
  }
  const label = anchor(timeline, at);
  const random = seededRandom(seed);
  let cursor = 0;
  let time = 0;
  while (cursor < els.length) {
    const size = Math.max(1, batch + Math.round(random() * 2) - 1);
    timeline.set(els.slice(cursor, cursor + size), { autoAlpha: 0 }, after(label, time));
    cursor += size;
    time += gap + random() * jitter;
  }
}

/**
 * A paragraph painting itself. The block is split into lines and each line
 * is switched on, top to bottom, with irregular gaps — a slow renderer
 * getting through the text. Returns the split so the caller can revert it;
 * `null` under reduced motion, where nothing was split at all.
 */
export function linesRender(
  timeline: gsap.core.Timeline,
  el: HTMLElement | null,
  at: At,
  { gap = 0.07, jitter = 0.09, seed = 21 }: { gap?: number; jitter?: number; seed?: number } = {},
): SplitText | null {
  if (!el) {
    return null;
  }
  if (prefersReducedMotion()) {
    timeline.set(el, { autoAlpha: 1 }, at);
    return null;
  }
  const split = SplitText.create(el, { type: "lines", aria: "auto" });
  // Safe to do now: the block itself is still hidden, so nothing flashes.
  gsap.set(split.lines, { autoAlpha: 0 });
  gsap.set(el, { autoAlpha: 1 });

  const label = anchor(timeline, at);
  const random = seededRandom(seed);
  let time = 0;
  for (const line of split.lines) {
    timeline.set(line, { autoAlpha: 1 }, after(label, time));
    time += gap + random() * jitter;
  }
  return split;
}

/**
 * Characters arriving one at a time, with a block cursor sitting at the end
 * of the line while they do. `cps` is characters per second — 1997 machines
 * rendered faster than they received, so this is about the modem, not the
 * screen. Returns the split to revert.
 */
export function typeIn(
  timeline: gsap.core.Timeline,
  el: HTMLElement | null,
  at: At,
  { cps = 26, cursor = true }: { cps?: number; cursor?: boolean } = {},
): SplitText | null {
  if (!el) {
    return null;
  }
  if (prefersReducedMotion()) {
    timeline.set(el, { autoAlpha: 1 }, at);
    return null;
  }
  const split = SplitText.create(el, { type: "chars", aria: "auto" });
  gsap.set(split.chars, { autoAlpha: 0 });
  gsap.set(el, { autoAlpha: 1 });

  const label = anchor(timeline, at);
  const step = 1 / Math.max(1, cps);

  const end = split.chars.length * step;

  let caret: HTMLSpanElement | null = null;
  if (cursor) {
    caret = document.createElement("span");
    caret.textContent = "\u2588";
    caret.setAttribute("aria-hidden", "true");
    caret.style.opacity = "0";
    el.append(caret);
    timeline.set(caret, { opacity: 1 }, label);
    // A hard 1s blink while the line comes in — counted out rather than
    // infinite, so this never leaves an endless child on a shared timeline.
    timeline.to(
      caret,
      {
        opacity: 0,
        duration: 0.5,
        repeat: Math.ceil((end + 0.45) / 0.5),
        yoyo: true,
        ease: "steps(1)",
      },
      label,
    );
  }

  const pen = caret;
  split.chars.forEach((char, index) => {
    timeline.call(
      () => {
        gsap.set(char, { autoAlpha: 1 });
        // Characters not yet typed are hidden but still hold their boxes, so
        // the cursor has to walk along with the text rather than sit at the
        // end of the reserved line.
        if (pen) {
          char.after(pen);
        }
      },
      undefined,
      after(label, index * step),
    );
  });

  if (caret) {
    const doomed = caret;
    timeline.call(
      () => {
        gsap.killTweensOf(doomed);
        doomed.remove();
      },
      undefined,
      after(label, end + 0.45),
    );
  }
  return split;
}

/**
 * The address bar getting a new URL: the old string is cleared and the new
 * one typed in behind a block cursor. Returns its own timeline — this one is
 * not part of a page's load choreography, it fires on navigation.
 */
export function retype(
  el: HTMLElement | null,
  text: string,
  { cps = 34 }: { cps?: number } = {},
): gsap.core.Timeline {
  const tl = gsap.timeline();
  if (!el) {
    return tl;
  }
  if (prefersReducedMotion()) {
    el.textContent = text;
    return tl;
  }
  const state = { n: 0 };
  const paint = (count: number, caret: boolean) => {
    el.textContent = text.slice(0, count) + (caret ? "█" : "");
  };
  paint(0, true);
  tl.to(state, {
    n: text.length,
    duration: text.length / Math.max(1, cps),
    ease: "none",
    onUpdate: () => paint(Math.round(state.n), true),
  });
  // Three blinks of the cursor, then it goes away and the URL stands alone.
  const blink = { on: 1 };
  tl.to(blink, {
    on: 0,
    duration: 0.28,
    repeat: 5,
    yoyo: true,
    ease: "steps(1)",
    onUpdate: () => paint(text.length, blink.on > 0.5),
  });
  tl.call(() => paint(text.length, false));
  return tl;
}

/* --------------------------------------------------------------- loops */

/**
 * The WordArt wave: every letter rides up and turns on its own axis, one
 * after the next, forever. Returns both halves so the caller can kill the
 * tween and put the text back together.
 */
export function letterWave(
  el: HTMLElement | null,
  {
    amount = 7,
    rotate = 26,
    each = 0.055,
    duration = 1.1,
  }: { amount?: number; rotate?: number; each?: number; duration?: number } = {},
): { split: SplitText | null; tween: gsap.core.Tween | null } {
  if (!el || prefersReducedMotion()) {
    return { split: null, tween: null };
  }
  const split = SplitText.create(el, { type: "chars", aria: "auto" });
  /*
   * `background-clip: text` clips to the element's own text, and a
   * transformed child paints in its own layer, outside that clip — so a
   * waving `.web-rainbow` heading would go invisible. Move the gradient
   * onto each letter instead, each one a step further through the hue
   * cycle, which reads as the same rainbow travelling along the word.
   */
  if (el.classList.contains("web-rainbow")) {
    const image = getComputedStyle(el).backgroundImage;
    const cycle = 3;
    split.chars.forEach((char, index) => {
      const letter = char as HTMLElement;
      letter.style.backgroundImage = image;
      letter.style.backgroundSize = "200% 100%";
      letter.style.webkitBackgroundClip = "text";
      letter.style.backgroundClip = "text";
      letter.style.color = "transparent";
      letter.style.animation = `web-rainbow-slide ${cycle}s linear infinite`;
      letter.style.animationDelay = `${(-index * cycle) / Math.max(1, split.chars.length)}s`;
    });
  }
  const tween = gsap.to(split.chars, {
    y: -amount,
    rotationY: rotate,
    transformPerspective: 500,
    transformOrigin: "50% 50%",
    duration,
    ease: "sine.inOut",
    repeat: -1,
    yoyo: true,
    stagger: { each, from: "start" },
  });
  return { split, tween };
}

/** A hit counter's LCD, never quite steady. */
export function lcdFlicker(el: HTMLElement | null): gsap.core.Tween | null {
  if (!el || prefersReducedMotion()) {
    return null;
  }
  return gsap.to(el, {
    opacity: 0.72,
    duration: 0.06,
    ease: "steps(1)",
    repeat: -1,
    yoyo: true,
    repeatDelay: 1.1,
  });
}

/**
 * A row of 8 bars jumping to random heights on a fast stepped clock, the way
 * every "now playing" panel did. Bars are scaled from their bottom edge, so
 * nothing reflows. Returns a teardown.
 */
export function equalizer(
  bars: Iterable<Element | null | undefined>,
  { fps = 9, min = 0.15, max = 1 }: { fps?: number; min?: number; max?: number } = {},
): () => void {
  const els = elements(bars);
  if (els.length === 0) {
    return () => {};
  }
  gsap.set(els, { transformOrigin: "50% 100%" });
  if (prefersReducedMotion()) {
    // A frozen, plausible spectrum rather than a flat line.
    els.forEach((bar, index) => {
      gsap.set(bar, { scaleY: 0.3 + ((index * 7) % 10) / 14 });
    });
    return () => {};
  }
  const tween = gsap.to(els, {
    scaleY: () => gsap.utils.random(min, max),
    duration: 1 / Math.max(1, fps),
    ease: "steps(1)",
    repeat: -1,
    repeatRefresh: true,
  });
  return () => {
    tween.kill();
    gsap.set(els, { clearProps: "transform" });
  };
}

/**
 * The Netscape "N", loading: a handful of meteors streak down through the
 * box behind the letter. The streaks are built inside `el`, which must be
 * positioned and clipped by the caller (`position: relative; overflow:
 * hidden`), and removed again by `kill`.
 *
 * Returns a control rather than a tween because the shower is tied to a
 * state — it runs while the page is loading and stops on `Document: Done`.
 */
export function throbber(
  el: HTMLElement | null,
  { count = 5, color = "#9fd0ff" }: { count?: number; color?: string } = {},
): { play: () => void; pause: () => void; kill: () => void } {
  const noop = { play: () => {}, pause: () => {}, kill: () => {} };
  if (!el || prefersReducedMotion()) {
    return noop;
  }
  const streaks: HTMLElement[] = [];
  for (let index = 0; index < count; index += 1) {
    const streak = document.createElement("i");
    streak.setAttribute("aria-hidden", "true");
    Object.assign(streak.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "2px",
      height: "11px",
      pointerEvents: "none",
      background: `linear-gradient(180deg, transparent, ${color})`,
    } satisfies Partial<CSSStyleDeclaration>);
    el.append(streak);
    streaks.push(streak);
  }
  const box = { w: el.offsetWidth || 26, h: el.offsetHeight || 22 };
  const tl = gsap.timeline({ repeat: -1, paused: true });
  streaks.forEach((streak, index) => {
    const duration = 0.5 + index * 0.09;
    tl.fromTo(
      streak,
      { x: -6 + index * (box.w / count), y: -12, rotation: 22, autoAlpha: 1 },
      {
        x: `+=${box.w * 0.5}`,
        y: box.h + 12,
        duration,
        ease: "none",
        repeat: -1,
        repeatDelay: 0.15,
      },
      index * 0.14,
    );
  });
  return {
    play: () => tl.play(),
    pause: () => tl.pause(),
    kill: () => {
      tl.kill();
      for (const streak of streaks) {
        streak.remove();
      }
    },
  };
}

/* ------------------------------------------------------------- counters */

/**
 * The hit counter. Each digit element is emptied and given a column of
 * numerals inside it, which is then scrolled up to land on its digit. Digits
 * further right spin further and land later, the way a mechanical odometer
 * settles left to right; then, a beat afterwards, the whole thing rolls over
 * by one — you are the newest visitor.
 *
 * `digitEls` must be as long as `value`, each one an element the effect owns
 * (it replaces the contents). Give them `.web-lcd` and a fixed width.
 */
export function odometer(
  timeline: gsap.core.Timeline,
  digitEls: Iterable<Element | null | undefined>,
  value: string,
  at: At,
  {
    duration = 1.4,
    stagger = 0.11,
    increment = true,
    incrementDelay = 0.9,
  }: { duration?: number; stagger?: number; increment?: boolean; incrementDelay?: number } = {},
): void {
  const els = elements(digitEls);
  const digits = value.split("");
  if (els.length === 0 || els.length !== digits.length) {
    return;
  }
  const next = String(Number(value) + 1)
    .padStart(value.length, "0")
    .slice(-value.length)
    .split("");
  /** The digit a column starts from, and the one it rolls over to. */
  const at$ = (list: string[], index: number) => list[index] ?? "0";

  if (prefersReducedMotion()) {
    els.forEach((el, index) => {
      el.textContent = increment ? at$(next, index) : at$(digits, index);
    });
    timeline.set(els, { autoAlpha: 1 }, at);
    return;
  }

  const label = anchor(timeline, at);

  els.forEach((el, index) => {
    // Build the column: whole turns of 0–9, then the digit, then the digit
    // it rolls over to. Nothing measures until the column is in the DOM.
    const turns = 1 + index;
    const cells: string[] = [];
    for (let turn = 0; turn < turns; turn += 1) {
      for (let n = 0; n <= 9; n += 1) {
        cells.push(String(n));
      }
    }
    cells.push(at$(digits, index), at$(next, index));

    // Pin the slot to the size it already has, so the column of numerals
    // scrolls inside it instead of stretching the page ten digits tall.
    const box = el.getBoundingClientRect();
    el.style.height = `${box.height}px`;
    el.style.minWidth = `${box.width}px`;
    el.style.overflow = "hidden";
    el.style.position = "relative";
    el.textContent = "";

    const column = document.createElement("span");
    column.setAttribute("aria-hidden", "true");
    column.style.display = "block";
    column.style.willChange = "transform";
    for (const cell of cells) {
      const line = document.createElement("span");
      line.style.display = "block";
      line.textContent = cell;
      column.append(line);
    }
    el.append(column);
    // Keep the value readable to assistive tech, which cannot see a column.
    el.setAttribute("aria-label", increment ? at$(next, index) : at$(digits, index));

    const cellHeight = (column.firstElementChild as HTMLElement | null)?.offsetHeight ?? 0;
    if (cellHeight === 0) {
      el.textContent = at$(digits, index);
      return;
    }
    // Index of the settled digit, and of the one it rolls over to.
    const settled = cells.length - 2;

    timeline.set(el, { autoAlpha: 1 }, label);
    timeline.fromTo(
      column,
      { y: 0 },
      {
        y: -settled * cellHeight,
        duration: duration + index * 0.12,
        ease: "power3.out",
      },
      after(label, index * stagger),
    );

    if (increment && at$(next, index) !== at$(digits, index)) {
      timeline.to(
        column,
        { y: -(settled + 1) * cellHeight, duration: 0.42, ease: "power2.inOut" },
        after(label, duration + els.length * stagger + incrementDelay),
      );
    }
  });
}

/* ----------------------------------------------------------- the status */

/**
 * The status bar filling. Pass either the dashed segments (each is switched
 * on in turn) or a single bar, which is clipped from the right — never
 * resized, so nothing around it moves. Chunky and uneven, like a transfer.
 */
export function progressSteps(
  timeline: gsap.core.Timeline,
  target: HTMLElement | Iterable<Element | null | undefined> | null,
  at: At,
  {
    duration = 2.4,
    steps = 9,
    to = 1,
    from = 0,
    seed = 31,
  }: { duration?: number; steps?: number; to?: number; from?: number; seed?: number } = {},
): void {
  if (!target) {
    return;
  }
  const isBar = target instanceof HTMLElement;
  const segments = isBar ? [] : elements(target);
  if (!isBar && segments.length === 0) {
    return;
  }

  const settle = (progress: number) => {
    if (isBar) {
      gsap.set(target, { clipPath: `inset(0 ${(1 - progress) * 100}% 0 0)`, autoAlpha: 1 });
    } else {
      const lit = Math.round(segments.length * progress);
      segments.forEach((segment, index) => {
        gsap.set(segment, { autoAlpha: index < lit ? 1 : 0 });
      });
    }
  };

  if (prefersReducedMotion()) {
    timeline.call(() => settle(to), undefined, at);
    return;
  }

  const label = anchor(timeline, at);
  // Empty before the first step, so the bar never shows full and then jumps.
  timeline.call(() => settle(from), undefined, label);
  const random = seededRandom(seed);
  // Uneven step sizes that still add up to the whole distance.
  const weights = Array.from({ length: steps }, () => 0.4 + random());
  const total = weights.reduce((sum, weight) => sum + weight, 0);

  let progress = from;
  let time = 0;
  for (const weight of weights) {
    progress += ((to - from) * weight) / total;
    const value = Math.min(to, progress);
    timeline.call(() => settle(value), undefined, after(label, time));
    // Long stalls and quick bursts, in the same proportion as the steps.
    time += (duration * weight) / total;
  }
  timeline.call(() => settle(to), undefined, after(label, duration));
}

/**
 * `Connecting to www.geocities.com...` → `Waiting for reply...` →
 * `Transferring data...` → `Document: Done`. The messages land at uneven
 * intervals across `duration`; the last one is the settled state, so under
 * reduced motion it is simply written straight away.
 */
export function statusCycle(
  timeline: gsap.core.Timeline,
  el: HTMLElement | null,
  messages: string[],
  at: At,
  { duration = 2.6, seed = 41 }: { duration?: number; seed?: number } = {},
): void {
  if (!el || messages.length === 0) {
    return;
  }
  const last = messages[messages.length - 1] ?? "";
  if (prefersReducedMotion()) {
    timeline.call(
      () => {
        el.textContent = last;
      },
      undefined,
      at,
    );
    return;
  }
  const label = anchor(timeline, at);
  const random = seededRandom(seed);
  const weights = messages.map(() => 0.5 + random());
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let time = 0;
  messages.forEach((message, index) => {
    timeline.call(
      () => {
        el.textContent = message;
      },
      undefined,
      after(label, time),
    );
    time += (duration * (weights[index] ?? 1)) / total;
  });
}

/* -------------------------------------------------------------- badges */

/**
 * A badge stamped onto the page: it appears a size too big and, one frame
 * later, is the right size. Two steps, no tween — the 90s way of landing.
 */
export function stampIn(
  timeline: gsap.core.Timeline,
  targets: Iterable<Element | null | undefined>,
  at: At,
  { stagger = 0.13, hold = 0.09 }: { stagger?: number; hold?: number } = {},
): void {
  const els = elements(targets);
  if (els.length === 0) {
    return;
  }
  if (prefersReducedMotion()) {
    timeline.set(els, { autoAlpha: 1, scale: 1 }, at);
    return;
  }
  const label = anchor(timeline, at);
  els.forEach((el, index) => {
    timeline.set(
      el,
      { autoAlpha: 1, scale: 1.15, transformOrigin: "50% 50%" },
      after(label, index * stagger),
    );
    timeline.set(el, { scale: 1 }, after(label, index * stagger + hold));
  });
}

/* --------------------------------------------------------------- media */

/**
 * An image arriving the way an interlaced GIF did: in horizontal bands, over
 * a coarse stand-in for the rows that have not come yet, behind a gray
 * placeholder with a broken-image glyph until the first band lands.
 *
 * `wrapper` is a `.web-interlace` element (see app/looks/earlyweb.css for
 * the DOM and the custom properties). Each pass widens `--web-band` within
 * the fixed `--web-period` of rows — 2px of every 16, then 4, then 8, then
 * all 16 — and sharpens the stand-in underneath. The passes are `set` calls,
 * so they land as hard as a scanline pass did.
 */
export function interlaceIn(
  timeline: gsap.core.Timeline,
  wrapper: HTMLElement | null,
  at: At,
  {
    wait = 0.5,
    step = 0.28,
    period = 16,
  }: { wait?: number; step?: number; period?: number } = {},
): void {
  if (!wrapper) {
    return;
  }
  const placeholder = wrapper.querySelector<HTMLElement>("[data-web-placeholder]");
  const coarse = wrapper.querySelector<HTMLElement>("[data-web-img-coarse]");

  const settle = () => {
    gsap.set(wrapper, { "--web-band": `${period}px`, "--web-period": `${period}px` });
    if (coarse) {
      gsap.set(coarse, { autoAlpha: 0 });
    }
    if (placeholder) {
      gsap.set(placeholder, { autoAlpha: 0 });
    }
  };

  if (prefersReducedMotion()) {
    timeline.set(wrapper, { autoAlpha: 1 }, at);
    timeline.call(settle, undefined, at);
    return;
  }

  const label = anchor(timeline, at);
  // Nothing but the placeholder while the bytes are still coming.
  timeline.set(wrapper, { autoAlpha: 1, "--web-period": `${period}px`, "--web-band": "0px" }, label);
  if (placeholder) {
    timeline.set(placeholder, { autoAlpha: 1 }, label);
  }
  if (coarse) {
    timeline.set(coarse, { autoAlpha: 0 }, label);
  }

  // Pass 1 uncovers the placeholder and paints one row in eight.
  const passes: { band: number; blur: number }[] = [
    { band: period / 8, blur: 9 },
    { band: period / 4, blur: 6 },
    { band: period / 2, blur: 3 },
    { band: period, blur: 0 },
  ];
  passes.forEach((pass, index) => {
    const time = wait + index * step;
    if (index === 0) {
      if (placeholder) {
        timeline.set(placeholder, { autoAlpha: 0 }, after(label, time));
      }
      if (coarse) {
        timeline.set(coarse, { autoAlpha: 1 }, after(label, time));
      }
    }
    timeline.set(
      wrapper,
      { "--web-band": `${pass.band}px`, "--web-coarse": `${pass.blur}px` },
      after(label, time),
    );
    if (index === passes.length - 1 && coarse) {
      timeline.set(coarse, { autoAlpha: 0 }, after(label, time));
    }
  });
}

/**
 * A marquee that stutters. GSAP moves the strip, but a modifier snaps the
 * offset to whole `amount` pixels, so it advances in the visible jumps the
 * `<marquee>` element made at its `scrollamount`, rather than gliding.
 *
 * `strip` must already contain its content **twice** (the second copy
 * `aria-hidden`), so the wrap is seamless; the effect measures half the
 * scroll width and never touches the DOM. Returns a teardown.
 */
export function marquee(
  strip: HTMLElement | null,
  {
    amount = 6,
    fps = 20,
    pauseOnHover = true,
  }: { amount?: number; fps?: number; pauseOnHover?: boolean } = {},
): () => void {
  if (!strip || prefersReducedMotion()) {
    return () => {};
  }
  const half = strip.scrollWidth / 2;
  if (half < 1) {
    return () => {};
  }
  const snap = Math.max(1, amount);
  const tween = gsap.to(strip, {
    x: -half,
    duration: half / (snap * Math.max(1, fps)),
    ease: "none",
    repeat: -1,
    modifiers: {
      x: (value: string) => {
        const wrapped = gsap.utils.wrap(-half, 0, Number.parseFloat(value));
        return `${Math.round(wrapped / snap) * snap}px`;
      },
    },
  });

  const host = strip.parentElement ?? strip;
  const stop = () => tween.pause();
  const start = () => tween.resume();
  if (pauseOnHover) {
    host.addEventListener("pointerenter", stop);
    host.addEventListener("pointerleave", start);
    host.addEventListener("focusin", stop);
    host.addEventListener("focusout", start);
  }

  return () => {
    if (pauseOnHover) {
      host.removeEventListener("pointerenter", stop);
      host.removeEventListener("pointerleave", start);
      host.removeEventListener("focusin", stop);
      host.removeEventListener("focusout", start);
    }
    tween.kill();
    gsap.set(strip, { clearProps: "transform" });
  };
}

/* -------------------------------------------------------------- pointer */

const SPARKLE_GLYPHS = ["✦", "*", "✧", "·"];
const SPARKLE_COLORS = ["#ff0000", "#ff8000", "#ffff00", "#00ff00", "#00ffff", "#ff00ff"];

/**
 * The cursor trail. Rainbow sparkles are dropped behind the pointer and
 * drift down as they fade. A fixed, clipped, pointer-events-none layer holds
 * them, so nothing they do can shift the page or widen its scroll; the
 * elements are pooled and reused, so a long drag cannot spawn thousands.
 *
 * Fine pointers only — a touch device has nothing to leave a trail behind —
 * and nothing at all under reduced motion. Returns a teardown.
 */
export function sparkleTrail(
  root: HTMLElement | null,
  { count = 18, distance = 14 }: { count?: number; distance?: number } = {},
): () => void {
  if (!root || prefersReducedMotion()) {
    return () => {};
  }
  if (typeof window === "undefined" || !window.matchMedia("(pointer: fine)").matches) {
    return () => {};
  }

  const layer = document.createElement("div");
  layer.className = "web-sparkle-layer";
  layer.setAttribute("aria-hidden", "true");
  document.body.append(layer);

  const pool: HTMLElement[] = [];
  for (let index = 0; index < count; index += 1) {
    const sparkle = document.createElement("span");
    sparkle.className = "web-sparkle";
    layer.append(sparkle);
    pool.push(sparkle);
  }

  let next = 0;
  let lastX = 0;
  let lastY = 0;

  const onMove = (event: PointerEvent) => {
    // One sparkle per `distance` px of travel, so speed sets the density.
    if (Math.hypot(event.clientX - lastX, event.clientY - lastY) < distance) {
      return;
    }
    lastX = event.clientX;
    lastY = event.clientY;

    const sparkle = pool[next];
    next = (next + 1) % pool.length;
    if (!sparkle) {
      return;
    }
    sparkle.textContent = SPARKLE_GLYPHS[Math.floor(Math.random() * SPARKLE_GLYPHS.length)] ?? "*";
    sparkle.style.color =
      SPARKLE_COLORS[Math.floor(Math.random() * SPARKLE_COLORS.length)] ?? "#ff0000";
    gsap.set(sparkle, { left: event.clientX, top: event.clientY, xPercent: -50, yPercent: -50 });
    gsap.fromTo(
      sparkle,
      { autoAlpha: 1, scale: gsap.utils.random(0.7, 1.3), x: 0, y: 0 },
      {
        autoAlpha: 0,
        scale: 0.3,
        x: gsap.utils.random(-10, 10),
        y: gsap.utils.random(16, 34),
        duration: gsap.utils.random(0.6, 1),
        ease: "power1.in",
        overwrite: true,
      },
    );
  };

  root.addEventListener("pointermove", onMove);
  return () => {
    root.removeEventListener("pointermove", onMove);
    gsap.killTweensOf(pool);
    layer.remove();
  };
}
