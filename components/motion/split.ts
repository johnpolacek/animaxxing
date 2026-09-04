"use client";

import { gsap, SplitText } from "./gsap";
import { prefersReducedMotion } from "./preference";
import { DURATION, EASE, STAGGER, WEIGHT } from "./tokens";
import type { MotionOptions } from "./primitives";

/*
 * Letter-level motion.
 *
 * Text is split into characters, words, or lines, animated, and put back
 * together again: every one of these reverts its split when the timeline
 * finishes, so the DOM a reader lands on is the DOM the author wrote.
 *
 * Accessibility: SplitText's `aria: "auto"` puts the original string on the
 * element as a label and hides the pieces, so a screen reader hears the
 * sentence and never the alphabet soup. Under reduced motion nothing is split
 * at all — the text is simply already there.
 *
 * These belong on display type: a masthead, a landing statement, a section
 * title. They do not belong on a transcript turn. A participant reading an
 * interviewer's question should never watch it assemble itself.
 */

export type SplitRunner = (
  target: HTMLElement | null,
  options?: MotionOptions,
) => gsap.core.Timeline;

function build(options: MotionOptions): gsap.core.Timeline {
  const timeline = gsap.timeline({ delay: options.delay ?? 0, defaults: { overwrite: "auto" } });
  if (options.onComplete) {
    timeline.eventCallback("onComplete", options.onComplete);
  }
  return timeline;
}

/**
 * Splits, runs `choreograph`, and puts the element back together afterwards.
 * The settled state is applied first so an interrupted run cannot leave text
 * stranded mid-flight.
 */
function withSplit(
  element: HTMLElement | null,
  options: MotionOptions,
  config: SplitText.Vars,
  choreograph: (split: SplitText, tl: gsap.core.Timeline) => void,
  settled: gsap.TweenVars = { autoAlpha: 1 },
): gsap.core.Timeline {
  const tl = build(options);
  if (!element) {
    return tl;
  }
  if (prefersReducedMotion()) {
    return tl.set(element, settled);
  }

  const split = SplitText.create(element, { aria: "auto", ...config });
  tl.set(element, { autoAlpha: 1 });
  choreograph(split, tl);
  // Revert on the way out and on a kill, so nothing is left split.
  tl.eventCallback("onComplete", () => {
    const previous = options.onComplete;
    split.revert();
    previous?.();
  });
  return tl;
}

/**
 * Pins each character to the width it needs at its heaviest, so the axis can
 * move without letters shoving each other along the line.
 */
function pinWidths(chars: Element[], atWeight: number): void {
  for (const char of chars) {
    const element = char as HTMLElement;
    const previous = element.style.fontWeight;
    element.style.fontWeight = String(atWeight);
    const { width } = element.getBoundingClientRect();
    element.style.fontWeight = previous;
    element.style.display = "inline-block";
    element.style.width = `${width}px`;
    element.style.textAlign = "center";
  }
}

/** Characters rise into place behind their own masks. The house entrance. */
export const charsRiseIn: SplitRunner = (element, options = {}) =>
  withSplit(element, options, { type: "chars", mask: "chars", smartWrap: true }, (split, tl) => {
    tl.from(split.chars, {
      yPercent: 115,
      duration: 0.5,
      ease: "power3.out",
      stagger: STAGGER.tight,
    });
  });

/**
 * Characters spring up into place with an elastic settle. Unmasked, because
 * the overshoot would clip against a line-box mask.
 */
export const charsSpringIn: SplitRunner = (element, options = {}) =>
  withSplit(element, options, { type: "chars", smartWrap: true }, (split, tl) => {
    tl.from(split.chars, {
      yPercent: 115,
      autoAlpha: 0,
      duration: 1.1,
      ease: "elastic.out(1, 0.5)",
      stagger: STAGGER.tight,
    });
  });

/** And back down, in the same order. */
export const charsFallOut: SplitRunner = (element, options = {}) =>
  withSplit(
    element,
    options,
    { type: "chars", mask: "chars", smartWrap: true },
    (split, tl) => {
      tl.to(split.chars, {
        yPercent: -115,
        duration: DURATION.component,
        ease: "power2.in",
        stagger: STAGGER.tight,
      }).set(element, { autoAlpha: 0 });
    },
    { autoAlpha: 0 },
  );

/** Characters arrive out of order, like a dealer flicking cards. */
export const charsCascadeIn: SplitRunner = (element, options = {}) =>
  withSplit(element, options, { type: "chars", smartWrap: true }, (split, tl) => {
    tl.from(split.chars, {
      autoAlpha: 0,
      y: -18,
      rotation: () => gsap.utils.random(-14, 14),
      duration: 0.45,
      ease: "back.out(1.8)",
      stagger: { each: 0.02, from: "random" },
    });
  });

export const charsCascadeOut: SplitRunner = (element, options = {}) =>
  withSplit(
    element,
    options,
    { type: "chars", smartWrap: true },
    (split, tl) => {
      tl.to(split.chars, {
        autoAlpha: 0,
        y: 18,
        rotation: () => gsap.utils.random(-14, 14),
        duration: DURATION.component,
        ease: "power2.in",
        stagger: { each: 0.015, from: "random" },
      }).set(element, { autoAlpha: 0 });
    },
    { autoAlpha: 0 },
  );

/** Each character tips over its own top edge. */
export const charsFlipIn: SplitRunner = (element, options = {}) =>
  withSplit(element, options, { type: "chars", smartWrap: true }, (split, tl) => {
    tl.from(split.chars, {
      autoAlpha: 0,
      rotationX: -90,
      transformOrigin: "50% 0%",
      transformPerspective: 600,
      duration: 0.5,
      ease: "back.out(1.4)",
      stagger: STAGGER.tight,
    });
  });

export const charsFlipOut: SplitRunner = (element, options = {}) =>
  withSplit(
    element,
    options,
    { type: "chars", smartWrap: true },
    (split, tl) => {
      tl.to(split.chars, {
        autoAlpha: 0,
        rotationX: 90,
        transformOrigin: "50% 100%",
        transformPerspective: 600,
        duration: DURATION.component,
        ease: "power2.in",
        stagger: STAGGER.tight,
      }).set(element, { autoAlpha: 0 });
    },
    { autoAlpha: 0 },
  );

/** Characters converge from wherever they were thrown. */
export const charsScatterIn: SplitRunner = (element, options = {}) =>
  withSplit(element, options, { type: "chars", smartWrap: true }, (split, tl) => {
    tl.from(split.chars, {
      autoAlpha: 0,
      x: () => gsap.utils.random(-120, 120),
      y: () => gsap.utils.random(-60, 60),
      rotation: () => gsap.utils.random(-45, 45),
      scale: 0.6,
      duration: 0.6,
      ease: "power3.out",
      stagger: { each: 0.012, from: "center" },
    });
  });

export const charsScatterOut: SplitRunner = (element, options = {}) =>
  withSplit(
    element,
    options,
    { type: "chars", smartWrap: true },
    (split, tl) => {
      tl.to(split.chars, {
        autoAlpha: 0,
        x: () => gsap.utils.random(-120, 120),
        y: () => gsap.utils.random(-60, 60),
        rotation: () => gsap.utils.random(-45, 45),
        scale: 0.6,
        duration: DURATION.page,
        ease: "power2.in",
        stagger: { each: 0.012, from: "edges" },
      }).set(element, { autoAlpha: 0 });
    },
    { autoAlpha: 0 },
  );

/**
 * A weight wave travelling through the line: each character dips to the light
 * end of the axis and comes back. Character boxes are pinned to their settled
 * widths first, so the letters breathe in place instead of shoving each other.
 */
export const charsWeightWave: SplitRunner = (element, options = {}) => {
  // Wave away from wherever the line rests and back to it, so it ends exactly
  // as it started: light text swells, heavy text thins.
  const settledWeight = element
    ? Number(getComputedStyle(element).fontWeight) || WEIGHT.rest
    : WEIGHT.rest;
  const farWeight = settledWeight >= 600 ? WEIGHT.rest : WEIGHT.display;

  return withSplit(
    element,
    options,
    { type: "chars", smartWrap: true },
    (split, tl) => {
      // Boxes are pinned at the heavier of the two ends, so no character can
      // shove its neighbour as the axis moves.
      pinWidths(split.chars, Math.max(settledWeight, farWeight));
      tl.fromTo(
        split.chars,
        { fontWeight: settledWeight },
        {
          fontWeight: farWeight,
          duration: 0.3,
          ease: EASE.shift,
          stagger: { each: 0.03, from: "start" },
        },
      ).to(
        split.chars,
        {
          fontWeight: settledWeight,
          duration: 0.4,
          ease: EASE.shift,
          stagger: { each: 0.03, from: "start" },
        },
        0.18,
      );
    },
    { autoAlpha: 1 },
  );
};

/** Words swing in from alternating sides. */
export const wordsSlideIn: SplitRunner = (element, options = {}) =>
  withSplit(element, options, { type: "words" }, (split, tl) => {
    tl.from(split.words, {
      autoAlpha: 0,
      x: (index: number) => (index % 2 === 0 ? -40 : 40),
      duration: DURATION.page,
      ease: EASE.entrance,
      stagger: STAGGER.loose,
    });
  });

export const wordsSlideOut: SplitRunner = (element, options = {}) =>
  withSplit(
    element,
    options,
    { type: "words" },
    (split, tl) => {
      tl.to(split.words, {
        autoAlpha: 0,
        x: (index: number) => (index % 2 === 0 ? 40 : -40),
        duration: DURATION.component,
        ease: EASE.exit,
        stagger: STAGGER.tight,
      }).set(element, { autoAlpha: 0 });
    },
    { autoAlpha: 0 },
  );

/** Whole lines wiped up behind masks — the most editorial of the family. */
export const linesMaskIn: SplitRunner = (element, options = {}) =>
  withSplit(element, options, { type: "lines", mask: "lines" }, (split, tl) => {
    tl.from(split.lines, {
      yPercent: 110,
      duration: DURATION.page,
      ease: "power3.out",
      stagger: STAGGER.loose,
    });
  });

export const linesMaskOut: SplitRunner = (element, options = {}) =>
  withSplit(
    element,
    options,
    { type: "lines", mask: "lines" },
    (split, tl) => {
      tl.to(split.lines, {
        yPercent: -110,
        duration: DURATION.component,
        ease: "power2.in",
        stagger: STAGGER.tight,
      }).set(element, { autoAlpha: 0 });
    },
    { autoAlpha: 0 },
  );

/**
 * Text resolving out of noise. It suits a system about reading code, but it
 * is display-only: a transcript turn must never look like it is being typed,
 * because that fakes streaming the engine is not doing.
 */
export const scrambleIn: SplitRunner = (element, options = {}) => {
  const tl = build(options);
  if (!element) {
    return tl;
  }
  const text = element.textContent ?? "";
  if (prefersReducedMotion()) {
    return tl.set(element, { autoAlpha: 1 });
  }
  return tl.set(element, { autoAlpha: 1 }).to(element, {
    duration: 0.9,
    ease: "none",
    scrambleText: { text, chars: "01{}/<>()=;", speed: 0.6, revealDelay: 0.15 },
  });
};

export const scrambleOut: SplitRunner = (element, options = {}) => {
  const tl = build(options);
  if (!element) {
    return tl;
  }
  if (prefersReducedMotion()) {
    return tl.set(element, { autoAlpha: 0 });
  }
  const text = element.textContent ?? "";
  return (
    tl
      .to(element, {
        duration: 0.5,
        ease: "none",
        scrambleText: { text: text.replace(/\S/g, "0"), chars: "01{}/<>()=;", speed: 0.8 },
      })
      .to(element, { autoAlpha: 0, duration: DURATION.micro, ease: EASE.exit })
      // Put the original string back once it is out of sight; a plain assignment
      // avoids depending on TextPlugin for a value nothing is animating.
      .call(() => {
        element.textContent = text;
      })
  );
};
