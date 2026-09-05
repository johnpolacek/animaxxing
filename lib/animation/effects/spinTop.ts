"use client";

import { gsap, prefersReducedMotion, SplitText } from "@/components/motion";

/** Seconds the last letter keeps spinning once the entrance hands it over, and
 * how many turns it makes doing it. It arrives already up to speed, so the run
 * down is the long ease-out half of one very long ease-in-out. */
const SPIN = 4;
const TURNS = 8;
/** Seconds the last wobble takes to die out once the spin has run down. */
const SETTLE = 0.6;
/** Fraction of the spin that passes before the lean is worth seeing. */
const WOBBLE_AT = 0.5;

/**
 * Carries on the twirl the heading's last letter started with its entrance,
 * running it down like a top on the ground: it pivots on its own foot, and the
 * lean circles rather than swings — the two tilt axes are a quarter cycle
 * apart — growing as the spin slows before damping back upright.
 *
 * This runs on its own split, off the page transition's timeline, so the
 * subhead and the buttons arrive on time while the top is still going.
 * Returns a stop function; the split puts itself back once the top settles,
 * and `keepSplit` leaves the markup in place for whatever animates next.
 */
export function spinTop(heading: HTMLElement) {
  if (prefersReducedMotion()) {
    return () => {};
  }
  const split = SplitText.create(heading, { type: "chars,words" });
  const chars = split.chars as HTMLElement[];
  const top = chars[chars.length - 1];
  if (!top) {
    split.revert();
    return () => {};
  }
  gsap.set(top, {
    transformOrigin: "50% 96%",
    transformPerspective: 900,
    willChange: "transform",
  });
  const timeline = gsap.timeline({ defaults: { overwrite: "auto" } });
  timeline.to(top, { rotationY: TURNS * 360, duration: SPIN, ease: "power3.out" }, 0);
  // A top only leans once it has lost some speed, so the wobble joins late,
  // grows through the run down, and damps back upright.
  timeline.to(
    top,
    {
      keyframes: {
        rotation: [0, 3, 0, -4.5, 0, 7, 0, -4, 0, 0],
        rotationX: [0, 0, 3.5, 0, -6, 0, 9, 0, -3, 0],
        easeEach: "sine.inOut",
      },
      duration: SPIN * (1 - WOBBLE_AT) + SETTLE,
      ease: "none",
    },
    SPIN * WOBBLE_AT,
  );

  let live = true;
  const stop = (keepSplit = false) => {
    if (!live) {
      return;
    }
    live = false;
    timeline.kill();
    gsap.set(top, { clearProps: "transform,willChange" });
    if (!keepSplit) {
      split.revert();
    }
  };
  timeline.eventCallback("onComplete", () => stop());
  return stop;
}
