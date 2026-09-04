"use client";

import { gsap } from "@/components/motion";

/*
 * Radar.
 *
 * A plan-position indicator drawn on a canvas in the page's own foreground
 * colour: range rings and a crosshair as hairlines, precipitation as solid
 * cells on a grid, and a sweep that turns once every few seconds. A cell is
 * brightest just after the sweep has passed it and fades until the next
 * pass, which is how a real display holds its picture between sweeps.
 *
 * Frames are intensity grids. Switching frames crossfades the cells; the
 * sweep keeps turning. Under reduced motion the sweep is still, every cell
 * shows at full strength, and a frame change is a cut.
 */

export type RadarOptions = {
  /** One row-major grid of 0–1 intensities per frame. */
  frames: number[][];
  /** Cells per side of the grid. */
  grid: number;
  /** Ring labels, innermost first. */
  rings: string[];
  reduced: boolean;
  /** Seconds per sweep. */
  period?: number;
  /** Frame to show first. Defaults to the last one. */
  initialFrame?: number;
};

export type Radar = {
  /** Draws the rings in and lights the cells up. */
  reveal: () => gsap.core.Tween;
  setFrame: (index: number) => void;
  setOnScreen: (onScreen: boolean) => void;
  sync: () => void;
  destroy: () => void;
};

const TWO_PI = Math.PI * 2;

export function createRadar(canvas: HTMLCanvasElement, options: RadarOptions): Radar {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Radar needs a 2d canvas context");
  }
  const { frames, grid, rings, reduced } = options;
  const period = options.period ?? 7;
  const state = { reveal: 0, mix: 1, angle: -Math.PI / 2 };
  let current = options.initialFrame ?? frames.length - 1;
  let previous = current;
  let mixTween: gsap.core.Tween | null = null;
  let width = 0;
  let height = 0;
  let color = "#000";
  let font = "10px monospace";
  let running = false;
  let onScreen = true;

  const sync = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const style = getComputedStyle(canvas);
    color = style.color;
    font = `500 10px ${style.fontFamily}`;
    draw();
  };

  const draw = () => {
    ctx.clearRect(0, 0, width, height);
    if (width === 0 || height === 0) {
      return;
    }
    const cx = width / 2;
    const cy = height / 2;
    const R = (Math.min(width, height) / 2 - 22) * (0.4 + 0.6 * state.reveal);
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.lineCap = "round";
    ctx.font = font;
    ctx.textBaseline = "middle";

    /* Cells, quantised to three strengths and lit by the sweep. */
    const cell = (R * 2) / grid;
    const a = frames[current] ?? [];
    const b = frames[previous] ?? a;
    for (let y = 0; y < grid; y++) {
      for (let x = 0; x < grid; x++) {
        const i = y * grid + x;
        const v = (b[i] ?? 0) + ((a[i] ?? 0) - (b[i] ?? 0)) * state.mix;
        if (v <= 0.02) {
          continue;
        }
        const px = cx - R + (x + 0.5) * cell;
        const py = cy - R + (y + 0.5) * cell;
        if (Math.hypot(px - cx, py - cy) > R - cell * 0.5) {
          continue;
        }
        const level = v < 0.4 ? 0.28 : v < 0.7 ? 0.58 : 1;
        let glow = 1;
        if (!reduced) {
          const behind = (((state.angle - Math.atan2(py - cy, px - cx)) % TWO_PI) + TWO_PI) % TWO_PI;
          glow = 0.45 + 0.55 * Math.max(0, 1 - behind / (Math.PI * 1.5));
        }
        ctx.globalAlpha = level * glow * state.reveal;
        ctx.fillRect(px - cell / 2 + 0.75, py - cell / 2 + 0.75, cell - 1.5, cell - 1.5);
      }
    }

    /* Rings and crosshair. */
    const count = rings.length;
    for (let k = 1; k <= count; k++) {
      const r = (R * k) / count;
      ctx.globalAlpha = (k === count ? 0.8 : 0.4) * state.reveal;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TWO_PI);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.3 * state.reveal;
    ctx.beginPath();
    ctx.moveTo(cx - R, cy);
    ctx.lineTo(cx + R, cy);
    ctx.moveTo(cx, cy - R);
    ctx.lineTo(cx, cy + R);
    ctx.stroke();

    /* Labels: ring ranges up the north line, and the compass point. */
    ctx.globalAlpha = 0.85 * state.reveal;
    ctx.textAlign = "left";
    rings.forEach((label, index) => {
      const r = (R * (index + 1)) / count;
      ctx.fillText(label.toUpperCase(), cx + 5, cy - r + 7);
    });
    ctx.textAlign = "center";
    ctx.fillText("N", cx, cy - R - 11);

    /* The sweep: a faint wedge trailing a hairline. */
    if (!reduced) {
      ctx.globalAlpha = 0.08 * state.reveal;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, state.angle - 0.7, state.angle);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 0.95 * state.reveal;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(state.angle) * R, cy + Math.sin(state.angle) * R);
      ctx.stroke();
    }
    ctx.globalAlpha = state.reveal;
    ctx.beginPath();
    ctx.arc(cx, cy, 2.5, 0, TWO_PI);
    ctx.fill();
    ctx.globalAlpha = 1;
  };

  const tick = (_time: number, deltaMs: number) => {
    state.angle = (state.angle + (Math.min(deltaMs, 50) / 1000) * (TWO_PI / period)) % TWO_PI;
    draw();
  };
  const start = () => {
    if (running || !onScreen || reduced) {
      return;
    }
    running = true;
    gsap.ticker.add(tick);
  };
  const stop = () => {
    if (!running) {
      return;
    }
    running = false;
    gsap.ticker.remove(tick);
  };

  sync();

  return {
    reveal() {
      sync();
      if (reduced) {
        return gsap.to(state, { reveal: 1, duration: 0, onUpdate: draw });
      }
      start();
      return gsap.to(state, { reveal: 1, duration: 1.4, ease: "power3.out", overwrite: "auto" });
    },
    setFrame(index) {
      if (index === current) {
        return;
      }
      previous = current;
      current = index;
      mixTween?.kill();
      if (reduced) {
        state.mix = 1;
        draw();
        return;
      }
      state.mix = 0;
      mixTween = gsap.to(state, { mix: 1, duration: 0.55, ease: "power2.inOut", onUpdate: draw });
    },
    setOnScreen(visible) {
      onScreen = visible;
      if (visible) {
        start();
      } else {
        stop();
      }
    },
    sync,
    destroy() {
      stop();
      mixTween?.kill();
      ctx.clearRect(0, 0, width, height);
    },
  };
}
