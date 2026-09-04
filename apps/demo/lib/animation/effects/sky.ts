"use client";

import { gsap } from "@/components/motion";
import { ParticleField, type Emitter } from "@/components/motion/particles/field";

/*
 * Sky.
 *
 * The weather itself, drawn over the page's current-conditions block. Three
 * ambient conditions, each on the particle field the buttons and the ink use:
 *
 *  - fog: level hairlines, the fog glyph's own mark, drifting in from the
 *    left at different speeds and thinning away
 *  - rain: hairline streaks falling on a slant, at a steady rate
 *  - heat: rings that swell out of the sun glyph and fade, like shimmer
 *
 * Each returns a stop that lets the last particles finish before the canvas
 * goes quiet. They are ambient on purpose, so they run only while their block
 * is on screen, and never under reduced motion.
 */

const rnd = gsap.utils.random;

/** How far past the block the canvas extends. Rain starts above it; fog starts beside it. */
export const SKY_BLEED = 120;

export type Sky = {
  /** Stops emitting. Particles already in the air finish, then the field is destroyed. */
  stop: (immediate?: boolean) => void;
};

/** Emits `perSecond` particles at a steady rate, carrying the fraction between frames. */
function steady(perSecond: number, spawn: () => void): Emitter {
  let owed = 0;
  return (dt) => {
    owed += perSecond * dt;
    while (owed >= 1) {
      owed -= 1;
      spawn();
    }
  };
}

function finish(field: ParticleField, emitter: Emitter): Sky["stop"] {
  let done = false;
  return (immediate = false) => {
    if (done) {
      return;
    }
    done = true;
    field.removeEmitter(emitter);
    if (immediate) {
      field.destroy();
      return;
    }
    field.release(0.8);
    gsap.delayedCall(1, () => field.destroy());
  };
}

export function startFog(canvas: HTMLCanvasElement, target: HTMLElement): Sky {
  const field = new ParticleField(canvas, target, SKY_BLEED);
  const { box } = field;
  const spawn = (age = 0) => {
    const base = rnd(0.12, 0.35);
    const life = rnd(8, 14);
    field.spawn({
      x: box.x - SKY_BLEED * 0.5 + rnd(0, box.w + SKY_BLEED),
      y: box.y + rnd(0, box.h),
      vx: rnd(12, 40),
      size: rnd(40, 160),
      alpha: base,
      life,
      age,
      fade: false,
      wobble: rnd(2, 6),
      wobbleFreq: rnd(0.05, 0.12),
      phase: rnd(0, Math.PI * 2),
      shape: "streak",
      // A bank rolls in, hangs, and thins: alpha follows a half sine over the life.
      update: (p) => {
        p.alpha = base * Math.sin((p.age / p.life) * Math.PI);
      },
    });
  };
  // The bank is already here when the block appears: seed it mid-life.
  for (let i = 0; i < 26; i++) {
    spawn(rnd(1, 8));
  }
  const emitter = steady(3, () => spawn());
  field.addEmitter(emitter);
  return { stop: finish(field, emitter) };
}

export function startRain(
  canvas: HTMLCanvasElement,
  target: HTMLElement,
  { intensity = 1 }: { intensity?: number } = {},
): Sky {
  const field = new ParticleField(canvas, target, SKY_BLEED);
  const { box } = field;
  const speed = 1050;
  const drift = -150;
  const emitter = steady(110 * intensity, () => {
    const life = (box.h + SKY_BLEED * 1.5) / speed;
    field.spawn({
      x: box.x + rnd(-SKY_BLEED * 0.2, box.w + SKY_BLEED * 0.6),
      y: box.y - SKY_BLEED * 0.8,
      vx: drift * rnd(0.9, 1.1),
      vy: speed * rnd(0.85, 1.1),
      size: 1,
      alpha: rnd(0.3, 0.65),
      life,
      fade: false,
      shape: "spark",
    });
  });
  field.addEmitter(emitter);
  return { stop: finish(field, emitter) };
}

/** Rings swell out of `origin` (the sun glyph) and fade, like heat off a road. */
export function startHeat(
  canvas: HTMLCanvasElement,
  target: HTMLElement,
  { origin = target }: { origin?: HTMLElement } = {},
): Sky {
  const field = new ParticleField(canvas, target, SKY_BLEED);
  const { box } = field;
  const frame = target.getBoundingClientRect();
  const sun = origin.getBoundingClientRect();
  const x = box.x + (sun.left - frame.left) + sun.width / 2;
  const y = box.y + (sun.top - frame.top) + sun.height / 2;
  const base = Math.min(sun.width, sun.height);
  const emitter = steady(1, () => {
    field.spawn({
      x,
      y,
      size: base * 0.17,
      alpha: 0.5,
      life: 2.6,
      fade: true,
      shape: "ring",
      update: (p, dt) => {
        p.size += base * 0.2 * dt;
      },
    });
  });
  field.addEmitter(emitter);
  return { stop: finish(field, emitter) };
}
