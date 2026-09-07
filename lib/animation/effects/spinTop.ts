"use client";

import { gsap, prefersReducedMotion, SplitText } from "@/components/motion";

/** Keeps both trailing x's tumbling while the rest of the hero arrives.
 * The final x gets the longer encore. The shared split is released only
 * after both settle, before handing control to the headline wave.
 */
export function spinTop(heading: HTMLElement, onComplete?: () => void) {
  if (prefersReducedMotion()) {
    return () => {};
  }
  const split = SplitText.create(heading, { type: "chars,words" });
  const chars = split.chars as HTMLElement[];
  const tops = chars.slice(-2).filter((char) => char.textContent?.toLowerCase() === "x");
  if (!tops.length) {
    split.revert();
    return () => {};
  }
  gsap.set(tops, {
    transformOrigin: "50% 96%",
    transformPerspective: 900,
    willChange: "transform",
  });
  const timeline = gsap.timeline({ defaults: { overwrite: "auto" } });
  tops.forEach((top, index) => {
    const last = index === tops.length - 1;
    const duration = last ? 5 : 3;
    const direction = last ? 1 : -1;
    timeline.to(top, {
      rotationY: direction * (last ? 9 : 5) * 360,
      duration,
      ease: "power2.out",
    }, 0);
    timeline.to(top, {
      keyframes: {
        yPercent: [0, -32, 8, -22, 0, -12, 0],
        rotation: [0, direction * 28, -direction * 22, direction * 18, -12, 6, 0],
        rotationX: [0, -35, 28, -24, 16, -8, 0],
        scaleX: [1, 0.72, 1.2, 0.85, 1.12, 0.95, 1],
        scaleY: [1, 1.25, 0.8, 1.18, 0.9, 1.05, 1],
        easeEach: "sine.inOut",
      },
      duration,
      ease: "none",
    }, 0);
  });

  let live = true;
  const stop = (keepSplit = false) => {
    if (!live) {
      return;
    }
    live = false;
    timeline.kill();
    gsap.set(tops, { clearProps: "transform,willChange" });
    if (!keepSplit) {
      split.revert();
    }
  };
  timeline.eventCallback("onComplete", () => {
    stop();
    onComplete?.();
  });
  return stop;
}
