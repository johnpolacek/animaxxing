"use client";

import { gsap, SplitText } from "@/components/motion";

/*
 * Blast off.
 *
 * The hero's outro when a call to action is pressed: the whole composition
 * is thrown apart from the pressed button outward, fast. Headline letters
 * fly away from it and tumble, the subhead's words drop off the page, the
 * pressed button flares out while the other collapses, and the page rocks.
 *
 * The timeline is built to be reversible, so the same motion played backward
 * pulls everything back into place.
 */

const rnd = gsap.utils.random;

/** How long the whole outro takes, roughly. Fast is the point. */
const LETTER_TIME: [number, number] = [0.4, 0.6];
const WORD_TIME: [number, number] = [0.32, 0.5];

export type BlastOffOptions = {
  /** The hero container: it gets the shake. */
  root: HTMLElement;
  heading: HTMLElement;
  /** The subhead's words, already split; they are animated in place. */
  words: HTMLElement[];
  pressed: HTMLElement;
  others: HTMLElement[];
};

export type BlastOff = {
  timeline: gsap.core.Timeline;
  /** Puts the headline markup back. Call once the timeline is done with, either way. */
  revert: () => void;
};

function centre(el: Element): { x: number; y: number } {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export function blastOff({ root, heading, words, pressed, others }: BlastOffOptions): BlastOff {
  const origin = centre(pressed);
  const split = SplitText.create(heading, { type: "chars,words" });
  const chars = split.chars as HTMLElement[];
  const timeline = gsap.timeline({ defaults: { overwrite: "auto" } });

  // The page rocks the instant the button is pressed.
  timeline
    .to(
      root,
      {
        x: () => rnd(-8, 8),
        y: () => rnd(-5, 5),
        duration: 0.04,
        repeat: 7,
        yoyo: true,
        ease: "none",
      },
      0,
    )
    .set(root, { x: 0, y: 0 }, ">");

  // The pressed button flares and burns out; the others fold in on themselves.
  timeline.to(
    pressed,
    { scale: 1.35, autoAlpha: 0, filter: "blur(14px)", duration: 0.28, ease: "power4.out" },
    0,
  );
  if (others.length > 0) {
    timeline.to(
      others,
      { scale: 0, rotation: () => rnd(-200, 200), autoAlpha: 0, duration: 0.32, ease: "back.in(2.5)" },
      0.02,
    );
  }

  // Letters are thrown straight away from the pressed button, each tumbling
  // on its own, with a little scatter in the angle so they never line up.
  gsap.set(chars, { willChange: "transform, opacity" });
  for (const char of chars) {
    const c = centre(char);
    const angle = Math.atan2(c.y - origin.y, c.x - origin.x) + rnd(-0.45, 0.45);
    const distance = rnd(340, 820);
    timeline.to(
      char,
      {
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance,
        rotation: rnd(-720, 720),
        scale: rnd(0.3, 2.4),
        autoAlpha: 0,
        duration: rnd(LETTER_TIME[0], LETTER_TIME[1]),
        ease: "expo.out",
      },
      rnd(0, 0.1),
    );
  }

  // Words lose their footing and drop off the bottom, spinning.
  for (const word of words) {
    timeline.to(
      word,
      {
        x: rnd(-360, 360),
        y: rnd(260, 620),
        rotation: `+=${rnd(-240, 240)}`,
        autoAlpha: 0,
        duration: rnd(WORD_TIME[0], WORD_TIME[1]),
        ease: "power2.in",
      },
      rnd(0, 0.14),
    );
  }

  return {
    timeline,
    revert: () => {
      // revert() puts every target back exactly as it was before the outro,
      // including the subhead words' resting tilts.
      timeline.revert();
      split.revert();
      gsap.set([pressed, ...others], { clearProps: "filter" });
      gsap.set(root, { clearProps: "transform" });
    },
  };
}
