"use client";

import { gsap, ScrollTrigger, SplitText } from "@/components/motion";

/*
 * Pinned.
 *
 * The motion vocabulary of a product keynote. A stage sticks to the viewport
 * while the page scrolls past it, and the wheel plays what happens inside:
 * one word blurs out of focus as the next blurs in; headings are typeset a
 * letter at a time from behind a mask; rules draw themselves; a frame tilts
 * up off the table; a checklist lights item by item, exactly as the thing it
 * describes happens; numerals count; a wash of light drifts from blue
 * through purple to pink; and on the way out the whole stage zooms through
 * the reader and hands off to the next route.
 *
 * Every helper takes the timeline it belongs to, its targets, the position
 * on that timeline, and its options, so a stage is written as a score.
 * Positions on a pinned stage are fractions of that stage's scroll: 0 is the
 * moment it pins, 1 the moment it lets go. Keep every tween inside that
 * range — anything past 1 lengthens the timeline and rescales the rest.
 *
 * Nothing here animates a property that costs layout. Transforms, opacity,
 * clip-path, colour and a little blur, and that is the whole palette.
 */

/** A position on a stage timeline: a fraction of the stage's scroll. */
type At = number;

/** Reads a design token off the document, since GSAP cannot tween `var()`. */
export function token(name: string, fallback: string): string {
  if (typeof document === "undefined") {
    return fallback;
  }
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/* ----------------------------------------------------------------- stages */

export type Stage = {
  /** The stage's own timeline. Its duration is 1: positions are scroll fractions. */
  timeline: gsap.core.Timeline;
  trigger: ScrollTrigger;
};

/**
 * Pins a stage to the top of the viewport and hands back a timeline scrubbed
 * by the scroll that passes it. `length` is how far the page scrolls while
 * the stage is held, as a percentage of the viewport height, so 280 is the
 * 280vh the design asks for. ScrollTrigger owns the spacer that keeps the
 * document the right height; never add one by hand.
 */
export function pinStage(
  stage: HTMLElement,
  pin: HTMLElement,
  {
    length = 280,
    scrub = 0.5,
    onToggle,
  }: {
    length?: number;
    scrub?: number;
    /** Told whenever the stage takes the viewport or gives it back. */
    onToggle?: (self: ScrollTrigger) => void;
  } = {},
): Stage {
  const timeline = gsap.timeline();
  // A dummy tween fixes the timeline at one second long, so every position
  // passed to the helpers below reads as a fraction of the stage.
  timeline.to({ progress: 0 }, { progress: 1, duration: 1, ease: "none" }, 0);
  const trigger = ScrollTrigger.create({
    animation: timeline,
    trigger: stage,
    pin,
    pinSpacing: true,
    anticipatePin: 1,
    start: "top top",
    end: `+=${length}%`,
    scrub,
    invalidateOnRefresh: true,
    ...(onToggle ? { onToggle } : {}),
  });
  return { timeline, trigger };
}

/** Lets every stage go: the pins come out and the spacers with them. */
export function unpinAll(triggers: ScrollTrigger[]): void {
  for (const trigger of triggers) {
    trigger.kill(true);
  }
}

/* ------------------------------------------------------------------- type */

/**
 * One line hands over to the next: the outgoing line pulls back and goes out
 * of focus, the incoming one arrives from too close and finds it, and the
 * two cross over for a moment in between.
 */
export function swapWord(
  timeline: gsap.core.Timeline,
  outgoing: HTMLElement,
  incoming: HTMLElement,
  at: At,
  {
    duration = 0.16,
    overlap = 0.04,
    blur = 14,
  }: { duration?: number; overlap?: number; blur?: number } = {},
): void {
  timeline.to(
    outgoing,
    { autoAlpha: 0, scale: 0.85, filter: `blur(${blur}px)`, duration, ease: "power1.in" },
    at,
  );
  timeline.fromTo(
    incoming,
    { autoAlpha: 0, scale: 1.15, filter: `blur(${blur}px)` },
    { autoAlpha: 1, scale: 1, filter: "blur(0px)", duration, ease: "power1.out" },
    at + duration - overlap,
  );
}

/** The keynote's reveal: a thing arrives slightly small and out of focus. */
export function blurIn(
  timeline: gsap.core.Timeline,
  targets: gsap.TweenTarget,
  at: At,
  {
    duration = 0.5,
    blur = 12,
    scale = 0.94,
    stagger = 0,
    ease = "power3.out",
  }: { duration?: number; blur?: number; scale?: number; stagger?: number; ease?: string } = {},
): void {
  timeline
    .fromTo(
      targets,
      { autoAlpha: 0, scale, filter: `blur(${blur}px)`, willChange: "transform, opacity, filter" },
      { autoAlpha: 1, scale: 1, filter: "blur(0px)", duration, ease, stagger },
      at,
    )
    .set(targets, { clearProps: "willChange" }, ">");
}

/** Copy rises the last of the way into place. */
export function fadeUp(
  timeline: gsap.core.Timeline,
  targets: gsap.TweenTarget,
  at: At,
  {
    duration = 0.5,
    y = 24,
    stagger = 0,
    ease = "power3.out",
  }: { duration?: number; y?: number; stagger?: number; ease?: string } = {},
): void {
  timeline.fromTo(
    targets,
    { autoAlpha: 0, y },
    { autoAlpha: 1, y: 0, duration, ease, stagger },
    at,
  );
}

/** And leaves the way it came. */
export function fadeOut(
  timeline: gsap.core.Timeline,
  targets: gsap.TweenTarget,
  at: At,
  { duration = 0.3, y = 0, ease = "power2.in" }: { duration?: number; y?: number; ease?: string } = {},
): void {
  timeline.to(targets, { autoAlpha: 0, y, duration, ease }, at);
}

/**
 * A paragraph is read to you: every word starts in the muted colour and
 * lights to the foreground one after another as the stage is scrolled, and
 * the words the writer set in bold light brighter still. Returns the split
 * so the caller can put the paragraph back.
 */
export function wordsLight(
  timeline: gsap.core.Timeline,
  el: HTMLElement,
  at: At,
  {
    span = 0.2,
    duration = 0.06,
    dim = token("--muted", "#86868b"),
    lit = token("--foreground", "#f5f5f7"),
    bright = token("--accent-bright", "#6fc0ff"),
  }: { span?: number; duration?: number; dim?: string; lit?: string; bright?: string } = {},
): SplitText {
  const split = SplitText.create(el, { type: "words", aria: "auto" });
  const words = split.words as HTMLElement[];
  const emphasised = words.filter((word) => word.closest("b") ?? word.querySelector("b"));
  const plain = words.filter((word) => !emphasised.includes(word));
  const amount = Math.max(span - duration, 0);
  // One stagger across every word, so the light travels the paragraph at an
  // even rate whichever words happen to be emphasised.
  const step = words.length > 1 ? amount / (words.length - 1) : 0;
  const runs: [HTMLElement[], string][] = [
    [plain, lit],
    [emphasised, bright],
  ];
  for (const [group, colour] of runs) {
    for (const word of group) {
      timeline.fromTo(
        word,
        { color: dim },
        { color: colour, duration, ease: "none" },
        at + words.indexOf(word) * step,
      );
    }
  }
  return split;
}

/**
 * A heading is typeset: every character rises from behind its own mask, one
 * after another, at the rate the page is scrolled. Returns the split.
 */
export function lettersRise(
  timeline: gsap.core.Timeline,
  el: HTMLElement,
  at: At,
  { span = 0.25, duration = 0.1 }: { span?: number; duration?: number } = {},
): SplitText {
  const split = SplitText.create(el, { type: "chars", mask: "chars", aria: "auto" });
  gsap.set(el, { autoAlpha: 1 });
  timeline.fromTo(
    split.chars,
    { yPercent: 115, autoAlpha: 0 },
    {
      yPercent: 0,
      autoAlpha: 1,
      duration,
      ease: "power3.out",
      stagger: { amount: Math.max(span - duration, 0) },
    },
    at,
  );
  return split;
}

/* ------------------------------------------------------------------ shape */

/** Rules draw themselves from the left, one after another. */
export function linesDraw(
  timeline: gsap.core.Timeline,
  bars: gsap.TweenTarget,
  at: At,
  { span = 0.2, duration = 0.1 }: { span?: number; duration?: number } = {},
): void {
  timeline.fromTo(
    bars,
    { scaleX: 0, transformOrigin: "left center" },
    {
      scaleX: 1,
      duration,
      ease: "power2.out",
      stagger: { amount: Math.max(span - duration, 0) },
    },
    at,
  );
}

/** A frame tilts up off the table and settles flat against the page. */
export function tiltIn(
  timeline: gsap.core.Timeline,
  frame: HTMLElement,
  at: At,
  {
    duration = 0.4,
    rotate = 18,
    scale = 0.86,
    perspective = 1200,
  }: { duration?: number; rotate?: number; scale?: number; perspective?: number } = {},
): void {
  timeline.fromTo(
    frame,
    {
      transformPerspective: perspective,
      rotateX: rotate,
      scale,
      autoAlpha: 0.4,
      transformOrigin: "center bottom",
    },
    { rotateX: 0, scale: 1, autoAlpha: 1, duration, ease: "power3.out" },
    at,
  );
}

/**
 * A card is turned to face the reader: it arrives edge-on and a little small,
 * swings round on its vertical axis and settles flat against the page. The
 * keynote's way of putting one object on the table beside the prose.
 */
export function swingIn(
  timeline: gsap.core.Timeline,
  card: HTMLElement,
  at: At,
  {
    duration = 0.35,
    rotate = -14,
    scale = 0.88,
    perspective = 1200,
  }: { duration?: number; rotate?: number; scale?: number; perspective?: number } = {},
): void {
  timeline.fromTo(
    card,
    {
      transformPerspective: perspective,
      rotateY: rotate,
      scale,
      autoAlpha: 0,
      transformOrigin: "center center",
    },
    { rotateY: 0, scale: 1, autoAlpha: 1, duration, ease: "power3.out" },
    at,
  );
}

/**
 * The chapter's number, drawn in outline behind everything: it comes up from
 * under the stage as the stage takes hold, and then keeps drifting slowly
 * upward for the rest of the scroll, so the plate behind the prose is never
 * quite still. `span` is how much of the stage the arrival takes; the drift
 * fills whatever is left.
 */
export function numeralRise(
  timeline: gsap.core.Timeline,
  numeral: HTMLElement,
  at: At,
  { span = 0.5, drift = 12 }: { span?: number; drift?: number } = {},
): void {
  timeline.fromTo(
    numeral,
    { yPercent: 20, autoAlpha: 0 },
    { yPercent: 0, autoAlpha: 1, duration: span, ease: "power2.out" },
    at,
  );
  const rest = Math.max(1 - (at + span), 0);
  if (rest > 0) {
    timeline.to(numeral, { yPercent: -drift, duration: rest, ease: "none" }, at + span);
  }
}

/** Something small arrives all at once, with a little overshoot. */
export function popIn(
  timeline: gsap.core.Timeline,
  targets: gsap.TweenTarget,
  at: At,
  { duration = 0.12, from = 0.6, stagger = 0 }: { duration?: number; from?: number; stagger?: number } = {},
): void {
  timeline.fromTo(
    targets,
    { autoAlpha: 0, scale: from, transformOrigin: "center" },
    { autoAlpha: 1, scale: 1, duration, ease: "back.out(2.2)", stagger },
    at,
  );
}

/**
 * A button is assembled out of particles: the dots come in from a scatter,
 * meet at the middle, and go out as the button itself pops into being.
 */
export function gatherIn(
  timeline: gsap.core.Timeline,
  dots: HTMLElement[],
  button: HTMLElement,
  at: At,
  { span = 0.2, spread = 130 }: { span?: number; spread?: number } = {},
): void {
  const travel = span * 0.68;
  timeline.fromTo(
    dots,
    {
      autoAlpha: 0,
      x: () => gsap.utils.random(-spread, spread),
      y: () => gsap.utils.random(-spread * 0.7, spread * 0.7),
      scale: 0.4,
    },
    {
      autoAlpha: 1,
      x: 0,
      y: 0,
      scale: 1,
      duration: travel,
      ease: "power2.inOut",
      stagger: { amount: span * 0.18, from: "random" },
    },
    at,
  );
  timeline.to(dots, { autoAlpha: 0, duration: span * 0.12, ease: "none" }, at + span * 0.72);
  popIn(timeline, button, at + span * 0.7, { duration: span * 0.3 });
}

/**
 * A photograph is uncovered left to right, corners and all.
 *
 * Every side carries the same unit on both ends of the tween. GSAP walks a
 * complex string by matching the text between its numbers, so `100%` against
 * a bare `0` reads as two different shapes and the reveal becomes a cut —
 * write the zeroes as `0%` and it interpolates. The corner is a radius on the
 * element, not part of the shape, for the same reason.
 */
export function clipReveal(
  timeline: gsap.core.Timeline,
  img: HTMLElement,
  at: At,
  { duration = 0.25 }: { duration?: number } = {},
): void {
  timeline.fromTo(
    img,
    { clipPath: "inset(0% 100% 0% 0%)" },
    { clipPath: "inset(0% 0% 0% 0%)", duration, ease: "power2.inOut" },
    at,
  );
}

/** The state `clipReveal` starts from, for anything hidden before its stage. */
export const CLIPPED = "inset(0% 100% 0% 0%)";

/* ------------------------------------------------------------------ light */

/**
 * The wash behind a stage drifts through the gradient as the page scrolls:
 * blue at the top, purple in the middle, pink by the end. It is one hue
 * rotation on one composited layer, so the drift costs nothing.
 */
export function glowShift(
  timeline: gsap.core.Timeline,
  el: HTMLElement,
  at: At,
  { span = 1, turn = 100, drift = 0.12 }: { span?: number; turn?: number; drift?: number } = {},
): void {
  timeline.fromTo(
    el,
    { filter: "hue-rotate(0deg)", scale: 1 - drift },
    { filter: `hue-rotate(${turn}deg)`, scale: 1 + drift, duration: span, ease: "none" },
    at,
  );
}

/** A checklist item lights the moment the thing it describes happens. */
export function stepLight(
  timeline: gsap.core.Timeline,
  step: HTMLElement,
  at: At,
  {
    span = 0.1,
    lit = token("--foreground", "#f5f5f7"),
    accent = token("--accent", "#2997ff"),
  }: { span?: number; lit?: string; accent?: string } = {},
): void {
  const text = step.querySelector<HTMLElement>("[data-step-text]");
  const dot = step.querySelector<HTMLElement>("[data-step-dot]");
  const check = step.querySelector<SVGPathElement>("[data-step-check] path");
  if (text) {
    timeline.to(text, { color: lit, duration: span * 0.6, ease: "none" }, at);
  }
  if (dot) {
    timeline.to(
      dot,
      { backgroundColor: accent, borderColor: accent, duration: span * 0.5, ease: "none" },
      at,
    );
  }
  if (check) {
    const length = check.getTotalLength();
    timeline.fromTo(
      check,
      { strokeDasharray: length, strokeDashoffset: length, autoAlpha: 1 },
      { strokeDashoffset: 0, duration: span * 0.6, ease: "power2.out" },
      at + span * 0.25,
    );
  }
}

/**
 * A numeral counts to its value, one step at a time. Whole numbers by
 * default; `decimals` keeps a measured value's precision, so 4.8 metres
 * counts through 0.1 and never shows a digit the figure does not have.
 */
export function countUp(
  timeline: gsap.core.Timeline,
  el: HTMLElement,
  at: At,
  {
    to,
    duration = 1.2,
    ease = "power2.out",
    decimals = 0,
  }: { to: number; duration?: number; ease?: string; decimals?: number },
): void {
  const counter = { n: 0 };
  const step = 1 / 10 ** decimals;
  timeline.to(
    counter,
    {
      n: to,
      duration,
      ease,
      snap: { n: step },
      onUpdate: () => {
        el.textContent = counter.n.toFixed(decimals);
      },
      onComplete: () => {
        el.textContent = to.toFixed(decimals);
      },
    },
    at,
  );
}

/**
 * One run of ink that has to walk to the other scheme and back: the elements,
 * the property that carries their colour, and the two values. `from` is what
 * the stylesheet already gives them, so the flip always ends where it began.
 */
export type Ink = {
  targets: gsap.TweenTarget;
  from: string;
  to: string;
  /** Defaults to `color`; `backgroundColor` and `borderColor` also work. */
  prop?: string;
};

/**
 * Camouflage. The stage turns the page over while it is held: a plate of the
 * other scheme's canvas washes in behind everything and every run of ink
 * walks to the colour it has over there, then both walk back before the stage
 * lets go — so the reader arrives and leaves on the page's own scheme and
 * only the held stage is inverted. Works either way round: give it the light
 * canvas on a dark page, the dark one on a light page.
 */
export function flipScheme(
  timeline: gsap.core.Timeline,
  plate: HTMLElement,
  ink: Ink[],
  at: At,
  { span = 0.18, until = 0.82 }: { span?: number; until?: number } = {},
): void {
  const ease = "power1.inOut";
  timeline.fromTo(plate, { autoAlpha: 0 }, { autoAlpha: 1, duration: span, ease }, at);
  timeline.to(plate, { autoAlpha: 0, duration: span, ease }, until);
  for (const run of ink) {
    const prop = run.prop ?? "color";
    timeline.fromTo(
      run.targets,
      { [prop]: run.from },
      { [prop]: run.to, duration: span, ease },
      at,
    );
    timeline.to(run.targets, { [prop]: run.from, duration: span, ease }, until);
  }
}

/**
 * Three hearts, the way an octopus has them: the two branchial hearts keep
 * time without stopping, and the systemic one — the first of the three —
 * sits out every other pair of beats and dims while it rests, which is
 * exactly what happens when the animal swims. Real time, not scrubbed: hand
 * the returned timeline to a trigger that plays it only while it is on
 * screen.
 */
export function pulseHearts(
  hearts: HTMLElement[],
  { beat = 0.92, rested = 0.45 }: { beat?: number; rested?: number } = {},
): gsap.core.Timeline {
  const [systemic, ...branchial] = hearts;
  const timeline = gsap.timeline({ repeat: -1 });
  for (let i = 0; i < 4; i += 1) {
    const t = i * beat;
    const swimming = i >= 2;
    if (branchial.length > 0) {
      timeline
        .to(branchial, { scale: 1.28, duration: 0.15, ease: "power2.out", stagger: 0.07 }, t)
        .to(branchial, { scale: 1, duration: 0.55, ease: "elastic.out(1, 0.45)", stagger: 0.07 }, t + 0.15);
    }
    if (!systemic) {
      continue;
    }
    if (swimming) {
      timeline.to(systemic, { autoAlpha: rested, scale: 1, duration: 0.3, ease: "power2.out" }, t);
    } else {
      timeline
        .to(systemic, { autoAlpha: 1, scale: 1.28, duration: 0.15, ease: "power2.out" }, t)
        .to(systemic, { scale: 1, duration: 0.55, ease: "elastic.out(1, 0.45)" }, t + 0.15);
    }
  }
  return timeline;
}

/**
 * The contents rail's underline slides to whichever chapter is speaking. The
 * hairline is out of flow, so the width it takes costs nothing but its own
 * paint, and the slide is one transform.
 */
export function slideUnderline(
  underline: HTMLElement,
  cell: HTMLElement,
  { duration = 0.34 }: { duration?: number } = {},
): void {
  gsap.to(underline, {
    x: cell.offsetLeft,
    width: cell.offsetWidth,
    autoAlpha: 1,
    duration,
    ease: "power3.out",
    overwrite: "auto",
  });
}

/** A hairline reads out how far through the stage the reader is. */
export function progressBar(
  timeline: gsap.core.Timeline,
  bar: HTMLElement,
  at: At,
  { span = 1 }: { span?: number } = {},
): void {
  timeline.fromTo(
    bar,
    { scaleX: 0, transformOrigin: "left center" },
    { scaleX: 1, duration: span, ease: "none" },
    at,
  );
}

/* ------------------------------------------------------------------ exits */

/**
 * The contents of a frame blast up and out of it, the way the whole site
 * leaves a route. Give it the frame's height so nothing lands short.
 */
export function blastUp(
  timeline: gsap.core.Timeline,
  targets: gsap.TweenTarget,
  at: At,
  { span = 0.12, distance = 480 }: { span?: number; distance?: number } = {},
): void {
  timeline.to(
    targets,
    {
      y: -distance,
      autoAlpha: 0,
      duration: span,
      ease: "power2.in",
      stagger: { amount: span * 0.35, from: "end" },
    },
    at,
  );
}

/**
 * The outro: whatever the reader is looking at rushes past them and goes out
 * of focus, and part-way through the route is handed the rest of the trip.
 * The chrome is untouched — the nav stays put while the page leaves.
 */
export function zoomThrough(
  targets: gsap.TweenTarget,
  {
    onHandoff,
    handoffAt = 0.45,
    duration = 0.6,
    scale = 1.4,
    blur = 24,
  }: {
    onHandoff: () => void;
    handoffAt?: number;
    duration?: number;
    scale?: number;
    blur?: number;
  },
): gsap.core.Timeline {
  const timeline = gsap.timeline();
  timeline.to(
    targets,
    {
      scale,
      autoAlpha: 0,
      filter: `blur(${blur}px)`,
      duration,
      ease: "power3.in",
      overwrite: "auto",
    },
    0,
  );
  timeline.call(onHandoff, [], handoffAt);
  return timeline;
}
