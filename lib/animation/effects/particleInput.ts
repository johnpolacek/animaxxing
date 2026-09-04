"use client";

import { gsap } from "@/components/motion";
import type { Particle, ParticleField } from "@/components/motion/particles/field";
import type {
  ParticleEffectDefinition,
  ParticleEffectInstance,
} from "@/components/motion/particles/useParticleEffect";

/*
 * Particle treatment for a form field.
 *
 * The field is a single rule of light. On entrance a runner streaks along
 * its underline and the field is revealed in its wake. While it idles, glints
 * drift up off the rule now and then; with the pointer or focus on it the
 * rule runs hot. Every keystroke throws sparks from the caret, and deleting
 * drops cinders. Submitting lights the whole rule at once and throws the
 * text's worth of sparks skyward.
 */

const rnd = gsap.utils.random;

/** Embers per second off the underline, idle and hot. */
const EMBER_RATE = { idle: 4, hot: 26 };
/** Seconds between idle glints. */
const GLINT_EVERY: [number, number] = [0.5, 1.4];
/** Sparks thrown per typed character. */
const KEY_SPARKS = 18;
/** Cinders dropped per deleted character. */
const DELETE_CINDERS = 10;

type Measure = (upTo: number) => number;

/** Builds a text measurer that mirrors the input's font. */
function measurer(input: HTMLInputElement): Measure {
  const ctx = document.createElement("canvas").getContext("2d");
  return (upTo) => {
    if (!ctx) {
      return 0;
    }
    const style = getComputedStyle(input);
    ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const text = input.value.slice(0, upTo);
    const spacing = parseFloat(style.letterSpacing) || 0;
    return ctx.measureText(text).width + spacing * text.length;
  };
}

export const strike: ParticleEffectDefinition<ParticleEffectInstance> = {
  bleed: 200,
  create(field: ParticleField, target: HTMLElement) {
    const input = target as HTMLInputElement;
    const measure = measurer(input);
    const state = { rate: EMBER_RATE.idle, hot: false };
    let emberAcc = 0;
    let glintIn = 0.6;
    let lastValue = input.value;

    /** Canvas x of the caret, clamped to the field. */
    function caretX(): number {
      const { box } = field;
      const padding = parseFloat(getComputedStyle(input).paddingLeft) || 0;
      const x = box.x + padding + measure(input.selectionEnd ?? input.value.length) - input.scrollLeft;
      return gsap.utils.clamp(box.x, box.x + box.w, x);
    }

    function baseline(): number {
      const { box } = field;
      return box.y + box.h;
    }

    const ambient = (dt: number) => {
      const { box } = field;
      const y = baseline();
      emberAcc += state.rate * dt;
      while (emberAcc >= 1) {
        emberAcc -= 1;
        field.spawn({
          x: box.x + rnd(0, box.w),
          y: y + rnd(-1, 1),
          vx: rnd(-6, 6),
          vy: -rnd(20, 60) * (state.hot ? 2 : 1),
          size: rnd(0.8, 2),
          alpha: rnd(0.5, 1),
          life: rnd(0.9, 1.8),
          gravity: -10,
          wobble: rnd(4, 12),
          wobbleFreq: rnd(1.5, 3.5),
          phase: rnd(0, Math.PI * 2),
        });
      }
      glintIn -= dt;
      if (glintIn <= 0) {
        glintIn = rnd(GLINT_EVERY[0], GLINT_EVERY[1]) / (state.hot ? 3 : 1);
        glint(box.x + rnd(0, box.w), y);
      }
    };

    function glint(x: number, y: number) {
      const size = rnd(4, 10);
      field.spawn({
        x,
        y,
        size,
        shape: "star",
        rotation: rnd(0, Math.PI),
        spin: rnd(-1.5, 1.5),
        life: rnd(0.4, 0.8),
        fade: false,
        update: (p) => {
          const k = Math.sin((p.age / p.life) * Math.PI);
          p.size = size * k;
          p.alpha = k;
        },
      });
    }

    /** Sparks fanning up and out from a point, as if struck. */
    function strike(x: number, y: number, count: number, speed: [number, number]) {
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + rnd(-1.1, 1.1);
        const v = rnd(speed[0], speed[1]);
        field.spawn({
          x,
          y,
          vx: Math.cos(angle) * v,
          vy: Math.sin(angle) * v,
          size: rnd(0.9, 2.2),
          alpha: rnd(0.7, 1),
          life: rnd(0.35, 0.8),
          drag: 0.06,
          gravity: 420,
          shape: "spark",
        });
      }
      glint(x, y);
    }

    /** Cinders falling off the rule below a point. */
    function crumble(x: number, y: number, count: number) {
      for (let i = 0; i < count; i++) {
        field.spawn({
          x: x + rnd(-14, 14),
          y,
          vx: rnd(-30, 30),
          vy: rnd(10, 70),
          size: rnd(1.2, 2.6),
          shape: "square",
          rotation: rnd(0, Math.PI),
          spin: rnd(-10, 10),
          life: rnd(0.5, 1),
          gravity: 500,
          drag: 0.4,
        });
      }
    }

    /** A hairline flare that spreads outward along the rule from a point. */
    function ripple(x: number, y: number, reach: number, duration: number) {
      for (const dir of [-1, 1]) {
        field.spawn({
          x,
          y,
          size: 0,
          alpha: 1,
          shape: "streak",
          life: duration,
          update: (p) => {
            const k = gsap.parseEase("power3.out")(p.age / p.life);
            p.size = 6 + reach * k * 0.5;
            p.x = x + dir * reach * k * 0.5;
          },
        });
      }
    }

    const onInput = () => {
      const value = input.value;
      const x = caretX();
      const y = baseline();
      if (value.length > lastValue.length) {
        strike(x, y, KEY_SPARKS, [120, 360]);
        ripple(x, y, 120, 0.35);
      } else if (value.length < lastValue.length) {
        crumble(x, y, DELETE_CINDERS);
      } else {
        glint(x, y);
      }
      lastValue = value;
    };
    input.addEventListener("input", onInput);

    function idle() {
      field.addEmitter(ambient);
    }

    return {
      enter(delay) {
        field.sync();
        field.particles.length = 0;
        const { box } = field;
        const y = baseline();
        const tl = gsap.timeline({ delay });
        gsap.set(input, { autoAlpha: 0, clipPath: "inset(-20% 100% -20% 0)" });

        // A runner streaks the length of the rule and the field appears
        // behind it, with sparks kicked up as it goes.
        const run = { x: box.x };
        let head: Particle | null = null;
        tl.set(input, { autoAlpha: 1 }, 0);
        tl.to(
          run,
          {
            x: box.x + box.w,
            duration: 0.7,
            ease: "power2.inOut",
            onStart() {
              head = field.spawn({
                x: box.x,
                y,
                size: 2.6,
                alpha: 1,
                life: Infinity,
                fade: false,
                shape: "spark",
              });
            },
            onUpdate() {
              if (!head) {
                return;
              }
              head.vx = (run.x - head.x) * 60;
              head.x = run.x;
              // Cast sparks in the runner's wake.
              for (let i = 0; i < 3; i++) {
                field.spawn({
                  x: run.x + rnd(-6, 0),
                  y: y + rnd(-1, 1),
                  vx: -rnd(20, 120),
                  vy: -rnd(20, 140),
                  size: rnd(0.8, 1.8),
                  life: rnd(0.3, 0.7),
                  drag: 0.08,
                  gravity: 240,
                  shape: "spark",
                });
              }
              gsap.set(input, {
                clipPath: `inset(-20% ${(1 - this.progress()) * 100}% -20% 0)`,
              });
            },
            onComplete: () => {
              if (head) {
                head.life = 0.1;
                head.age = 0;
                head.fade = true;
                head.vx = 0;
              }
            },
          },
          0,
        );
        tl.set(input, { clearProps: "clipPath" }, 0.72);
        tl.call(
          () => {
            ripple(box.x + box.w, y, 240, 0.5);
            for (let i = 0; i < 6; i++) {
              glint(box.x + rnd(0, box.w), y);
            }
            idle();
          },
          [],
          0.72,
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
        const y = baseline();
        // The rule lights end to end and the typed text is thrown skyward.
        const end = caretX();
        for (let i = 0; i < 6; i++) {
          ripple(box.x + rnd(0, box.w), y, 300, 0.6);
        }
        const columns = Math.max(6, Math.round((end - box.x) / 18));
        for (let i = 0; i <= columns; i++) {
          const x = box.x + ((end - box.x) * i) / columns;
          strike(x, y - rnd(0, box.h * 0.6), 9, [260, 720]);
        }
        strike(end, y, 40, [300, 900]);
        for (let i = 0; i < 14; i++) {
          glint(box.x + rnd(0, box.w), y + rnd(-box.h, 0));
        }
      },
      idle,
      hover(on) {
        state.hot = on;
        gsap.to(state, {
          rate: on ? EMBER_RATE.hot : EMBER_RATE.idle,
          duration: on ? 0.3 : 0.8,
          overwrite: true,
        });
        if (on) {
          ripple(caretX(), baseline(), 200, 0.45);
        }
      },
      destroy() {
        input.removeEventListener("input", onInput);
        field.removeEmitter(ambient);
        gsap.killTweensOf(state);
      },
    };
  },
};
