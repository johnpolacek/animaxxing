"use client";

import { gsap } from "@/components/motion/gsap";

type Entrance = {
  from: gsap.TweenVars;
  via?: gsap.TweenVars;
  ease: string;
  duration: number;
  /** Seconds to fade up over, when the usual quick reveal is too abrupt. */
  fade?: number;
};

/**
 * The x is already twirling as it arrives: it winds up over the rest of the
 * entrance and hands the spin to {@link spinTop} at a whole number of turns,
 * so the split can be rebuilt underneath it without a seam.
 */
const WIND_UP_TURNS = 2;

/** Fourteen distinct entrances, one for every character of “Motion to the Max”. */
export function individualLetters(timeline: gsap.core.Timeline, chars: HTMLElement[], start: number) {
  const travel = Math.min(window.innerWidth * 0.38, 280);
  const entrances: Entrance[] = [
    // M: a heavy drop and rubber landing.
    { from: { y: -travel, scaleY: 1.6, scaleX: 0.65 }, ease: "bounce.out", duration: 0.9 },
    // o: rolls in from the left.
    { from: { x: -travel, rotation: -540 }, ease: "power3.out", duration: 0.85 },
    // t: swings down on its top hinge.
    { from: { rotationX: -150, transformOrigin: "50% 0%" }, ease: "elastic.out(1, 0.5)", duration: 1.05 },
    // i: launches upward, overshoots, and drops into place.
    { from: { y: travel, scaleY: 0.3 }, via: { y: -35, scaleY: 1.25 }, ease: "back.out(2)", duration: 0.65 },
    // o: corkscrews out of a tiny point.
    { from: { scale: 0.02, rotation: 450 }, ease: "back.out(2.2)", duration: 0.85 },
    // n: skids in sideways and straightens.
    { from: { x: travel, skewX: -50, scaleX: 1.5 }, ease: "elastic.out(1, 0.6)", duration: 0.95 },
    // t: opens like a door on its left edge.
    { from: { rotationY: -160, transformOrigin: "0% 50%" }, ease: "back.out(1.8)", duration: 0.8 },
    // o: dives diagonally, then hooks back to its baseline.
    { from: { x: travel * 0.7, y: -travel, rotation: 180 }, via: { x: -25, y: 25, rotation: -25 }, ease: "power2.out", duration: 0.55 },
    // t: unfolds from a horizontal sliver.
    { from: { scaleY: 0.02, scaleX: 1.8, transformOrigin: "50% 100%" }, ease: "elastic.out(1, 0.4)", duration: 1 },
    // h: somersaults up from below.
    { from: { y: travel * 0.6, rotationX: 270, rotation: -35 }, ease: "back.out(1.5)", duration: 0.9 },
    // e: sweeps around a low pivot like a pendulum.
    { from: { rotation: -140, transformOrigin: "50% 160%" }, ease: "elastic.out(1, 0.55)", duration: 1.1 },
    // M: shrinks in from the foreground with a quarter turn.
    { from: { scale: 3.5, rotation: 90 }, ease: "power3.out", duration: 0.8 },
    // a: stretches out of a vertical thread.
    { from: { scaleX: 0.02, scaleY: 2, skewY: 35 }, ease: "elastic.out(1, 0.45)", duration: 1 },
    // x: fades up out of the left and leaves the spin to do the talking.
    { from: { x: -travel * 0.35 }, ease: "power2.out", duration: 0.6, fade: 0.6 },
  ];
  const settled = { x: 0, y: 0, rotation: 0, rotationX: 0, rotationY: 0,
    scale: 1, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0 };
  chars.forEach((char, index) => {
    const entrance = entrances[index % entrances.length]!;
    const at = start + index * 0.045;
    gsap.set(char, { ...settled, transformOrigin: "50% 50%", transformPerspective: 700,
      autoAlpha: 0, willChange: "transform, opacity" });
    gsap.set(char, entrance.from);
    timeline.to(char, { autoAlpha: 1, duration: entrance.fade ?? 0.12, ease: "none" }, at);
    if (entrance.via) {
      timeline.to(char, { ...entrance.via, duration: 0.3, ease: "power2.out" }, at);
    }
    // The last letter's spin owns rotationY from here on; leave it out of the
    // landing so the two tweens are not writing the same property.
    const { rotationY: _spun, ...landing } = settled;
    timeline.to(char,
      { ...(index === chars.length - 1 ? landing : settled), duration: entrance.duration, ease: entrance.ease },
      at + (entrance.via ? 0.3 : 0));
  });
  windUp(timeline, chars, entrances, start);
}

/** Where the last letter to land finishes: the whole entrance is over by then. */
function lettersEnd(chars: HTMLElement[], entrances: Entrance[], start: number): number {
  return chars.reduce((end, _char, index) => {
    const entrance = entrances[index % entrances.length]!;
    const at = start + index * 0.045 + (entrance.via ? 0.3 : 0) + entrance.duration;
    return Math.max(end, at);
  }, 0);
}

/**
 * Spins the x up from its first frame to the moment the entrance ends, so it
 * is already turning fast when {@link spinTop} takes over. Sized to land on
 * the entrance's own finish, it never makes the page wait.
 */
function windUp(timeline: gsap.core.Timeline, chars: HTMLElement[], entrances: Entrance[], start: number) {
  const top = chars[chars.length - 1];
  if (!top) {
    return;
  }
  const at = start + (chars.length - 1) * 0.045;
  const duration = lettersEnd(chars, entrances, start) - at;
  if (duration <= 0) {
    return;
  }
  gsap.set(top, { transformOrigin: "50% 96%", transformPerspective: 900 });
  timeline.to(top, { rotationY: WIND_UP_TURNS * 360, duration, ease: "power3.in" }, at);
}
