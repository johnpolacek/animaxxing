"use client";

import { gsap, prefersReducedMotion, ScrollTrigger } from "@/components/motion";

/*
 * Three hearts.
 *
 * The systemic heart beats slow and heavy; the two branchial hearts beat
 * quicker, a half-cycle apart. When the reader scrolls, the octopus is
 * swimming, and the systemic heart stops until the page comes to rest, which
 * is exactly what the article says the animal's own heart does.
 *
 * Beats are scale and weight only. The status label is plain text, swapped
 * outright rather than animated, so assistive tech reads a word and not a tween.
 */

/** Seconds from one systemic beat to the next. */
const SYSTEMIC_PERIOD = 1.1;
const BRANCHIAL_PERIOD = 0.7;
/** Seconds of stillness before the page counts as at rest. */
const REST_AFTER = 0.35;

export type HeartsOptions = {
  systemic: HTMLElement;
  branchial: HTMLElement[];
  status?: HTMLElement | null;
};

function beat(target: HTMLElement, period: number, delay: number, strength: number) {
  return gsap
    .timeline({ repeat: -1, repeatDelay: period - 0.36, delay, defaults: { overwrite: "auto" } })
    .to(target, { scale: 1 + strength, duration: 0.12, ease: "power2.out" })
    .to(target, { scale: 1, duration: 0.24, ease: "power2.inOut" });
}

export function startHearts({ systemic, branchial, status }: HeartsOptions): () => void {
  if (prefersReducedMotion()) {
    return () => {};
  }
  gsap.set([systemic, ...branchial], { transformOrigin: "0% 100%", willChange: "transform" });

  const main = beat(systemic, SYSTEMIC_PERIOD, 0, 0.06);
  const gills = branchial.map((el, i) => beat(el, BRANCHIAL_PERIOD, (i * BRANCHIAL_PERIOD) / 2, 0.12));

  const setStatus = (text: string) => {
    if (status) {
      status.textContent = text;
    }
  };
  setStatus("at rest");

  let rest: gsap.core.Tween | null = null;
  const swim = () => {
    rest?.kill();
    if (main.isActive() || !main.paused()) {
      main.pause();
      gsap.to(systemic, { scale: 1, duration: 0.2, overwrite: "auto" });
      setStatus("swimming, systemic heart stopped");
    }
  };
  const settle = () => {
    rest?.kill();
    rest = gsap.delayedCall(REST_AFTER, () => {
      main.play();
      setStatus("at rest");
    });
  };
  ScrollTrigger.addEventListener("scrollStart", swim);
  ScrollTrigger.addEventListener("scrollEnd", settle);

  return () => {
    ScrollTrigger.removeEventListener("scrollStart", swim);
    ScrollTrigger.removeEventListener("scrollEnd", settle);
    rest?.kill();
    main.kill();
    gills.forEach((tl) => tl.kill());
    gsap.set([systemic, ...branchial], { clearProps: "transform,willChange" });
  };
}
