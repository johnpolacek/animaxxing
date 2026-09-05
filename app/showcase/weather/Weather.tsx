"use client";

import { useEffect, useRef, useState } from "react";
import {
  charsRiseIn,
  charsSpringIn,
  charsWeightWave,
  gsap,
  prefersReducedMotion,
  ScrollTrigger,
  scrollRevealBatch,
  useGSAP,
} from "@/components/motion";
import { Annotation, Label } from "@/components/ui";
import { createRadar, type Radar } from "@/lib/animation/effects/radar";
import { SKY_BLEED, startFog, startHeat, startRain, type Sky } from "@/lib/animation/effects/sky";
import { watchPageTransition } from "@/lib/animation/pageState";
import {
  CHAPTERS,
  CITIES,
  CONDITION_LABEL,
  RADAR_FRAMES,
  RADAR_GRID,
  radarFrames,
  type City,
  type Day,
  type Hour,
} from "./content";
import { Glyph, WindArrow } from "./Glyph";

/*
 * The forecast, animaxxed.
 *
 * Layout: a sticky strip of chrome (wordmark, location, the change chip),
 * then a twelve-column grid with a sticky rail of the four views in two
 * columns and the views themselves in the other ten. Each view is a chapter:
 * a mono number, an oversized title, and a hairline.
 *
 * Motion, all of it drawn from the weather:
 *  - the temperature's digits scatter in with the route; the condition word
 *    comes out of a blur like a bank of fog; the glyph draws itself
 *  - the sky itself runs over the current conditions: fog rolls through,
 *    rain falls on a slant, heat rings off the sun. Only while on screen.
 *  - the sun crosses its arc to where it is right now
 *  - readings print row by row, their digits resolving out of noise
 *  - the hourly line draws itself across the day; the rain bars grow;
 *    a hairline cursor follows the pointer
 *  - each day of the week draws its glyph and stretches its range; a storm
 *    day strikes: the bolt snaps in and the row flashes negative
 *  - the radar sweeps, and cells glow brightest just behind the sweep
 *  - the rail's marker drifts between chapters
 *  - changing the city is a front moving through: every number scrambles
 *    to its new value, the line and bars morph, the radar rescans
 * Reduced motion snaps every one of these to its settled state.
 */

const CHIP =
  "inline-flex items-center gap-2 rounded-md border-2 px-3 py-1.5 font-mono text-caption font-bold uppercase tracking-[0.08em] transition-colors";
const CHIP_OUTLINE = `${CHIP} border-foreground text-foreground hover:bg-inverse hover:text-inverse-foreground`;
const CHIP_TOGGLE = `${CHIP} border-foreground text-foreground hover:bg-surface-hover aria-pressed:border-inverse aria-pressed:bg-inverse aria-pressed:text-inverse-foreground aria-pressed:hover:bg-inverse-hover`;
const CHIP_RAIL = `${CHIP} shrink-0 border-foreground text-foreground data-[active=true]:border-inverse data-[active=true]:bg-inverse data-[active=true]:text-inverse-foreground`;

const BUTTON =
  "inline-flex items-center rounded-lg px-6 py-3 font-sans text-2xl font-extrabold uppercase tracking-[-0.02em] transition-colors sm:px-8 sm:py-4 sm:text-4xl";
const BUTTON_PRIMARY = `${BUTTON} bg-inverse text-inverse-foreground hover:bg-inverse-hover`;
const BUTTON_SECONDARY = `${BUTTON} border-2 border-foreground text-foreground hover:bg-surface-hover`;

const DISPLAY =
  "font-sans font-extrabold uppercase leading-[0.88] tracking-[-0.04em] [font-kerning:none] [text-rendering:optimizeSpeed]";
const READING =
  "font-sans text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl";

const RINGS = ["15 mi", "30 mi", "45 mi", "60 mi"];
/** Seconds each radar frame holds while playing. */
const FRAME_HOLD = 0.8;

/* ------------------------------------------------------------ geometry */

const CHART_W = 1000;
const CHART_H = 220;
const CHART_PAD = 14;

type Point = [number, number];

/** The day's temperatures as one smooth stroke, normalised to the chart box. */
function tempPath(hourly: Hour[]): string {
  const temps = hourly.map((h) => h.temp);
  const min = Math.min(...temps);
  const span = Math.max(Math.max(...temps) - min, 1);
  const pts: Point[] = hourly.map((h, i) => [
    ((i + 0.5) / hourly.length) * CHART_W,
    CHART_PAD + (1 - (h.temp - min) / span) * (CHART_H - CHART_PAD * 2),
  ]);
  const first = pts[0];
  if (!first) {
    return "";
  }
  const f = (n: number) => n.toFixed(1);
  let d = `M${f(first[0])} ${f(first[1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    if (!p0 || !p1 || !p2 || !p3) {
      continue;
    }
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  return d;
}

function weekRange(week: Day[]): { min: number; span: number } {
  const min = Math.min(...week.map((d) => d.low));
  const max = Math.max(...week.map((d) => d.high));
  return { min, span: Math.max(max - min, 1) };
}

function dayBar(day: Day, range: { min: number; span: number }): { left: string; width: string } {
  return {
    left: `${(((day.low - range.min) / range.span) * 100).toFixed(1)}%`,
    width: `${(((day.high - day.low) / range.span) * 100).toFixed(1)}%`,
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

const UV: [number, string][] = [
  [2, "Low"],
  [5, "Moderate"],
  [7, "High"],
  [10, "Very high"],
  [Infinity, "Extreme"],
];
const uvLabel = (uv: number) => UV.find(([max]) => uv <= max)?.[1] ?? "Extreme";

type Reading = { id: string; label: string; value: string; unit: string; note: string };

function readings(city: City): Reading[] {
  return [
    {
      id: "wind",
      label: "Wind",
      value: String(city.wind.speed),
      unit: `mph ${city.wind.compass}`,
      note: `Gusts ${city.wind.gust} mph`,
    },
    { id: "humidity", label: "Humidity", value: String(city.humidity), unit: "%", note: `Dew point ${city.dewPoint}°` },
    { id: "feels", label: "Feels like", value: `${city.feelsLike}°`, unit: "", note: `Actual ${city.temp}°` },
    { id: "pressure", label: "Pressure", value: city.pressure, unit: "in", note: "Steady" },
    { id: "visibility", label: "Visibility", value: city.visibility, unit: "mi", note: `Station ${city.station}` },
    { id: "uv", label: "UV index", value: String(city.uv), unit: "", note: uvLabel(city.uv) },
  ];
}

/* --------------------------------------------------------------- motion */

/** Draws every tagged stroke in an SVG along its own length. */
function drawStrokes(
  scope: Element,
  { duration = 0.8, stagger = 0.08, delay = 0 } = {},
): gsap.core.Tween | null {
  const strokes = Array.from(scope.querySelectorAll<SVGGeometryElement>("[data-stroke]"));
  if (strokes.length === 0) {
    return null;
  }
  for (const stroke of strokes) {
    const length = stroke.getTotalLength();
    stroke.style.strokeDasharray = `${length}`;
    stroke.style.strokeDashoffset = `${length}`;
  }
  return gsap.to(strokes, {
    strokeDashoffset: 0,
    duration,
    stagger,
    delay,
    ease: "power2.inOut",
    overwrite: "auto",
    onComplete: () => {
      for (const stroke of strokes) {
        stroke.style.strokeDasharray = "";
        stroke.style.strokeDashoffset = "";
      }
    },
  });
}

/** Digits (or letters) resolving out of noise into whatever the element now says. */
function resolve(element: HTMLElement, at = 0, tl?: gsap.core.Timeline): void {
  const upper = element.dataset.live === "upper";
  const vars: gsap.TweenVars = {
    duration: upper ? 0.7 : 0.6,
    ease: "none",
    overwrite: "auto",
    scrambleText: {
      text: element.textContent ?? "",
      chars: upper ? "upperCase" : "0123456789",
      speed: 0.5,
      revealDelay: 0.15,
    },
  };
  if (tl) {
    tl.to(element, vars, at);
  } else {
    gsap.to(element, { ...vars, delay: at });
  }
}

/** A storm day: the bolt snaps in and the row flashes negative, twice. */
function strike(row: HTMLElement): gsap.core.Timeline {
  const bolt = row.querySelector<SVGGeometryElement>("[data-bolt]");
  const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
  if (bolt) {
    const length = bolt.getTotalLength();
    tl.fromTo(
      bolt,
      { strokeDasharray: length, strokeDashoffset: length },
      { strokeDashoffset: 0, duration: 0.12, ease: "power4.in", clearProps: "strokeDasharray,strokeDashoffset" },
      0,
    );
  }
  return tl
    .to(row, { filter: "invert(1)", duration: 0.05, ease: "none" }, 0.1)
    .to(row, { filter: "invert(0)", duration: 0.08, ease: "none" }, 0.16)
    .to(row, { filter: "invert(1)", duration: 0.05, ease: "none" }, 0.3)
    .to(row, { filter: "invert(0)", duration: 0.4, ease: "power2.out" }, 0.36)
    .set(row, { clearProps: "filter" });
}

/* ---------------------------------------------------------------- page */

export function Weather() {
  const scope = useRef<HTMLDivElement>(null);
  const [cityIndex, setCityIndex] = useState(0);
  const [frame, setFrame] = useState(RADAR_FRAMES.length - 1);
  const [playing, setPlaying] = useState(false);
  const city = CITIES[cityIndex] ?? CITIES[0]!;

  const cityRef = useRef(city);
  cityRef.current = city;
  const frameRef = useRef(frame);
  frameRef.current = frame;
  const previousCity = useRef(cityIndex);

  const radar = useRef<Radar | null>(null);
  const radarRevealed = useRef(false);
  const radarOnScreen = useRef(false);
  const sky = useRef<Sky | null>(null);
  const nowOnScreen = useRef(true);
  const idle = useRef(false);
  const sun = useRef({ t: 0 });
  const change = useRef<() => void>(() => {});

  /** Moves the sun along its arc to `t`, drawing the elapsed part of the arc behind it. */
  const placeSun = (root: HTMLElement) => {
    const path = root.querySelector<SVGGeometryElement>("[data-sun-path]");
    const dot = root.querySelector<SVGCircleElement>("[data-sun-dot]");
    if (!path || !dot) {
      return;
    }
    const length = path.getTotalLength();
    const t = sun.current.t;
    path.style.strokeDasharray = `${length}`;
    path.style.strokeDashoffset = `${length * (1 - t)}`;
    const angle = Math.PI * (1 - t);
    dot.setAttribute("cx", (100 + 90 * Math.cos(angle)).toFixed(2));
    dot.setAttribute("cy", (95 - 90 * Math.sin(angle)).toFixed(2));
  };

  /** Starts whichever sky the city is under, over the current-conditions block. */
  const startSky = (root: HTMLElement) => {
    sky.current?.stop();
    sky.current = null;
    if (prefersReducedMotion() || !idle.current || !nowOnScreen.current) {
      return;
    }
    const canvas = root.querySelector<HTMLCanvasElement>("canvas[data-sky]");
    const frame = root.querySelector<HTMLElement>("[data-sky-frame]");
    const glyph = root.querySelector<HTMLElement>("[data-big-glyph]");
    if (!canvas || !frame) {
      return;
    }
    switch (cityRef.current.condition) {
      case "fog":
      case "cloud":
        sky.current = startFog(canvas, frame);
        break;
      case "rain":
        sky.current = startRain(canvas, frame);
        break;
      case "storm":
        sky.current = startRain(canvas, frame, { intensity: 1.6 });
        break;
      default:
        sky.current = startHeat(canvas, frame, { origin: glyph ?? frame });
    }
  };

  const buildRadar = (root: HTMLElement) => {
    radar.current?.destroy();
    const canvas = root.querySelector<HTMLCanvasElement>("canvas[data-radar]");
    if (!canvas) {
      return;
    }
    radar.current = createRadar(canvas, {
      frames: radarFrames(cityRef.current),
      grid: RADAR_GRID,
      rings: RINGS,
      reduced: prefersReducedMotion(),
      initialFrame: frameRef.current,
    });
    radar.current.setOnScreen(radarOnScreen.current);
    if (radarRevealed.current) {
      radar.current.reveal();
    }
  };

  /* ------------------------------------------------ mount: the page */
  useGSAP(
    (_context, contextSafe) => {
      const root = scope.current;
      const temp = root?.querySelector<HTMLElement>("[data-temp]");
      if (!root || !temp || !contextSafe) {
        return;
      }
      const reduced = prefersReducedMotion();
      const q = gsap.utils.selector(root);
      const cleanups: (() => void)[] = [];
      const sections = q<HTMLElement>("[data-chapter]");
      const marker = root.querySelector<HTMLElement>("[data-rail-marker]");
      const links = q<HTMLElement>("[data-rail-link]");
      const cursor = root.querySelector<HTMLElement>("[data-cursor]");
      const rules = q<HTMLElement>("[data-rule]");

      if (marker) {
        gsap.set(marker, { autoAlpha: 0 });
      }
      if (cursor) {
        gsap.set(cursor, { autoAlpha: 0 });
      }
      if (!reduced) {
        gsap.set(rules, { scaleX: 0, transformOrigin: "0% 50%" });
        gsap.set(q("[data-reading] > *"), { autoAlpha: 0 });
      }

      /** A chapter's title rises behind its mask while its hairline draws across. */
      const chapterIn = (section: HTMLElement): gsap.core.Timeline => {
        const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
        const title = section.querySelector<HTMLElement>("[data-title]");
        const rule = section.querySelector<HTMLElement>("[data-rule]");
        if (rule && !reduced) {
          tl.to(rule, { scaleX: 1, duration: 0.7, ease: "power3.inOut", clearProps: "transform" }, 0);
        }
        if (title) {
          tl.add(charsSpringIn(title), 0.1);
        }
        return tl;
      };

      /* ------------------------------------------------- the rail */
      let active = -1;
      const driftTo = (index: number) => {
        if (index === active) {
          return;
        }
        active = index;
        const id = CHAPTERS[index]?.id;
        links.forEach((link) => {
          link.dataset.active = String(link.dataset.target === id);
        });
        const link = root.querySelector<HTMLElement>(`[data-rail] [data-rail-link][data-target="${id}"]`);
        if (!marker || !link) {
          return;
        }
        if (reduced) {
          gsap.set(marker, { y: link.offsetTop, autoAlpha: 1 });
          return;
        }
        // A drift: the marker stretches toward where it is going and settles.
        gsap
          .timeline({ defaults: { overwrite: "auto" } })
          .to(marker, { autoAlpha: 1, duration: 0.15 }, 0)
          .to(marker, { y: link.offsetTop, duration: 0.65, ease: "power3.inOut" }, 0)
          .fromTo(
            marker,
            { scaleY: 1.35, transformOrigin: "50% 50%" },
            { scaleY: 1, duration: 0.5, ease: "power2.out" },
            0.2,
          );
      };

      /* --------------------------------------------- the hours */
      const chart = root.querySelector<HTMLElement>("[data-chart]");
      const readout = root.querySelector<HTMLElement>("[data-readout]");
      if (chart && cursor && readout) {
        const moveX = gsap.quickTo(cursor, "x", { duration: 0.18, ease: "power3.out" });
        const move = contextSafe((event: PointerEvent) => {
          const rect = chart.getBoundingClientRect();
          const hours = cityRef.current.hourly;
          const index = gsap.utils.clamp(
            0,
            hours.length - 1,
            Math.floor(((event.clientX - rect.left) / rect.width) * hours.length),
          );
          const hour = hours[index];
          if (!hour) {
            return;
          }
          const x = ((index + 0.5) / hours.length) * rect.width;
          if (reduced) {
            gsap.set(cursor, { x });
          } else {
            moveX(x);
          }
          readout.textContent = `${pad(hour.hour)}:00 · ${hour.temp}° · ${hour.precip}%`;
          readout.dataset.side = index > hours.length * 0.7 ? "left" : "right";
        });
        const enter = contextSafe((event: PointerEvent) => {
          move(event);
          gsap.to(cursor, { autoAlpha: 1, duration: reduced ? 0 : 0.2, overwrite: "auto" });
        });
        const leave = contextSafe(() => {
          gsap.to(cursor, { autoAlpha: 0, duration: reduced ? 0 : 0.25, overwrite: "auto" });
        });
        chart.addEventListener("pointerenter", enter);
        chart.addEventListener("pointermove", move);
        chart.addEventListener("pointerleave", leave);
        cleanups.push(() => {
          chart.removeEventListener("pointerenter", enter);
          chart.removeEventListener("pointermove", move);
          chart.removeEventListener("pointerleave", leave);
        });
      }

      const hoursIn = () => {
        const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
        const line = root.querySelector<SVGGeometryElement>("[data-temp-path]");
        if (reduced || !line) {
          return tl;
        }
        const length = line.getTotalLength();
        tl.fromTo(
          line,
          { strokeDasharray: length, strokeDashoffset: length },
          { strokeDashoffset: 0, duration: 1.6, ease: "power2.inOut", clearProps: "strokeDasharray,strokeDashoffset" },
          0,
        )
          .fromTo(
            q("[data-bar]"),
            { scaleY: 0, transformOrigin: "50% 100%" },
            { scaleY: 1, duration: 0.6, ease: "power3.out", stagger: 0.035, clearProps: "transform" },
            0.1,
          );
        const glyphs = root.querySelector<HTMLElement>("[data-hour-glyphs]");
        if (glyphs) {
          const draw = drawStrokes(glyphs, { duration: 0.5, stagger: 0.012 });
          if (draw) {
            tl.add(draw, 0.2);
          }
        }
        q<HTMLElement>("[data-hour-temp]").forEach((el, i) => resolve(el, 0.2 + i * 0.03, tl));
        return tl;
      };

      /* ---------------------------------------------- the week */
      const dayIn = (row: HTMLElement, index: number) => {
        if (reduced) {
          return;
        }
        const at = index * 0.08;
        const bar = row.querySelector<HTMLElement>("[data-range]");
        if (bar) {
          gsap.fromTo(
            bar,
            { scaleX: 0, transformOrigin: "0% 50%" },
            { scaleX: 1, duration: 0.7, ease: "power3.out", delay: at + 0.1, clearProps: "transform", overwrite: "auto" },
          );
        }
        drawStrokes(row, { duration: 0.6, stagger: 0.06, delay: at });
        row.querySelectorAll<HTMLElement>("[data-live]").forEach((el) => resolve(el, at + 0.1));
        if (row.dataset.storm !== undefined) {
          gsap.delayedCall(at + 0.7, () => strike(row));
        }
      };
      // Which day is the storm changes with the city, so every row listens.
      for (const row of q<HTMLElement>("[data-day]")) {
        const again = contextSafe(() => {
          if (!reduced && row.dataset.storm !== undefined) {
            strike(row);
          }
        });
        row.addEventListener("pointerenter", again);
        cleanups.push(() => row.removeEventListener("pointerenter", again));
      }

      /* ------------------------------------------------ the sky */
      const now = sections[0];
      if (now) {
        ScrollTrigger.create({
          trigger: now,
          start: "top bottom",
          end: "bottom top",
          onToggle: (self) => {
            nowOnScreen.current = self.isActive;
            if (self.isActive) {
              startSky(root);
            } else {
              sky.current?.stop();
              sky.current = null;
            }
          },
        });
      }

      /* ---------------------------------------------- the radar */
      buildRadar(root);
      const radarBlock = root.querySelector<HTMLElement>("[data-radar-block]");
      const resync = contextSafe(() => radar.current?.sync());
      window.addEventListener("resize", resync);
      cleanups.push(() => window.removeEventListener("resize", resync));

      /* ------------------------------------- scroll, armed at idle */
      const armScroll = () => {
        scrollRevealBatch("[data-reveal]", root);
        if (!reduced) {
          // Each reading gets its own entrance, including on tall mobile layouts.
          q<HTMLElement>("[data-reading]").forEach(row => {
            ScrollTrigger.create({
              trigger: row,
              start: "top 88%",
              once: true,
              onEnter: contextSafe(() => {
                const label = row.querySelector<HTMLElement>("dt");
                const value = row.querySelector<HTMLElement>("dd > span");
                const note = row.querySelector<HTMLElement>("dd > p");
                const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
                tl.set(row.children, { autoAlpha: 1 });
                if (label) tl.add(charsRiseIn(label), 0);
                if (value) tl.fromTo(value, { y: 30, autoAlpha: 0, scale: 0.85, transformOrigin: "0% 100%" }, {
                  y: 0, autoAlpha: 1, scale: 1, duration: 0.75, ease: "back.out(1.4)", clearProps: "transform,opacity,visibility",
                }, 0.12);
                if (note) tl.fromTo(note, { x: -18, autoAlpha: 0 }, {
                  x: 0, autoAlpha: 1, duration: 0.45, clearProps: "transform,opacity,visibility",
                }, 0.32);
                row.querySelectorAll<HTMLElement>("[data-live]").forEach(el => resolve(el, 0.2, tl));
              }),
            });
          });

          // Animate wrappers so city changes can still redraw the glyphs and numbers.
          const hourIcons = q<HTMLElement>("[data-hour-icon]");
          if (hourIcons.length) gsap.fromTo(hourIcons, {
            y: 28, rotation: -25, scale: 0.45, autoAlpha: 0,
          }, {
            y: 0, rotation: 0, scale: 1, autoAlpha: 1, stagger: 0.055, ease: "none",
            scrollTrigger: { trigger: root.querySelector("#hourly"), start: "top 78%", end: "bottom 65%", scrub: 0.45 },
          });
          q<HTMLElement>("[data-day]").forEach((row, index) => {
            gsap.fromTo(row.children, {
              x: index % 2 ? 28 : -28, y: 16, autoAlpha: 0,
            }, {
              x: 0, y: 0, autoAlpha: 1, stagger: 0.12, ease: "none",
              scrollTrigger: { trigger: row, start: "top 94%", end: "top 66%", scrub: 0.35 },
            });
          });
          const radarFrame = root.querySelector<HTMLElement>("[data-radar-frame]");
          if (radarFrame) gsap.fromTo(radarFrame, {
            clipPath: "inset(12% 8% 12% 8%)", scale: 0.94,
          }, {
            clipPath: "inset(0% 0% 0% 0%)", scale: 1, ease: "none",
            scrollTrigger: { trigger: radarFrame, start: "top 92%", end: "top 30%", scrub: 0.6 },
          });
          const radarControls = root.querySelector<HTMLElement>("[aria-label='Radar time']");
          if (radarControls) gsap.fromTo(radarControls.children, { y: 24, autoAlpha: 0 }, {
            y: 0, autoAlpha: 1, stagger: 0.09, duration: 0.5, clearProps: "transform,opacity,visibility",
            scrollTrigger: { trigger: radarControls, start: "top 88%", once: true },
          });
        }
        sections.forEach((section, index) => {
          if (index > 0) {
            if (!reduced) {
              const titleFrame = section.querySelector<HTMLElement>("[data-title-frame]");
              if (titleFrame) gsap.fromTo(titleFrame, { x: 28 }, {
                x: 0, ease: "none",
                scrollTrigger: { trigger: section, start: "top 90%", end: "top 30%", scrub: 0.5 },
              });
            }
            ScrollTrigger.create({
              trigger: section,
              start: "top 85%",
              once: true,
              onEnter: () => chapterIn(section),
            });
          }
          ScrollTrigger.create({
            trigger: section,
            start: "top 45%",
            end: "bottom 45%",
            onToggle: (self) => {
              if (self.isActive) {
                driftTo(index);
              }
            },
          });
        });
        if (chart) {
          ScrollTrigger.create({ trigger: chart, start: "top 85%", once: true, onEnter: hoursIn });
        }
        ScrollTrigger.batch(q<HTMLElement>("[data-day]"), {
          start: "top 88%",
          once: true,
          onEnter: (batch) => (batch as HTMLElement[]).forEach(dayIn),
        });
        if (radarBlock) {
          ScrollTrigger.create({
            trigger: radarBlock,
            start: "top 80%",
            once: true,
            onEnter: () => {
              radarRevealed.current = true;
              radar.current?.reveal();
            },
          });
          ScrollTrigger.create({
            trigger: radarBlock,
            start: "top bottom",
            end: "bottom top",
            onToggle: (self) => {
              radarOnScreen.current = self.isActive;
              radar.current?.setOnScreen(self.isActive);
            },
          });
        }
      };

      /* ------------------------------------------------- arrival */
      let arrival: gsap.core.Timeline | null = null;
      const arrive = (): gsap.core.Timeline => {
        const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
        const word = root.querySelector<HTMLElement>("[data-condition]");
        const glyph = root.querySelector<HTMLElement>("[data-big-glyph]");
        const arrow = root.querySelector<HTMLElement>("[data-wind-arrow]");
        const rows = q<HTMLElement>("[data-reading]");
        const chips = q<HTMLElement>("[data-arrive='chips'] > *");
        const direction = cityRef.current.wind.direction;
        if (reduced) {
          tl.set(q("[data-arrive]"), { autoAlpha: 1 });
          if (arrow) {
            tl.set(arrow, { rotation: direction }, 0);
          }
          sun.current.t = cityRef.current.sunProgress;
          tl.call(() => placeSun(root), [], 0);
          return tl;
        }
        if (now) {
          tl.add(chapterIn(now), 0);
        }
        if (word) {
          // Out of the fog: the word sharpens and drifts into place.
          tl.fromTo(
            word,
            { autoAlpha: 0, filter: "blur(18px)", x: -24 },
            { autoAlpha: 1, filter: "blur(0px)", x: 0, duration: 1.1, ease: "power2.out", clearProps: "filter" },
            0.25,
          );
        }
        if (chips.length > 0) {
          tl.set(chips[0]?.parentElement ?? chips, { autoAlpha: 1 }, 0.55).fromTo(
            chips,
            { autoAlpha: 0, y: 10 },
            { autoAlpha: 1, y: 0, duration: 0.35, ease: "power2.out", stagger: 0.07 },
            0.55,
          );
        }
        if (glyph) {
          tl.set(glyph, { autoAlpha: 1 }, 0.3);
          const draw = drawStrokes(glyph, { duration: 0.9, stagger: 0.07 });
          if (draw) {
            tl.add(draw, 0.3);
          }
        }
        // The sun crosses to where it is now.
        const sunBlock = root.querySelector<HTMLElement>("[data-sun]");
        if (sunBlock) {
          sun.current.t = 0;
          placeSun(root);
          tl.set(sunBlock, { autoAlpha: 1 }, 0.5).to(
            sun.current,
            {
              t: cityRef.current.sunProgress,
              duration: 1.4,
              ease: "power2.inOut",
              onUpdate: () => placeSun(root),
            },
            0.6,
          );
        }
        // The ledger's children reveal individually when they reach the viewport.
        if (rows.length > 0) {
          tl.set(rows[0]?.parentElement ?? rows, { autoAlpha: 1 }, 0.7);
        }
        if (arrow) {
          tl.fromTo(
            arrow,
            { rotation: direction - 120 },
            { rotation: direction, duration: 1.2, ease: "elastic.out(1, 0.5)" },
            0.9,
          );
        }
        return tl;
      };

      /* ------------------------------------------- change city */
      let changing = false;
      change.current = contextSafe(() => {
        if (!idle.current || changing) {
          return;
        }
        changing = true;
        // Let the front pass before another can be called.
        gsap.delayedCall(reduced ? 0 : 1, () => (changing = false));
        setCityIndex((index) => (index + 1) % CITIES.length);
      });

      const unwatch = watchPageTransition(temp, {
        onIdle: contextSafe(() => {
          idle.current = true;
          arrival = arrive();
          armScroll();
          startSky(root);
        }),
        onExiting: () => {
          idle.current = false;
          arrival?.kill();
          sky.current?.stop(true);
          sky.current = null;
          gsap.to(q("[data-arrive]"), { autoAlpha: 0, duration: 0.2, overwrite: "auto" });
        },
      });

      /* --------------------------------------------------- chips */
      for (const chip of q<HTMLElement>("[data-chip]")) {
        const label = chip.querySelector<HTMLElement>("[data-chip-label]") ?? chip;
        let armed = true;
        const wave = contextSafe(() => {
          if (reduced || !armed) {
            return;
          }
          armed = false;
          charsWeightWave(label);
        });
        const rearm = () => {
          armed = true;
        };
        chip.addEventListener("pointerenter", wave);
        chip.addEventListener("pointerleave", rearm);
        chip.addEventListener("focus", wave);
        chip.addEventListener("blur", rearm);
        cleanups.push(() => {
          chip.removeEventListener("pointerenter", wave);
          chip.removeEventListener("pointerleave", rearm);
          chip.removeEventListener("focus", wave);
          chip.removeEventListener("blur", rearm);
        });
      }

      /* ----------------------------------------------------- gust */
      const windCell = root.querySelector<HTMLElement>("[data-reading='wind']");
      const arrow = root.querySelector<HTMLElement>("[data-wind-arrow]");
      if (windCell && !reduced) {
        const gust = contextSafe(() => {
          const value = windCell.querySelector<HTMLElement>("[data-gust]");
          gsap
            .timeline({ defaults: { overwrite: "auto" } })
            .to(value, { x: 12, skewX: -10, duration: 0.18, ease: "power3.out" }, 0)
            .to(value, { x: 0, skewX: 0, duration: 0.9, ease: "elastic.out(1, 0.4)", clearProps: "transform" }, 0.18);
          if (arrow) {
            const direction = cityRef.current.wind.direction;
            gsap
              .timeline({ defaults: { overwrite: "auto" } })
              .to(arrow, { rotation: direction + 28, duration: 0.18, ease: "power3.out" }, 0)
              .to(arrow, { rotation: direction, duration: 1, ease: "elastic.out(1, 0.35)" }, 0.18);
          }
        });
        windCell.addEventListener("pointerenter", gust);
        cleanups.push(() => windCell.removeEventListener("pointerenter", gust));
      }

      return () => {
        unwatch();
        cleanups.forEach((fn) => fn());
        arrival?.kill();
        sky.current?.stop(true);
        sky.current = null;
        radar.current?.destroy();
        radar.current = null;
      };
    },
    { scope },
  );

  /* ------------------------------------ the front: a city change */
  useGSAP(
    () => {
      const root = scope.current;
      const before = CITIES[previousCity.current];
      if (!root || previousCity.current === cityIndex || !before) {
        return;
      }
      previousCity.current = cityIndex;
      const reduced = prefersReducedMotion();
      const q = gsap.utils.selector(root);

      buildRadar(root);
      startSky(root);

      const arrow = root.querySelector<HTMLElement>("[data-wind-arrow]");
      if (reduced) {
        if (arrow) {
          gsap.set(arrow, { rotation: city.wind.direction });
        }
        sun.current.t = city.sunProgress;
        placeSun(root);
        return;
      }

      const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
      const temp = root.querySelector<HTMLElement>("[data-temp]");
      const word = root.querySelector<HTMLElement>("[data-condition]");
      const glyph = root.querySelector<HTMLElement>("[data-big-glyph]");
      const line = root.querySelector<SVGPathElement>("[data-temp-path]");

      // The location and every live number resolve to their new values.
      q<HTMLElement>("[data-live]").forEach((el, i) => resolve(el, Math.min(i * 0.02, 0.4), tl));
      if (temp) {
        tl.fromTo(
          temp,
          { scale: 1.1, transformOrigin: "0% 100%" },
          { scale: 1, duration: 0.5, ease: "power3.out", clearProps: "transform" },
          0,
        );
      }
      if (word) {
        tl.fromTo(
          word,
          { autoAlpha: 0, filter: "blur(18px)", x: -24 },
          { autoAlpha: 1, filter: "blur(0px)", x: 0, duration: 1, ease: "power2.out", clearProps: "filter" },
          0.1,
        );
      }
      if (glyph) {
        const draw = drawStrokes(glyph, { duration: 0.9, stagger: 0.07 });
        if (draw) {
          tl.add(draw, 0.15);
        }
      }
      tl.to(
        sun.current,
        { t: city.sunProgress, duration: 1.2, ease: "power2.inOut", onUpdate: () => placeSun(root) },
        0.2,
      );
      if (arrow) {
        tl.to(arrow, { rotation: city.wind.direction, duration: 1.1, ease: "elastic.out(1, 0.5)" }, 0.3);
      }
      // The line and the bars move to the new day.
      if (line) {
        tl.from(line, { attr: { d: tempPath(before.hourly) }, duration: 0.9, ease: "power3.inOut" }, 0.1);
      }
      q<HTMLElement>("[data-bar]").forEach((bar, i) => {
        tl.from(bar, { height: `${before.hourly[i]?.precip ?? 0}%`, duration: 0.8, ease: "power3.inOut" }, 0.1 + i * 0.01);
      });
      // Each day's range slides to its new place, and the storm day strikes.
      const range = weekRange(before.week);
      q<HTMLElement>("[data-range]").forEach((bar, i) => {
        const day = before.week[i];
        if (day) {
          tl.from(bar, { ...dayBar(day, range), duration: 0.8, ease: "power3.inOut" }, 0.15 + i * 0.03);
        }
      });
      q<HTMLElement>("[data-day][data-storm]").forEach((row) => {
        tl.call(() => strike(row), [], 0.9);
      });
    },
    { scope, dependencies: [cityIndex] },
  );

  /* ------------------------------------------------- radar frames */
  useEffect(() => {
    radar.current?.setFrame(frame);
  }, [frame]);

  useEffect(() => {
    if (!playing) {
      return;
    }
    const step = gsap.delayedCall(FRAME_HOLD, () => {
      setFrame((f) => (f + 1) % RADAR_FRAMES.length);
      step.restart(true);
    });
    return () => {
      step.kill();
    };
  }, [playing]);

  const range = weekRange(city.week);
  const hourlyTemps = city.hourly.map((h) => h.temp);
  const path = tempPath(city.hourly);

  return (
    <div ref={scope} className="@container">
      {/* Persistent chrome */}
      <header
        data-page-transition
        className="sticky top-0 z-30 -mx-gutter border-b border-border bg-canvas px-gutter sm:-mx-gutter-lg sm:px-gutter-lg"
      >
        <div className="flex min-h-14 flex-wrap items-center gap-x-5 gap-y-2 py-2">
          <a
            href="#top"
            className="font-mono text-base font-extrabold uppercase tracking-[0.24em] text-foreground"
          >
            Weather
          </a>
          <span aria-hidden="true" className="hidden h-6 w-px bg-border sm:block" />
          <h1 data-live="upper" className="font-mono text-caption font-bold uppercase tracking-[0.08em]">
            {city.name}
          </h1>
          <button type="button" data-chip className={CHIP_OUTLINE} onClick={() => change.current()}>
            <span data-chip-label>Change</span>
          </button>
          <p className="ml-auto hidden font-mono text-annotation uppercase tracking-[0.08em] text-muted md:block">
            As of <span data-live="digits">{city.asOf}</span> {city.timezone}{" "}
            <span aria-hidden="true">·</span> {city.station}
          </p>
        </div>
        <nav aria-label="Views" className="-mx-gutter overflow-x-auto px-gutter pb-3 lg:hidden">
          <ul className="flex gap-2">
            {CHAPTERS.map((chapter) => (
              <li key={chapter.id}>
                <a data-rail-link data-target={chapter.id} href={`#${chapter.id}`} className={CHIP_RAIL}>
                  <span>{chapter.number}</span>
                  <span>{chapter.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <div className="mt-6 grid grid-cols-12 gap-x-6">
        {/* The rail */}
        <nav
          data-page-transition
          aria-label="Views"
          className="sticky top-24 hidden self-start lg:col-span-2 lg:block"
        >
          <ol data-rail className="relative">
            <span
              data-rail-marker
              aria-hidden="true"
              className="absolute top-0 left-0 h-9 w-full rounded-md bg-inverse"
            />
            {CHAPTERS.map((chapter) => (
              <li key={chapter.id}>
                <a
                  data-rail-link
                  data-chip
                  data-target={chapter.id}
                  href={`#${chapter.id}`}
                  className="relative z-10 flex h-9 items-center gap-4 rounded-md px-3 font-mono text-caption font-bold uppercase tracking-[0.08em] text-muted transition-colors hover:text-foreground data-[active=true]:text-inverse-foreground"
                >
                  <span>{chapter.number}</span>
                  <span data-chip-label>{chapter.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="col-span-12 lg:col-span-10">
          {/* 01 Now */}
          <section id="now" data-chapter className="scroll-mt-24">
            <ChapterHead chapter={CHAPTERS[0]} eager />
            <div data-sky-frame className="relative mt-8">
              <canvas
                data-sky
                aria-hidden="true"
                className="pointer-events-none absolute z-10 text-muted"
                style={{ left: -SKY_BLEED, top: -SKY_BLEED }}
              />
              <div className="grid grid-cols-12 gap-x-6 gap-y-10">
                <div className="col-span-12 lg:col-span-7">
                  <p
                    data-temp
                    data-page-transition="letters"
                    className={`${DISPLAY} -ml-[0.04em] text-[clamp(6rem,26cqi,22rem)] leading-[0.8] tracking-[-0.06em]`}
                  >
                    {`${city.temp}°`}
                  </p>
                  <p
                    data-condition
                    data-arrive
                    className={`${DISPLAY} mt-5 text-[clamp(2.5rem,8cqi,7rem)] text-muted`}
                  >
                    {CONDITION_LABEL[city.condition]}
                  </p>
                  <ul data-arrive="chips" className="mt-8 flex flex-wrap gap-2" aria-label="Today">
                    <li className={CHIP_OUTLINE}>
                      High <span data-live="digits">{`${city.high}°`}</span>
                    </li>
                    <li className={CHIP_OUTLINE}>
                      Low <span data-live="digits">{`${city.low}°`}</span>
                    </li>
                    <li className={CHIP_OUTLINE}>
                      Feels like <span data-live="digits">{`${city.feelsLike}°`}</span>
                    </li>
                    <li className={CHIP_OUTLINE}>
                      Rain <span data-live="digits">{`${city.hourly[0]?.precip ?? 0}%`}</span>
                    </li>
                  </ul>
                </div>

                <div className="col-span-12 lg:col-span-5">
                  <div data-arrive data-big-glyph className="w-full max-w-[13rem] text-foreground sm:max-w-[20rem]">
                    <Glyph
                      key={`${city.id}-${city.condition}`}
                      condition={city.condition}
                      label={CONDITION_LABEL[city.condition]}
                      className="h-auto w-full"
                    />
                  </div>
                  <div data-arrive data-sun className="mt-6 max-w-[16rem] sm:max-w-[20rem]">
                    <svg viewBox="0 0 200 104" aria-hidden="true" className="w-full overflow-visible text-foreground">
                      <path
                        d="M10 95A90 90 0 0 1 190 95"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1"
                        opacity="0.3"
                        vectorEffect="non-scaling-stroke"
                      />
                      <path
                        data-sun-path
                        d="M10 95A90 90 0 0 1 190 95"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        vectorEffect="non-scaling-stroke"
                      />
                      <line x1="0" y1="95" x2="200" y2="95" stroke="currentColor" strokeWidth="1" opacity="0.5" vectorEffect="non-scaling-stroke" />
                      <circle data-sun-dot cx="10" cy="95" r="4" fill="currentColor" />
                    </svg>
                    <div className="mt-2 flex justify-between font-mono text-annotation uppercase tracking-[0.08em] text-muted">
                      <span>
                        Sunrise <span data-live="digits" className="text-foreground">{city.sunrise}</span>
                      </span>
                      <span>
                        Sunset <span data-live="digits" className="text-foreground">{city.sunset}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <dl
                  data-arrive
                  aria-label="Readings"
                  className="col-span-12 grid grid-cols-2 border-t border-border sm:grid-cols-3"
                >
                  {readings(city).map((reading) => (
                    <div
                      key={reading.id}
                      data-reading={reading.id}
                      className="border-b border-border py-5 pr-4"
                    >
                      <Label as="dt">{reading.label}</Label>
                      <dd className="mt-2">
                        <span className="flex items-baseline gap-2">
                          <span data-gust={reading.id === "wind" ? "" : undefined} className={`${READING} inline-block`}>
                            <span data-live="digits">{reading.value}</span>
                          </span>
                          {reading.unit ? (
                            <span data-live="upper" className="font-mono text-caption uppercase tracking-[0.08em] text-muted">
                              {reading.unit}
                            </span>
                          ) : null}
                          {reading.id === "wind" ? (
                            <WindArrow data-wind-arrow className="ml-1 h-7 w-7 self-center text-foreground" />
                          ) : null}
                        </span>
                        <Annotation className="mt-2">
                          <span data-live="upper">{reading.note}</span>
                        </Annotation>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </section>

          {/* 02 Hourly */}
          <section id="hourly" data-chapter className="mt-section scroll-mt-24">
            <ChapterHead chapter={CHAPTERS[1]} />
            <div data-reveal className="mt-8 overflow-x-auto">
              <div className="min-w-[46rem]">
                <div className="flex justify-between font-mono text-annotation uppercase tracking-[0.08em] text-muted">
                  <span>
                    Temperature, next 24 h <span aria-hidden="true">·</span> High{" "}
                    <span data-live="digits" className="text-foreground">{`${Math.max(...hourlyTemps)}°`}</span> Low{" "}
                    <span data-live="digits" className="text-foreground">{`${Math.min(...hourlyTemps)}°`}</span>
                  </span>
                  <span>Bars: chance of rain</span>
                </div>
                <div data-chart className="relative mt-3 h-56 cursor-crosshair border-b border-border">
                  <div className="absolute inset-0 grid grid-cols-24 gap-x-[3px]">
                    {city.hourly.map((hour) => (
                      <div key={hour.hour} className="relative">
                        <div
                          data-bar
                          className="hatch absolute bottom-0 left-0 w-full"
                          style={{ height: `${hour.precip}%` }}
                        />
                      </div>
                    ))}
                  </div>
                  <svg
                    viewBox={`0 0 ${CHART_W} ${CHART_H}`}
                    preserveAspectRatio="none"
                    aria-hidden="true"
                    className="absolute inset-0 h-full w-full overflow-visible text-foreground"
                  >
                    <path
                      data-temp-path
                      d={path}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                  <div data-cursor aria-hidden="true" className="pointer-events-none absolute top-0 left-0 h-full w-px bg-foreground">
                    <span
                      data-readout
                      className="absolute top-2 left-2 whitespace-nowrap bg-canvas px-1 font-mono text-caption font-bold uppercase tracking-[0.08em] data-[side=left]:right-2 data-[side=left]:left-auto"
                    />
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-24 font-mono text-annotation uppercase text-muted">
                  {city.hourly.map((hour, i) => (
                    <span key={hour.hour}>{i % 3 === 0 ? pad(hour.hour) : ""}</span>
                  ))}
                </div>
                <div data-hour-glyphs className="mt-3 grid grid-cols-24 text-foreground">
                  {city.hourly.map((hour) => (
                    <span key={hour.hour} data-hour-icon className="inline-flex origin-center">
                      <Glyph
                        key={`${city.id}-${hour.hour}`}
                        condition={hour.condition}
                        label={CONDITION_LABEL[hour.condition]}
                        className="h-6 w-6"
                      />
                    </span>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-24 font-mono text-caption font-bold">
                  {city.hourly.map((hour) => (
                    <span key={hour.hour} data-hour-temp data-live="digits">
                      {`${hour.temp}°`}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* 03 Week */}
          <section id="week" data-chapter className="mt-section scroll-mt-24">
            <ChapterHead chapter={CHAPTERS[2]} />
            <ol className="mt-8 border-t border-border" aria-label="Seven-day forecast">
              {city.week.map((day) => {
                const bar = dayBar(day, range);
                return (
                  <li
                    key={day.day}
                    data-day
                    data-reveal
                    data-storm={day.condition === "storm" ? "" : undefined}
                    className="grid grid-cols-12 items-center gap-x-4 border-b border-border bg-canvas py-4"
                  >
                    <div className="col-span-4 sm:col-span-2">
                      <span className="block font-sans text-title font-extrabold uppercase tracking-[-0.01em]">
                        {day.day}
                      </span>
                      <span className="font-mono text-annotation uppercase text-muted">{day.date}</span>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <Glyph
                        key={`${city.id}-${day.condition}`}
                        condition={day.condition}
                        label={CONDITION_LABEL[day.condition]}
                        className="h-9 w-9 text-foreground"
                      />
                    </div>
                    <div className="col-span-6 flex items-center gap-3 sm:col-span-7">
                      <span data-live="digits" className="w-8 text-right font-mono text-caption text-muted">
                        {`${day.low}°`}
                      </span>
                      <span className="relative h-6 flex-1 border-b border-border">
                        <span
                          data-range
                          className="absolute bottom-0 h-2 bg-foreground"
                          style={{ left: bar.left, width: bar.width }}
                        />
                      </span>
                      <span data-live="digits" className="w-10 font-sans text-title font-extrabold tracking-[-0.02em]">
                        {`${day.high}°`}
                      </span>
                    </div>
                    <div className="col-span-12 mt-2 flex items-center gap-2 sm:col-span-2 sm:mt-0 sm:justify-end">
                      <span data-live="upper" className="font-mono text-annotation uppercase text-muted">
                        {CONDITION_LABEL[day.condition]}
                      </span>
                      <span data-live="digits" className="font-mono text-caption font-bold">{`${day.precip}%`}</span>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>

          {/* 04 Radar */}
          <section id="radar" data-chapter className="mt-section scroll-mt-24">
            <ChapterHead chapter={CHAPTERS[3]} />
            <div data-reveal data-radar-block className="mt-8">
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Radar time">
                {RADAR_FRAMES.map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    data-chip
                    aria-pressed={frame === index}
                    className={CHIP_TOGGLE}
                    onClick={() => {
                      setPlaying(false);
                      setFrame(index);
                    }}
                  >
                    <span data-chip-label>{label}</span>
                  </button>
                ))}
                <button
                  type="button"
                  data-chip
                  aria-pressed={playing}
                  className={`${CHIP_TOGGLE} ml-auto`}
                  onClick={() => setPlaying((p) => !p)}
                >
                  <span data-chip-label>{playing ? "Pause" : "Play"}</span>
                </button>
              </div>
              <div data-radar-frame className="relative mt-6 aspect-[4/3] overflow-hidden rounded-lg border border-border sm:aspect-[16/9]">
                <canvas
                  data-radar
                  role="img"
                  aria-label={`Precipitation radar around ${city.name}, ${RADAR_FRAMES[frame]}`}
                  className="absolute inset-0 h-full w-full font-mono text-foreground"
                />
                <p className="absolute bottom-3 left-3 font-mono text-annotation uppercase tracking-[0.08em] text-muted">
                  <span data-live="upper">{city.station}</span> <span aria-hidden="true">·</span> 60 mi{" "}
                  <span aria-hidden="true">·</span> {RADAR_FRAMES[frame]}
                  {frame === RADAR_FRAMES.length - 1 ? "" : " min"}
                </p>
                <ul className="absolute right-3 bottom-3 flex items-center gap-3 font-mono text-annotation uppercase tracking-[0.08em] text-muted" aria-label="Legend">
                  <li className="flex items-center gap-1.5">
                    <span aria-hidden="true" className="block h-2.5 w-2.5 bg-foreground opacity-30" /> Light
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span aria-hidden="true" className="block h-2.5 w-2.5 bg-foreground opacity-60" /> Moderate
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span aria-hidden="true" className="block h-2.5 w-2.5 bg-foreground" /> Heavy
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <div data-reveal className="mt-section flex flex-wrap gap-4 border-t border-border pt-10">
            <a className={BUTTON_PRIMARY} href="#top">
              Back to top
            </a>
            <a className={BUTTON_SECONDARY} href="/showcase/animaxxipedia">
              Animaxxipedia
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- pieces */

function ChapterHead({
  chapter,
  eager = false,
}: {
  chapter: (typeof CHAPTERS)[number];
  eager?: boolean;
}) {
  return (
    <div data-page-transition={eager ? "" : undefined} data-reveal={eager ? undefined : ""}>
      <p className="font-mono text-caption uppercase tracking-[0.08em] text-muted">
        {chapter.number} <span aria-hidden="true">/</span> {String(CHAPTERS.length).padStart(2, "0")}
      </p>
      <div data-title-frame>
        <h2 data-title data-arrive className={`${DISPLAY} mt-3 text-[clamp(2.75rem,8.5cqi,7.5rem)]`}>
          {chapter.title}
        </h2>
      </div>
      <span data-rule aria-hidden="true" className="mt-4 block h-px w-full bg-foreground" />
    </div>
  );
}
