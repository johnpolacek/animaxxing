"use client";

import { useRef, type FormEvent } from "react";
import { gsap, prefersReducedMotion, useGSAP } from "@/components/motion";
import { useParticleEffect } from "@/components/motion/particles/useParticleEffect";
import { reactor } from "@/lib/animation/effects/particleButtons";
import { ignite } from "@/lib/animation/effects/particleInput";
import { watchPageTransition } from "@/lib/animation/pageState";
import { ParticleButton, type ParticleButtonHandle } from "../ParticleButton";

/*
 * The intake form: one giant field for a website address and the button that
 * sends it off. The field lights up out of particles once the route entrance
 * has settled, the button assembles a beat later, and both wind down when the
 * route leaves.
 *
 * Submitting does nothing real yet. The form throws everything it has at the
 * screen, then settles back down and waits, with the address still in the
 * field.
 */

/**
 * Seconds after the route entrance starts before the field draws itself.
 * The headline letters begin to land at 0.75; the field runs in under them.
 */
const FIELD_DELAY = 0.75;
/** Seconds between the field's entrance starting and the button's. */
const BUTTON_DELAY = 0.4;
/** Seconds the form holds after a submit before it settles back into idling. */
const SUBMIT_HOLD = 0.9;

const FIELD =
  "block w-full border-b-[3px] border-foreground bg-transparent py-3 font-sans text-[clamp(2.75rem,9cqi,8rem)] font-extrabold leading-[1.05] tracking-[-0.04em] text-foreground outline-none! placeholder:text-border";
const BUTTON =
  "inline-flex cursor-pointer items-center rounded-lg bg-inverse px-6 py-3 font-sans text-4xl font-extrabold uppercase tracking-[-0.02em] text-inverse-foreground transition-colors hover:bg-inverse-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus sm:px-8 sm:py-4 sm:text-5xl";

export function Animaxx() {
  const scope = useRef<HTMLFormElement>(null);
  const fieldScope = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const button = useRef<ParticleButtonHandle>(null);
  const field = useParticleEffect(fieldScope, canvasRef, inputRef, ignite);
  const submit = useRef<() => void>(() => {});

  useGSAP(
    (_context, contextSafe) => {
      const root = scope.current;
      const input = inputRef.current;
      if (!root || !input || !contextSafe) {
        return;
      }
      if (prefersReducedMotion()) {
        gsap.set(root, { autoAlpha: 1 });
        submit.current = () => {};
        return;
      }

      let busy = false;
      submit.current = contextSafe(() => {
        const pressed = button.current?.element;
        if (busy || !pressed) {
          return;
        }
        busy = true;
        input.blur();
        field.blast();
        button.current?.blast();
        gsap
          .timeline({ defaults: { overwrite: "auto" } })
          // The whole form kicks, and the button burns hot for a moment.
          .to(
            root,
            { x: () => gsap.utils.random(-10, 10), y: () => gsap.utils.random(-6, 6), duration: 0.04, repeat: 7, yoyo: true, ease: "none" },
            0,
          )
          .set(root, { clearProps: "transform" })
          .fromTo(
            pressed,
            { scale: 1.18, filter: "blur(3px)" },
            { scale: 1, filter: "blur(0px)", duration: 0.55, ease: "elastic.out(1, 0.4)", clearProps: "filter" },
            0,
          )
          .call(
            () => {
              field.idle();
              button.current?.idle();
              busy = false;
            },
            [],
            SUBMIT_HOLD,
          );
      });

      let entered = false;
      const enter = (delay: number) => {
        entered = true;
        field.enter(delay);
        button.current?.enter(delay + BUTTON_DELAY);
        gsap.set(root, { autoAlpha: 1 });
      };
      return watchPageTransition(root, {
        onEntering: () => enter(FIELD_DELAY),
        onIdle: () => {
          // Only when the entrance was missed, such as on a reduced-motion
          // page that reports idle straight away.
          if (!entered) {
            enter(0);
          }
        },
        onExiting: () => {
          entered = false;
          field.exit();
          button.current?.exit();
        },
      });
    },
    { scope },
  );

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submit.current();
  };

  return (
    <form ref={scope} data-animaxx-form onSubmit={onSubmit} className="mt-12 [container-type:inline-size]">
      <div ref={fieldScope} className="relative isolate">
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute z-10 text-foreground"
          style={{ left: -ignite.bleed, top: -ignite.bleed }}
        />
        <label htmlFor="animaxx-url" className="sr-only">
          Website to animaxx
        </label>
        <input
          ref={inputRef}
          id="animaxx-url"
          name="url"
          type="text"
          inputMode="url"
          autoComplete="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          placeholder="yoursite.com"
          className={FIELD}
        />
      </div>
      <div className="mt-10">
        <ParticleButton ref={button} effect={reactor} className={BUTTON} type="submit">
          Animaxx It
        </ParticleButton>
      </div>
    </form>
  );
}
