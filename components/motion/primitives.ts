"use client";

import { gsap } from "./gsap";
import { prefersReducedMotion } from "./preference";
import { DURATION, EASE, SHIFT, WEIGHT } from "./tokens";

/*
 * Paired motion primitives.
 *
 * Every entrance has a matching exit, so nothing in the product ever pops in
 * or disappears. Each function builds and returns a timeline: callers can
 * reverse it, kill it, or wait on its completion (see Presence).
 *
 * Rules applied throughout:
 *  - transforms, autoAlpha, clip-path, and the font `wght` axis only; never
 *    width, height, top, or left
 *  - `overwrite: "auto"` on every tween, so a rapid second call replaces the
 *    conflicting properties of the first instead of fighting it
 *  - under reduced motion the timeline still exists and still completes, but
 *    it snaps to the settled state, so callers that sequence work behind
 *    onComplete keep working
 */

export type MotionTarget = gsap.TweenTarget;

export type MotionOptions = {
  delay?: number;
  /** Seconds between children when the target resolves to several elements. */
  stagger?: number;
  onComplete?: () => void;
};

function build(options: MotionOptions): gsap.core.Timeline {
  const timeline = gsap.timeline({ delay: options.delay ?? 0, defaults: { overwrite: "auto" } });
  if (options.onComplete) {
    timeline.eventCallback("onComplete", options.onComplete);
  }
  return timeline;
}

/** Screens and large sections. */
export function revealIn(target: MotionTarget, options: MotionOptions = {}): gsap.core.Timeline {
  const tl = build(options);
  if (prefersReducedMotion()) {
    return tl.set(target, { autoAlpha: 1, y: 0 });
  }
  return tl.fromTo(
    target,
    { autoAlpha: 0, y: SHIFT.page },
    {
      autoAlpha: 1,
      y: 0,
      duration: DURATION.page,
      ease: EASE.entrance,
      stagger: options.stagger ?? 0,
    },
  );
}

export function revealOut(target: MotionTarget, options: MotionOptions = {}): gsap.core.Timeline {
  const tl = build(options);
  if (prefersReducedMotion()) {
    return tl.set(target, { autoAlpha: 0 });
  }
  return tl.to(target, {
    autoAlpha: 0,
    y: -SHIFT.component,
    duration: DURATION.component,
    ease: EASE.exit,
    stagger: options.stagger ?? 0,
  });
}

/** Newly committed transcript turns. */
export function messageIn(target: MotionTarget, options: MotionOptions = {}): gsap.core.Timeline {
  const tl = build(options);
  if (prefersReducedMotion()) {
    return tl.set(target, { autoAlpha: 1, y: 0 });
  }
  return tl.fromTo(
    target,
    { autoAlpha: 0, y: SHIFT.component },
    {
      autoAlpha: 1,
      y: 0,
      duration: DURATION.component,
      ease: EASE.entrance,
      stagger: options.stagger ?? 0,
    },
  );
}

export function messageOut(target: MotionTarget, options: MotionOptions = {}): gsap.core.Timeline {
  const tl = build(options);
  if (prefersReducedMotion()) {
    return tl.set(target, { autoAlpha: 0 });
  }
  return tl.to(target, {
    autoAlpha: 0,
    y: -SHIFT.micro,
    duration: DURATION.micro,
    ease: EASE.exit,
  });
}

/** Code and conversation panes, and anything pane-sized. */
export function panelIn(target: MotionTarget, options: MotionOptions = {}): gsap.core.Timeline {
  const tl = build(options);
  if (prefersReducedMotion()) {
    return tl.set(target, { autoAlpha: 1, scale: 1, y: 0 });
  }
  return tl.fromTo(
    target,
    { autoAlpha: 0, scale: 0.985, y: SHIFT.micro },
    {
      autoAlpha: 1,
      scale: 1,
      y: 0,
      duration: DURATION.page,
      ease: EASE.entrance,
      stagger: options.stagger ?? 0,
    },
  );
}

export function panelOut(target: MotionTarget, options: MotionOptions = {}): gsap.core.Timeline {
  const tl = build(options);
  if (prefersReducedMotion()) {
    return tl.set(target, { autoAlpha: 0 });
  }
  return tl.to(target, {
    autoAlpha: 0,
    scale: 0.99,
    duration: DURATION.component,
    ease: EASE.exit,
  });
}

/**
 * Phase changes. The label is the only thing that moves; the assistive text
 * behind it is updated by the caller immediately, never on the timeline.
 */
export function phaseIn(target: MotionTarget, options: MotionOptions = {}): gsap.core.Timeline {
  const tl = build(options);
  if (prefersReducedMotion()) {
    return tl.set(target, { autoAlpha: 1, y: 0 });
  }
  return tl.fromTo(
    target,
    { autoAlpha: 0, y: SHIFT.micro },
    { autoAlpha: 1, y: 0, duration: DURATION.component, ease: EASE.entrance },
  );
}

export function phaseOut(target: MotionTarget, options: MotionOptions = {}): gsap.core.Timeline {
  const tl = build(options);
  if (prefersReducedMotion()) {
    return tl.set(target, { autoAlpha: 0 });
  }
  return tl.to(target, {
    autoAlpha: 0,
    y: -SHIFT.micro,
    duration: DURATION.micro,
    ease: EASE.exit,
  });
}

/**
 * Report-to-transcript navigation: reveal the cited turn and hold a brief
 * emphasis on it. The emphasis is weight and scale, never color — the system
 * has none to spend, and assessment meaning must not ride on it.
 *
 * A child marked `data-motion-emphasis` takes the weight change so the whole
 * block does not reflow.
 */
export function evidenceFocus(
  target: Element | null,
  options: MotionOptions = {},
): gsap.core.Timeline {
  const tl = build(options);
  if (!target) {
    return tl;
  }
  const emphasis = target.querySelector("[data-motion-emphasis]");
  if (prefersReducedMotion()) {
    tl.set(target, { autoAlpha: 1, scale: 1 });
    if (emphasis) {
      tl.set(emphasis, { fontWeight: WEIGHT.emphasis }, "<");
    }
    return tl;
  }
  tl.addLabel("focus")
    .to(target, { autoAlpha: 1, duration: DURATION.micro, ease: EASE.entrance }, "focus")
    .fromTo(
      target,
      { scale: 0.995 },
      { scale: 1, duration: DURATION.component, ease: EASE.entrance },
      "focus",
    );
  if (emphasis) {
    tl.to(
      emphasis,
      { fontWeight: WEIGHT.emphasis, duration: DURATION.component, ease: EASE.shift },
      "focus",
    );
  }
  return tl;
}

export function evidenceClear(
  target: Element | null,
  options: MotionOptions = {},
): gsap.core.Timeline {
  const tl = build(options);
  if (!target) {
    return tl;
  }
  const emphasis = target.querySelector("[data-motion-emphasis]");
  const duration = prefersReducedMotion() ? 0 : DURATION.component;
  tl.to(target, { scale: 1, duration, ease: EASE.shift });
  if (emphasis) {
    tl.to(emphasis, { fontWeight: WEIGHT.rest, duration, ease: EASE.shift }, "<");
  }
  return tl;
}

/*
 * Variable type.
 *
 * Rethink Sans ships from next/font as a variable face with `font-weight: 400
 * 800`, so a numeric `fontWeight` tween interpolates the `wght` axis directly
 * and no `font-variation-settings` plumbing is needed. Values above 800 clamp,
 * so WEIGHT.display is the ceiling.
 *
 * Weight changes glyph widths, which can change line count, which would shift
 * the page. `reserveHeight` measures the element at its heaviest weight once,
 * before the tween starts, and pins that height for the duration.
 */
function reserveHeight(element: HTMLElement, weight: number): void {
  const previous = element.style.fontWeight;
  element.style.fontWeight = String(weight);
  const { height } = element.getBoundingClientRect();
  element.style.fontWeight = previous;
  element.style.minHeight = `${Math.ceil(height)}px`;
}

/** Display type: a dramatic axis shift, clipped in from below. */
export function posterIn(
  target: HTMLElement | null,
  options: MotionOptions = {},
): gsap.core.Timeline {
  const tl = build(options);
  if (!target) {
    return tl;
  }
  reserveHeight(target, WEIGHT.display);
  if (prefersReducedMotion()) {
    return tl.set(target, {
      autoAlpha: 1,
      y: 0,
      fontWeight: WEIGHT.display,
      clipPath: "inset(0% 0% 0% 0%)",
    });
  }
  return tl.fromTo(
    target,
    {
      autoAlpha: 0,
      y: SHIFT.component,
      fontWeight: WEIGHT.rest,
      clipPath: "inset(0% 0% 110% 0%)",
    },
    {
      autoAlpha: 1,
      y: 0,
      fontWeight: WEIGHT.display,
      clipPath: "inset(0% 0% 0% 0%)",
      duration: DURATION.page,
      ease: EASE.entrance,
    },
  );
}

export function posterOut(
  target: HTMLElement | null,
  options: MotionOptions = {},
): gsap.core.Timeline {
  const tl = build(options);
  if (!target) {
    return tl;
  }
  if (prefersReducedMotion()) {
    return tl.set(target, { autoAlpha: 0 });
  }
  return tl.to(target, {
    autoAlpha: 0,
    y: -SHIFT.micro,
    fontWeight: WEIGHT.emphasis,
    clipPath: "inset(0% 0% 60% 0%)",
    duration: DURATION.component,
    ease: EASE.exit,
  });
}

/**
 * Labels and small copy: a short, subtle axis change, or none at all under
 * reduced motion. Small text never gets the display treatment — at caption
 * sizes a large weight swing reads as a glitch, not as hierarchy.
 */
export function weightEmphasis(
  target: MotionTarget,
  options: MotionOptions = {},
): gsap.core.Timeline {
  const tl = build(options);
  if (prefersReducedMotion()) {
    return tl.set(target, { fontWeight: WEIGHT.emphasis });
  }
  return tl.to(target, {
    fontWeight: WEIGHT.emphasis,
    duration: DURATION.micro,
    ease: EASE.shift,
  });
}

export function weightRest(target: MotionTarget, options: MotionOptions = {}): gsap.core.Timeline {
  const tl = build(options);
  if (prefersReducedMotion()) {
    return tl.set(target, { fontWeight: WEIGHT.rest });
  }
  return tl.to(target, { fontWeight: WEIGHT.rest, duration: DURATION.micro, ease: EASE.shift });
}
