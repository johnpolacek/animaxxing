"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/components/motion";
import {
  useParticleEffect,
  type ParticleEffectDefinition,
  type ParticleEffectInstance,
} from "@/components/motion/particles/useParticleEffect";
import { ignite } from "@/lib/animation/effects/particleCommand";
import { strike } from "@/lib/animation/effects/particleInput";

/*
 * One field in the contact form: a mono label over a rule of light. Single
 * line fields throw sparks as you type; the message area lights its rule
 * and glints. The form places each field's entrance in its own sequence.
 */
export type FormFieldHandle = {
  enter(delay?: number): void;
  exit(): void;
  blast(): void;
  idle(): void;
  readonly element: HTMLInputElement | HTMLTextAreaElement | null;
};

type Props = {
  id: string;
  label: string;
  type?: "text" | "email" | "url";
  placeholder?: string;
  multiline?: boolean;
  required?: boolean;
};

const LABEL = "block font-mono text-caption uppercase text-muted";
const FIELD =
  "block w-full border-b-2 border-foreground bg-transparent py-2 font-sans text-title font-bold text-foreground outline-none! placeholder:text-border sm:text-display";

export const FormField = forwardRef<FormFieldHandle, Props>(function FormField(
  { id, label, type = "text", placeholder, multiline = false, required = false },
  ref,
) {
  const scope = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelRef = useRef<HTMLLabelElement>(null);
  const fieldRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const effect: ParticleEffectDefinition<ParticleEffectInstance> = multiline ? ignite : strike;
  const controls = useParticleEffect(scope, canvasRef, fieldRef, effect);

  useImperativeHandle(ref, () => ({
    enter(delay = 0) {
      const tag = labelRef.current;
      if (tag) {
        if (prefersReducedMotion()) {
          gsap.set(tag, { autoAlpha: 1 });
        } else {
          gsap.fromTo(tag, { autoAlpha: 0, x: -10 }, { autoAlpha: 1, x: 0, duration: 0.35, ease: "power3.out", delay });
        }
      }
      controls.enter(delay);
    },
    exit() {
      const tag = labelRef.current;
      if (tag) {
        gsap.to(tag, { autoAlpha: 0, duration: 0.15, overwrite: "auto" });
      }
      controls.exit();
    },
    blast: controls.blast,
    idle: controls.idle,
    get element() {
      return fieldRef.current;
    },
  }));

  const shared = {
    id,
    name: id,
    placeholder,
    required,
    className: FIELD,
    autoComplete: type === "email" ? "email" : type === "url" ? "url" : "name",
  };

  return (
    <div ref={scope} className="relative isolate">
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute z-10 text-foreground"
        style={{ left: -effect.bleed, top: -effect.bleed }}
      />
      <label ref={labelRef} htmlFor={id} className={`${LABEL} invisible`}>
        {label}
      </label>
      {multiline ? (
        <textarea ref={fieldRef as React.RefObject<HTMLTextAreaElement>} rows={3} {...shared} className={`${FIELD} resize-none`} />
      ) : (
        <input ref={fieldRef as React.RefObject<HTMLInputElement>} type={type} {...shared} />
      )}
    </div>
  );
});
