/*
 * Motion tokens.
 *
 * Three durations, and every primitive picks one of them. Timings follow the
 * prototype plan: micro motion 100–180ms, components 160–240ms, pages and
 * major panels 220–320ms. A coordinated sequence should rarely exceed 500ms
 * in total, which is why staggers are small and sequences are short.
 *
 * Distances are deliberately tiny. In a monochrome, type-led system motion
 * signals that something changed; it is not the thing being read.
 */
export const DURATION = {
  micro: 0.14,
  component: 0.2,
  page: 0.28,
} as const;

export const EASE = {
  /** Entrances decelerate: fast at first, settled at the end. */
  entrance: "power2.out",
  /** Exits accelerate away — they should feel shorter than entrances. */
  exit: "power2.in",
  /** Position or state shifts that start and end at rest. */
  shift: "power2.inOut",
} as const;

export const SHIFT = {
  micro: 4,
  component: 8,
  page: 16,
} as const;

export const STAGGER = {
  tight: 0.03,
  loose: 0.05,
} as const;

/*
 * Variable-font axis values.
 *
 * next/font emits Rethink Sans as a variable font with `font-weight: 400 800`,
 * and JetBrains Mono with `100 800`. 400–800 is therefore the entire animatable
 * range for `wght`: a value above 800 clamps and renders identically, so no
 * primitive should request one.
 */
export const WEIGHT = {
  rest: 400,
  emphasis: 600,
  display: 800,
} as const;
