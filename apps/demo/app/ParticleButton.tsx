"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { gsap, prefersReducedMotion, useGSAP } from "@/components/motion";
import { ParticleField } from "@/components/motion/particles/field";
import type { ButtonEffect, ButtonEffectInstance } from "@/lib/animation/effects/particleButtons";

/*
 * A button with a particle canvas bleeding out around it. The effect decides
 * what the particles do; this component owns the canvas, keeps it sized to
 * the button, pauses it off screen, and exposes enter and exit so the page
 * can place the entrance in its own sequence.
 *
 * Hover and keyboard focus are the same state to the effect, so the pointer
 * treatment is also what a keyboard user sees.
 */
export type ParticleButtonHandle = {
  /** Plays the entrance after `delay` seconds. Reveals the button. */
  enter(delay?: number): void;
  /** Hides the button and winds the particles down. */
  exit(): void;
};

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  effect: ButtonEffect;
  children: ReactNode;
};

export const ParticleButton = forwardRef<ParticleButtonHandle, Props>(function ParticleButton(
  { effect, children, className, ...rest },
  ref,
) {
  const scope = useRef<HTMLSpanElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const instance = useRef<ButtonEffectInstance | null>(null);
  const entrance = useRef<gsap.core.Timeline | null>(null);
  const safe = useRef<((fn: () => void) => () => void) | null>(null);
  const ready = useRef(false);

  useGSAP(
    (_context, contextSafe) => {
      const canvas = canvasRef.current;
      const button = buttonRef.current;
      const root = scope.current;
      if (!canvas || !button || !root || !contextSafe) {
        return;
      }
      safe.current = (fn) => contextSafe(fn);

      const field = new ParticleField(canvas, button, effect.bleed);
      instance.current = effect.create(field, button);

      const resize = new ResizeObserver(() => field.sync());
      resize.observe(button);
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
      button.addEventListener("pointerenter", on);
      button.addEventListener("pointerleave", off);
      button.addEventListener("focus", on);
      button.addEventListener("blur", off);

      return () => {
        button.removeEventListener("pointerenter", on);
        button.removeEventListener("pointerleave", off);
        button.removeEventListener("focus", on);
        button.removeEventListener("blur", off);
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

  useImperativeHandle(ref, () => ({
    enter(delay = 0) {
      const button = buttonRef.current;
      const fx = instance.current;
      if (!button || !fx) {
        return;
      }
      entrance.current?.kill();
      if (prefersReducedMotion()) {
        gsap.set(button, { autoAlpha: 1, clearProps: "transform" });
        ready.current = true;
        return;
      }
      const run = safe.current?.(() => {
        const tl = fx.enter(delay);
        tl.eventCallback("onComplete", () => {
          ready.current = true;
        });
        entrance.current = tl;
      });
      run?.();
    },
    exit() {
      const button = buttonRef.current;
      ready.current = false;
      entrance.current?.kill();
      entrance.current = null;
      instance.current?.exit();
      if (button) {
        gsap.to(button, { autoAlpha: 0, duration: 0.2, overwrite: "auto" });
      }
    },
  }));

  return (
    <span ref={scope} className="relative isolate inline-flex">
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={[
          "pointer-events-none absolute text-foreground",
          effect.layer === "under" ? "-z-10" : "z-10",
        ].join(" ")}
        style={{ left: -effect.bleed, top: -effect.bleed }}
      />
      <button ref={buttonRef} type="button" className={className} {...rest}>
        {children}
      </button>
    </span>
  );
});
