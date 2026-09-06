"use client";

import { gsap, SplitText } from "@/components/motion";

/*
 * Constructivist.
 *
 * The motion vocabulary of the constructivist look, all of it from the
 * agitprop press: a red wedge that drives in from the corner, bars that
 * slash across the page, blocks that are stamped down hard, letters that
 * are hammered onto the diagonal one at a time, captions that come over
 * the wire a word at a time with no easing at all, a ring that is drawn
 * around a circle, numerals that count, a ▶▶ that keeps marching, and the
 * red wipe that ends a scene.
 */

type At = number | string;

/** The wedge drives in from its point, along its own long edge. */
export function wedgeIn(
  timeline: gsap.core.Timeline,
  wedge: HTMLElement,
  at: At,
  { duration = 1.1, from = "polygon(0 100%, 0 100%, 0 100%)", to = "polygon(0 100%, 100% 6%, 100% 100%)" }: { duration?: number; from?: string; to?: string } = {},
): void {
  timeline
    .fromTo(
      wedge,
      { autoAlpha: 1, clipPath: from, willChange: "clip-path" },
      { clipPath: to, duration, ease: "power4.out" },
      at,
    )
    .set(wedge, { clearProps: "clipPath,willChange" }, ">");
}

/** A bar slashes across from one end, overshoots, and settles. */
export function slashIn(
  timeline: gsap.core.Timeline,
  targets: gsap.TweenTarget,
  at: At,
  { duration = 0.8, origin = "left center", stagger = 0 }: { duration?: number; origin?: string; stagger?: number } = {},
): void {
  timeline
    .fromTo(
      targets,
      { autoAlpha: 1, scaleX: 0, transformOrigin: origin, willChange: "transform" },
      { scaleX: 1, duration, ease: "back.out(1.2)", stagger },
      at,
    )
    .set(targets, { clearProps: "willChange" }, ">");
}

/** Stamped: the block comes down on the paper from above, hard, and leaves a little ink. */
export function stampDown(
  timeline: gsap.core.Timeline,
  targets: gsap.TweenTarget,
  at: At,
  { duration = 0.45, from = 1.8, rotate = 0, stagger = 0.08 }: { duration?: number; from?: number; rotate?: number; stagger?: number } = {},
): void {
  timeline
    .fromTo(
      targets,
      { autoAlpha: 0, scale: from, rotation: rotate, transformOrigin: "center", willChange: "transform, opacity" },
      { autoAlpha: 1, scale: 1, rotation: 0, duration, ease: "power4.in", stagger },
      at,
    )
    .to(targets, { scale: 0.96, duration: 0.08, ease: "power2.out", stagger }, `>-${duration * 0.02}`)
    .to(targets, { scale: 1, duration: 0.35, ease: "elastic.out(1, 0.5)", stagger }, ">")
    .set(targets, { clearProps: "willChange" }, ">");
}

/**
 * Letters are hammered on one at a time: each drops from above, hits, and
 * overshoots a hair. Returns the split so the caller can revert it.
 */
export function hammerIn(
  timeline: gsap.core.Timeline,
  el: HTMLElement,
  at: At,
  { duration = 0.5, each = 0.05, from = -0.6 }: { duration?: number; each?: number; from?: number } = {},
): SplitText {
  // Words stay whole so the line breaks where the prose would.
  const split = SplitText.create(el, { type: "words,chars", aria: "auto" });
  gsap.set(el, { autoAlpha: 1 });
  timeline
    .fromTo(
      split.chars,
      { autoAlpha: 0, yPercent: from * 100, scale: 1.3, willChange: "transform, opacity" },
      { autoAlpha: 1, yPercent: 0, scale: 1, duration, ease: "back.out(3)", stagger: each },
      at,
    )
    .set(split.chars, { clearProps: "willChange" }, ">");
  return split;
}

/**
 * Over the wire: words appear one after another with no easing at all,
 * the way a teleprinter sets them. Returns the split to revert.
 */
export function wireIn(
  timeline: gsap.core.Timeline,
  el: HTMLElement,
  at: At,
  { each = 0.045 }: { each?: number } = {},
): SplitText {
  const split = SplitText.create(el, { type: "words", aria: "auto" });
  gsap.set(el, { autoAlpha: 1 });
  timeline.fromTo(split.words, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.001, stagger: each }, at);
  return split;
}

/** Letters are typed out one after another, hard cuts. Returns the split to revert. */
export function typeIn(
  timeline: gsap.core.Timeline,
  el: HTMLElement,
  at: At,
  { each = 0.03 }: { each?: number } = {},
): SplitText {
  const split = SplitText.create(el, { type: "words,chars", aria: "auto" });
  gsap.set(el, { autoAlpha: 1 });
  timeline.fromTo(split.chars, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.001, stagger: each }, at);
  return split;
}

/**
 * Lines shove in from the left, skewed by their own speed, and square up as
 * they stop. Returns the split so the caller can revert it.
 */
export function linesShove(
  timeline: gsap.core.Timeline,
  el: HTMLElement,
  at: At,
  { duration = 0.7, stagger = 0.1, x = -70 }: { duration?: number; stagger?: number; x?: number } = {},
): SplitText {
  const split = SplitText.create(el, { type: "lines", aria: "auto" });
  gsap.set(el, { autoAlpha: 1 });
  timeline
    .fromTo(
      split.lines,
      { autoAlpha: 0, x, skewX: -14, willChange: "transform, opacity" },
      { autoAlpha: 1, x: 0, skewX: 0, duration, ease: "power4.out", stagger },
      at,
    )
    .set(split.lines, { clearProps: "willChange" }, ">");
  return split;
}

/** Blocks shove in from one side, hard, one after another. */
export function shoveIn(
  timeline: gsap.core.Timeline,
  targets: gsap.TweenTarget,
  at: At,
  { duration = 0.6, stagger = 0.08, x = -80, y = 0, skew = 0 }: { duration?: number; stagger?: number; x?: number; y?: number; skew?: number } = {},
): void {
  timeline
    .fromTo(
      targets,
      { autoAlpha: 0, x, y, skewX: skew, willChange: "transform, opacity" },
      { autoAlpha: 1, x: 0, y: 0, skewX: 0, duration, ease: "power4.out", stagger },
      at,
    )
    .set(targets, { clearProps: "transform,willChange" }, ">");
}

/** A ring is drawn around its centre. The target is an SVG circle. */
export function ringDraw(
  timeline: gsap.core.Timeline,
  ring: SVGCircleElement,
  at: At,
  { duration = 1.2 }: { duration?: number } = {},
): void {
  const r = Number.parseFloat(ring.getAttribute("r") ?? "0");
  const length = 2 * Math.PI * r;
  timeline.fromTo(
    ring,
    { autoAlpha: 1, strokeDasharray: length, strokeDashoffset: length },
    { strokeDashoffset: 0, duration, ease: "power3.inOut" },
    at,
  );
}

/** A photograph is cut on by a diagonal, from one corner to the other. */
export function cutIn(
  timeline: gsap.core.Timeline,
  el: HTMLElement,
  at: At,
  { duration = 1.1, from = "polygon(0 0, 0 0, 0 100%, 0 100%)", to = "polygon(0 0, 100% 0, 100% 100%, 0 100%)" }: { duration?: number; from?: string; to?: string } = {},
): void {
  timeline
    .fromTo(
      el,
      { autoAlpha: 1, clipPath: from, willChange: "clip-path" },
      { clipPath: to, duration, ease: "expo.inOut" },
      at,
    )
    .set(el, { clearProps: "clipPath,willChange" }, ">");
}

/** An exclamation mark drops from above and hits the paper. */
export function bangIn(
  timeline: gsap.core.Timeline,
  targets: gsap.TweenTarget,
  at: At,
  { duration = 0.6, stagger = 0.1 }: { duration?: number; stagger?: number } = {},
): void {
  timeline
    .fromTo(
      targets,
      { autoAlpha: 0, y: -120, scaleY: 1.4, transformOrigin: "center bottom", willChange: "transform, opacity" },
      { autoAlpha: 1, y: 0, scaleY: 1, duration, ease: "bounce.out", stagger },
      at,
    )
    .set(targets, { clearProps: "willChange" }, ">");
}

/** A numeral counts up from nothing to its value. */
export function countUp(
  timeline: gsap.core.Timeline,
  el: HTMLElement,
  at: At,
  value: string,
  { duration = 1.2 }: { duration?: number } = {},
): void {
  const decimals = (value.split(".")[1] ?? "").length;
  const target = Number.parseFloat(value);
  if (Number.isNaN(target)) {
    return;
  }
  const counter = { n: 0 };
  timeline.to(
    counter,
    {
      n: target,
      duration,
      ease: "steps(12)",
      onUpdate: () => {
        el.textContent = counter.n.toFixed(decimals);
      },
      onComplete: () => {
        el.textContent = value;
      },
    },
    at,
  );
}

/* --------------------------------------------------------------- loops */

/** The ▶▶ marches: the two heads step forward one after the other, and again. */
export function march(heads: HTMLElement[], { every = 2.4 }: { every?: number } = {}): gsap.core.Timeline {
  const tl = gsap.timeline({ repeat: -1, repeatDelay: every });
  tl.to(heads, { x: "0.12em", duration: 0.12, ease: "power2.out", stagger: 0.1 })
    .to(heads, { x: 0, duration: 0.35, ease: "back.out(2)", stagger: 0.1 }, ">-0.05");
  return tl;
}

/** A ring turns, slowly, forever. */
export function turn(target: gsap.TweenTarget, { duration = 40, direction = 1 }: { duration?: number; direction?: 1 | -1 } = {}): gsap.core.Tween {
  return gsap.to(target, { rotation: `+=${360 * direction}`, duration, repeat: -1, ease: "none", transformOrigin: "center" });
}

/** The arrow keeps pushing: a nudge forward along its own line, and back. */
export function push(target: gsap.TweenTarget, { distance = 14, every = 3 }: { distance?: number; every?: number } = {}): gsap.core.Timeline {
  return gsap
    .timeline({ repeat: -1, repeatDelay: every })
    .to(target, { x: distance, duration: 0.18, ease: "power3.out" })
    .to(target, { x: 0, duration: 0.7, ease: "elastic.out(1, 0.4)" });
}

/** An exclamation mark shakes, now and then, as if struck. */
export function rattle(targets: gsap.TweenTarget, { every = 4 }: { every?: number } = {}): gsap.core.Timeline {
  return gsap
    .timeline({ repeat: -1, repeatDelay: every })
    .to(targets, { rotation: -6, duration: 0.06, ease: "none" })
    .to(targets, { rotation: 5, duration: 0.08, ease: "none" })
    .to(targets, { rotation: -3, duration: 0.08, ease: "none" })
    .to(targets, { rotation: 0, duration: 0.3, ease: "elastic.out(1, 0.3)" });
}

/**
 * Pointer parallax: layers drift toward the pointer, deeper ones further.
 * Each layer's `data-depth` is a multiplier on the travel. Returns a cleanup.
 */
export function parallax(root: HTMLElement, layers: HTMLElement[], travel = 24): () => void {
  const movers = layers.map((layer) => {
    const depth = Number.parseFloat(layer.dataset.depth ?? "1");
    return {
      x: gsap.quickTo(layer, "x", { duration: 0.9, ease: "power3.out" }),
      y: gsap.quickTo(layer, "y", { duration: 0.9, ease: "power3.out" }),
      depth,
    };
  });
  const onMove = (event: PointerEvent) => {
    const bounds = root.getBoundingClientRect();
    const nx = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    const ny = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    for (const mover of movers) {
      mover.x(nx * travel * mover.depth);
      mover.y(ny * travel * mover.depth);
    }
  };
  const onLeave = () => {
    for (const mover of movers) {
      mover.x(0);
      mover.y(0);
    }
  };
  root.addEventListener("pointermove", onMove);
  root.addEventListener("pointerleave", onLeave);
  return () => {
    root.removeEventListener("pointermove", onMove);
    root.removeEventListener("pointerleave", onLeave);
  };
}

/* ---------------------------------------------------------------- outro */

/**
 * The red wipe: the wedge drives up and covers the whole scene while the
 * type is shoved off along the diagonal. Returns the timeline.
 */
export function redWipe(
  wedge: HTMLElement,
  type: gsap.TweenTarget,
  { duration = 0.6 }: { duration?: number } = {},
): gsap.core.Timeline {
  return gsap
    .timeline()
    .to(wedge, { clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)", autoAlpha: 1, duration, ease: "power4.in", overwrite: "auto" }, 0)
    .to(type, { x: 120, y: -40, autoAlpha: 0, duration: duration * 0.8, ease: "power3.in", stagger: 0.03, overwrite: "auto" }, 0);
}
