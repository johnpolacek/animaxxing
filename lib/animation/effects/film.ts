"use client";

import { gsap } from "@/components/motion";

/*
 * Film.
 *
 * Footage for a video site that has no videos: every frame on the page is a
 * canvas drawing one of a dozen monochrome scenes in the frame's own text
 * colour, from a seed, as a function of time. A film has a clock, so it can
 * play, pause, and seek like a real one, and a `noise` level that mixes
 * static over the picture, which is how a frame tunes in.
 *
 * A film ticks only while it has to: playing, or with static on it. A paused
 * film is one still, drawn once. Off screen it does nothing at all. Under
 * reduced motion the caller never calls play.
 */

export type Scene =
  | "static"
  | "bars"
  | "wave"
  | "orbit"
  | "grid"
  | "rain"
  | "halftone"
  | "type"
  | "scan"
  | "pulse"
  | "stripes"
  | "clock";

export const SCENES: Scene[] = [
  "static",
  "bars",
  "wave",
  "orbit",
  "grid",
  "rain",
  "halftone",
  "type",
  "scan",
  "pulse",
  "stripes",
  "clock",
];

export type FilmOptions = {
  scene: Scene;
  seed: number;
  /** Length of the film, in seconds. The clock wraps at the end. */
  duration: number;
  /** Called on every drawn frame while playing, with the clock. */
  onTime?: (time: number) => void;
};

export type Film = {
  readonly duration: number;
  readonly time: number;
  readonly playing: boolean;
  /** 0–1: how much static sits over the picture. Tweenable through `tune`. */
  readonly tune: { noise: number };
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  /** Swaps the footage. The clock restarts. */
  setScene: (scene: Scene, seed: number, duration: number) => void;
  setOnScreen: (onScreen: boolean) => void;
  /** Re-reads the size and colour, and redraws. */
  sync: () => void;
  /** Asks for a redraw on the next tick. */
  touch: () => void;
  destroy: () => void;
};

type Rng = () => number;

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, rng: Rng, seed: number) => void;

const TAU = Math.PI * 2;

/** A small deterministic generator, so a seed always draws the same picture. */
function mulberry(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------------------------------------------------------------- scenes */

const bars: Draw = (ctx, w, h, t, rng) => {
  const levels = [1, 0.85, 0.7, 0.55, 0.4, 0.28, 0.16, 0.06];
  const shift = Math.floor(t / 1.6);
  const n = levels.length;
  const bw = w / n;
  for (let i = 0; i < n; i++) {
    ctx.globalAlpha = levels[(i + shift) % n] ?? 1;
    ctx.fillRect(Math.floor(i * bw), 0, Math.ceil(bw), h * 0.72);
  }
  // The lower strip: small blocks, a hairline, and a count.
  const strip = h * 0.72;
  for (let i = 0; i < n * 2; i++) {
    ctx.globalAlpha = 0.1 + (rng() * 0.8 > 0.5 ? 0.7 : 0);
    ctx.fillRect(Math.floor((i * bw) / 2), strip + h * 0.04, Math.ceil(bw / 2) - 2, h * 0.08);
  }
  ctx.globalAlpha = 0.5;
  ctx.fillRect(0, strip + h * 0.16, w, 1);
  ctx.globalAlpha = 0.9;
  ctx.fillRect(w * ((t * 0.08) % 1), strip + h * 0.2, 2, h * 0.08);
};

const wave: Draw = (ctx, w, h, t, rng) => {
  const f1 = 1.5 + rng() * 2;
  const f2 = 4 + rng() * 4;
  const f3 = 9 + rng() * 6;
  ctx.globalAlpha = 0.14;
  for (let i = 1; i < 8; i++) {
    ctx.fillRect(0, Math.round((h * i) / 8), w, 1);
    ctx.fillRect(Math.round((w * i) / 8), 0, 1, h);
  }
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  for (let x = 0; x <= w; x += 2) {
    const u = x / w;
    const y =
      h / 2 +
      Math.sin(u * TAU * f1 + t * 2.4) * h * 0.22 +
      Math.sin(u * TAU * f2 - t * 3.1) * h * 0.1 +
      Math.sin(u * TAU * f3 + t * 5) * h * 0.04;
    if (x === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();
  // The sweep: a hairline crossing the screen every two seconds.
  ctx.globalAlpha = 0.5;
  ctx.fillRect(w * ((t / 2) % 1), 0, 1, h);
};

const orbit: Draw = (ctx, w, h, t, rng) => {
  const cx = w / 2;
  const cy = h / 2;
  const base = Math.min(w, h);
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const r = base * (0.12 + i * 0.11);
    const speed = (0.9 - i * 0.18) * (rng() > 0.5 ? 1 : -1);
    const phase = rng() * TAU;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();
    const a = t * speed + phase;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, a - 0.9 * Math.sign(speed), a, speed < 0);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2 + i, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, base * 0.035, 0, TAU);
  ctx.fill();
};

const grid: Draw = (ctx, w, h, t) => {
  const horizon = h * 0.42;
  const vx = w / 2;
  ctx.lineWidth = 1;
  // Horizontal lines rushing toward the viewer.
  const rows = 12;
  for (let i = 0; i < rows; i++) {
    const z = (i + ((t * 1.4) % 1)) / rows;
    if (z <= 0) {
      continue;
    }
    const y = horizon + (h - horizon) * (z * z);
    ctx.globalAlpha = 0.15 + z * 0.85;
    ctx.fillRect(0, Math.round(y), w, 1);
  }
  // Verticals fanning out of the vanishing point.
  for (let i = -8; i <= 8; i++) {
    const x = vx + (i * w) / 6;
    ctx.globalAlpha = 0.45 - Math.abs(i) * 0.03;
    ctx.beginPath();
    ctx.moveTo(vx, horizon);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.9;
  ctx.fillRect(0, Math.round(horizon), w, 1);
  // A sun that is only an outline.
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.arc(vx, horizon - h * 0.02, h * 0.16, Math.PI, TAU);
  ctx.stroke();
};

const rain: Draw = (ctx, w, h, t, rng) => {
  const cols = Math.max(8, Math.floor(w / 12));
  for (let i = 0; i < cols; i++) {
    const x = (i + 0.5) * (w / cols);
    const speed = 120 + rng() * 260;
    const len = 12 + rng() * 40;
    const offset = rng() * (h + len);
    const alpha = 0.25 + rng() * 0.75;
    const y = ((t * speed + offset) % (h + len)) - len;
    ctx.globalAlpha = alpha;
    ctx.fillRect(Math.round(x), Math.round(y), 1, len);
    // The head of the streak is a brighter dot.
    ctx.globalAlpha = Math.min(1, alpha + 0.3);
    ctx.fillRect(Math.round(x) - 1, Math.round(y + len) - 2, 3, 2);
  }
};

const halftone: Draw = (ctx, w, h, t, rng) => {
  const gap = Math.max(10, Math.min(w, h) / 10);
  const cx = w * (0.3 + rng() * 0.4);
  const cy = h * (0.3 + rng() * 0.4);
  ctx.globalAlpha = 1;
  for (let y = gap / 2; y < h; y += gap) {
    for (let x = gap / 2; x < w; x += gap) {
      const d = Math.hypot(x - cx, y - cy);
      const k = 0.5 + 0.5 * Math.sin(d / (gap * 1.6) - t * 2.2);
      const r = (gap * 0.46) * k;
      if (r < 0.4) {
        continue;
      }
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
    }
  }
};

const type: Draw = (ctx, w, h, t, rng) => {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const start = Math.floor(rng() * 26);
  const index = (start + Math.floor(t * 2)) % 26;
  const font = ctx.font;
  const family = font.slice(font.indexOf("px") + 2).trim() || "sans-serif";
  ctx.globalAlpha = 1;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `800 ${Math.round(h * 0.78)}px ${family}`;
  const glyph = letters[index] ?? "A";
  const measure = ctx.measureText(glyph);
  const x = w * 0.06;
  const baseline = h * 0.86;
  ctx.fillText(glyph, x, baseline);
  // The specimen's rules: baseline, cap height, and the glyph's box.
  ctx.globalAlpha = 0.35;
  ctx.fillRect(0, Math.round(baseline), w, 1);
  const cap = baseline - measure.actualBoundingBoxAscent;
  ctx.fillRect(0, Math.round(cap), w, 1);
  ctx.fillRect(Math.round(x + measure.width), 0, 1, h);
  ctx.globalAlpha = 0.9;
  ctx.font = `600 ${Math.max(9, Math.round(h * 0.07))}px ${family}`;
  ctx.fillText(`${String(index + 1).padStart(2, "0")} / 26`, x + measure.width + h * 0.05, h * 0.16);
  ctx.font = font;
};

const scan: Draw = (ctx, w, h, t, rng) => {
  ctx.globalAlpha = 0.14;
  for (let y = 0; y < h; y += 3) {
    ctx.fillRect(0, y, w, 1);
  }
  // A picture under the lines: a broad block and a hairline horizon.
  ctx.globalAlpha = 0.35;
  ctx.fillRect(w * 0.12, h * 0.2, w * 0.36, h * 0.6);
  ctx.globalAlpha = 0.55;
  ctx.fillRect(0, Math.round(h * 0.62), w, 1);
  // The bright band rolling down, as on a tube that is losing sync.
  const band = ((t * 90) % (h + 40)) - 20;
  ctx.globalAlpha = 0.55;
  ctx.fillRect(0, Math.round(band), w, 6);
  ctx.globalAlpha = 0.25;
  ctx.fillRect(0, Math.round(band) - 10, w, 10);
  // One row jumps now and then.
  if (rng() < 0.15 + ((t * 7) % 1) * 0.1) {
    const y = Math.floor(rng() * h);
    ctx.globalAlpha = 0.6;
    ctx.fillRect(Math.floor(rng() * w * 0.3), y, w * 0.5, 2);
  }
};

const pulse: Draw = (ctx, w, h, t) => {
  const cx = w / 2;
  const cy = h / 2;
  const max = Math.hypot(w, h) / 2;
  ctx.lineWidth = 1.5;
  for (let k = 0; k < 5; k++) {
    const r = (t * 42 + (k * max) / 5) % max;
    ctx.globalAlpha = 1 - r / max;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.25;
  ctx.fillRect(0, Math.round(cy), w, 1);
  ctx.fillRect(Math.round(cx), 0, 1, h);
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, TAU);
  ctx.fill();
};

const stripes: Draw = (ctx, w, h, t, rng) => {
  const period = Math.max(14, Math.min(w, h) / 7);
  const width = period * 0.45;
  const angle = (rng() > 0.5 ? 1 : -1) * Math.PI / 4;
  const offset = (t * period * 1.2) % period;
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(angle);
  const span = Math.hypot(w, h);
  ctx.globalAlpha = 0.9;
  for (let x = -span - period; x < span + period; x += period) {
    ctx.fillRect(x + offset, -span, width, span * 2);
  }
  ctx.restore();
  // A window cut into the stripes, where the picture is inverted by absence.
  ctx.globalCompositeOperation = "destination-out";
  ctx.globalAlpha = 1;
  ctx.fillRect(w * 0.3, h * 0.28, w * 0.4, h * 0.44);
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 0.8;
  ctx.lineWidth = 1;
  ctx.strokeRect(w * 0.3 + 0.5, h * 0.28 + 0.5, w * 0.4, h * 0.44);
};

const clock: Draw = (ctx, w, h, t, rng) => {
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.42;
  const startHours = rng() * 12;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.stroke();
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * TAU;
    const long = i % 5 === 0;
    const inner = r * (long ? 0.88 : 0.94);
    ctx.globalAlpha = long ? 0.9 : 0.4;
    ctx.lineWidth = long ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * inner, cy + Math.sin(a) * inner);
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.stroke();
  }
  const hand = (turns: number, length: number, width: number) => {
    const a = turns * TAU - Math.PI / 2;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(cx - Math.cos(a) * r * 0.08, cy - Math.sin(a) * r * 0.08);
    ctx.lineTo(cx + Math.cos(a) * r * length, cy + Math.sin(a) * r * length);
    ctx.stroke();
  };
  ctx.globalAlpha = 1;
  hand((startHours + t / 720) / 12, 0.5, 4);
  hand(((startHours * 60 + t / 12) % 60) / 60, 0.74, 2.5);
  hand((t % 60) / 60, 0.86, 1);
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, TAU);
  ctx.fill();
};

const DRAWS: Record<Exclude<Scene, "static">, Draw> = {
  bars,
  wave,
  orbit,
  grid,
  rain,
  halftone,
  type,
  scan,
  pulse,
  stripes,
  clock,
};

/* ------------------------------------------------------------------ film */

export function createFilm(canvas: HTMLCanvasElement, options: FilmOptions): Film {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Film needs a 2d canvas context");
  }
  let { scene, seed, duration } = options;
  const tune = { noise: 0 };
  let time = 0;
  let playing = false;
  let onScreen = true;
  let dirty = true;
  let ticking = false;
  let destroyed = false;
  let width = 0;
  let height = 0;
  let color = "#000";
  let rgb: [number, number, number] = [0, 0, 0];
  let frame = 0;
  // Static is drawn at a quarter of the resolution and scaled up, so it is coarse and cheap.
  const grain = document.createElement("canvas");
  const grainCtx = grain.getContext("2d");

  const parse = (value: string): [number, number, number] => {
    const m = value.match(/\d+(\.\d+)?/g);
    if (!m || m.length < 3) {
      return [0, 0, 0];
    }
    return [Number(m[0]), Number(m[1]), Number(m[2])];
  };

  const drawStatic = (strength: number) => {
    if (!grainCtx || width === 0) {
      return;
    }
    const gw = Math.max(8, Math.round(width / 4));
    const gh = Math.max(8, Math.round(height / 4));
    if (grain.width !== gw || grain.height !== gh) {
      grain.width = gw;
      grain.height = gh;
    }
    const image = grainCtx.createImageData(gw, gh);
    const data = image.data;
    const [r, g, b] = rgb;
    const rnd = mulberry((seed ^ frame * 2654435761) >>> 0);
    for (let i = 0; i < data.length; i += 4) {
      const v = rnd();
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = v < 0.55 ? 0 : Math.round(255 * Math.min(1, (v - 0.55) * 2.4));
    }
    grainCtx.putImageData(image, 0, 0);
    ctx.save();
    ctx.globalAlpha = strength;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(grain, 0, 0, width, height);
    // A rolling bar, so the static is recognisably a lost signal.
    ctx.globalAlpha = strength * 0.5;
    ctx.fillStyle = color;
    ctx.fillRect(0, ((frame * 3) % (height + 20)) - 10, width, 8);
    ctx.restore();
  };

  const draw = () => {
    if (destroyed) {
      return;
    }
    frame += 1;
    ctx.clearRect(0, 0, width, height);
    if (width === 0 || height === 0) {
      return;
    }
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineCap = "round";
    if (scene === "static") {
      drawStatic(0.9);
    } else {
      ctx.save();
      DRAWS[scene](ctx, width, height, time, mulberry(seed), seed);
      ctx.restore();
    }
    if (tune.noise > 0.005) {
      drawStatic(Math.min(1, tune.noise));
    }
    ctx.globalAlpha = 1;
  };

  const tick = (_t: number, deltaMs: number) => {
    if (destroyed) {
      return;
    }
    if (!onScreen) {
      return;
    }
    if (playing) {
      time = (time + deltaMs / 1000) % duration;
      options.onTime?.(time);
    }
    if (playing || tune.noise > 0.005 || dirty) {
      dirty = false;
      draw();
    }
    if (!(playing || tune.noise > 0.005)) {
      stopTicking();
    }
  };

  const startTicking = () => {
    if (ticking || destroyed) {
      return;
    }
    ticking = true;
    gsap.ticker.add(tick);
  };

  const stopTicking = () => {
    if (!ticking) {
      return;
    }
    ticking = false;
    gsap.ticker.remove(tick);
  };

  const sync = () => {
    if (destroyed) {
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const style = getComputedStyle(canvas);
    color = style.color;
    rgb = parse(color);
    ctx.font = `800 ${Math.max(12, Math.round(height * 0.7))}px ${style.fontFamily}`;
    draw();
  };

  // `tune.noise` is tweened from outside; poll it by ticking whenever it is set above zero.
  const touch = () => {
    dirty = true;
    startTicking();
  };

  const film: Film = {
    get duration() {
      return duration;
    },
    get time() {
      return time;
    },
    get playing() {
      return playing;
    },
    tune: new Proxy(tune, {
      set(target, key, value) {
        if (key === "noise") {
          target.noise = Number(value);
          touch();
          return true;
        }
        return Reflect.set(target, key, value);
      },
    }),
    play() {
      if (playing || destroyed) {
        return;
      }
      playing = true;
      startTicking();
    },
    pause() {
      playing = false;
      dirty = true;
      startTicking();
    },
    seek(next) {
      time = ((next % duration) + duration) % duration;
      options.onTime?.(time);
      touch();
    },
    setScene(nextScene, nextSeed, nextDuration) {
      scene = nextScene;
      seed = nextSeed;
      duration = nextDuration;
      time = 0;
      options.onTime?.(0);
      touch();
    },
    setOnScreen(next) {
      onScreen = next;
      if (next) {
        touch();
      }
    },
    sync,
    touch,
    destroy() {
      destroyed = true;
      stopTicking();
    },
  };

  sync();
  return film;
}

/** m:ss, or h:mm:ss past the hour. */
export function timecode(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${rest}` : `${m}:${rest}`;
}

/** The reverse: "12:41" or "1:02:03" to seconds. */
export function seconds(code: string): number {
  return code
    .split(":")
    .map(Number)
    .reduce((total, part) => total * 60 + part, 0);
}
