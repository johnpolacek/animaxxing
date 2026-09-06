"use client";

import { gsap, SplitText } from "@/components/motion";

/*
 * Cinematic.
 *
 * The motion vocabulary of the cinematic look, all of it borrowed from the
 * projection booth: titles that track in from wide spacing while they pull
 * into focus, a subtitle that cuts in rather than fades, a beam of light
 * that sweeps the frame before it settles, a projector's flicker, a running
 * timecode, and the cut to black that ends a scene.
 */

/** Frames per second the timecode counts at. */
const TIMECODE_FPS = 24;

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Formats seconds as hh:mm:ss:ff. */
export function formatTimecode(seconds: number): string {
  const whole = Math.floor(seconds);
  const frames = Math.floor((seconds - whole) * TIMECODE_FPS);
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = whole % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(frames)}`;
}

/**
 * Runs a timecode in `el` from `from` seconds, at 24 frames a second.
 * Returns a stop function; the display holds where it was stopped.
 */
export function runTimecode(el: HTMLElement, from = 0, prefix = "TC "): () => void {
  const start = gsap.ticker.time - from;
  let last = "";
  const tick = () => {
    const next = prefix + formatTimecode(gsap.ticker.time - start);
    if (next !== last) {
      last = next;
      el.textContent = next;
    }
  };
  gsap.ticker.add(tick);
  return () => gsap.ticker.remove(tick);
}

/**
 * A title card. The letters come up out of soft focus while the line tracks
 * in from wide spacing to its set width. Returns the split so the caller can
 * revert it on the way out.
 */
export function trackIn(
  timeline: gsap.core.Timeline,
  el: HTMLElement,
  {
    at = 0,
    from = "0.6em",
    to = "0.16em",
    duration = 2,
    stagger = 0.05,
  }: { at?: number | string; from?: string; to?: string; duration?: number; stagger?: number } = {},
): SplitText {
  const split = SplitText.create(el, { type: "chars", aria: "auto" });
  gsap.set(el, { autoAlpha: 1, letterSpacing: from });
  gsap.set(split.chars, { autoAlpha: 0, filter: "blur(12px)", willChange: "filter, opacity" });
  timeline
    .to(el, { letterSpacing: to, duration, ease: "power3.out" }, at)
    .to(
      split.chars,
      {
        autoAlpha: 1,
        filter: "blur(0px)",
        duration: duration * 0.6,
        ease: "power2.out",
        stagger: { each: stagger, from: "center" },
      },
      at,
    )
    .set(split.chars, { clearProps: "filter,willChange" }, `>`);
  return split;
}

/** A line of subtitles: it is simply there on one frame, the way a subtitle is. */
export function subtitleIn(timeline: gsap.core.Timeline, el: HTMLElement, at: number | string): void {
  timeline.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.04, ease: "none" }, at);
}

/** A slow fade up from black, for anything lit rather than cut. */
export function fadeUp(
  timeline: gsap.core.Timeline,
  targets: gsap.TweenTarget,
  at: number | string,
  { duration = 1.2, y = 0, stagger = 0 }: { duration?: number; y?: number; stagger?: number } = {},
): void {
  timeline.fromTo(
    targets,
    { autoAlpha: 0, y },
    { autoAlpha: 1, y: 0, duration, ease: "sine.out", stagger },
    at,
  );
}

/**
 * The beam: a vertical streak of light crosses the frame once, then settles
 * in the middle. `width` is the frame's width in px.
 */
export function beamSweep(
  timeline: gsap.core.Timeline,
  beam: HTMLElement,
  width: number,
  at: number | string,
): void {
  timeline
    .fromTo(
      beam,
      { autoAlpha: 0, x: -width * 0.55 },
      { autoAlpha: 1, x: width * 0.5, duration: 1.6, ease: "power2.inOut" },
      at,
    )
    .to(beam, { x: 0, duration: 1.4, ease: "power3.out" }, ">-0.1");
}

/**
 * Projector flicker: the light wavers a little, all the time. Returns the
 * tween so it can be killed; the target is left as it was.
 */
export function projector(target: gsap.TweenTarget): gsap.core.Tween {
  return gsap.to(target, {
    opacity: () => gsap.utils.random(0.82, 1),
    duration: 0.1,
    repeat: -1,
    repeatRefresh: true,
    ease: "none",
  });
}

/** Cut to black: the shutter drops over the frame, and everything else is pulled down with it. */
export function cutToBlack(
  shutter: HTMLElement,
  others: gsap.TweenTarget,
  { duration = 0.4 }: { duration?: number } = {},
): gsap.core.Timeline {
  return gsap
    .timeline()
    .to(shutter, { autoAlpha: 1, duration, ease: "power2.in" }, 0)
    .to(others, { autoAlpha: 0, duration: duration * 0.75, ease: "power2.in" }, 0);
}
