"use client";

import { gsap } from "./gsap";
import { prefersReducedMotion } from "./preference";
import { DURATION, EASE, SHIFT, WEIGHT } from "./tokens";
import type { MotionOptions, MotionTarget } from "./primitives";

/*
 * The vocabulary.
 *
 * Named entrances and exits, each one paired, kept here so the direction can
 * be chosen by watching them rather than by arguing about them. The product
 * primitives in primitives.ts are the ones a screen actually uses; these are
 * the shelf they are picked from, and anything promoted from here should move
 * there with a name that says what it is for rather than what it does.
 *
 * Same rules as everywhere else: transforms, autoAlpha, clip-path, filters and
 * the font weight axis only; `overwrite: "auto"`; reduced motion snaps to the
 * settled state instead of skipping the callback.
 */

function build(options: MotionOptions): gsap.core.Timeline {
  const timeline = gsap.timeline({ delay: options.delay ?? 0, defaults: { overwrite: "auto" } });
  if (options.onComplete) {
    timeline.eventCallback("onComplete", options.onComplete);
  }
  return timeline;
}

type Pair = (target: MotionTarget, options?: MotionOptions) => gsap.core.Timeline;

/** Builds an in/out pair from two vars objects, with the reduced path handled once. */
function pair(
  from: gsap.TweenVars,
  to: gsap.TweenVars,
  settledIn: gsap.TweenVars,
  outVars: gsap.TweenVars,
): [Pair, Pair] {
  const entrance: Pair = (target, options = {}) => {
    const tl = build(options);
    if (prefersReducedMotion()) {
      return tl.set(target, { autoAlpha: 1, ...settledIn });
    }
    return tl.fromTo(target, from, { ...to, stagger: options.stagger ?? 0 });
  };

  const exit: Pair = (target, options = {}) => {
    const tl = build(options);
    if (prefersReducedMotion()) {
      return tl.set(target, { autoAlpha: 0 });
    }
    return tl.to(target, { ...outVars, stagger: options.stagger ?? 0 });
  };

  return [entrance, exit];
}

const SETTLED = { x: 0, y: 0, scale: 1, rotationX: 0, filter: "blur(0px)" };

/** The plainest pair there is: opacity and nothing else. */
export const [fadeIn, fadeOut] = pair(
  { autoAlpha: 0 },
  { autoAlpha: 1, duration: DURATION.component, ease: EASE.entrance },
  {},
  { autoAlpha: 0, duration: DURATION.micro, ease: EASE.exit },
);

/** Arrives from below. The workhorse for anything that was just committed. */
export const [riseIn, riseOut] = pair(
  { autoAlpha: 0, y: SHIFT.component },
  { autoAlpha: 1, y: 0, duration: DURATION.component, ease: EASE.entrance },
  SETTLED,
  { autoAlpha: 0, y: -SHIFT.micro, duration: DURATION.micro, ease: EASE.exit },
);

/** Arrives from above — for things that interrupt, like a status or a banner. */
export const [dropIn, dropOut] = pair(
  { autoAlpha: 0, y: -SHIFT.component },
  { autoAlpha: 1, y: 0, duration: DURATION.component, ease: EASE.entrance },
  SETTLED,
  { autoAlpha: 0, y: SHIFT.micro, duration: DURATION.micro, ease: EASE.exit },
);

/** Comes in from the left edge; leaves the way it came. */
export const [slideInLeft, slideOutLeft] = pair(
  { autoAlpha: 0, x: -SHIFT.page },
  { autoAlpha: 1, x: 0, duration: DURATION.component, ease: EASE.entrance },
  SETTLED,
  { autoAlpha: 0, x: -SHIFT.component, duration: DURATION.micro, ease: EASE.exit },
);

/** The mirror, for a pane that belongs on the right. */
export const [slideInRight, slideOutRight] = pair(
  { autoAlpha: 0, x: SHIFT.page },
  { autoAlpha: 1, x: 0, duration: DURATION.component, ease: EASE.entrance },
  SETTLED,
  { autoAlpha: 0, x: SHIFT.component, duration: DURATION.micro, ease: EASE.exit },
);

/** Settles into place from slightly small. Reads as focus, not as zoom. */
export const [scaleIn, scaleOut] = pair(
  { autoAlpha: 0, scale: 0.96 },
  { autoAlpha: 1, scale: 1, duration: DURATION.component, ease: EASE.entrance },
  SETTLED,
  { autoAlpha: 0, scale: 0.98, duration: DURATION.micro, ease: EASE.exit },
);

/** A little overshoot. Reserve it for something small and infrequent. */
export const [popIn, popOut] = pair(
  { autoAlpha: 0, scale: 0.4 },
  { autoAlpha: 1, scale: 1, duration: DURATION.component, ease: "back.out(2.4)" },
  SETTLED,
  { autoAlpha: 0, scale: 0.6, duration: DURATION.micro, ease: "back.in(2)" },
);

/** A hard edge travelling upward — the most editorial of the set. */
export const [wipeUp, wipeDown] = pair(
  { autoAlpha: 1, clipPath: "inset(0% 0% 100% 0%)" },
  {
    autoAlpha: 1,
    clipPath: "inset(0% 0% 0% 0%)",
    duration: DURATION.page,
    ease: EASE.entrance,
  },
  { clipPath: "inset(0% 0% 0% 0%)" },
  {
    clipPath: "inset(100% 0% 0% 0%)",
    duration: DURATION.component,
    ease: EASE.exit,
  },
);

/** The same edge, travelling across. Good for rules, bars, and code lines. */
export const [wipeAcross, wipeBack] = pair(
  { autoAlpha: 1, clipPath: "inset(0% 100% 0% 0%)" },
  {
    autoAlpha: 1,
    clipPath: "inset(0% 0% 0% 0%)",
    duration: DURATION.page,
    ease: EASE.entrance,
  },
  { clipPath: "inset(0% 0% 0% 0%)" },
  {
    clipPath: "inset(0% 0% 0% 100%)",
    duration: DURATION.component,
    ease: EASE.exit,
  },
);

/** Tips in on the X axis. The loudest thing here; use it almost never. */
export const [flipIn, flipOut] = pair(
  { autoAlpha: 0, rotationX: -60, transformPerspective: 800, transformOrigin: "50% 0%" },
  {
    autoAlpha: 1,
    rotationX: 0,
    duration: DURATION.page,
    ease: EASE.entrance,
  },
  SETTLED,
  {
    autoAlpha: 0,
    rotationX: 25,
    duration: DURATION.component,
    ease: EASE.exit,
  },
);

/** Resolves out of a blur. Costly to paint — keep it to one element at a time. */
export const [focusIn, focusOut] = pair(
  { autoAlpha: 0, filter: "blur(8px)" },
  {
    autoAlpha: 1,
    filter: "blur(0px)",
    duration: DURATION.page,
    ease: EASE.entrance,
  },
  SETTLED,
  {
    autoAlpha: 0,
    filter: "blur(6px)",
    duration: DURATION.component,
    ease: EASE.exit,
  },
);

/** Type that gains its weight as it arrives, and gives it back as it leaves. */
export const [weightIn, weightOut] = pair(
  { autoAlpha: 0, fontWeight: WEIGHT.rest, y: SHIFT.micro },
  {
    autoAlpha: 1,
    fontWeight: WEIGHT.display,
    y: 0,
    duration: DURATION.page,
    ease: EASE.shift,
  },
  { fontWeight: WEIGHT.display, y: 0 },
  {
    autoAlpha: 0,
    fontWeight: WEIGHT.rest,
    duration: DURATION.component,
    ease: EASE.shift,
  },
);
