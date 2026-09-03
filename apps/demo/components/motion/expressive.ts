"use client";

import { gsap, ScrollTrigger, SplitText } from "./gsap";
import { prefersReducedMotion } from "./preference";
import { DURATION, EASE, STAGGER, WEIGHT } from "./tokens";

/*
 * The expressive layer.
 *
 * These are for the north star and the landing page — surfaces whose job is to
 * make an argument before anyone has typed anything. They are louder than the
 * interview primitives on purpose, and they are deliberately NOT used inside a
 * session: nothing may compete with code the participant is reading.
 *
 * The rules that still hold everywhere:
 *  - entrances only, played once; nothing loops, nothing is ambient
 *  - no scroll scrubbing and no parallax; scroll decides *when*, never *how far*
 *  - text is animated into place, never while it is being read
 *  - reduced motion collapses every one of these to its settled state
 */

/**
 * Poster type revealed per character behind a mask, while the line as a whole
 * sweeps its weight axis.
 *
 * The weight tween runs on the element rather than on each character: per-char
 * weight would change per-char widths and make the line crawl. The height is
 * pinned at the heaviest weight first, so the reveal cannot shift the page.
 */
export function posterSplitIn(element: HTMLElement | null): gsap.core.Timeline {
  const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
  if (!element) {
    return tl;
  }

  const settled = { autoAlpha: 1, y: 0, fontWeight: WEIGHT.display };
  if (prefersReducedMotion()) {
    return tl.set(element, settled);
  }

  const previousWeight = element.style.fontWeight;
  element.style.fontWeight = String(WEIGHT.display);
  element.style.minHeight = `${Math.ceil(element.getBoundingClientRect().height)}px`;
  element.style.fontWeight = previousWeight;

  const split = SplitText.create(element, {
    type: "chars",
    mask: "chars",
    smartWrap: true,
    // Screen readers get the original text; the character spans are ignored.
    aria: "auto",
  });

  return tl
    .set(element, { autoAlpha: 1, fontWeight: WEIGHT.rest })
    .from(split.chars, {
      yPercent: 115,
      duration: 0.5,
      ease: "power3.out",
      stagger: STAGGER.tight,
    })
    .to(element, { fontWeight: WEIGHT.display, duration: 0.6, ease: EASE.shift }, 0.08);
}

/**
 * Hides a group, then reveals it in batches as it scrolls into view. One
 * ScrollTrigger per element, batched so a row of items arrives together
 * instead of one at a time.
 */
export function scrollRevealBatch(
  targets: string | Element[],
  scope: Element | null,
): ScrollTrigger[] {
  const elements =
    typeof targets === "string"
      ? Array.from((scope ?? document).querySelectorAll<HTMLElement>(targets))
      : (targets as HTMLElement[]);

  if (elements.length === 0) {
    return [];
  }

  if (prefersReducedMotion()) {
    gsap.set(elements, { autoAlpha: 1, y: 0 });
    return [];
  }

  gsap.set(elements, { autoAlpha: 0, y: 24 });

  return ScrollTrigger.batch(elements, {
    start: "top 88%",
    once: true,
    interval: 0.08,
    batchMax: 6,
    onEnter: (batch) => {
      gsap.to(batch, {
        autoAlpha: 1,
        y: 0,
        duration: DURATION.page,
        ease: EASE.entrance,
        stagger: STAGGER.loose,
        overwrite: "auto",
      });
    },
  });
}

/** Diff lines arriving as a block of material: staggered, from the left. */
export function scrollRevealLines(
  targets: string | Element[],
  scope: Element | null,
): ScrollTrigger[] {
  const elements =
    typeof targets === "string"
      ? Array.from((scope ?? document).querySelectorAll<HTMLElement>(targets))
      : (targets as HTMLElement[]);

  if (elements.length === 0) {
    return [];
  }

  if (prefersReducedMotion()) {
    gsap.set(elements, { autoAlpha: 1, x: 0 });
    return [];
  }

  gsap.set(elements, { autoAlpha: 0, x: -12 });

  return ScrollTrigger.batch(elements, {
    start: "top 92%",
    once: true,
    batchMax: 24,
    onEnter: (batch) => {
      gsap.to(batch, {
        autoAlpha: 1,
        x: 0,
        duration: DURATION.component,
        ease: EASE.entrance,
        stagger: 0.02,
        overwrite: "auto",
      });
    },
  });
}

/** Assessment marks landing with a little weight behind them. */
export function markPop(targets: string | Element[], scope: Element | null): void {
  const elements =
    typeof targets === "string"
      ? Array.from((scope ?? document).querySelectorAll<HTMLElement>(targets))
      : (targets as HTMLElement[]);

  if (elements.length === 0) {
    return;
  }

  if (prefersReducedMotion()) {
    gsap.set(elements, { autoAlpha: 1, scale: 1 });
    return;
  }

  gsap.set(elements, { autoAlpha: 0, scale: 0.4 });
  ScrollTrigger.batch(elements, {
    start: "top 90%",
    once: true,
    onEnter: (batch) => {
      gsap.to(batch, {
        autoAlpha: 1,
        scale: 1,
        duration: DURATION.component,
        ease: "back.out(2.4)",
        stagger: STAGGER.loose,
        overwrite: "auto",
      });
    },
  });
}

/**
 * Pointer-driven weight sweep for display type. Returns a teardown so callers
 * can remove the listeners with the rest of their context.
 */
export function weightHover(element: HTMLElement | null): () => void {
  if (!element || prefersReducedMotion()) {
    return () => {};
  }

  const enter = () => {
    gsap.to(element, {
      fontWeight: WEIGHT.display,
      duration: DURATION.component,
      ease: EASE.shift,
      overwrite: "auto",
    });
  };
  const leave = () => {
    gsap.to(element, {
      fontWeight: WEIGHT.rest,
      duration: DURATION.page,
      ease: EASE.shift,
      overwrite: "auto",
    });
  };

  element.addEventListener("pointerenter", enter);
  element.addEventListener("pointerleave", leave);
  element.addEventListener("focus", enter);
  element.addEventListener("blur", leave);

  return () => {
    element.removeEventListener("pointerenter", enter);
    element.removeEventListener("pointerleave", leave);
    element.removeEventListener("focus", enter);
    element.removeEventListener("blur", leave);
  };
}
