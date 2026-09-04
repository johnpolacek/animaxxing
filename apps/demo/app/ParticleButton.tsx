"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { useParticleEffect } from "@/components/motion/particles/useParticleEffect";
import type { ButtonEffect } from "@/lib/animation/effects/particleButtons";

/*
 * A button with a particle canvas bleeding out around it. The effect decides
 * what the particles do; this component owns the canvas and exposes the
 * effect's phases so the page can place the entrance in its own sequence.
 */
export type ParticleButtonHandle = {
  /** Plays the entrance after `delay` seconds. Reveals the button. */
  enter(delay?: number): void;
  /** Hides the button and winds the particles down. */
  exit(): void;
  /** Fires the effect's biggest burst and stops its ambient loop. The button itself is left to the caller. */
  blast(): void;
  /** Restarts the ambient loop. */
  idle(): void;
  readonly element: HTMLButtonElement | null;
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
  const controls = useParticleEffect(scope, canvasRef, buttonRef, effect);

  useImperativeHandle(ref, () => ({
    ...controls,
    get element() {
      return buttonRef.current;
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
