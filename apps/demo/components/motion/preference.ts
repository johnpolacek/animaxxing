"use client";

import { gsap } from "./gsap";

/*
 * Motion preference.
 *
 * The operating-system setting is the source of truth. `data-motion` on <html>
 * is an explicit override, used by the switch on the design-system page so
 * reduced motion can be reviewed without changing system settings.
 *
 * Primitives call `prefersReducedMotion()` when they build a timeline, so an
 * override applies to the next animation immediately. Setups declared through
 * gsap.matchMedia() are re-run by `applyMotion` via gsap.matchMediaRefresh().
 */

export const MOTION_CHOICES = ["system", "full", "reduced"] as const;

export type MotionChoice = (typeof MOTION_CHOICES)[number];

export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export function isMotionChoice(value: unknown): value is MotionChoice {
  return typeof value === "string" && (MOTION_CHOICES as readonly string[]).includes(value);
}

export function readMotionChoice(): MotionChoice {
  if (typeof document === "undefined") {
    return "system";
  }
  const value = document.documentElement.dataset.motion;
  return isMotionChoice(value) ? value : "system";
}

export function applyMotion(choice: MotionChoice): void {
  const root = document.documentElement;
  if (choice === "system") {
    delete root.dataset.motion;
  } else {
    root.dataset.motion = choice;
  }
  // Re-run matchMedia handlers so declarative setups pick the override up.
  gsap.matchMediaRefresh();
}

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") {
    return true;
  }
  const choice = readMotionChoice();
  if (choice === "reduced") {
    return true;
  }
  if (choice === "full") {
    return false;
  }
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}
