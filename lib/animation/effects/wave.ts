"use client";

import { gsap, prefersReducedMotion, SplitText } from "@/components/motion";

/*
 * The wave.
 *
 * Splits a heading into letters and, every few seconds, ripples a small move
 * across them left to right, one letter at a time, the way a crowd does the
 * wave. Each pass uses a different move, and every letter ends exactly where
 * it started, so the text never drifts.
 */

/** Delay between neighbouring letters starting their move. */
const RIPPLE = 0.03;
/** Each letter is back at rest this many seconds after it starts. */
const LETTER_TIME = 0.25;

const rnd = gsap.utils.random;

type Move = (chars: HTMLElement[]) => gsap.core.Timeline;

/**
 * One out-and-back tween per letter, staggered along the line. The repeat
 * and yoyo live inside the stagger so each letter turns around on its own
 * schedule; at the top level they would apply to the whole set, sending the
 * wave back in reverse instead.
 */
function ripple(chars: HTMLElement[], vars: gsap.TweenVars, ease = "sine.inOut") {
  return gsap
    .timeline()
    .to(chars, {
      ...vars,
      duration: LETTER_TIME / 2,
      ease,
      stagger: { each: RIPPLE, yoyo: true, repeat: 1 },
    })
    .set(chars, { clearProps: "transform,opacity,fontWeight" });
}

/** A one-way tween per letter for moves that end where they began anyway. */
function sweep(chars: HTMLElement[], vars: gsap.TweenVars, ease = "power2.inOut") {
  return gsap
    .timeline()
    .to(chars, { ...vars, duration: LETTER_TIME, ease, stagger: RIPPLE })
    .set(chars, { clearProps: "transform,opacity,fontWeight" });
}

/**
 * Rethink Sans is a variable font with one axis, weight, running 400 to 800.
 * The heading sits at the top of that range, so every weight move is a dip
 * away from bold and back. Widths are pinned at setup so the thinner glyphs
 * never shove their neighbours along the line.
 */
const MOVES: Move[] = [
  // Hop: each letter lifts and lands.
  (chars) => ripple(chars, { y: -14 }, "power2.out"),
  // Breathe: a swell from the baseline.
  (chars) => ripple(chars, { scale: 1.07, transformOrigin: "50% 100%" }),
  // Lean: a nod to the right and back.
  (chars) => ripple(chars, { rotation: 7, transformOrigin: "50% 100%" }),
  // Flip: a full turn about the vertical axis. No perspective, so the near
  // half never looms larger; the letter just folds to a line and back.
  (chars) => sweep(chars, { rotationY: 360, transformOrigin: "50% 50%" }),
  // Lighten: the weight axis eases down to medium and back.
  (chars) => ripple(chars, { fontWeight: 500 }),
  // Hairline: weight drops to the floor while the letter stretches to keep
  // its footprint, so it reads as the same shape drawn with a thinner pen.
  (chars) =>
    ripple(chars, { fontWeight: 400, scaleX: 1.14, transformOrigin: "50% 100%" }, "power2.inOut"),
  // Ink: weight snaps to thin, then fills back in to bold.
  (chars) =>
    gsap
      .timeline()
      .fromTo(
        chars,
        { fontWeight: 400 },
        {
          fontWeight: 800,
          duration: LETTER_TIME,
          ease: "power2.out",
          stagger: RIPPLE,
          // Each letter goes thin on its own turn, not all at the wave start.
          immediateRender: false,
        },
      )
      .set(chars, { clearProps: "fontWeight" }),
  // Shear: a quick italic slant.
  (chars) => ripple(chars, { skewX: 12 }, "power2.inOut"),
  // Squash: pressed flat and released.
  (chars) => ripple(chars, { scaleY: 0.82, transformOrigin: "50% 100%" }, "power2.inOut"),
  // Twist: each letter swells to 110% with its own small twist, then back.
  (chars) =>
    ripple(
      chars,
      { scale: 1.1, rotation: () => rnd(-12, 12), transformOrigin: "50% 50%" },
      "power2.inOut",
    ),
];

/**
 * Pins each letter to its resting width so weight changes cannot reflow the
 * line. Rest is the heaviest weight, so nothing ever needs more room.
 */
function pinWidths(chars: HTMLElement[]): void {
  const widths = chars.map((char) => char.getBoundingClientRect().width);
  chars.forEach((char, i) => {
    char.style.display = "inline-block";
    char.style.width = `${widths[i] ?? 0}px`;
    char.style.textAlign = "center";
  });
}

export type WaveOptions = {
  /** Seconds from the start of one wave to the start of the next. */
  period?: number;
};

/**
 * Starts waving the heading's letters. Returns a stop function; pass
 * `keepSplit` when another animation is about to split the same element and
 * needs the current markup left in place.
 */
export function startWave(heading: HTMLElement, { period = 4 }: WaveOptions = {}) {
  if (prefersReducedMotion()) {
    return () => {};
  }
  const split = SplitText.create(heading, { type: "chars,words" });
  const chars = split.chars as HTMLElement[];
  chars.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
  pinWidths(chars);
  gsap.set(chars, { willChange: "transform, opacity" });

  // Shuffle so each cycle through the moves plays in a fresh order, never
  // repeating one back to back across the seam.
  let deck = gsap.utils.shuffle([...MOVES]);
  let index = 0;
  let current: gsap.core.Timeline | undefined;

  const wave = () => {
    const move = deck[index];
    index++;
    if (index >= deck.length) {
      deck = gsap.utils.shuffle([...MOVES]);
      if (deck[0] === move && deck.length > 1) {
        deck.push(deck.shift() as Move);
      }
      index = 0;
    }
    current?.kill();
    current = move ? move(chars) : undefined;
  };

  const clock = gsap.delayedCall(period, () => {
    wave();
    clock.restart(true);
  });

  return (keepSplit = false) => {
    clock.kill();
    current?.kill();
    if (!keepSplit) {
      split.revert();
    }
  };
}
