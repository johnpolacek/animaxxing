"use client";

import { useRef, type RefObject } from "react";
import { gsap, useGSAP } from "../gsap";
import { prefersReducedMotion } from "../preference";
import { ParticleField } from "./field";

/*
 * Wires a particle canvas to a target element for the life of a component:
 * builds the field, keeps it sized to the target, re-reads its colour when
 * the theme changes, pauses it off screen, and treats pointer hover and
 * keyboard focus as one state. Returns handles the component uses to run
 * the effect's phases.
 */

export type ParticleEffectDefinition<Instance extends ParticleEffectInstance> = {
  /** How far the canvas extends past the target on each side, in px. */
  bleed: number;
  create(field: ParticleField, target: HTMLElement): Instance;
};

export type ParticleEffectInstance = {
  /** Builds the entrance, starting after `delay` seconds. The timeline reveals the target itself. */
  enter(delay: number): gsap.core.Timeline;
  /** Stops the ambient loop and lets the particles die. */
  exit(): void;
  /** Everything at once: the biggest burst the effect has, then silence. */
  blast(): void;
  /** Restarts the ambient loop after an exit or blast. */
  idle(): void;
  hover(on: boolean): void;
  destroy(): void;
};

export type ParticleEffectControls = {
  enter(delay?: number): void;
  exit(): void;
  blast(): void;
  idle(): void;
};

export function useParticleEffect<Instance extends ParticleEffectInstance>(
  scope: RefObject<HTMLElement | null>,
  canvasRef: RefObject<HTMLCanvasElement | null>,
  targetRef: RefObject<HTMLElement | null>,
  effect: ParticleEffectDefinition<Instance>,
): ParticleEffectControls {
  const instance = useRef<Instance | null>(null);
  const entrance = useRef<gsap.core.Timeline | null>(null);
  const safe = useRef<((fn: () => void) => () => void) | null>(null);
  const ready = useRef(false);

  useGSAP(
    (_context, contextSafe) => {
      const canvas = canvasRef.current;
      const target = targetRef.current;
      const root = scope.current;
      if (!canvas || !target || !root || !contextSafe) {
        return;
      }
      safe.current = (fn) => contextSafe(fn);

      const field = new ParticleField(canvas, target, effect.bleed);
      instance.current = effect.create(field, target);

      const resize = new ResizeObserver(() => field.sync());
      resize.observe(target);
      // Theme changes land on <html>; re-read the particle colour when they do.
      const theme = new MutationObserver(() => field.sync());
      theme.observe(document.documentElement, { attributes: true });
      const visibility = new IntersectionObserver(([entry]) => {
        field.setOnScreen(entry?.isIntersecting ?? true);
      });
      visibility.observe(root);

      const on = contextSafe(() => {
        if (ready.current) {
          instance.current?.hover(true);
        }
      });
      const off = contextSafe(() => {
        if (ready.current) {
          instance.current?.hover(false);
        }
      });
      target.addEventListener("pointerenter", on);
      target.addEventListener("pointerleave", off);
      target.addEventListener("focus", on);
      target.addEventListener("blur", off);

      return () => {
        target.removeEventListener("pointerenter", on);
        target.removeEventListener("pointerleave", off);
        target.removeEventListener("focus", on);
        target.removeEventListener("blur", off);
        resize.disconnect();
        theme.disconnect();
        visibility.disconnect();
        entrance.current?.kill();
        entrance.current = null;
        instance.current?.destroy();
        instance.current = null;
        field.destroy();
        ready.current = false;
      };
    },
    { scope, dependencies: [effect] },
  );

  return {
    enter(delay = 0) {
      const target = targetRef.current;
      const fx = instance.current;
      if (!target || !fx) {
        return;
      }
      entrance.current?.kill();
      if (prefersReducedMotion()) {
        gsap.set(target, { autoAlpha: 1, clearProps: "transform" });
        ready.current = true;
        return;
      }
      safe.current?.(() => {
        const tl = fx.enter(delay);
        tl.eventCallback("onComplete", () => {
          ready.current = true;
        });
        entrance.current = tl;
      })?.();
    },
    exit() {
      const target = targetRef.current;
      ready.current = false;
      entrance.current?.kill();
      entrance.current = null;
      instance.current?.exit();
      if (target) {
        gsap.to(target, { autoAlpha: 0, duration: 0.2, overwrite: "auto" });
      }
    },
    blast() {
      ready.current = false;
      entrance.current?.kill();
      entrance.current = null;
      if (!prefersReducedMotion()) {
        safe.current?.(() => instance.current?.blast())?.();
      }
    },
    idle() {
      if (!prefersReducedMotion()) {
        safe.current?.(() => instance.current?.idle())?.();
      }
      ready.current = true;
    },
  };
}
