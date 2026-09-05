"use client";

import { gsap } from "@/components/motion";

/** Rasterize the settled letters so every fragment returns to its exact glyph. */
export function titleParticles(heading: HTMLElement, onComplete: () => void) {
  const bounds = heading.getBoundingClientRect();
  const host = heading.parentElement!;
  const hostBounds = host.getBoundingClientRect();
  const bleed = Math.min(360, window.innerWidth * 0.5);
  const mask = document.createElement("canvas");
  mask.width = Math.ceil(bounds.width);
  mask.height = Math.ceil(bounds.height);
  const ink = mask.getContext("2d", { willReadFrequently: true });
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ink || !ctx) {
    onComplete();
    return null;
  }

  // Range geometry preserves the real wrapping and tracking, including any
  // markup retained by the page entrance. Read everything before hiding it.
  const walker = document.createTreeWalker(heading, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const style = getComputedStyle(node.parentElement!);
    ink.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    ink.fillStyle = style.color;
    ink.textBaseline = "alphabetic";
    for (let i = 0; i < (node.textContent?.length ?? 0); i++) {
      const char = node.textContent!.charAt(i);
      if (!char.trim()) continue;
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const rect = range.getBoundingClientRect();
      const metrics = ink.measureText(char);
      const ascent = metrics.fontBoundingBoxAscent;
      const descent = metrics.fontBoundingBoxDescent;
      ink.fillText(char, rect.left - bounds.left,
        rect.top - bounds.top + (rect.height - ascent - descent) / 2 + ascent);
    }
  }

  const pixels = ink.getImageData(0, 0, mask.width, mask.height).data;
  const step = Math.max(4, Math.ceil(Math.sqrt(mask.width * mask.height / 5000)));
  const pieces: { x: number; y: number; dx: number; dy: number; spin: number }[] = [];
  for (let y = 0; y < mask.height; y += step) {
    for (let x = 0; x < mask.width; x += step) {
      let visible = false;
      for (let sy = y; sy < Math.min(y + step, mask.height) && !visible; sy++) {
        for (let sx = x; sx < Math.min(x + step, mask.width); sx++) {
          if ((pixels[(sy * mask.width + sx) * 4 + 3] ?? 0) > 30) {
            visible = true;
            break;
          }
        }
      }
      if (!visible) continue;
      const angle = Math.atan2(y - bounds.height / 2, x - bounds.width / 2)
        + gsap.utils.random(-0.8, 0.8);
      const distance = gsap.utils.random(bleed * 0.4, bleed * 0.92);
      pieces.push({ x, y, dx: Math.cos(angle) * distance,
        dy: Math.sin(angle) * distance, spin: gsap.utils.random(-Math.PI, Math.PI) });
    }
  }

  const width = bounds.width + bleed * 2;
  const height = bounds.height + bleed * 2;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.ceil(width * dpr);
  canvas.height = Math.ceil(height * dpr);
  canvas.setAttribute("aria-hidden", "true");
  canvas.dataset.titleParticles = "";
  Object.assign(canvas.style, {
    position: "absolute", pointerEvents: "none", zIndex: "1",
    left: `${bounds.left - hostBounds.left - bleed}px`,
    top: `${bounds.top - hostBounds.top - bleed}px`,
    width: `${width}px`, height: `${height}px`, opacity: "0",
  });
  host.append(canvas);
  const opacity = heading.style.opacity;
  const state = { spread: 0 };
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    heading.style.opacity = opacity;
    canvas.remove();
  };
  const draw = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    for (const p of pieces) {
      ctx.save();
      ctx.translate(bleed + p.x + step / 2 + p.dx * state.spread,
        bleed + p.y + step / 2 + p.dy * state.spread);
      ctx.rotate(p.spin * state.spread);
      const size = step * (1 - state.spread * 0.55);
      ctx.drawImage(mask, p.x, p.y, step, step, -size / 2, -size / 2, size, size);
      ctx.restore();
    }
  };
  const timeline = gsap.timeline({ onComplete: () => { cleanup(); onComplete(); } });
  timeline.call(() => {
    draw();
    canvas.style.opacity = "1";
    heading.style.opacity = "0";
  }, [], 0);
  // Keep moving through the fade: disappear at full spread, then immediately
  // emerge on the return without adding a hold at either end.
  timeline.to(state, { spread: 1, duration: 0.65, ease: "none", onUpdate: draw }, 0);
  timeline.to(canvas, { opacity: 0, duration: 0.33, ease: "none" }, 0.32);
  timeline.to(state, { spread: 0, duration: 0.55, ease: "none", onUpdate: draw }, 0.65);
  timeline.to(canvas, { opacity: 1, duration: 0.35, ease: "none" }, 0.65);
  return { timeline, revert: () => { timeline.kill(); cleanup(); } };
}
