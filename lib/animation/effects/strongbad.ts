"use client";

import { gsap, prefersReducedMotion } from "@/components/motion";

/*
 * Strong Bad.
 *
 * The motion vocabulary of a 2003 Flash cartoon, which is to say slapstick.
 * Nothing here arrives politely. Stickers are slapped down from twice their
 * size and squash on impact, speech bubbles spring out of their own tails,
 * tabs pop up off the black bar, the Compy 386 boots with a line of light
 * that opens into a screen, green text is typed a character at a time on a
 * stepped clock, and a boxing glove comes in from off-screen and hits things
 * so they rumble.
 *
 * Three rules run through all of it.
 *
 * 1. **Everything overshoots.** `back.out(2)`, `elastic.out(1, 0.5)` and
 *    `bounce.out` do the arriving; `power4.in` does the hitting. A thing that
 *    lands on its mark without passing it first has not landed hard enough.
 * 2. **Impact is squash.** Scale is never uniform on the beat of a hit: the
 *    target goes wide and short, then springs back through 1.
 * 3. **Ink does not blur.** Hard shadows appear at the moment of impact, not
 *    on the way down, so the thing reads as flat until it hits the page.
 *
 * Shape of the API, following lib/animation/effects/constructivist.ts and
 * earlyweb.ts: the sequencing functions take `(timeline, targets, at,
 * options)`, add themselves to the timeline at `at`, and return whatever the
 * caller has to hand back later. The loop factories take a target and return
 * a tween, timeline or teardown to kill on unmount.
 *
 * Reduced motion is handled **inside every function**, as in earlyweb.ts
 * rather than constructivist.ts: each one snaps to its settled state and
 * returns early instead. That makes all of them safe to call unconditionally
 * from `useGSAP`, and means no caller can forget.
 */

type At = number | string;

/* -------------------------------------------------------------- helpers */

function elements(input: Iterable<Element | null | undefined>): HTMLElement[] {
  return Array.from(input).filter((el): el is HTMLElement => el instanceof HTMLElement);
}

/**
 * The look's ink, read off the element rather than hard-coded, so a shadow
 * built in JavaScript matches the one the stylesheet draws. GSAP interpolates
 * a box-shadow by tweening the numbers inside the string, which only works if
 * both ends spell the colour the same way; `var(--sb-ink)` does not survive
 * that, a resolved colour does.
 */
function inkOf(el: Element): string {
  const value = getComputedStyle(el).getPropertyValue("--sb-ink").trim();
  return value || "#1b1b1b";
}

/** A hard offset shadow, n pixels down and right, in the look's ink. */
function hardShadow(ink: string, offset: number): string {
  return `${offset}px ${offset}px 0px ${ink}`;
}

/** The targets, resolved to real nodes, so each can be animated on its own. */
function resolve(targets: gsap.TweenTarget): Element[] {
  return gsap.utils.toArray<Element>(targets);
}

/**
 * The angle an element is already sitting at. Half the stickers in this look
 * wear a resting tilt from the stylesheet, and a tween that drives rotation
 * to a flat 0 straightens them on the way in and then lets them snap back to
 * the tilt the moment its inline transform is cleared. Everything here that
 * touches rotation reads this first and works either side of it, so a tilt is
 * a starting point rather than something to be undone.
 *
 * Read it before anything else is set on the element: GSAP caches an
 * element's transform the first time it touches it, so a value read after a
 * `set` or a `fromTo` is the animation's own and not the stylesheet's.
 */
function restAngle(el: Element): number {
  const value = Number(gsap.getProperty(el, "rotation"));
  return Number.isFinite(value) ? value : 0;
}

/* ------------------------------------------------------------ entrances */

export type SlapOptions = {
  /** Seconds for the fall itself, before the squash and the spring. */
  duration?: number;
  /** The scale it falls from. */
  from?: number;
  /** Degrees it is rotated by on the way down, straightening on impact. */
  rotate?: number;
  stagger?: number;
  /**
   * Which shadow to hold back until the moment of impact. `"box"` for a card
   * or a pill, `"text"` for sticker type, `"none"` to leave the CSS alone.
   */
  shadow?: "box" | "text" | "none";
};

/**
 * A sticker or a numeral is slapped onto the page: it falls from twice its
 * size and a few degrees off square, squashes wide and short on impact, and
 * springs back through 1. The hard shadow is suppressed until it lands, so
 * the thing is flat in the air and dropped on the page after.
 *
 * Every target gets its own little timeline, offset by the stagger. That is
 * not tidiness: a squash belongs to the impact that caused it, and one shared
 * chain would hold the first sticker flat on the page until the last one had
 * finished falling. It also lets each element fall around its own resting
 * angle, so a sticker that wears a tilt in CSS keeps it.
 */
export function slapDown(
  timeline: gsap.core.Timeline,
  targets: gsap.TweenTarget,
  at: At,
  { duration = 0.36, from = 2.2, rotate = -8, stagger = 0.06, shadow = "none" }: SlapOptions = {},
): void {
  if (prefersReducedMotion()) {
    timeline.set(targets, { autoAlpha: 1, clearProps: "transform" }, at);
    return;
  }
  const els = resolve(targets);
  if (els.length === 0) {
    return;
  }
  const property = shadow === "box" ? "boxShadow" : "textShadow";
  const run = gsap.timeline();
  els.forEach((el, index) => {
    const rest = restAngle(el);
    const own = gsap.timeline();
    if (shadow !== "none") {
      own.set(el, { [property]: "none" }, 0);
    }
    own
      .fromTo(
        el,
        {
          autoAlpha: 0,
          scale: from,
          rotation: rest + rotate,
          transformOrigin: "50% 50%",
          willChange: "transform, opacity",
        },
        { autoAlpha: 1, scale: 1, rotation: rest, duration, ease: "power4.in" },
        0,
      )
      // The impact: wide and short for two frames, then the spring back.
      .to(el, { scaleX: 1.15, scaleY: 0.8, duration: 0.08, ease: "power2.out" }, ">");
    if (shadow !== "none") {
      own.set(el, { clearProps: property }, "<");
    }
    own
      .to(el, { scaleX: 1, scaleY: 1, duration: 0.5, ease: "elastic.out(1, 0.5)" }, ">")
      .set(el, { clearProps: "transform,willChange" }, ">");
    run.add(own, index * stagger);
  });
  timeline.add(run, at);
}

/**
 * A speech bubble grows out of its own tail. The origin is the corner the
 * tail hangs off, so the card looks like it is being said rather than placed,
 * and it rocks a couple of degrees on the way out.
 */
export function bubbleIn(
  timeline: gsap.core.Timeline,
  targets: gsap.TweenTarget,
  at: At,
  {
    duration = 0.72,
    origin = "0% 30%",
    rotate = -4,
    stagger = 0.08,
  }: { duration?: number; origin?: string; rotate?: number; stagger?: number } = {},
): void {
  if (prefersReducedMotion()) {
    timeline.set(targets, { autoAlpha: 1, clearProps: "transform" }, at);
    return;
  }
  const els = resolve(targets);
  if (els.length === 0) {
    return;
  }
  const run = gsap.timeline();
  els.forEach((el, index) => {
    const rest = restAngle(el);
    run
      .fromTo(
        el,
        {
          autoAlpha: 0,
          scale: 0.35,
          rotation: rest + rotate,
          transformOrigin: origin,
          willChange: "transform, opacity",
        },
        {
          autoAlpha: 1,
          scale: 1,
          rotation: rest,
          duration,
          ease: "elastic.out(1, 0.5)",
        },
        index * stagger,
      )
      .set(el, { clearProps: "transform,willChange" }, index * stagger + duration);
  });
  timeline.add(run, at);
}

/**
 * Tabs pop up off the black bar, one after the next. They come from below
 * their resting line and overshoot it, so the row reads as being pushed up
 * from behind the horizon rather than faded in above it. Give the row a
 * `clip-path` cut at the bar if you want the travel hidden completely.
 */
export function tabsRise(
  timeline: gsap.core.Timeline,
  targets: gsap.TweenTarget,
  at: At,
  {
    duration = 0.5,
    stagger = 0.07,
    distance = 28,
  }: { duration?: number; stagger?: number; distance?: number } = {},
): void {
  if (prefersReducedMotion()) {
    timeline.set(targets, { autoAlpha: 1, clearProps: "transform" }, at);
    return;
  }
  const run = gsap.timeline();
  run
    .fromTo(
      targets,
      {
        autoAlpha: 0,
        y: distance,
        scaleY: 0.72,
        transformOrigin: "50% 100%",
        willChange: "transform, opacity",
      },
      {
        autoAlpha: 1,
        y: 0,
        scaleY: 1,
        duration,
        ease: "back.out(2)",
        stagger,
      },
      0,
    )
    .set(targets, { clearProps: "transform,willChange" }, ">");
  timeline.add(run, at);
}

/**
 * The Compy 386 powers on. A two-pixel line of light flashes across the
 * middle of the glass, opens out to the full height of the screen, and the
 * brightness ramps down out of the flare into the phosphor's normal level.
 * Whatever is on the screen should be typed after this, not during it.
 */
export function crtBoot(
  timeline: gsap.core.Timeline,
  screen: HTMLElement | null,
  at: At,
  { duration = 0.6 }: { duration?: number } = {},
): void {
  if (!screen) {
    return;
  }
  if (prefersReducedMotion()) {
    timeline.set(screen, { autoAlpha: 1, clearProps: "clipPath,filter" }, at);
    return;
  }
  /*
   * Built on its own timeline and dropped in at `at`. Every step here is
   * placed at an absolute second inside that run, so the boot is the same
   * whether it is the first thing on the caller's timeline or the last: a
   * relative ">" would mean "the end of everything added so far", which is
   * only the end of this effect by accident.
   */
  const run = gsap.timeline();
  run
    .set(
      screen,
      {
        autoAlpha: 1,
        clipPath: "inset(49.8% 0% 49.8% 0%)",
        filter: "brightness(3.4)",
        willChange: "clip-path, filter",
      },
      0,
    )
    // The line sits there for a beat, the way a tube takes a moment to decide.
    .to(screen, { clipPath: "inset(49.4% 0% 49.4% 0%)", duration: 0.14, ease: "none" }, 0)
    .to(screen, { clipPath: "inset(0% 0% 0% 0%)", duration, ease: "power3.out" }, 0.14)
    .to(screen, { filter: "brightness(1)", duration: 0.45, ease: "power2.out" }, 0.19)
    .set(screen, { clearProps: "clipPath,filter,willChange" }, Math.max(0.14 + duration, 0.64));
  timeline.add(run, at);
}

/* --------------------------------------------------------------- typing */

/** What `typeOut` hands back: the characters it made, and how to undo them. */
export type TypeRun = {
  chars: HTMLElement[];
  /** Puts the container's original markup back. */
  revert: () => void;
};

/**
 * Splits every text node under `container` into one span per character,
 * leaving the elements around them exactly where they were. SplitText would
 * do this too, but it normalises whitespace, and the Compy's screen is a
 * `<pre>`: its newlines and its runs of spaces are the layout. Walking the
 * text nodes keeps every one of them, and keeps the `.sb-dim` and `.sb-hi`
 * spans wrapped around their characters, so the colours survive the split.
 */
function splitChars(container: HTMLElement): HTMLElement[] {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  while (walker.nextNode()) {
    texts.push(walker.currentNode as Text);
  }
  const chars: HTMLElement[] = [];
  for (const node of texts) {
    const value = node.nodeValue ?? "";
    if (!value) {
      continue;
    }
    const fragment = document.createDocumentFragment();
    for (const character of value) {
      const span = document.createElement("span");
      span.textContent = character;
      fragment.append(span);
      chars.push(span);
    }
    node.replaceWith(fragment);
  }
  return chars;
}

export type TypeOutOptions = {
  /** Characters per second. Strong Bad types faster than the people writing to him. */
  cps?: number;
  /**
   * A block cursor to walk along behind the text. Put it in the markup just
   * after `container`; the run walks it in among the characters and lifts it
   * back out again when the line is blanked or the run is reverted.
   */
  cursor?: HTMLElement | null;
  /** Called as each character lands, for a keyclick or a screen flicker. */
  onChar?: (index: number, char: HTMLElement) => void;
};

/**
 * Green text typed onto the screen. The container is split per character and
 * the characters are revealed on a `steps` clock, so the line arrives on a
 * hard machine rhythm with no easing in it at all. Characters that have not
 * arrived yet are hidden rather than removed, so the block holds its full
 * height from the first frame and nothing below it reflows.
 *
 * Returns the run so the caller can revert the split on unmount, or `null`
 * under reduced motion, where the text is simply already there.
 */
export function typeOut(
  timeline: gsap.core.Timeline,
  container: HTMLElement | null,
  at: At,
  { cps = 34, cursor = null, onChar }: TypeOutOptions = {},
): TypeRun | null {
  if (!container) {
    return null;
  }
  if (prefersReducedMotion()) {
    timeline.set(container, { autoAlpha: 1 }, at);
    if (cursor) {
      timeline.set(cursor, { autoAlpha: 1 }, at);
    }
    return null;
  }
  const original = container.innerHTML;
  const chars = splitChars(container);
  gsap.set(chars, { autoAlpha: 0 });
  gsap.set(container, { autoAlpha: 1 });

  // Where the markup left the cursor, so a repeat can put it back there.
  const home = { parent: cursor?.parentNode ?? null, next: cursor?.nextSibling ?? null };
  const state = { n: 0 };
  let shown = 0;
  const paint = (count: number) => {
    const next = Math.max(0, Math.min(chars.length, count));
    // Winding backwards blanks the line again, so the tween can be put on a
    // repeating timeline and simply type the whole thing out once more.
    while (shown > next) {
      shown -= 1;
      const char = chars[shown];
      if (char) {
        gsap.set(char, { autoAlpha: 0 });
      }
    }
    while (shown < next) {
      const char = chars[shown];
      if (char) {
        gsap.set(char, { autoAlpha: 1 });
        onChar?.(shown, char);
      }
      shown += 1;
    }
    // The cursor walks with the text: unrevealed characters still hold their
    // boxes, so a cursor parked at the end would sit at the end of the line
    // rather than behind the last letter typed. At zero it goes back where
    // the markup put it, ready for the line to be typed again.
    if (!cursor) {
      return;
    }
    const last = chars[next - 1];
    if (last) {
      last.after(cursor);
    } else if (home.parent) {
      home.parent.insertBefore(cursor, home.next);
    }
  };

  timeline.to(
    state,
    {
      n: chars.length,
      duration: chars.length / Math.max(1, cps),
      ease: `steps(${Math.max(1, chars.length)})`,
      onUpdate: () => paint(Math.round(state.n)),
      onComplete: () => paint(chars.length),
    },
    at,
  );

  return {
    chars,
    revert: () => {
      gsap.killTweensOf(chars);
      // The cursor walks in among the characters, so it has to be lifted back
      // out before the original markup is put back over the top of them.
      if (cursor && home.parent) {
        home.parent.insertBefore(cursor, home.next);
      }
      container.innerHTML = original;
    },
  };
}

/* ---------------------------------------------------------------- impact */

/**
 * A short jitter, a handful of frames of it, on whatever was just hit. Not an
 * ease in sight: a rumble is a machine shaking, not a thing springing.
 */
export function rumble(
  timeline: gsap.core.Timeline,
  targets: gsap.TweenTarget,
  at: At,
  { amount = 6, duration = 0.3 }: { amount?: number; duration?: number } = {},
): void {
  if (prefersReducedMotion()) {
    return;
  }
  const step = duration / 6;
  const run = gsap.timeline();
  run
    .set(targets, { willChange: "transform" }, 0)
    .to(
      targets,
      {
        keyframes: [
          { x: -amount, y: amount * 0.4, duration: step },
          { x: amount, y: -amount * 0.3, duration: step },
          { x: -amount * 0.6, y: amount * 0.2, duration: step },
          { x: amount * 0.5, y: 0, duration: step },
          { x: -amount * 0.25, y: 0, duration: step },
          { x: 0, y: 0, duration: step },
        ],
        ease: "none",
      },
      0,
    )
    .set(targets, { clearProps: "willChange" }, duration);
  timeline.add(run, at);
}

/**
 * The whole stage takes a hit: a bigger, slower rumble with a little rotation
 * in it, for the beat where something lands hard enough to move the camera.
 */
export function shake(
  timeline: gsap.core.Timeline,
  targets: gsap.TweenTarget,
  at: At,
  { amount = 12, duration = 0.42 }: { amount?: number; duration?: number } = {},
): void {
  if (prefersReducedMotion()) {
    return;
  }
  const els = resolve(targets);
  if (els.length === 0) {
    return;
  }
  const step = duration / 5;
  const run = gsap.timeline();
  for (const el of els) {
    // Around whatever angle the thing is already at, not around zero.
    const rest = restAngle(el);
    run
      .set(el, { transformOrigin: "50% 50%", willChange: "transform" }, 0)
      .to(
        el,
        {
          keyframes: [
            { x: amount, y: -amount * 0.5, rotation: rest + 1.2, duration: step },
            { x: -amount * 0.8, y: amount * 0.4, rotation: rest - 1, duration: step },
            { x: amount * 0.5, y: -amount * 0.2, rotation: rest + 0.6, duration: step },
            { x: -amount * 0.25, y: 0, rotation: rest - 0.3, duration: step },
            { x: 0, y: 0, rotation: rest, duration: step, ease: "power2.out" },
          ],
          ease: "none",
        },
        0,
      )
      .set(el, { clearProps: "transform,willChange" }, duration);
  }
  timeline.add(run, at);
}

export type PunchOptions = {
  /** Which edge the glove comes in from. */
  from?: "bottom" | "top" | "left" | "right";
  /** How far off-screen it starts, in pixels. */
  distance?: number;
  /** Seconds for the swing itself. */
  duration?: number;
  /** How hard the thing it hits rumbles. */
  amount?: number;
};

/**
 * A boxing glove comes in from off-screen, accelerating the whole way
 * (`power4.in`, because a punch is all arrival), connects, and pulls back
 * while whatever it hit squashes and rumbles.
 */
export function punchIn(
  timeline: gsap.core.Timeline,
  glove: HTMLElement | null,
  targets: gsap.TweenTarget | null,
  at: At,
  { from = "bottom", distance = 340, duration = 0.26, amount = 8 }: PunchOptions = {},
): void {
  if (!glove) {
    return;
  }
  const axis = from === "left" || from === "right" ? "x" : "y";
  const sign = from === "bottom" || from === "right" ? 1 : -1;
  if (prefersReducedMotion()) {
    timeline.set(glove, { autoAlpha: 1, clearProps: "transform" }, at);
    return;
  }
  // A punch on its own timeline, timed from the moment of contact, so two
  // gloves can be thrown at the same keyboard from different beats of the
  // caller's timeline without either one waiting on the other.
  const run = gsap.timeline();
  run
    .fromTo(
      glove,
      { autoAlpha: 1, [axis]: sign * distance, willChange: "transform" },
      // Held back until the swing actually starts. A `fromTo` renders its
      // start state the moment it is built, which for a punch scheduled nine
      // seconds out would park the glove off-screen for the nine seconds in
      // between.
      { [axis]: 0, duration, ease: "power4.in", immediateRender: false },
      0,
    )
    // Connect, then withdraw a little, the way a fist rebounds off what it hit.
    .to(glove, { [axis]: sign * distance * 0.16, duration: 0.14, ease: "power2.out" }, duration)
    .to(glove, { [axis]: 0, duration: 0.45, ease: "elastic.out(1, 0.5)" }, duration + 0.14)
    .set(glove, { clearProps: "willChange" }, duration + 0.59);
  if (targets) {
    run
      .to(
        targets,
        { scaleX: 1.12, scaleY: 0.86, transformOrigin: "50% 100%", duration: 0.09, ease: "power2.out" },
        duration,
      )
      .to(targets, { scaleX: 1, scaleY: 1, duration: 0.5, ease: "elastic.out(1, 0.45)" }, duration + 0.09);
    rumble(run, targets, duration, { amount, duration: 0.3 });
  }
  timeline.add(run, at);
}

/**
 * The sbemail gag. The screen's text blanks in three stepped flashes, a white
 * flare goes across the glass, `DELETED!!` is slapped down over the top of it
 * in huge green VT323, and the Compy jolts. The flare is built here and taken
 * away again, so the caller only has to hand over the two elements.
 *
 * `screen` defaults to the text's own parent, which under this look is the
 * `.sb-crt` — positioned and clipped already, which the flare needs.
 *
 * The whole gag is under two thirds of a second, and every beat of it is
 * pinned to an absolute second on its own timeline. It is the last thing a
 * visitor sees of this page before the route swaps, so its length is a
 * promise the caller schedules the handoff against.
 */
export function deleted(
  timeline: gsap.core.Timeline,
  text: HTMLElement | null,
  banner: HTMLElement | null,
  at: At,
  { screen = null, duration = 0.34 }: { screen?: HTMLElement | null; duration?: number } = {},
): void {
  if (!text || !banner) {
    return;
  }
  const glass = screen ?? text.parentElement;
  if (prefersReducedMotion()) {
    timeline.set(text, { autoAlpha: 0 }, at).set(banner, { autoAlpha: 1 }, at);
    return;
  }
  const run = gsap.timeline();
  // Flashes on a hard clock, then the line is gone.
  run
    .to(text, { autoAlpha: 0, duration: 0.05, repeat: 3, yoyo: true, ease: "steps(1)" }, 0)
    .set(text, { autoAlpha: 0 }, 0.2);

  if (glass) {
    const flare = document.createElement("i");
    flare.setAttribute("aria-hidden", "true");
    Object.assign(flare.style, {
      position: "absolute",
      inset: "0",
      zIndex: "3",
      background: "#ffffff",
      opacity: "0",
      pointerEvents: "none",
    } satisfies Partial<CSSStyleDeclaration>);
    glass.append(flare);
    run
      .set(flare, { opacity: 1 }, 0.2)
      .to(flare, { opacity: 0, duration: 0.3, ease: "power2.out" }, 0.22)
      .call(() => flare.remove(), undefined, 0.52);
  }

  // Out of the flare, not after it: the banner is what the flare was hiding.
  slapDown(run, banner, 0.22, { duration, from: 2.6, rotate: -5, shadow: "text" });
  if (glass) {
    rumble(run, glass, 0.22, { amount: 10, duration: 0.34 });
  }
  timeline.add(run, at);
}

/* --------------------------------------------------------------- figures */

/**
 * A glove counter counts up to its number. The count is snapped to the value's
 * own precision, so a whole number never shows a decimal on its way there.
 */
export function countUp(
  timeline: gsap.core.Timeline,
  el: HTMLElement | null,
  at: At,
  value: string,
  { duration = 1 }: { duration?: number } = {},
): void {
  if (!el) {
    return;
  }
  const decimals = (value.split(".")[1] ?? "").length;
  const target = Number.parseFloat(value);
  if (Number.isNaN(target)) {
    return;
  }
  if (prefersReducedMotion()) {
    timeline.call(() => {
      el.textContent = value;
    }, undefined, at);
    return;
  }
  const counter = { n: 0 };
  const step = 10 ** -decimals;
  timeline.to(
    counter,
    {
      n: target,
      duration,
      ease: "power2.out",
      snap: { n: step },
      onUpdate: () => {
        el.textContent = counter.n.toFixed(decimals);
      },
      onComplete: () => {
        el.textContent = value;
      },
    },
    at,
  );
}

/**
 * Hearts beat: two quick beats, a pause, two more. Staggered, because three
 * hearts beating in unison looks like one heart drawn three times.
 */
export function heartbeat(
  timeline: gsap.core.Timeline,
  targets: gsap.TweenTarget,
  at: At,
  { scale = 1.25, stagger = 0.08 }: { scale?: number; stagger?: number } = {},
): void {
  if (prefersReducedMotion()) {
    return;
  }
  const run = gsap.timeline();
  run
    .set(targets, { transformOrigin: "50% 50%", willChange: "transform" }, 0)
    .to(
      targets,
      {
        keyframes: [
          { scale, duration: 0.11, ease: "power2.out" },
          { scale: 1, duration: 0.16, ease: "power2.in" },
          { scale, duration: 0.11, ease: "power2.out" },
          { scale: 1, duration: 0.24, ease: "power2.in" },
        ],
        stagger,
      },
      0,
    )
    .set(targets, { clearProps: "transform,willChange" }, ">");
  timeline.add(run, at);
}

/**
 * A polaroid is tossed onto the page from below: it comes up spinning past
 * its resting angle, settles into it, and the strip of tape is slapped across
 * the top afterwards, once the photo has stopped moving.
 */
export function polaroidToss(
  timeline: gsap.core.Timeline,
  photo: HTMLElement | null,
  tape: HTMLElement | null,
  at: At,
  {
    duration = 0.72,
    distance = 120,
    rotate = 9,
  }: { duration?: number; distance?: number; rotate?: number } = {},
): void {
  if (!photo) {
    return;
  }
  if (prefersReducedMotion()) {
    timeline.set(photo, { autoAlpha: 1 }, at);
    if (tape) {
      timeline.set(tape, { autoAlpha: 1, clearProps: "transform" }, at);
    }
    return;
  }
  // The photo carries its own resting tilt in CSS, and GSAP animates rotation
  // in absolute degrees, so the overshoot is measured out from that tilt and
  // lands back on it rather than on a flat zero.
  const rest = restAngle(photo);
  timeline
    .fromTo(
      photo,
      {
        autoAlpha: 0,
        y: distance,
        rotation: rest + rotate,
        scale: 0.86,
        willChange: "transform, opacity",
      },
      { autoAlpha: 1, y: 0, rotation: rest, scale: 1, duration, ease: "back.out(1.7)" },
      at,
    )
    .set(photo, { clearProps: "willChange" }, ">");
  if (tape) {
    slapDown(timeline, tape, ">-0.15", { duration: 0.22, from: 1.9, rotate: 14, shadow: "none" });
  }
}

/* ----------------------------------------------------------------- loops */

/**
 * A sticker that will not sit still: it rocks a couple of degrees either way,
 * slowly, forever. Each one rocks around the angle it was already sitting at,
 * so a sticker stuck on at a tilt keeps its tilt and rocks about that instead
 * of being dragged upright. Returns the tween, or `null` under reduced
 * motion, where nothing rocks at all.
 */
export function wobble(
  targets: gsap.TweenTarget,
  { angle = 2, duration = 2.6, stagger = 0.3 }: { angle?: number; duration?: number; stagger?: number } = {},
): gsap.core.Tween | null {
  if (prefersReducedMotion()) {
    return null;
  }
  const els = resolve(targets);
  if (els.length === 0) {
    return null;
  }
  // Read every resting angle up front: once the tween applies its `from`, the
  // element is no longer where the stylesheet left it.
  const rests = els.map(restAngle);
  return gsap.fromTo(
    els,
    { rotation: (index: number) => (rests[index] ?? 0) - angle },
    {
      rotation: (index: number) => (rests[index] ?? 0) + angle,
      duration,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
      stagger,
      transformOrigin: "50% 50%",
    },
  );
}

/** The block cursor: on for half a second, off for half a second, no ramp. */
export function cursorBlink(
  target: HTMLElement | null,
  { period = 1 }: { period?: number } = {},
): gsap.core.Tween | null {
  if (!target || prefersReducedMotion()) {
    return null;
  }
  return gsap.to(target, {
    autoAlpha: 0,
    duration: period / 2,
    repeat: -1,
    yoyo: true,
    ease: "steps(1)",
  });
}

/**
 * The scanlines creep down the glass. The overlay is drawn from a repeating
 * gradient with a four-pixel period, so the drift is a four-pixel loop of
 * `--sb-scan-y` and joins itself seamlessly. A custom property rather than a
 * transform: the overlay is a pseudo-element, and nothing else on the screen
 * should move.
 */
export function scanlineDrift(
  screen: HTMLElement | null,
  { duration = 7, period = 4 }: { duration?: number; period?: number } = {},
): gsap.core.Tween | null {
  if (!screen || prefersReducedMotion()) {
    return null;
  }
  return gsap.fromTo(
    screen,
    { "--sb-scan-y": "0px" },
    { "--sb-scan-y": `${period}px`, duration, ease: "none", repeat: -1 },
  );
}

/* -------------------------------------------------------------- controls */

export type ButtonPressOptions = {
  /** Pixels the button lifts on hover. */
  lift?: number;
  /** Shadow offsets, in pixels, at rest, on hover, and while pressed. */
  rest?: number;
  hover?: number;
  press?: number;
};

/**
 * Wires the look's button behaviour onto every element passed in: hovering or
 * focusing lifts the button off the page and grows its shadow, pressing
 * squashes it flat and collapses the shadow to nothing, exactly as a rubber
 * cartoon button would. Returns a teardown that removes the listeners and
 * puts the inline styles back.
 *
 * Under reduced motion the listeners are never attached and the teardown does
 * nothing: the buttons keep the stylesheet's own hover colour and no more.
 */
export function buttonPress(
  targets: Iterable<Element | null | undefined>,
  { lift = 2, rest = 4, hover = 7, press = 0 }: ButtonPressOptions = {},
): () => void {
  const els = elements(targets);
  if (els.length === 0 || prefersReducedMotion()) {
    return () => {};
  }
  const teardowns: (() => void)[] = [];
  for (const el of els) {
    const ink = inkOf(el);
    const to = (y: number, offset: number, duration: number, ease: string) => {
      gsap.to(el, { y, boxShadow: hardShadow(ink, offset), duration, ease, overwrite: "auto" });
    };
    const raise = () => to(-lift, hover, 0.18, "power2.out");
    const settle = () => to(0, rest, 0.3, "elastic.out(1, 0.6)");
    // The press takes the button below its resting line, not just back to it.
    const squash = () => to(lift, press, 0.08, "power2.in");
    const events: [string, () => void][] = [
      ["pointerenter", raise],
      ["pointerleave", settle],
      ["focus", raise],
      ["blur", settle],
      ["pointerdown", squash],
      ["pointerup", raise],
      ["pointercancel", settle],
    ];
    for (const [name, handler] of events) {
      el.addEventListener(name, handler);
    }
    teardowns.push(() => {
      for (const [name, handler] of events) {
        el.removeEventListener(name, handler);
      }
      gsap.killTweensOf(el);
      gsap.set(el, { clearProps: "transform,boxShadow" });
    });
  }
  return () => {
    for (const teardown of teardowns) {
      teardown();
    }
  };
}

/* ------------------------------------------------- added for the article */

/**
 * A heading arrives a word at a time, each one thrown up off the line and
 * overshooting its place. The caller does the splitting and hands the words
 * over, because the split has to be reverted by whoever owns it.
 */
export function wordsSlapIn(
  timeline: gsap.core.Timeline,
  targets: gsap.TweenTarget,
  at: At,
  {
    duration = 0.5,
    stagger = 0.06,
    distance = 26,
    from = 0.55,
  }: { duration?: number; stagger?: number; distance?: number; from?: number } = {},
): void {
  if (prefersReducedMotion()) {
    timeline.set(targets, { autoAlpha: 1, clearProps: "transform" }, at);
    return;
  }
  timeline
    .fromTo(
      targets,
      {
        autoAlpha: 0,
        y: distance,
        scale: from,
        rotation: -6,
        transformOrigin: "50% 100%",
        willChange: "transform, opacity",
      },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        rotation: 0,
        duration,
        ease: "back.out(2.4)",
        stagger,
      },
      at,
    )
    .set(targets, { clearProps: "transform,willChange" }, ">");
}

/**
 * `heartbeat`, forever: two beats, a pause, two more, again. Returns the
 * timeline so it can be killed the moment the hearts leave the screen, or
 * `null` under reduced motion, where nothing beats.
 */
export function heartbeatLoop(
  targets: gsap.TweenTarget,
  { gap = 0.7, stagger = 0.08 }: { gap?: number; stagger?: number } = {},
): gsap.core.Timeline | null {
  if (prefersReducedMotion()) {
    return null;
  }
  const timeline = gsap.timeline({ repeat: -1, repeatDelay: gap });
  heartbeat(timeline, targets, 0, { stagger });
  return timeline;
}
