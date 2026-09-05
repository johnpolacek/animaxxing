"use client";

import { gsap } from "@/components/motion";
import type { ParticleField } from "@/components/motion/particles/field";

/*
 * Theme burst.
 *
 * The scheme switch is a page-wide colour blend; this is the event that goes
 * with it. From the pressed toggle, a shockwave rings out across the viewport
 * and a spray of sparks, dots, and glints flies off in every direction,
 * settling as the page catches up. Everything is drawn in the incoming
 * scheme's ink, so the particles surface as the page turns to meet them.
 */

const rnd = gsap.utils.random;

/** How many of each go out. Tuned for a full viewport, not a button. */
const SPARKS = 150;
const GLINTS = 12;
const RINGS = 2;

export type Point = { x: number; y: number };

export function themeBurst(field: ParticleField, origin: Point): void {
  const { w, h } = field.box;
  // Everything scales with the viewport diagonal so a phone and a wide
  // monitor get the same picture.
  const reach = Math.hypot(w, h);

  for (let i = 0; i < RINGS; i++) {
    const delay = i * 0.08;
    field.spawn({
      x: origin.x,
      y: origin.y,
      shape: "ring",
      size: 0,
      alpha: 0.9 - i * 0.35,
      life: 1.1 + delay,
      fade: true,
      update: (p) => {
        const t = Math.max(0, (p.age - delay) / (p.life - delay));
        p.size = reach * 0.85 * (1 - Math.pow(1 - t, 3));
      },
    });
  }

  for (let i = 0; i < SPARKS; i++) {
    const angle = rnd(0, Math.PI * 2);
    const speed = rnd(0.5, 1.6) * reach;
    field.spawn({
      x: origin.x,
      y: origin.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      shape: Math.random() < 0.7 ? "spark" : "dot",
      size: rnd(1.2, 2.6),
      alpha: rnd(0.6, 1),
      life: rnd(0.55, 1.1),
      // Heavy drag: they cross the page and stop, rather than leaving it.
      drag: 0.04,
      fade: true,
      shrink: true,
    });
  }

  for (let i = 0; i < GLINTS; i++) {
    const angle = rnd(0, Math.PI * 2);
    const speed = rnd(0.3, 0.9) * reach;
    field.spawn({
      x: origin.x,
      y: origin.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      shape: "star",
      size: rnd(5, 11),
      alpha: 0.9,
      rotation: rnd(0, Math.PI),
      spin: rnd(-4, 4),
      life: rnd(0.8, 1.3),
      drag: 0.05,
      fade: true,
      shrink: true,
    });
  }
}
