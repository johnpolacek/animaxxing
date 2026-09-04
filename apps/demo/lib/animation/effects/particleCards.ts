"use client";

import { gsap } from "@/components/motion";
import { perimeterLength, perimeterPoint } from "@/components/motion/particles/field";
import type { ButtonEffect } from "./particleButtons";

/*
 * The showcase cards resolve out of a field of dots: particles stream in from
 * far off and settle into a grid over the card's face, the card fades up
 * beneath them, and the grid dissolves. Idle, a single light wanders the
 * outline and the edge glints now and then; under the pointer the outline
 * lights up and runs.
 */

const rnd = gsap.utils.random;

/** Spacing of the dot grid the card resolves from, in px. */
const GRID = 16;
/** Lights on the outline while idle and while hovered. */
const RUNNERS = { idle: 1, hover: 4 };
const RUNNER_SPEED = { idle: 50, hover: 260 };

export const resolve: ButtonEffect = {
  layer: "over",
  bleed: 140,
  create(field, card) {
    const runners: { t: number }[] = [];
    const state = { speed: RUNNER_SPEED.idle, hovering: false };
    let glintIn = 0.6;
    let sprayAcc = 0;

    const ambient = (dt: number) => {
      const { box, radius } = field;
      const total = perimeterLength(box, radius);
      for (const run of runners) {
        run.t = (run.t + (state.speed * dt) / total) % 1;
        const pt = perimeterPoint(box, radius, run.t);
        field.spawn({
          x: pt.x,
          y: pt.y,
          size: state.hovering ? 2.4 : 1.8,
          life: state.hovering ? 0.45 : 0.6,
          shrink: true,
        });
      }
      if (state.hovering) {
        sprayAcc += 40 * dt;
        while (sprayAcc >= 1) {
          sprayAcc -= 1;
          const pt = perimeterPoint(box, radius, Math.random());
          const speed = rnd(40, 120);
          field.spawn({
            x: pt.x,
            y: pt.y,
            vx: pt.nx * speed,
            vy: pt.ny * speed,
            size: rnd(0.8, 1.4),
            life: rnd(0.3, 0.6),
            drag: 0.1,
            shape: "spark",
          });
        }
      }
      glintIn -= dt;
      if (glintIn <= 0) {
        glintIn = rnd(0.6, 1.6) / (state.hovering ? 4 : 1);
        glint(perimeterPoint(box, radius, Math.random()));
      }
    };

    function glint(pt: { x: number; y: number }) {
      const size = rnd(3, 7);
      field.spawn({
        x: pt.x,
        y: pt.y,
        size,
        shape: "star",
        rotation: rnd(0, Math.PI),
        spin: rnd(-1, 1),
        life: rnd(0.4, 0.7),
        fade: false,
        update: (p) => {
          const k = Math.sin((p.age / p.life) * Math.PI);
          p.size = size * k;
          p.alpha = k;
        },
      });
    }

    function setRunners(count: number) {
      runners.length = 0;
      for (let k = 0; k < count; k++) {
        runners.push({ t: k / count });
      }
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
          size: rnd(1, 2),
          life: rnd(0.3, 0.6),
          drag: 0.05,
          shape: "spark",
        });
      }
    }

    function idle() {
      setRunners(RUNNERS.idle);
      field.addEmitter(ambient);
    }

    return {
      enter(delay) {
        field.sync();
        field.particles.length = 0;
        runners.length = 0;
        const { box } = field;
        const cx = box.x + box.w / 2;
        const cy = box.y + box.h / 2;
        const tl = gsap.timeline({ delay });
        gsap.set(card, { autoAlpha: 0, scale: 0.94, transformOrigin: "50% 50%" });

        // A grid of dots over the card's face, each arriving from far off.
        // Rows resolve top to bottom, like a scan.
        const cols = Math.max(2, Math.floor(box.w / GRID));
        const rows = Math.max(2, Math.floor(box.h / GRID));
        const padX = (box.w - (cols - 1) * GRID) / 2;
        const padY = (box.h - (rows - 1) * GRID) / 2;
        const settle = 0.75;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const tx = box.x + padX + c * GRID;
            const ty = box.y + padY + r * GRID;
            const angle = rnd(0, Math.PI * 2);
            const dist = rnd(160, 420);
            const p = field.spawn({
              x: cx + Math.cos(angle) * dist,
              y: cy + Math.sin(angle) * dist,
              size: rnd(1, 1.8),
              alpha: 0,
              life: Infinity,
              fade: false,
            });
            tl.to(
              p,
              {
                x: tx,
                y: ty,
                alpha: rnd(0.6, 1),
                duration: rnd(0.45, 0.7),
                ease: "power3.inOut",
                onComplete: () => {
                  p.life = 0.45;
                  p.age = 0;
                  p.fade = true;
                  p.shrink = true;
                },
              },
              (r / rows) * 0.25 + rnd(0, 0.06),
            );
          }
        }
        tl.to(
          card,
          { autoAlpha: 1, scale: 1, duration: 0.45, ease: "power3.out" },
          settle,
        );
        tl.call(
          () => {
            flash(24, [40, 120]);
            idle();
          },
          [],
          settle + 0.25,
        );
        return tl;
      },
      exit() {
        field.removeEmitter(ambient);
        runners.length = 0;
        field.release(0.25);
      },
      blast() {
        field.removeEmitter(ambient);
        runners.length = 0;
        flash(60, [250, 700]);
      },
      idle,
      hover(on) {
        state.hovering = on;
        setRunners(on ? RUNNERS.hover : RUNNERS.idle);
        gsap.to(state, {
          speed: on ? RUNNER_SPEED.hover : RUNNER_SPEED.idle,
          duration: on ? 0.3 : 0.7,
          ease: on ? "power3.out" : "power2.inOut",
          overwrite: true,
        });
        if (on) {
          flash(28, [80, 200]);
        }
      },
      destroy() {
        field.removeEmitter(ambient);
        gsap.killTweensOf(state);
      },
    };
  },
};
