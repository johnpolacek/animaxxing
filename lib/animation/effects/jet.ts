"use client";

import { gsap, prefersReducedMotion } from "@/components/motion";
import type { Ink } from "./ink";

/*
 * Jet.
 *
 * Press the masthead and the octopus bolts: the letters draw back for a
 * beat as the mantle fills, then fire off the left edge of the page, the
 * leading letters first and the trailing ones stretched out behind, while
 * a cloud of ink is left hanging where the word was. After a moment the
 * word swims back in from the right and settles, and the arms take over
 * again.
 *
 * The letters are the arms effect's split, borrowed for the duration; the
 * caller pauses the arms before and resumes them after.
 */

const rnd = gsap.utils.random;

/** Seconds the page is left empty before the word comes back. */
const HOLD = 0.55;

export type JetOptions = {
  heading: HTMLElement;
  chars: HTMLElement[];
  /** The ink field around the heading, and the frame its coordinates are in. */
  ink?: Ink | null;
  frame: HTMLElement;
};

export function jet({ heading, chars, ink, frame }: JetOptions): gsap.core.Timeline {
  const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
  if (prefersReducedMotion() || chars.length === 0) {
    // A blink stands in for the bolt.
    return tl
      .to(heading, { autoAlpha: 0, duration: 0.15 })
      .to(heading, { autoAlpha: 1, duration: 0.15 }, `+=${HOLD}`);
  }

  const frameBox = frame.getBoundingClientRect();
  const headBox = heading.getBoundingClientRect();
  // The siphon sits at the back: the ink leaves from the right end of the word.
  const siphon = { x: headBox.right - frameBox.left - headBox.width * 0.08, y: headBox.top - frameBox.top + headBox.height * 0.55 };
  const exits = chars.map((char) => -(char.getBoundingClientRect().right + 120));
  const entries = chars.map((char) => window.innerWidth - char.getBoundingClientRect().left + 160);

  tl.addLabel("fill", 0)
    // Fill: the whole word draws back a touch and narrows, taking water in.
    .to(
      chars,
      { x: 22, scaleX: 0.9, transformOrigin: "50% 100%", duration: 0.2, ease: "power2.out" },
      "fill",
    )
    .addLabel("fire", "fill+=0.2")
    .call(() => ink?.squirt(siphon.x, siphon.y, { angle: Math.PI, strength: 1.6 }), [], "fire")
    .call(() => ink?.squirt(siphon.x - 40, siphon.y, { angle: Math.PI + 0.3, strength: 0.6 }), [], "fire+=0.08")
    // Fire: off the page to the left, leading letters first, trailing ones stretched.
    .to(
      chars,
      {
        x: (i: number) => exits[i] ?? -2000,
        scaleX: (i: number) => 1.35 + i * 0.06,
        scaleY: 0.82,
        skewX: -22,
        duration: 0.42,
        ease: "power4.in",
        stagger: { each: 0.028, from: "start" },
      },
      "fire",
    )
    .addLabel("return", `fire+=${0.42 + 0.028 * chars.length + HOLD}`)
    // Return: in from the right, still streamlined, easing out to a stop.
    .set(chars, { x: (i: number) => entries[i] ?? 2000, scaleX: 1.25, scaleY: 0.9, skewX: -14 }, "return")
    .to(
      chars,
      {
        x: 0,
        scaleX: 1,
        scaleY: 1,
        skewX: 0,
        duration: 1.15,
        ease: "expo.out",
        stagger: { each: 0.04, from: "start" },
      },
      "return",
    )
    // A wobble as the body reinflates, then rest.
    .to(chars, { scaleY: 1.06, duration: 0.12, ease: "sine.out", stagger: 0.02 }, "return+=0.55")
    .to(chars, { scaleY: 1, duration: 0.3, ease: "elastic.out(1, 0.5)", stagger: 0.02 }, ">")
    .set(chars, { x: 0, scaleX: 1, scaleY: 1, skewX: 0 });

  // Random micro-shake while firing: the page feels the push.
  tl.to(
    frame,
    { x: () => rnd(-5, 5), y: () => rnd(-3, 3), duration: 0.035, repeat: 8, yoyo: true, ease: "none" },
    "fire",
  ).set(frame, { x: 0, y: 0 }, ">");

  return tl;
}
