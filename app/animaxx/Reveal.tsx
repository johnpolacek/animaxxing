"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import {
  charsCascadeIn,
  charsFlipIn,
  charsScatterIn,
  charsSpringIn,
  gsap,
  prefersReducedMotion,
  riseIn,
  useGSAP,
  wipeAcross,
} from "@/components/motion";
import { watchPageTransition } from "@/lib/animation/pageState";

/*
 * Brings one element in with a named entrance the first time it is on screen
 * while the route is entering or settled, and takes it out when the route
 * leaves. Elements already in view on arrival wait `delay` seconds so they
 * fall into the page's own sequence; the rest arrive as they are scrolled to.
 */
export type RevealEffect = "cascade" | "scatter" | "flip" | "spring" | "rise" | "wipe";

const RUNNERS: Record<RevealEffect, (el: HTMLElement, delay: number) => gsap.core.Timeline> = {
  cascade: (el, delay) => charsCascadeIn(el, { delay }),
  scatter: (el, delay) => charsScatterIn(el, { delay }),
  flip: (el, delay) => charsFlipIn(el, { delay }),
  spring: (el, delay) => charsSpringIn(el, { delay }),
  rise: (el, delay) => riseIn(el, { delay }),
  wipe: (el, delay) => wipeAcross(el, { delay }),
};

export function Reveal({
  as: Tag = "div",
  effect,
  delay = 0,
  className,
  children,
}: {
  as?: ElementType;
  effect: RevealEffect;
  /** Seconds after the route entrance starts, when the element is already in view. */
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) {
        return;
      }
      if (prefersReducedMotion()) {
        gsap.set(el, { autoAlpha: 1 });
        return;
      }

      let armed = false;
      let entered = false;
      let timeline: gsap.core.Timeline | null = null;
      const inView = () => {
        const r = el.getBoundingClientRect();
        return r.bottom > 0 && r.top < window.innerHeight;
      };
      const go = (wait: number) => {
        entered = true;
        timeline = RUNNERS[effect](el, wait);
      };
      const observer = new IntersectionObserver(([entry]) => {
        if (entry?.isIntersecting && armed && !entered) {
          go(0);
        }
      });
      observer.observe(el);

      const unwatch = watchPageTransition(el, {
        onEntering: () => {
          armed = true;
          if (!entered && inView()) {
            go(delay);
          }
        },
        onIdle: () => {
          armed = true;
          if (!entered && inView()) {
            go(0);
          }
        },
        onExiting: () => {
          armed = false;
          entered = false;
          timeline?.kill();
          gsap.to(el, { autoAlpha: 0, y: -8, duration: 0.2, ease: "power2.in", overwrite: "auto" });
        },
      });
      return () => {
        observer.disconnect();
        unwatch();
        timeline?.kill();
      };
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} data-intro className={className}>
      {children}
    </Tag>
  );
}
