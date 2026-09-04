"use client";

import { gsap } from "@/components/motion";
import type { ButtonEffect } from "./particleButtons";

/*
 * The Next button rides a slipstream: hairlines rush past it from left to
 * right, as if it were already on its way. It arrives from the left through
 * a gust of them and docks with a puff of sparks off the arrow. Idle, a line
 * or two drifts past now and then; under the pointer the wind picks up and
 * the button leans into it. Pressed, everything blows off to the right.
 */

const rnd = gsap.utils.random;

/** Streaks per second, idle and hovered. */
const RATE = { idle: 5, hover: 60 };
/** Streak speed, px/s, idle and hovered. */
const SPEED = { idle: 90, hover: 520 };
/** How far, in px, the button leans into the wind under the pointer. */
const LEAN = 4;

export const slipstream: ButtonEffect = {
  layer: "over",
  bleed: 160,
  create(field, button) {
    const state = { rate: RATE.idle, speed: SPEED.idle, hovering: false };
    let streakAcc = 0;
    let sparkIn = 1;

    /** One level hairline crossing the button's band, left to right. */
    function streak(x: number, speed: number, life = rnd(0.5, 0.9), alpha = rnd(0.3, 0.7)) {
      const { box } = field;
      field.spawn({
        x,
        y: box.y + rnd(-6, box.h + 6),
        vx: speed,
        size: gsap.utils.clamp(3, 28, speed * 0.04),
        alpha,
        life,
        shape: "streak",
        shrink: true,
      });
    }

    /** Sparks leaving the arrow's tip at the right edge. */
    function tip(count: number, speed: [number, number]) {
      const { box } = field;
      for (let i = 0; i < count; i++) {
        const v = rnd(speed[0], speed[1]);
        field.spawn({
          x: box.x + box.w - 4,
          y: box.y + box.h / 2 + rnd(-4, 4),
          vx: v,
          vy: rnd(-v * 0.18, v * 0.18),
          size: rnd(0.8, 1.6),
          life: rnd(0.3, 0.6),
          drag: 0.1,
          shape: "spark",
        });
      }
    }

    const ambient = (dt: number) => {
      const { box } = field;
      streakAcc += state.rate * dt;
      while (streakAcc >= 1) {
        streakAcc -= 1;
        streak(box.x - rnd(20, 120), state.speed * rnd(0.7, 1.3));
      }
      // Now and then a spark comes off the arrow; steadily, under the pointer.
      sparkIn -= dt;
      if (sparkIn <= 0) {
        sparkIn = rnd(0.8, 2.2) / (state.hovering ? 8 : 1);
        tip(state.hovering ? 3 : 1, [state.speed, state.speed * 2]);
      }
    };

    function idle() {
      field.addEmitter(ambient);
    }

    return {
      enter(delay) {
        field.sync();
        field.particles.length = 0;
        const { box } = field;
        const tl = gsap.timeline({ delay });
        gsap.set(button, { autoAlpha: 0, x: -48 });

        // The gust the button rides in on: a rush of lines ahead of it.
        for (let i = 0; i < 44; i++) {
          tl.call(
            () => streak(box.x - rnd(40, 160), rnd(500, 900), rnd(0.35, 0.6), rnd(0.4, 0.9)),
            [],
            rnd(0, 0.35),
          );
        }
        tl.to(button, { autoAlpha: 1, x: 0, duration: 0.55, ease: "power4.out" }, 0.1);
        // Docked: sparks off the arrow, then the wind settles.
        tl.call(
          () => {
            tip(14, [200, 480]);
            idle();
          },
          [],
          0.5,
        );
        return tl;
      },
      exit() {
        field.removeEmitter(ambient);
        field.release(0.25);
      },
      blast() {
        field.removeEmitter(ambient);
        const { box } = field;
        for (let i = 0; i < 60; i++) {
          streak(box.x + rnd(-80, box.w), rnd(700, 1400), rnd(0.3, 0.6), rnd(0.5, 1));
        }
        tip(50, [500, 1200]);
      },
      idle,
      hover(on) {
        state.hovering = on;
        gsap.to(state, {
          rate: on ? RATE.hover : RATE.idle,
          speed: on ? SPEED.hover : SPEED.idle,
          duration: on ? 0.3 : 0.8,
          ease: on ? "power3.out" : "power2.inOut",
          overwrite: true,
        });
        gsap.to(button, {
          x: on ? LEAN : 0,
          duration: 0.3,
          ease: on ? "back.out(2)" : "power2.out",
          overwrite: "auto",
        });
        if (on) {
          tip(10, [200, 500]);
        }
      },
      destroy() {
        field.removeEmitter(ambient);
        gsap.killTweensOf(state);
      },
    };
  },
};
