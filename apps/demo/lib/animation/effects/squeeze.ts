"use client";

import { gsap, prefersReducedMotion } from "@/components/motion";

/*
 * Squeeze.
 *
 * A chapter heading arrives the way an octopus goes through a gap: pressed
 * flat into a hairline, stretched wide, then released to its full height with
 * a little wobble as the body reinflates. The rule it came through fades once
 * the heading is standing.
 *
 * Transforms only, so the heading's box is laid out at its settled size from
 * the first paint and the page never shifts.
 */

export type SqueezeOptions = {
  /** The hairline the heading passes through. Sits at the heading's vertical centre. */
  gap?: HTMLElement | null;
};

/** Hidden, flattened, ready to be released. */
export function primeSqueeze(heading: HTMLElement, { gap }: SqueezeOptions = {}): void {
  if (prefersReducedMotion()) {
    gsap.set(heading, { autoAlpha: 1 });
    if (gap) {
      gsap.set(gap, { autoAlpha: 0 });
    }
    return;
  }
  gsap.set(heading, {
    autoAlpha: 0,
    scaleY: 0.04,
    scaleX: 1.16,
    transformOrigin: "0% 50%",
    willChange: "transform, opacity",
  });
  if (gap) {
    gsap.set(gap, { autoAlpha: 1, scaleX: 0, transformOrigin: "0% 50%" });
  }
}

export function squeezeIn(heading: HTMLElement, { gap }: SqueezeOptions = {}): gsap.core.Timeline {
  const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
  if (prefersReducedMotion()) {
    tl.set(heading, { autoAlpha: 1, clearProps: "transform,willChange" });
    if (gap) {
      tl.set(gap, { autoAlpha: 0 }, 0);
    }
    return tl;
  }
  tl.addLabel("gap", 0);
  if (gap) {
    // The hairline draws across first: the gap exists before anything goes through it.
    tl.to(gap, { scaleX: 1, duration: 0.35, ease: "power3.out" }, "gap");
  }
  tl.set(heading, { autoAlpha: 1 }, "gap+=0.2")
    // Pushing through: the letters widen as they are pressed into the line.
    .to(heading, { scaleX: 1.22, duration: 0.18, ease: "power2.in" }, "gap+=0.2")
    // Release: the body springs back to full height, overshoots, and settles.
    .to(
      heading,
      { scaleY: 1, scaleX: 1, duration: 1.05, ease: "elastic.out(1, 0.55)" },
      "gap+=0.38",
    )
    .set(heading, { clearProps: "transform,willChange" }, ">");
  if (gap) {
    tl.to(gap, { autoAlpha: 0, duration: 0.3, ease: "power2.in" }, "gap+=0.55");
  }
  return tl;
}
