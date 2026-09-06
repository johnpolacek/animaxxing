"use client";

import { gsap, SplitText } from "@/components/motion";

/*
 * Bauhaus.
 *
 * The motion vocabulary of the Bauhaus look, all of it from the workshop:
 * shapes that drop, roll and rise into a composition and then keep moving
 * like a kinetic sculpture; bars that swing in on a hinge; rules that wipe;
 * type that is stamped onto the paper or rises behind a mask, line by line;
 * numerals that count; and, on the way out, the whole composition flying
 * apart along the lines it arrived on.
 */

type At = number | string;

/** Stamped: the block lands on the paper from above, hard, with a little give. */
export function stampIn(
  timeline: gsap.core.Timeline,
  targets: gsap.TweenTarget,
  at: At,
  { duration = 0.55, stagger = 0.08, from = 1.6, rotate = 0 }: { duration?: number; stagger?: number; from?: number; rotate?: number } = {},
): void {
  timeline
    .set(targets, { willChange: "transform, opacity" }, at)
    .fromTo(
      targets,
      { autoAlpha: 0, scale: from, rotation: rotate, transformOrigin: "center" },
      { autoAlpha: 1, scale: 1, rotation: 0, duration, ease: "back.out(2.2)", stagger },
      at,
    )
    .set(targets, { clearProps: "willChange" }, ">");
}

/**
 * Lines rise behind a mask, one after another, the way a heading is set a
 * line at a time. Returns the split so the caller can revert it.
 */
export function linesRise(
  timeline: gsap.core.Timeline,
  el: HTMLElement,
  at: At,
  { duration = 0.9, stagger = 0.12, ease = "power4.out" }: { duration?: number; stagger?: number; ease?: string } = {},
): SplitText {
  const split = SplitText.create(el, { type: "lines", mask: "lines", aria: "auto" });
  gsap.set(el, { autoAlpha: 1 });
  timeline.fromTo(
    split.lines,
    { yPercent: 110, willChange: "transform" },
    { yPercent: 0, duration, ease, stagger },
    at,
  );
  return split;
}

/** Words step onto the line one after another. Returns the split to revert. */
export function wordsRise(
  timeline: gsap.core.Timeline,
  el: HTMLElement,
  at: At,
  { duration = 0.6, each = 0.03 }: { duration?: number; each?: number } = {},
): SplitText {
  const split = SplitText.create(el, { type: "words", aria: "auto" });
  gsap.set(el, { autoAlpha: 1 });
  timeline
    .fromTo(
      split.words,
      { autoAlpha: 0, y: 22, willChange: "transform, opacity" },
      { autoAlpha: 1, y: 0, duration, ease: "back.out(1.4)", stagger: each },
      at,
    )
    .set(split.words, { clearProps: "willChange" }, ">");
  return split;
}

/** Letters tumble onto the line from random angles, each finding its feet. */
export function tumbleIn(
  timeline: gsap.core.Timeline,
  el: HTMLElement,
  at: At,
  { duration = 0.7, each = 0.03 }: { duration?: number; each?: number } = {},
): SplitText {
  const split = SplitText.create(el, { type: "chars", aria: "auto" });
  gsap.set(el, { autoAlpha: 1 });
  timeline
    .fromTo(
      split.chars,
      {
        autoAlpha: 0,
        scale: 0.4,
        rotation: () => gsap.utils.random(-120, 120),
        y: () => gsap.utils.random(-24, 24),
        willChange: "transform, opacity",
      },
      {
        autoAlpha: 1,
        scale: 1,
        rotation: 0,
        y: 0,
        duration,
        ease: "back.out(1.8)",
        stagger: { each, from: "random" },
      },
      at,
    )
    .set(split.chars, { clearProps: "willChange" }, ">");
  return split;
}

/** A rule wipes across from one end. */
export function wipeIn(
  timeline: gsap.core.Timeline,
  targets: gsap.TweenTarget,
  at: At,
  { duration = 0.9, origin = "left center", axis = "x", stagger = 0 }: { duration?: number; origin?: string; axis?: "x" | "y"; stagger?: number } = {},
): void {
  const from = axis === "x" ? { scaleX: 0 } : { scaleY: 0 };
  const to = axis === "x" ? { scaleX: 1 } : { scaleY: 1 };
  timeline
    .fromTo(
      targets,
      { autoAlpha: 1, ...from, transformOrigin: origin, willChange: "transform" },
      { ...to, duration, ease: "expo.out", stagger },
      at,
    )
    .set(targets, { clearProps: "willChange" }, ">");
}

/** A bar swings in on a hinge at one end and grows to its length as it comes. */
export function barSwing(
  timeline: gsap.core.Timeline,
  bar: HTMLElement,
  at: At,
  { from = -90, to = 0, duration = 1.1, origin = "left center" }: { from?: number; to?: number; duration?: number; origin?: string } = {},
): void {
  timeline
    .fromTo(
      bar,
      { autoAlpha: 1, rotation: from, scaleX: 0, transformOrigin: origin, willChange: "transform" },
      { rotation: to, scaleX: 1, duration, ease: "power4.out" },
      at,
    )
    .set(bar, { clearProps: "willChange" }, ">");
}

/** A circle rolls in along the floor and lands with a squash. */
export function rollIn(
  timeline: gsap.core.Timeline,
  circle: HTMLElement,
  at: At,
  { fromX = -600, duration = 1.2 }: { fromX?: number; duration?: number } = {},
): void {
  const turns = fromX / (Math.PI * Math.max(circle.offsetWidth, 1));
  timeline
    .fromTo(
      circle,
      { autoAlpha: 1, x: fromX, rotation: turns * 360, willChange: "transform" },
      { x: 0, rotation: 0, duration, ease: "power3.out" },
      at,
    )
    .fromTo(
      circle,
      { scaleX: 1.08, scaleY: 0.92, transformOrigin: "center bottom" },
      { scaleX: 1, scaleY: 1, duration: 0.8, ease: "elastic.out(1, 0.4)" },
      `>-${duration * 0.35}`,
    )
    .set(circle, { clearProps: "willChange" }, ">");
}

/** A square drops from above and bounces to rest. */
export function dropIn(
  timeline: gsap.core.Timeline,
  square: HTMLElement,
  at: At,
  { fromY = -500, duration = 1.1 }: { fromY?: number; duration?: number } = {},
): void {
  timeline
    .fromTo(
      square,
      { autoAlpha: 1, y: fromY, willChange: "transform" },
      { y: 0, duration, ease: "bounce.out" },
      at,
    )
    .set(square, { clearProps: "willChange" }, ">");
}

/** A triangle rises from below, righting itself as it comes. */
export function riseIn(
  timeline: gsap.core.Timeline,
  triangle: HTMLElement,
  at: At,
  { fromY = 500, rotate = -30, duration = 1.1 }: { fromY?: number; rotate?: number; duration?: number } = {},
): void {
  timeline
    .fromTo(
      triangle,
      { autoAlpha: 1, y: fromY, rotation: rotate, transformOrigin: "center 66%", willChange: "transform" },
      { y: 0, rotation: 0, duration, ease: "back.out(1.4)" },
      at,
    )
    .set(triangle, { clearProps: "willChange" }, ">");
}

/** A dot pops into being. */
export function popIn(
  timeline: gsap.core.Timeline,
  targets: gsap.TweenTarget,
  at: At,
  { duration = 0.9, stagger = 0.1 }: { duration?: number; stagger?: number } = {},
): void {
  timeline
    .fromTo(
      targets,
      { autoAlpha: 1, scale: 0, transformOrigin: "center", willChange: "transform" },
      { scale: 1, duration, ease: "elastic.out(1, 0.45)", stagger },
      at,
    )
    .set(targets, { clearProps: "willChange" }, ">");
}

/** A shape spins in from nothing, for the ones that carry a number. */
export function spinIn(
  timeline: gsap.core.Timeline,
  targets: gsap.TweenTarget,
  at: At,
  { duration = 1, from = -180 }: { duration?: number; from?: number } = {},
): void {
  timeline
    .fromTo(
      targets,
      { autoAlpha: 1, scale: 0, rotation: from, transformOrigin: "center", willChange: "transform" },
      { scale: 1, rotation: 0, duration, ease: "back.out(1.6)" },
      at,
    )
    .set(targets, { clearProps: "willChange" }, ">");
}

/** Blocks march in, one after another. */
export function marchIn(
  timeline: gsap.core.Timeline,
  targets: gsap.TweenTarget,
  at: At,
  { duration = 0.7, stagger = 0.06, y = 40 }: { duration?: number; stagger?: number; y?: number } = {},
): void {
  timeline
    .fromTo(
      targets,
      { autoAlpha: 0, y, willChange: "transform, opacity" },
      { autoAlpha: 1, y: 0, duration, ease: "power4.out", stagger },
      at,
    )
    .set(targets, { clearProps: "transform,willChange" }, ">");
}

/** A photograph is revealed by a wipe from one side. */
export function revealIn(
  timeline: gsap.core.Timeline,
  el: HTMLElement,
  at: At,
  { duration = 1.1, from = "inset(0 100% 0 0)" }: { duration?: number; from?: string } = {},
): void {
  timeline
    .fromTo(
      el,
      { autoAlpha: 1, clipPath: from, willChange: "clip-path" },
      { clipPath: "inset(0 0% 0 0)", duration, ease: "expo.inOut" },
      at,
    )
    .set(el, { clearProps: "clipPath,willChange" }, ">");
}

/** A numeral counts up from nothing to its value. */
export function countUp(
  timeline: gsap.core.Timeline,
  el: HTMLElement,
  at: At,
  value: string,
  { duration = 1.4 }: { duration?: number } = {},
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
      ease: "power3.out",
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

/** A satellite orbits a centre. The target is moved with x and y; `radius` in px. */
export function orbit(
  target: HTMLElement,
  { radius, duration = 12, from = 0 }: { radius: number; duration?: number; from?: number },
): gsap.core.Tween {
  const angle = { a: from };
  const rad = (deg: number) => (deg * Math.PI) / 180;
  return gsap.to(angle, {
    a: from + 360,
    duration,
    repeat: -1,
    ease: "none",
    onUpdate: () => {
      gsap.set(target, { x: Math.cos(rad(angle.a)) * radius, y: Math.sin(rad(angle.a)) * radius });
    },
  });
}

/**
 * A kinetic sculpture: each shape keeps a slow motion of its own, all of it
 * in balance. Returns the timeline so the caller can kill it; the shapes
 * are left where they were.
 */
export function kinetic({
  bar,
  triangle,
  square,
  circle,
}: {
  bar?: HTMLElement | null;
  triangle?: HTMLElement | null;
  square?: HTMLElement | null;
  circle?: HTMLElement | null;
}): gsap.core.Timeline {
  const tl = gsap.timeline({ repeat: -1, yoyo: true, defaults: { ease: "sine.inOut" } });
  if (bar) {
    tl.to(bar, { rotation: "+=3", duration: 5 }, 0);
  }
  if (triangle) {
    tl.to(triangle, { y: -14, rotation: 4, duration: 3.6 }, 0);
  }
  if (square) {
    tl.to(square, { y: 10, duration: 4.4 }, 0);
  }
  if (circle) {
    tl.to(circle, { x: 12, y: -8, duration: 6 }, 0);
  }
  return tl;
}

/** Hearts beat, one after another. */
export function heartbeat(targets: gsap.TweenTarget): gsap.core.Timeline {
  return gsap
    .timeline({ repeat: -1, repeatDelay: 0.6 })
    .to(targets, { scale: 1.35, duration: 0.14, ease: "power2.out", stagger: 0.12 })
    .to(targets, { scale: 1, duration: 0.5, ease: "elastic.out(1, 0.4)", stagger: 0.12 }, "-=0.4");
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
 * The composition flies apart: every shape leaves along the line it came in
 * on, spinning, and the type drops off the page. Returns the timeline.
 */
export function flyApart(
  shapes: { el: HTMLElement; x?: number; y?: number; rotation?: number }[],
  type: gsap.TweenTarget,
  { duration = 0.7 }: { duration?: number } = {},
): gsap.core.Timeline {
  const tl = gsap.timeline();
  shapes.forEach(({ el, x = 0, y = 0, rotation = 0 }, index) => {
    tl.to(
      el,
      { x, y, rotation, autoAlpha: 0, duration, ease: "power3.in", overwrite: "auto" },
      index * 0.04,
    );
  });
  tl.to(type, { y: 60, autoAlpha: 0, duration: duration * 0.8, ease: "power3.in", stagger: 0.04, overwrite: "auto" }, 0);
  return tl;
}
