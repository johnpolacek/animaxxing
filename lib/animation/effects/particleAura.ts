"use client";

import { gsap } from "@/components/motion";
import type { ParticleField } from "@/components/motion/particles/field";
import type {
  ParticleEffectDefinition,
  ParticleEffectInstance,
} from "@/components/motion/particles/useParticleEffect";

/*
 * An aura around a headline. Motes drift up through the letters and glints
 * bloom on them now and then; a ring breathes out from a letter every few
 * seconds. The headline itself is left alone: the route transition brings
 * the letters in, and this only starts once they are landing.
 */

const rnd = gsap.utils.random;

/** Motes per second while idle and under the pointer. */
const MOTE_RATE = { idle: 10, hover: 60 };
/** Seconds between glints. */
const GLINT_EVERY: [number, number] = [0.25, 0.8];
/** Seconds between rings. */
const RING_EVERY: [number, number] = [1.4, 3];

export const aura: ParticleEffectDefinition<ParticleEffectInstance> = {
  bleed: 160,
  create(field: ParticleField) {
    const state = { rate: MOTE_RATE.idle, hovering: false };
    let moteAcc = 0;
    let glintIn = 0.4;
    let ringIn = 1;

    function mote(x: number, y: number, rise: number) {
      field.spawn({
        x,
        y,
        vx: rnd(-8, 8),
        vy: -rise,
        size: rnd(0.7, 2),
        alpha: rnd(0.3, 0.9),
        life: rnd(1.6, 3.2),
        gravity: -6,
        wobble: rnd(6, 18),
        wobbleFreq: rnd(0.8, 2.2),
        phase: rnd(0, Math.PI * 2),
      });
    }

    function glint(x: number, y: number) {
      const size = rnd(4, 11);
      field.spawn({
        x,
        y,
        size,
        shape: "star",
        rotation: rnd(0, Math.PI),
        spin: rnd(-1.2, 1.2),
        life: rnd(0.5, 0.9),
        fade: false,
        update: (p) => {
          const k = Math.sin((p.age / p.life) * Math.PI);
          p.size = size * k;
          p.alpha = k;
        },
      });
    }

    function ring(x: number, y: number, reach: number) {
      field.spawn({
        x,
        y,
        size: 1,
        alpha: 0.7,
        shape: "ring",
        life: rnd(0.8, 1.2),
        update: (p) => {
          p.size = 2 + reach * gsap.parseEase("power2.out")(p.age / p.life);
        },
      });
    }

    /** Motes thrown outward from the whole face of the headline. */
    function burst(count: number, speed: [number, number]) {
      const { box } = field;
      for (let i = 0; i < count; i++) {
        const angle = rnd(0, Math.PI * 2);
        const v = rnd(speed[0], speed[1]);
        field.spawn({
          x: box.x + rnd(0, box.w),
          y: box.y + rnd(0, box.h),
          vx: Math.cos(angle) * v,
          vy: Math.sin(angle) * v - 30,
          size: rnd(0.8, 2.2),
          life: rnd(0.5, 1.1),
          drag: 0.1,
          gravity: 90,
          shape: "spark",
        });
      }
    }

    const ambient = (dt: number) => {
      const { box } = field;
      moteAcc += state.rate * dt;
      while (moteAcc >= 1) {
        moteAcc -= 1;
        mote(box.x + rnd(-20, box.w + 20), box.y + rnd(box.h * 0.3, box.h + 24), rnd(14, 44) * (state.hovering ? 2.5 : 1));
      }
      glintIn -= dt;
      if (glintIn <= 0) {
        glintIn = rnd(GLINT_EVERY[0], GLINT_EVERY[1]) / (state.hovering ? 3 : 1);
        glint(box.x + rnd(0, box.w), box.y + rnd(0, box.h));
      }
      ringIn -= dt;
      if (ringIn <= 0) {
        ringIn = rnd(RING_EVERY[0], RING_EVERY[1]);
        ring(box.x + rnd(box.w * 0.1, box.w * 0.9), box.y + rnd(box.h * 0.2, box.h * 0.8), rnd(18, 40));
      }
    };

    function idle() {
      field.addEmitter(ambient);
    }

    return {
      enter(delay) {
        field.sync();
        field.particles.length = 0;
        const tl = gsap.timeline({ delay });
        // The letters are landing: a burst off their faces, then the aura settles in.
        tl.call(() => burst(70, [120, 320]), [], 0);
        tl.call(
          () => {
            const { box } = field;
            for (let i = 0; i < 8; i++) {
              glint(box.x + rnd(0, box.w), box.y + rnd(0, box.h));
            }
            idle();
          },
          [],
          0.15,
        );
        return tl;
      },
      exit() {
        field.removeEmitter(ambient);
        field.release(0.3);
      },
      blast() {
        field.removeEmitter(ambient);
        burst(160, [300, 900]);
      },
      idle,
      hover(on) {
        state.hovering = on;
        gsap.to(state, {
          rate: on ? MOTE_RATE.hover : MOTE_RATE.idle,
          duration: on ? 0.3 : 0.9,
          overwrite: true,
        });
        if (on) {
          burst(24, [60, 180]);
        }
      },
      destroy() {
        field.removeEmitter(ambient);
        gsap.killTweensOf(state);
      },
    };
  },
};
