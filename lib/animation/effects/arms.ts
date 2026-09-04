"use client";

import { gsap, prefersReducedMotion, SplitText } from "@/components/motion";

/*
 * Arms.
 *
 * The masthead's letters move the way an octopus's arms do at rest: each one
 * drifts on its own slow sway, and a phase offset per letter turns the row
 * into a single undulation travelling left to right. Bring a pointer near
 * and the letters under it reach for it, the way arms come up to feel at
 * something new. Nothing is ever far from home, and stopping it puts every
 * letter back exactly where it sat.
 *
 * It runs on the ticker rather than on tweens so seven letters cost one
 * callback and no timeline bookkeeping. Pausing fades the sway out and
 * hands the letters over; resuming fades it back in.
 */

/** Pixels of lift at the crest. */
const LIFT = 10;
/** Degrees of lean at the crest. */
const LEAN = 3.2;
/** Degrees of shear at the crest; opposed to the lean so the letter bends, not tips. */
const SHEAR = 4;
/** Radians between neighbouring letters. Smaller is a longer, lazier wave. */
const SPACING = 0.85;
/** Cycles per second of the main swell. */
const RATE = 0.22;
/** Pixels a letter rises when the pointer is straight over it. */
const REACH_LIFT = 22;
/** Degrees a letter leans toward the pointer at most. */
const REACH_LEAN = 11;
/** How far the reach spreads, in letter widths. */
const REACH_SPREAD = 1.4;

export type Arms = {
  chars: HTMLElement[];
  /** Fades the sway out and stops ticking. The letters keep their split. */
  pause: () => void;
  /** Starts ticking again and fades the sway back in. */
  resume: () => void;
  /** Stops for good. Pass `keepSplit` if another animation needs the current markup. */
  stop: (keepSplit?: boolean) => void;
};

export type ArmsOptions = {
  /** The element whose pointer the letters reach for. Defaults to the heading. */
  field?: HTMLElement;
};

const IDLE: Arms = { chars: [], pause: () => {}, resume: () => {}, stop: () => {} };

export function startArms(heading: HTMLElement, { field = heading }: ArmsOptions = {}): Arms {
  if (prefersReducedMotion()) {
    return IDLE;
  }
  const split = SplitText.create(heading, { type: "chars", aria: "auto" });
  const chars = split.chars as HTMLElement[];
  chars.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
  gsap.set(chars, { transformOrigin: "50% 100%", willChange: "transform" });

  const setters = chars.map((char) => ({
    y: gsap.quickSetter(char, "y", "px"),
    rotation: gsap.quickSetter(char, "rotation", "deg"),
    skewX: gsap.quickSetter(char, "skewX", "deg"),
  }));
  // Every letter's own small irregularity, so the swell never looks mechanical.
  const drift = chars.map(() => gsap.utils.random(0.7, 1.3));

  // Resting centres, for the reach. Measured while nothing is transformed.
  let centres: number[] = [];
  let width = 1;
  const measure = () => {
    centres = chars.map((char) => {
      const r = char.getBoundingClientRect();
      return r.left + r.width / 2;
    });
    width = Math.max(1, (chars[0]?.getBoundingClientRect().width ?? 1) * REACH_SPREAD);
  };
  measure();
  const resized = new ResizeObserver(measure);
  resized.observe(heading);

  let pointerX: number | null = null;
  const reach = chars.map(() => 0);
  const move = (event: PointerEvent) => {
    pointerX = event.clientX;
  };
  const leave = () => {
    pointerX = null;
  };
  field.addEventListener("pointermove", move);
  field.addEventListener("pointerleave", leave);

  // The sway fades in and out through this, so starting and stopping never jump.
  const amount = { value: 0 };
  let elapsed = 0;
  let ticking = false;

  const tick = (_time: number, deltaMs: number) => {
    const dt = Math.min(deltaMs / 1000, 0.05);
    elapsed += dt;
    const t = elapsed * RATE * Math.PI * 2;
    const ease = Math.min(1, dt * 9);
    for (let i = 0; i < setters.length; i++) {
      const set = setters[i];
      if (!set) {
        continue;
      }
      const wobble = drift[i] ?? 1;
      const phase = t - i * SPACING;
      const swell = Math.sin(phase);
      const second = Math.sin(phase * 2.3 * wobble + i);

      // Reach: a bell around the pointer, smoothed so it never snaps.
      const cx = centres[i] ?? 0;
      const dx = pointerX === null ? 0 : (pointerX - cx) / width;
      const target = pointerX === null ? 0 : Math.exp(-dx * dx);
      const r = (reach[i] ?? 0) + (target - (reach[i] ?? 0)) * ease;
      reach[i] = r;
      const toward = Math.tanh(dx * 1.5);

      const a = amount.value;
      set.y((-Math.abs(swell) * LIFT - second * 2) * a - REACH_LIFT * r);
      set.rotation(Math.cos(phase) * LEAN * a + toward * REACH_LEAN * r);
      set.skewX(-Math.cos(phase) * SHEAR * wobble * a - toward * 5 * r);
    }
  };

  const start = () => {
    if (!ticking) {
      ticking = true;
      gsap.ticker.add(tick);
    }
    gsap.to(amount, { value: 1, duration: 1.2, ease: "sine.inOut", overwrite: "auto" });
  };
  start();

  const teardown = () => {
    gsap.ticker.remove(tick);
    ticking = false;
    gsap.killTweensOf(amount);
    resized.disconnect();
    field.removeEventListener("pointermove", move);
    field.removeEventListener("pointerleave", leave);
  };

  return {
    chars,
    pause: () => {
      pointerX = null;
      gsap.to(amount, {
        value: 0,
        duration: 0.25,
        ease: "sine.out",
        overwrite: "auto",
        onComplete: () => {
          // One last tick lands every letter at zero before the ticker goes.
          tick(0, 16);
          gsap.ticker.remove(tick);
          ticking = false;
        },
      });
    },
    resume: () => {
      measure();
      start();
    },
    stop: (keepSplit = false) => {
      teardown();
      if (!keepSplit) {
        split.revert();
      }
    },
  };
}
