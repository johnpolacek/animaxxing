"use client";

import { gsap } from "@/components/motion";
import {
  perimeterLength,
  perimeterPoint,
  type ParticleField,
} from "@/components/motion/particles/field";

/*
 * Theme switcher particles.
 *
 * The button is a live wire: every few seconds it twitches, and each twitch
 * throws sparks off its outline and rings a shockwave out from it. Under the
 * pointer it crackles continuously.
 *
 * The picker panel is fenced in fire: sparks stream off its edge the whole
 * time it is open, a few runners chase around the outline, and on open the
 * outline rings out three times before the panel itself lands.
 */

const rnd = gsap.utils.random;

/** Sparks thrown by one twitch. */
const TWITCH_SPARKS = 36;
const TWITCH_RINGS = 2;

/** Sparks off the button per second while hovered. */
const CRACKLE_RATE = 70;

/** Sparks off the panel edge per second. */
const FENCE_RATE = 260;
const FENCE_RUNNERS = 8;
const FENCE_RUNNER_SPEED = 240;

/** Spawns `count` sparks at random points along the target's outline, flying outward. */
function sparkOutline(field: ParticleField, count: number, speed: [number, number], life: [number, number]) {
  const { box, radius } = field;
  for (let i = 0; i < count; i++) {
    const pt = perimeterPoint(box, radius, Math.random());
    const v = rnd(speed[0], speed[1]);
    // A little tangential scatter so the spray is not a perfect halo.
    const tx = -pt.ny;
    const ty = pt.nx;
    const side = rnd(-0.6, 0.6);
    field.spawn({
      x: pt.x,
      y: pt.y,
      vx: (pt.nx + tx * side) * v,
      vy: (pt.ny + ty * side) * v,
      shape: Math.random() < 0.65 ? "spark" : "dot",
      size: rnd(1, 2.4),
      alpha: rnd(0.7, 1),
      life: rnd(life[0], life[1]),
      drag: 0.05,
      fade: true,
      shrink: true,
    });
  }
}

/** Rings that grow out from the target's outline. */
function ringOutline(field: ParticleField, count: number, reach: number, life = 0.7) {
  for (let i = 0; i < count; i++) {
    const delay = i * 0.1;
    field.spawn({
      x: 0,
      y: 0,
      shape: "outline",
      size: 0,
      alpha: 0.9 - i * 0.3,
      life: life + delay,
      fade: true,
      update: (p) => {
        const t = Math.max(0, (p.age - delay) / (p.life - delay));
        p.size = reach * (1 - Math.pow(1 - t, 3));
      },
    });
  }
}

/** One twitch's worth of sparks and rings. */
export function twitchBurst(field: ParticleField): void {
  sparkOutline(field, TWITCH_SPARKS, [120, 320], [0.4, 0.9]);
  ringOutline(field, TWITCH_RINGS, 44, 0.6);
}

/** The bigger burst that goes with opening the picker. */
export function openBurst(field: ParticleField): void {
  sparkOutline(field, TWITCH_SPARKS * 3, [220, 640], [0.5, 1.1]);
  ringOutline(field, 3, 90, 0.8);
}

/** Continuous sparks while the pointer is on the button. Returns the emitter so it can be removed. */
export function crackle(field: ParticleField): (dt: number) => void {
  let acc = 0;
  const emitter = (dt: number) => {
    acc += CRACKLE_RATE * dt;
    const n = Math.floor(acc);
    acc -= n;
    sparkOutline(field, n, [40, 140], [0.25, 0.6]);
  };
  field.addEmitter(emitter);
  return emitter;
}

/**
 * The picker's edge fire. Runs until removed. Returns the emitter so the
 * panel can take it down when it closes.
 */
export function fence(field: ParticleField): (dt: number) => void {
  const runners = Array.from({ length: FENCE_RUNNERS }, (_, i) => ({ t: i / FENCE_RUNNERS }));
  let acc = 0;
  const emitter = (dt: number) => {
    const { box, radius } = field;
    acc += FENCE_RATE * dt;
    const n = Math.floor(acc);
    acc -= n;
    // Sparks rise off the edge with a touch of lift, like the panel is hot.
    for (let i = 0; i < n; i++) {
      const pt = perimeterPoint(box, radius, Math.random());
      const v = rnd(30, 110);
      field.spawn({
        x: pt.x,
        y: pt.y,
        vx: pt.nx * v + rnd(-20, 20),
        vy: pt.ny * v - rnd(10, 50),
        shape: Math.random() < 0.5 ? "spark" : "dot",
        size: rnd(0.8, 2.2),
        alpha: rnd(0.5, 1),
        life: rnd(0.5, 1.3),
        drag: 0.3,
        gravity: -30,
        fade: true,
        shrink: true,
        wobble: rnd(10, 30),
        wobbleFreq: rnd(1, 3),
        phase: rnd(0, Math.PI * 2),
      });
    }
    const total = perimeterLength(box, radius);
    for (const run of runners) {
      run.t = (run.t + (FENCE_RUNNER_SPEED * dt) / total) % 1;
      const pt = perimeterPoint(box, radius, run.t);
      field.spawn({ x: pt.x, y: pt.y, size: 2.6, alpha: 1, life: 0.35, shrink: true });
    }
  };
  field.addEmitter(emitter);
  return emitter;
}

/** Rings out from the panel outline as it opens. */
export function fenceOpen(field: ParticleField): void {
  ringOutline(field, 3, 120, 0.9);
  sparkOutline(field, 120, [200, 520], [0.5, 1]);
}
