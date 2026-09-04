"use client";

import { gsap, prefersReducedMotion, SplitText } from "@/components/motion";

/*
 * Chromatophores.
 *
 * Skin that never quite holds still. A title is split into letters and, a
 * few times a second, a small patch of one to three neighbouring letters
 * dims and thins on the weight axis, then fills back in, the way pigment
 * cells open and close across an octopus's skin. Each letter's box is
 * pinned to its heaviest width first, so the line never crawls.
 *
 * It is ambient, so keep it to one title and stop it when that title leaves
 * the screen.
 */

const rnd = gsap.utils.random;

/** Seconds between patches. */
const INTERVAL: [number, number] = [0.06, 0.32];
/** Seconds a patch takes to open, and again to close. */
const OPEN: [number, number] = [0.1, 0.28];

export function startChromatophores(el: HTMLElement): () => void {
  if (prefersReducedMotion()) {
    return () => {};
  }
  const settledWeight = Number(getComputedStyle(el).fontWeight) || 800;
  const split = SplitText.create(el, { type: "chars", aria: "auto" });
  const chars = split.chars as HTMLElement[];
  for (const char of chars) {
    const { width } = char.getBoundingClientRect();
    char.style.display = "inline-block";
    char.style.width = `${width}px`;
    char.style.textAlign = "center";
  }
  gsap.set(chars, { willChange: "opacity" });

  let current: gsap.core.Tween | undefined;
  const patch = () => {
    const size = Math.round(rnd(1, 3));
    const start = Math.floor(rnd(0, Math.max(1, chars.length - size)));
    const cells = chars.slice(start, start + size);
    const open = rnd(OPEN[0], OPEN[1]);
    current = gsap.to(cells, {
      fontWeight: rnd(400, Math.max(420, settledWeight - 150), 10),
      autoAlpha: rnd(0.35, 0.75),
      duration: open,
      ease: "sine.inOut",
      yoyo: true,
      repeat: 1,
      stagger: 0.03,
      overwrite: "auto",
    });
    clock.restart(true).delay(rnd(INTERVAL[0], INTERVAL[1]) + open);
  };
  const clock = gsap.delayedCall(rnd(INTERVAL[0], INTERVAL[1]), patch);

  return () => {
    clock.kill();
    current?.kill();
    gsap.killTweensOf(chars);
    split.revert();
  };
}
