"use client";

import { gsap } from "@/components/motion";
import {
  perimeterLength,
  perimeterPoint,
  type ParticleField,
} from "@/components/motion/particles/field";

/*
 * Particle treatments for the two calls to action. Each defines how the
 * button assembles on entrance, what plays while it idles, and what happens
 * under the pointer.
 *
 * Showcase is a marquee sign: lights gather on its outline, then chase around
 * it. Get Animaxxed is a reactor: sparks spiral in and collapse into it, and
 * it breathes embers from then on.
 */

const rnd = gsap.utils.random;

export type ButtonEffect = {
  /** Whether the canvas sits under or over the button. */
  layer: "under" | "over";
  /** How far the canvas extends past the button on each side, in px. */
  bleed: number;
  create(field: ParticleField, button: HTMLElement): ButtonEffectInstance;
};

export type ButtonEffectInstance = {
  /** Builds the entrance, starting after `delay` seconds. The timeline reveals the button itself. */
  enter(delay: number): gsap.core.Timeline;
  /** Stops the ambient loop and lets the particles die. */
  exit(): void;
  hover(on: boolean): void;
  destroy(): void;
};

/* ---------------------------------------------------------------- Showcase */

/** Lights that chase around the outline. */
const RUNNERS = 6;
/** Runner speed along the outline, px/s. */
const RUNNER_SPEED = 110;
/** How much faster the runners go under the pointer. */
const RUNNER_RUSH = 4;

export const marquee: ButtonEffect = {
  layer: "over",
  bleed: 160,
  create(field, button) {
    const runners: { t: number }[] = [];
    const state = { rush: 1, hovering: false };
    let twinkleIn = 0.4;
    let sprayAcc = 0;

    const ambient = (dt: number) => {
      const { box, radius } = field;
      const total = perimeterLength(box, radius);
      for (const run of runners) {
        run.t = (run.t + (RUNNER_SPEED * state.rush * dt) / total) % 1;
        const pt = perimeterPoint(box, radius, run.t);
        // The head is bright; each frame leaves a dot that fades, so the
        // faster the runner the longer its tail.
        field.spawn({
          x: pt.x,
          y: pt.y,
          size: 2.8,
          alpha: 1,
          life: 0.4 * (0.6 + state.rush / RUNNER_RUSH),
          shrink: true,
        });
      }
      if (state.hovering) {
        // Sparkler: fine sparks fly off the outline while the pointer is on it.
        sprayAcc += 90 * dt;
        while (sprayAcc >= 1) {
          sprayAcc -= 1;
          const pt = perimeterPoint(box, radius, Math.random());
          const speed = rnd(60, 180);
          const jitter = rnd(-0.6, 0.6);
          field.spawn({
            x: pt.x,
            y: pt.y,
            vx: (pt.nx + jitter * pt.ny) * speed,
            vy: (pt.ny - jitter * pt.nx) * speed,
            size: rnd(0.8, 1.6),
            alpha: rnd(0.6, 1),
            life: rnd(0.3, 0.7),
            drag: 0.08,
            gravity: 60,
            shape: "spark",
          });
        }
      }
      // Glints appear on the outline now and then, more often under the pointer.
      twinkleIn -= dt;
      if (twinkleIn <= 0) {
        twinkleIn = rnd(0.25, 0.7) / (state.hovering ? 3 : 1);
        twinkle(perimeterPoint(box, radius, Math.random()));
      }
    };

    function twinkle(pt: { x: number; y: number }) {
      const size = rnd(4, 9);
      field.spawn({
        x: pt.x,
        y: pt.y,
        size,
        shape: "star",
        rotation: rnd(0, Math.PI),
        spin: rnd(-1.5, 1.5),
        life: rnd(0.45, 0.8),
        fade: false,
        update: (p) => {
          // Grow then shrink, so the glint blooms rather than blinks.
          const k = Math.sin((p.age / p.life) * Math.PI);
          p.size = size * k;
          p.alpha = k;
        },
      });
    }

    function flash(count: number, speed: [number, number]) {
      const { box, radius } = field;
      for (let i = 0; i < count; i++) {
        const pt = perimeterPoint(box, radius, i / count + rnd(-0.01, 0.01));
        const v = rnd(speed[0], speed[1]);
        field.spawn({
          x: pt.x,
          y: pt.y,
          vx: pt.nx * v,
          vy: pt.ny * v,
          size: rnd(1, 2.2),
          life: rnd(0.35, 0.7),
          drag: 0.04,
          shape: "spark",
        });
      }
    }

    return {
      enter(delay) {
        field.sync();
        field.particles.length = 0;
        runners.length = 0;
        const { box, radius } = field;
        const cx = box.x + box.w / 2;
        const cy = box.y + box.h / 2;
        const tl = gsap.timeline({ delay });
        gsap.set(button, { autoAlpha: 0, scale: 0.5, transformOrigin: "50% 50%" });

        // Lights gather from all around and land evenly along the outline.
        const count = 72;
        for (let i = 0; i < count; i++) {
          const target = perimeterPoint(box, radius, i / count);
          const angle = rnd(0, Math.PI * 2);
          const dist = rnd(180, 340);
          const p = field.spawn({
            x: cx + Math.cos(angle) * dist,
            y: cy + Math.sin(angle) * dist,
            size: rnd(1.4, 2.8),
            alpha: 0,
            life: Infinity,
            fade: false,
          });
          tl.to(
            p,
            {
              x: target.x,
              y: target.y,
              alpha: 1,
              duration: rnd(0.55, 0.85),
              ease: "power3.inOut",
              onComplete: () => {
                // Landed: hold for a beat, then shrink away as the runners take over.
                p.life = 0.5;
                p.age = 0;
                p.fade = true;
                p.shrink = true;
              },
            },
            rnd(0, 0.25),
          );
        }
        tl.to(
          button,
          { autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(1.7)" },
          0.55,
        );
        // Ignition: the sign lights up with a burst and the runners set off.
        tl.call(
          () => {
            flash(40, [80, 200]);
            for (let k = 0; k < RUNNERS; k++) {
              runners.push({ t: k / RUNNERS });
            }
            field.addEmitter(ambient);
          },
          [],
          0.95,
        );
        return tl;
      },
      exit() {
        field.removeEmitter(ambient);
        runners.length = 0;
        field.release(0.25);
      },
      hover(on) {
        state.hovering = on;
        gsap.to(state, {
          rush: on ? RUNNER_RUSH : 1,
          duration: on ? 0.35 : 0.8,
          ease: on ? "power3.out" : "power2.inOut",
          overwrite: true,
        });
        if (on) {
          flash(36, [120, 260]);
        }
      },
      destroy() {
        field.removeEmitter(ambient);
        gsap.killTweensOf(state);
      },
    };
  },
};

/* ------------------------------------------------------------ Get Animaxxed */

/** Embers per second while idle and while hovered. */
const EMBER_RATE = { idle: 9, hover: 70 };
/** How fast embers rise, px/s, idle and hovered. */
const EMBER_RISE = { idle: 55, hover: 220 };
/** Seconds between idle pulses. */
const PULSE_EVERY = 2.6;

export const reactor: ButtonEffect = {
  layer: "under",
  bleed: 180,
  create(field, button) {
    const state = { rate: EMBER_RATE.idle, rise: EMBER_RISE.idle, hovering: false };
    let emberAcc = 0;
    let pulseIn = 1.2;

    const ambient = (dt: number) => {
      const { box } = field;
      // Embers start inside the button, hidden behind it, and surface as they
      // rise past its top edge — the button looks like it is giving them off.
      emberAcc += state.rate * dt;
      while (emberAcc >= 1) {
        emberAcc -= 1;
        field.spawn({
          x: box.x + rnd(4, box.w - 4),
          y: box.y + rnd(2, box.h - 2),
          vx: rnd(-10, 10) * (state.hovering ? 3 : 1),
          vy: -rnd(state.rise * 0.6, state.rise * 1.3),
          size: rnd(1.2, 2.8),
          alpha: rnd(0.7, 1),
          life: rnd(1.1, 2.1),
          gravity: -12,
          wobble: rnd(6, 16),
          wobbleFreq: rnd(1.5, 4),
          phase: rnd(0, Math.PI * 2),
        });
      }
      // A slow heartbeat: the outline breathes outward and fades.
      pulseIn -= dt;
      if (pulseIn <= 0) {
        pulseIn = PULSE_EVERY;
        if (!state.hovering) {
          shockwave(28, 1.3, 0.35);
        }
      }
    };

    function shockwave(spread: number, duration: number, alpha: number) {
      field.spawn({
        x: 0,
        y: 0,
        shape: "outline",
        size: 0,
        alpha,
        life: duration,
        update: (p) => {
          p.size = spread * gsap.parseEase("power2.out")(p.age / p.life);
        },
      });
    }

    function erupt(count: number, speed: [number, number]) {
      const { box, radius } = field;
      for (let i = 0; i < count; i++) {
        const pt = perimeterPoint(box, radius, Math.random());
        const v = rnd(speed[0], speed[1]);
        const jitter = rnd(-0.5, 0.5);
        const square = Math.random() < 0.35;
        field.spawn({
          x: pt.x,
          y: pt.y,
          vx: (pt.nx + jitter * pt.ny) * v,
          vy: (pt.ny - jitter * pt.nx) * v - 40,
          size: square ? rnd(1.5, 3) : rnd(1, 2.4),
          shape: square ? "square" : "dot",
          rotation: rnd(0, Math.PI),
          spin: rnd(-12, 12),
          life: rnd(0.5, 1.1),
          drag: 0.12,
          gravity: 320,
        });
      }
    }

    return {
      enter(delay) {
        field.sync();
        field.particles.length = 0;
        const { box } = field;
        const cx = box.x + box.w / 2;
        const cy = box.y + box.h / 2;
        const tl = gsap.timeline({ delay });
        gsap.set(button, { autoAlpha: 0, scale: 0.5, transformOrigin: "50% 50%" });

        // Sparks spiral in from a wide ring and collapse into the button.
        const count = 110;
        for (let i = 0; i < count; i++) {
          const orbit = {
            radius: rnd(200, 320),
            angle: rnd(0, Math.PI * 2),
          };
          const landing = {
            x: rnd(-box.w * 0.4, box.w * 0.4),
            y: rnd(-box.h * 0.4, box.h * 0.4),
          };
          const p = field.spawn({
            x: cx + Math.cos(orbit.angle) * orbit.radius,
            y: cy + Math.sin(orbit.angle) * orbit.radius,
            size: rnd(1, 2.4),
            alpha: 0,
            life: Infinity,
            fade: false,
            shape: "spark",
          });
          const turn = rnd(1.2, 2.4) * (Math.random() < 0.5 ? -1 : 1);
          tl.to(
            orbit,
            {
              radius: 0,
              angle: orbit.angle + turn,
              duration: rnd(0.6, 0.9),
              ease: "power3.in",
              onUpdate() {
                const k = 1 - orbit.radius / 320;
                const nx = cx + landing.x * k + Math.cos(orbit.angle) * orbit.radius;
                const ny = cy + landing.y * k + Math.sin(orbit.angle) * orbit.radius;
                // Velocity only orients the spark's tail; position is set here.
                p.vx = (nx - p.x) * 60;
                p.vy = (ny - p.y) * 60;
                p.x = nx;
                p.y = ny;
                p.alpha = Math.min(1, this.progress() * 3);
              },
              onComplete: () => {
                p.life = 0.12;
                p.age = 0;
                p.fade = true;
                p.vx = 0;
                p.vy = 0;
              },
            },
            rnd(0, 0.2),
          );
        }
        // Impact: the button pops in and the collapse rebounds outward.
        tl.to(
          button,
          { autoAlpha: 1, scale: 1, duration: 0.45, ease: "back.out(2.2)" },
          0.82,
        );
        tl.call(
          () => {
            shockwave(60, 0.7, 0.9);
            erupt(44, [140, 320]);
          },
          [],
          0.84,
        );
        tl.call(() => shockwave(90, 0.9, 0.5), [], 0.96);
        tl.call(() => field.addEmitter(ambient), [], 1.05);
        return tl;
      },
      exit() {
        field.removeEmitter(ambient);
        field.release(0.25);
      },
      hover(on) {
        state.hovering = on;
        gsap.to(state, {
          rate: on ? EMBER_RATE.hover : EMBER_RATE.idle,
          rise: on ? EMBER_RISE.hover : EMBER_RISE.idle,
          duration: on ? 0.3 : 0.9,
          ease: on ? "power3.out" : "power2.inOut",
          overwrite: true,
        });
        gsap.to(button, {
          scale: on ? 1.04 : 1,
          duration: 0.3,
          ease: on ? "back.out(2)" : "power2.out",
          overwrite: "auto",
        });
        if (on) {
          shockwave(40, 0.5, 0.8);
          erupt(56, [160, 360]);
        }
      },
      destroy() {
        field.removeEmitter(ambient);
        gsap.killTweensOf(state);
      },
    };
  },
};
