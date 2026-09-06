"use client";

import { gsap } from "@/components/motion";

/*
 * Film grit.
 *
 * The ambient wear of a print that has been through the projector a few
 * hundred times: grain that shifts every frame, hairline scratches that
 * run the full height of the picture and wander as the gate rattles, and
 * dust and hairs that land for a frame or two and blow off.
 * All of it is drawn on one canvas in the page's own ink at a whisper of
 * alpha, so it reads as texture rather than as an effect.
 *
 * The grain is a handful of pre-rendered tiles shown in a random order at a
 * film-like frame rate; nothing is generated per frame. One to three
 * scratches are on the print at any time, each living a second or so.
 * Under reduced motion the caller asks for one still and never plays.
 */

export type FilmGritOptions = {
  /** Opacity of the grain layer. */
  grain?: number;
  /** Opacity of a scratch at its brightest. */
  scratch?: number;
  /** Grain frames a second. Film ran at 24; wear reads better a little slower. */
  fps?: number;
  /** How many scratches are on the print at once, least to most. */
  scratches?: [number, number];
  /** Average dust flecks and hairs spawned a second. */
  dustRate?: number;
};

export type FilmGrit = {
  play: () => void;
  pause: () => void;
  /** Re-reads the size and ink, and redraws. */
  sync: () => void;
  /** Draws a single frame without playing. */
  still: () => void;
  destroy: () => void;
};

type Scratch = {
  x: number;
  /** Pixels a frame the scratch wanders sideways. */
  drift: number;
  width: number;
  life: number;
  age: number;
  peak: number;
};

type Dust = {
  x: number;
  y: number;
  /** A speck is a dot; a hair is a short curved line. */
  kind: "speck" | "hair";
  r: number;
  /** Hair: end point relative to x, y, and the bend of its curve. */
  dx: number;
  dy: number;
  bend: number;
  life: number;
  age: number;
};

const TILE = 256;
const TILES = 6;

function parseInk(value: string): [number, number, number] {
  const hex = value.trim().match(/^#([0-9a-f]{6})$/i);
  if (hex?.[1]) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  const rgb = value.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (rgb) {
    return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  }
  return [234, 227, 210];
}

function makeTile(ink: [number, number, number]): HTMLCanvasElement {
  const tile = document.createElement("canvas");
  tile.width = TILE;
  tile.height = TILE;
  const ctx = tile.getContext("2d");
  if (!ctx) {
    return tile;
  }
  const image = ctx.createImageData(TILE, TILE);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    // Mostly nothing, a few bright specks: silver halide, not TV static.
    const v = Math.random();
    const a = v > 0.82 ? (v - 0.82) * 5.5 * 255 : 0;
    data[i] = ink[0];
    data[i + 1] = ink[1];
    data[i + 2] = ink[2];
    data[i + 3] = a;
  }
  ctx.putImageData(image, 0, 0);
  return tile;
}

export function filmGrit(
  canvas: HTMLCanvasElement,
  { grain = 0.06, scratch = 0.22, fps = 18, scratches: scratchRange = [1, 3], dustRate = 10 }: FilmGritOptions = {},
): FilmGrit {
  const ctx = canvas.getContext("2d");
  let ink: [number, number, number] = [234, 227, 210];
  let tiles: HTMLCanvasElement[] = [];
  let w = 0;
  let h = 0;
  let scratches: Scratch[] = [];
  let dust: Dust[] = [];
  let playing = false;
  let last = 0;
  const step = 1 / fps;

  const readInk = () => {
    const value = getComputedStyle(document.documentElement).getPropertyValue("--foreground");
    const next = parseInk(value);
    if (next.some((c, i) => c !== ink[i]) || tiles.length === 0) {
      ink = next;
      tiles = Array.from({ length: TILES }, () => makeTile(ink));
    }
  };

  const resize = () => {
    // Grain at half resolution is both cheaper and coarser, which is the point.
    const scale = 0.5;
    w = Math.ceil(window.innerWidth * scale);
    h = Math.ceil(window.innerHeight * scale);
    canvas.width = w;
    canvas.height = h;
  };

  const spawnScratch = () => {
    scratches.push({
      x: Math.random() * w,
      drift: gsap.utils.random(-1.2, 1.2),
      width: Math.random() < 0.8 ? 1 : 2,
      life: gsap.utils.random(12, 70, 1),
      age: 0,
      peak: gsap.utils.random(0.35, 1),
    });
  };

  const spawnDust = () => {
    const hair = Math.random() < 0.3;
    const length = gsap.utils.random(6, 26);
    const angle = Math.random() * Math.PI * 2;
    dust.push({
      x: Math.random() * w,
      y: Math.random() * h,
      kind: hair ? "hair" : "speck",
      r: hair ? gsap.utils.random(0.5, 0.9) : gsap.utils.random(0.5, 1.6),
      dx: Math.cos(angle) * length,
      dy: Math.sin(angle) * length,
      bend: gsap.utils.random(-8, 8),
      life: gsap.utils.random(1, 3, 1),
      age: 0,
    });
  };

  const draw = () => {
    if (!ctx || !w || !h || tiles.length === 0) {
      return;
    }
    ctx.clearRect(0, 0, w, h);

    // Grain: a random tile, shifted by a random offset, tiled over the frame.
    const tile = tiles[Math.floor(Math.random() * tiles.length)];
    const pattern = tile ? ctx.createPattern(tile, "repeat") : null;
    if (pattern) {
      ctx.save();
      ctx.globalAlpha = grain;
      ctx.translate(-Math.random() * TILE, -Math.random() * TILE);
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, w + TILE, h + TILE);
      ctx.restore();
    }

    const [r, g, b] = ink;
    ctx.lineCap = "round";
    for (const s of scratches) {
      const t = s.age / s.life;
      const fade = Math.min(1, Math.sin(t * Math.PI) * 1.6);
      // The gate never holds the print quite still: the line jitters every
      // frame, wanders with its drift, and now and then jumps.
      s.x += s.drift + (Math.random() - 0.5) * 1.5;
      if (Math.random() < 0.06) {
        s.x += gsap.utils.random(-6, 6);
      }
      const flicker = 0.6 + Math.random() * 0.4;
      const x = ((s.x % w) + w) % w;
      ctx.strokeStyle = `rgba(${r},${g},${b},${scratch * s.peak * fade * flicker})`;
      ctx.lineWidth = s.width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (Math.random() - 0.5) * 1.2, h);
      ctx.stroke();
      s.age += 1;
    }
    scratches = scratches.filter((s) => s.age < s.life);

    const dustInk = `rgba(${r},${g},${b},${Math.min(1, scratch * 1.6)})`;
    ctx.fillStyle = dustInk;
    ctx.strokeStyle = dustInk;
    for (const d of dust) {
      if (d.kind === "hair") {
        ctx.lineWidth = d.r;
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        // Bow the hair: the control point sits off the midpoint, across the line.
        const length = Math.hypot(d.dx, d.dy) || 1;
        const cx = d.x + d.dx / 2 - (d.dy / length) * d.bend;
        const cy = d.y + d.dy / 2 + (d.dx / length) * d.bend;
        ctx.quadraticCurveTo(cx, cy, d.x + d.dx, d.y + d.dy);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
      d.age += 1;
    }
    dust = dust.filter((d) => d.age < d.life);
  };

  const [fewest, most] = scratchRange;

  /** Keeps the print's scratch count inside its range. */
  const wear = (elapsed: number) => {
    while (scratches.length < fewest) {
      spawnScratch();
    }
    if (scratches.length < most && Math.random() < 0.8 * elapsed) {
      spawnScratch();
    }
    const flecks = dustRate * elapsed;
    for (let n = Math.floor(flecks) + (Math.random() < flecks % 1 ? 1 : 0); n > 0; n--) {
      spawnDust();
    }
  };

  const tick = () => {
    const now = gsap.ticker.time;
    if (now - last < step) {
      return;
    }
    const elapsed = Math.min(now - last, 0.5);
    last = now;
    wear(elapsed);
    draw();
  };

  const sync = () => {
    readInk();
    resize();
    draw();
  };

  const still = () => {
    sync();
    wear(0.5);
    draw();
  };

  const play = () => {
    if (playing) {
      return;
    }
    playing = true;
    last = gsap.ticker.time;
    gsap.ticker.add(tick);
  };

  const pause = () => {
    if (!playing) {
      return;
    }
    playing = false;
    gsap.ticker.remove(tick);
  };

  sync();

  return {
    play,
    pause,
    sync,
    still,
    destroy: () => {
      pause();
      scratches = [];
      dust = [];
      tiles = [];
      ctx?.clearRect(0, 0, w, h);
    },
  };
}
