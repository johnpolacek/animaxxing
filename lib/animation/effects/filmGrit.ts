"use client";

import { gsap } from "@/components/motion";

/*
 * Film grit.
 *
 * The ambient wear of a print that has been through the projector a few
 * hundred times: grain that shifts every frame, hairline scratches that
 * run down the picture for a moment and heal, and the odd fleck of dust.
 * All of it is drawn on one canvas in the page's own ink at a whisper of
 * alpha, so it reads as texture rather than as an effect.
 *
 * The grain is a handful of pre-rendered tiles shown in a random order at a
 * film-like frame rate; nothing is generated per frame. Scratches are
 * spawned at random and live a few frames each. Under reduced motion the
 * caller asks for one still and never plays.
 */

export type FilmGritOptions = {
  /** Opacity of the grain layer. */
  grain?: number;
  /** Opacity of a scratch at its brightest. */
  scratch?: number;
  /** Grain frames a second. Film ran at 24; wear reads better a little slower. */
  fps?: number;
  /** Average scratches spawned a second. */
  scratchRate?: number;
  /** Average dust flecks spawned a second. */
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
  drift: number;
  top: number;
  bottom: number;
  width: number;
  life: number;
  age: number;
  peak: number;
};

type Dust = {
  x: number;
  y: number;
  r: number;
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
  { grain = 0.05, scratch = 0.18, fps = 18, scratchRate = 0.35, dustRate = 0.6 }: FilmGritOptions = {},
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
    const life = gsap.utils.random(3, 14, 1);
    scratches.push({
      x: Math.random() * w,
      drift: gsap.utils.random(-0.4, 0.4),
      top: Math.random() < 0.6 ? 0 : Math.random() * h * 0.5,
      bottom: Math.random() < 0.6 ? h : h * (0.5 + Math.random() * 0.5),
      width: Math.random() < 0.85 ? 1 : 2,
      life,
      age: 0,
      peak: gsap.utils.random(0.3, 1),
    });
  };

  const spawnDust = () => {
    dust.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: gsap.utils.random(0.6, 1.8),
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
    ctx.lineCap = "butt";
    for (const s of scratches) {
      const t = s.age / s.life;
      const fade = Math.sin(t * Math.PI);
      const jitter = (Math.random() - 0.5) * 0.6;
      const x = s.x + s.drift * s.age + jitter;
      ctx.strokeStyle = `rgba(${r},${g},${b},${scratch * s.peak * fade})`;
      ctx.lineWidth = s.width;
      ctx.beginPath();
      ctx.moveTo(x, s.top);
      ctx.lineTo(x + jitter, s.bottom);
      ctx.stroke();
      s.age += 1;
    }
    scratches = scratches.filter((s) => s.age < s.life);

    ctx.fillStyle = `rgba(${r},${g},${b},${scratch * 1.4})`;
    for (const d of dust) {
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
      d.age += 1;
    }
    dust = dust.filter((d) => d.age < d.life);
  };

  const tick = () => {
    const now = gsap.ticker.time;
    if (now - last < step) {
      return;
    }
    const elapsed = Math.min(now - last, 0.5);
    last = now;
    if (Math.random() < scratchRate * elapsed) {
      spawnScratch();
    }
    if (Math.random() < dustRate * elapsed) {
      spawnDust();
    }
    draw();
  };

  const sync = () => {
    readInk();
    resize();
    draw();
  };

  const still = () => {
    sync();
    spawnScratch();
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
