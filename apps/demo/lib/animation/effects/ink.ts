"use client";

import { gsap } from "@/components/motion";
import { ParticleField } from "@/components/motion/particles/field";

/*
 * Ink.
 *
 * A cloud expelled from a point: a dense burst of soft dots thrown in one
 * direction that slows, spreads, hangs, and thins out. On the page it marks
 * the arrival of a chapter, jetted from the chapter's number as its heading
 * comes through the gap; the masthead and the rail marker squirt it too.
 *
 * The field is the one the particle buttons use, with the heading as its
 * target and a wide bleed, so the cloud can drift well past the type.
 */

const rnd = gsap.utils.random;

/** How far past the target the canvas extends, in px. Ink travels. */
export const INK_BLEED = 220;

export type SquirtOptions = {
  /** Direction of the jet in radians; 0 is rightward, positive is clockwise on screen. */
  angle?: number;
  /** Scales the count, size and speed. 1 is a chapter's worth. */
  strength?: number;
};

export type Ink = {
  /** Expels a cloud from `x`, `y` in the target's own coordinates. */
  squirt: (x: number, y: number, options?: SquirtOptions) => void;
  sync: () => void;
  destroy: () => void;
};

export function createInk(canvas: HTMLCanvasElement, target: HTMLElement): Ink {
  const field = new ParticleField(canvas, target, INK_BLEED);

  return {
    squirt(x, y, { angle = 0, strength = 1 } = {}) {
      field.sync();
      const ox = field.box.x + x;
      const oy = field.box.y + y;
      const size = Math.sqrt(strength);
      // The jet: a tight, fast plume thrown along the angle and slightly up.
      for (let i = 0; i < Math.round(70 * strength); i++) {
        const a = angle + rnd(-0.4, 0.4);
        const speed = rnd(140, 620) * size;
        field.spawn({
          x: ox + rnd(-4, 4),
          y: oy + rnd(-4, 4),
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          size: rnd(3, 16) * size,
          alpha: rnd(0.25, 0.6),
          life: rnd(0.9, 1.9),
          drag: 0.02,
          gravity: -18,
          wobble: rnd(10, 40),
          wobbleFreq: rnd(0.4, 1.4),
          phase: rnd(0, Math.PI * 2),
          shape: "dot",
        });
      }
      // The bloom: slower, bigger, fainter, hanging around the source.
      for (let i = 0; i < Math.round(36 * strength); i++) {
        const a = rnd(0, Math.PI * 2);
        const speed = rnd(20, 120) * size;
        field.spawn({
          x: ox,
          y: oy,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          size: rnd(10, 30) * size,
          alpha: rnd(0.08, 0.22),
          life: rnd(1.4, 2.4),
          drag: 0.05,
          gravity: -10,
          wobble: rnd(6, 20),
          wobbleFreq: rnd(0.3, 0.8),
          phase: rnd(0, Math.PI * 2),
          shape: "dot",
        });
      }
      // A few rings, the way ink curls at its edge.
      for (let i = 0; i < Math.max(2, Math.round(6 * strength)); i++) {
        const a = angle + rnd(-0.35, 0.35);
        const speed = rnd(80, 260) * size;
        field.spawn({
          x: ox,
          y: oy,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          size: rnd(6, 14) * size,
          alpha: rnd(0.3, 0.6),
          life: rnd(0.8, 1.4),
          drag: 0.04,
          shape: "ring",
          spin: rnd(-2, 2),
          update: (p, dt) => {
            p.size += 14 * dt;
          },
        });
      }
    },
    sync: () => field.sync(),
    destroy: () => field.destroy(),
  };
}
