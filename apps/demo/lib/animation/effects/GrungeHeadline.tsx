"use client";

import { useRef, type ReactNode } from "react";
import { gsap, prefersReducedMotion, SplitText, useGSAP } from "@/components/motion";
import { Statement } from "@/components/ui";

/*
 * Grunge for the headline.
 *
 * Once the route entrance has settled, the heading is split into letters and
 * each letter is rasterized so we know exactly which pixels are ink. About
 * once a second one small patch of one letter gets distressed: speckled
 * erosion inside the glyph, a scratch or two, and a little spatter just past
 * the edge. Nothing is ever undone, so the wear builds up for as long as the
 * page is open. The letters stay live text; a canvas over the heading holds
 * the distress and repaints it whenever the theme colors change.
 */

/** Canvas bleed around the heading so spatter can sit outside the letters. */
const OVERSCAN = 40;
/** Seconds between patches. */
const INTERVAL_MIN = 0.7;
const INTERVAL_MAX = 1.3;
/** Patch radius in CSS pixels. */
const RADIUS_MIN = 8;
const RADIUS_MAX = 22;
/** Stop accumulating after this many patches; the look has plateaued by then. */
const MAX_PATCHES = 900;

const rnd = gsap.utils.random;

type Ink = {
  /** Which pixels of the canvas are letter ink, in CSS pixel coordinates. */
  mask: Uint8Array;
  width: number;
  height: number;
  /** Ink pixel indices per letter, so a patch can be aimed at one glyph. */
  letters: number[][];
};

/* ---------- rasterizing ---------- */

function rasterize(chars: Element[], origin: DOMRect, width: number, height: number): Ink {
  const mask = new Uint8Array(width * height);
  const letters: number[][] = [];
  for (const char of chars) {
    const el = char as HTMLElement;
    const text = el.textContent ?? "";
    if (text.trim() === "") {
      continue;
    }
    const rect = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    // The span's box is the line box, which tight leading can make shorter
    // than the glyph; pad the raster so nothing hanging outside it is lost.
    const pad = Math.ceil(parseFloat(cs.fontSize) * 0.5);
    const w = Math.ceil(rect.width) + pad * 2;
    const h = Math.ceil(rect.height) + pad * 2;
    const off = document.createElement("canvas");
    off.width = w;
    off.height = h;
    const ctx = off.getContext("2d", { willReadFrequently: true });
    if (!ctx) {
      continue;
    }
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    ctx.fontKerning = "none";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#000";
    // Half the leading below the box top, plus the ascent, lands on the same
    // baseline the browser used.
    const metrics = ctx.measureText(text);
    const content = metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
    const baseline = (rect.height - content) / 2 + metrics.fontBoundingBoxAscent;
    ctx.fillText(text, pad, baseline + pad);

    const data = ctx.getImageData(0, 0, w, h).data;
    const ox = Math.round(rect.left - origin.left) + OVERSCAN - pad;
    const oy = Math.round(rect.top - origin.top) + OVERSCAN - pad;
    const pixels: number[] = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if ((data[(y * w + x) * 4 + 3] ?? 0) <= 128) {
          continue;
        }
        const gx = ox + x;
        const gy = oy + y;
        if (gx < 0 || gy < 0 || gx >= width || gy >= height) {
          continue;
        }
        const index = gy * width + gx;
        mask[index] = 1;
        pixels.push(index);
      }
    }
    if (pixels.length > 0) {
      letters.push(pixels);
    }
  }
  return { mask, width, height, letters };
}

/* ---------- distressing ---------- */

type Marks = {
  /** Packed x, y, size triples painted in the page background: ink removed. */
  erode: number[];
  /** Packed x, y, size triples painted in the text color: ink flung outside. */
  spatter: number[];
};

function grungePatch(ink: Ink, marks: Marks): void {
  const letter = ink.letters[Math.floor(Math.random() * ink.letters.length)];
  if (!letter) {
    return;
  }
  const { width, height, mask } = ink;
  const filled = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < width && y < height && mask[y * width + x] === 1;
  const nearEdge = (x: number, y: number) =>
    !filled(x - 3, y) || !filled(x + 3, y) || !filled(x, y - 3) || !filled(x, y + 3);

  // Wear shows first along edges, so most patches are aimed there.
  let cx = 0;
  let cy = 0;
  const wantEdge = Math.random() < 0.65;
  for (let tries = 0; tries < 24; tries++) {
    const index = letter[Math.floor(Math.random() * letter.length)] ?? 0;
    cx = index % width;
    cy = (index - cx) / width;
    if (!wantEdge || nearEdge(cx, cy)) {
      break;
    }
  }
  const radius = rnd(RADIUS_MIN, RADIUS_MAX);

  // Speckled erosion, dense at the center and thinning outward.
  const specks = Math.round(radius * radius * 0.45);
  for (let i = 0; i < specks; i++) {
    const angle = rnd(0, Math.PI * 2);
    const r = radius * Math.pow(Math.random(), 0.6);
    const x = Math.round(cx + Math.cos(angle) * r);
    const y = Math.round(cy + Math.sin(angle) * r);
    if (!filled(x, y)) {
      continue;
    }
    const size = Math.random() < 0.7 ? 1 : Math.random() < 0.8 ? 2 : 3;
    marks.erode.push(x, y, size);
  }

  // A scratch or two: short wandering hairlines through the ink.
  const scratches = Math.round(rnd(1, 3));
  for (let s = 0; s < scratches; s++) {
    let x = cx + rnd(-radius / 2, radius / 2);
    let y = cy + rnd(-radius / 2, radius / 2);
    let angle = rnd(0, Math.PI * 2);
    const length = Math.round(rnd(6, 22));
    for (let k = 0; k < length; k++) {
      x += Math.cos(angle);
      y += Math.sin(angle);
      angle += rnd(-0.45, 0.45);
      const xi = Math.round(x);
      const yi = Math.round(y);
      if (filled(xi, yi)) {
        marks.erode.push(xi, yi, 1);
      }
    }
  }

  // Spatter: a few flecks of ink thrown just past the edge.
  const flecks = Math.round(rnd(3, 10));
  for (let i = 0; i < flecks; i++) {
    const angle = rnd(0, Math.PI * 2);
    const r = radius * rnd(0.7, 1.6);
    const x = Math.round(cx + Math.cos(angle) * r);
    const y = Math.round(cy + Math.sin(angle) * r);
    if (x < 0 || y < 0 || x >= width || y >= height || filled(x, y)) {
      continue;
    }
    marks.spatter.push(x, y, Math.random() < 0.75 ? 1 : 2);
  }
}

/* ---------- lifecycle ---------- */

function setup(wrap: HTMLElement, heading: HTMLElement): (keepSplit?: boolean) => void {
  const dpr = window.devicePixelRatio || 1;
  const split = SplitText.create(heading, { type: "chars,words" });
  const origin = wrap.getBoundingClientRect();
  const cssW = Math.ceil(origin.width) + OVERSCAN * 2;
  const cssH = Math.ceil(origin.height) + OVERSCAN * 2;
  const ink = rasterize(split.chars, origin, cssW, cssH);

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(cssW * dpr);
  canvas.height = Math.ceil(cssH * dpr);
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, {
    position: "absolute",
    left: `${-OVERSCAN}px`,
    top: `${-OVERSCAN}px`,
    width: `${cssW}px`,
    height: `${cssH}px`,
    pointerEvents: "none",
  });
  wrap.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx || ink.letters.length === 0) {
    split.revert();
    canvas.remove();
    return () => {};
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const marks: Marks = { erode: [], spatter: [] };

  const paint = () => {
    ctx.clearRect(0, 0, cssW, cssH);
    ctx.fillStyle = getComputedStyle(document.body).backgroundColor;
    for (let i = 0; i < marks.erode.length; i += 3) {
      ctx.fillRect(marks.erode[i] ?? 0, marks.erode[i + 1] ?? 0, marks.erode[i + 2] ?? 1, marks.erode[i + 2] ?? 1);
    }
    ctx.fillStyle = getComputedStyle(heading).color;
    for (let i = 0; i < marks.spatter.length; i += 3) {
      ctx.fillRect(marks.spatter[i] ?? 0, marks.spatter[i + 1] ?? 0, marks.spatter[i + 2] ?? 1, marks.spatter[i + 2] ?? 1);
    }
  };

  let patches = 0;
  let next: gsap.core.Tween | undefined;
  const tick = () => {
    grungePatch(ink, marks);
    paint();
    patches++;
    if (patches < MAX_PATCHES) {
      next = gsap.delayedCall(rnd(INTERVAL_MIN, INTERVAL_MAX), tick);
    }
  };
  next = gsap.delayedCall(rnd(INTERVAL_MIN, INTERVAL_MAX), tick);

  // The erosion is painted in the page background, so a theme switch has to
  // repaint it: once immediately and once after the color transition ends.
  let repaintTimer: ReturnType<typeof setTimeout> | undefined;
  const repaint = () => {
    paint();
    clearTimeout(repaintTimer);
    repaintTimer = setTimeout(paint, 320);
  };
  const themeObserver = new MutationObserver(repaint);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const scheme = window.matchMedia("(prefers-color-scheme: dark)");
  scheme.addEventListener("change", repaint);

  return (keepSplit = false) => {
    next?.kill();
    clearTimeout(repaintTimer);
    themeObserver.disconnect();
    scheme.removeEventListener("change", repaint);
    canvas.remove();
    if (!keepSplit) {
      split.revert();
    }
  };
}

export function GrungeHeadline({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    (_context, contextSafe) => {
      const wrap = scope.current;
      const heading = wrap?.querySelector<HTMLElement>("h1");
      if (!wrap || !heading || !contextSafe || prefersReducedMotion()) {
        return;
      }

      let teardown: ((keepSplit?: boolean) => void) | null = null;
      const start = contextSafe(() => {
        teardown?.();
        teardown = setup(wrap, heading);
      });

      // The route entrance owns the letters until it reports idle; the exit
      // needs the plain heading back the moment it begins.
      const observer = new MutationObserver((records) => {
        for (const record of records) {
          const target = record.target as HTMLElement;
          if (!target.contains(heading)) {
            continue;
          }
          const state = target.dataset.transitionState;
          if (state === "idle" && !teardown) {
            start();
          } else if (state === "exiting" && teardown) {
            teardown(true);
            teardown = null;
          }
        }
      });
      observer.observe(document.body, {
        attributes: true,
        subtree: true,
        attributeFilter: ["data-transition-state"],
      });
      if (heading.closest<HTMLElement>("[data-transition-state]")?.dataset.transitionState === "idle") {
        start();
      }

      let resizeTimer: ReturnType<typeof setTimeout> | undefined;
      const onResize = () => {
        if (!teardown) {
          return;
        }
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(start, 200);
      };
      window.addEventListener("resize", onResize);

      return () => {
        observer.disconnect();
        clearTimeout(resizeTimer);
        window.removeEventListener("resize", onResize);
        teardown?.();
      };
    },
    { scope },
  );

  return (
    <div ref={scope} className="relative">
      <Statement as="h1" data-page-transition="letters" className={className}>
        {children}
      </Statement>
    </div>
  );
}
