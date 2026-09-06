"use client";

import { gsap, prefersReducedMotion, ScrollTrigger, SplitText } from "@/components/motion";

/*
 * Ukiyo-e.
 *
 * The motion vocabulary of the ukiyo-e look, all of it from the printing
 * studio and the sea it kept printing. A print is pulled one colour block
 * at a time, each block landing a hair out of register before it snaps
 * home; headings are painted rather than typed; a hanko is brought down
 * hard and rocks back; vertical text pours down its column; cartouches and
 * skies unroll from the top; the wave rises out of the bottom of the sheet,
 * curls, and throws foam; the octopus never stops moving; rain falls
 * through the sky band; and the whole sea floods the page on the way out.
 *
 * SVG-driven effects find their parts by data attribute, so the markup can
 * be lifted straight from the exploration and only annotated:
 *
 *   [data-wave-layer]   the three flat water bands, back to front
 *   [data-wave-crest]   the crest paths, back to front
 *   [data-wave-foam]    the foam circles and the drawn foam lines
 *   [data-arm]          one octopus arm
 *   [data-mantle]       the octopus head
 *   [data-eye]          an eye
 *   [data-sucker]       one sucker circle
 *
 * Everything sequenced takes `(timeline, target, at, options)` so a hero or
 * an article can compose the same phrases at different times. Everything
 * ambient takes its element and returns a tween, a timeline, or a kill
 * function, and the caller kills it on exit. Effects that split text return
 * the SplitText so the caller can revert it before the page leaves.
 */

type At = number | string;

/* ------------------------------------------------------------ the press */

/**
 * The plates of a print are pressed one at a time. Each block arrives hard
 * and a couple of pixels out of register, then snaps square, and the key
 * (ink) block — last in the list — lands last, as it does on the bench.
 */
export function registerBlocks(
  timeline: gsap.core.Timeline,
  layers: gsap.TweenTarget,
  at: At,
  {
    duration = 0.12,
    stagger = 0.28,
    offset = 3,
    settle = 0.5,
  }: { duration?: number; stagger?: number; offset?: number; settle?: number } = {},
): void {
  // A nested timeline, so every step is placed against the press itself
  // rather than against whatever the caller has already built.
  const press = gsap.timeline();
  press
    .fromTo(
      layers,
      {
        autoAlpha: 0,
        x: () => gsap.utils.random(-offset, offset, 1),
        y: () => gsap.utils.random(-offset, offset, 1),
        willChange: "transform, opacity",
      },
      { autoAlpha: 1, duration, ease: "none", stagger },
      0,
    )
    .to(layers, { x: 0, y: 0, duration: settle, ease: "power4.out", stagger }, duration)
    .set(layers, { clearProps: "transform,willChange" }, ">");
  timeline.add(press, at);
}

/**
 * A heading is painted: each stroke arrives wet and out of focus and dries
 * into place. Returns the split so the caller can revert it.
 */
export function brushIn(
  timeline: gsap.core.Timeline,
  el: HTMLElement,
  at: At,
  { duration = 0.5, each = 0.04 }: { duration?: number; each?: number } = {},
): SplitText {
  const split = SplitText.create(el, { type: "words,chars", aria: "auto" });
  gsap.set(el, { autoAlpha: 1 });
  timeline
    .fromTo(
      split.chars,
      {
        opacity: 0,
        scale: 1.12,
        y: 6,
        filter: "blur(6px)",
        transformOrigin: "center bottom",
        willChange: "transform, opacity, filter",
      },
      {
        opacity: 1,
        scale: 1,
        y: 0,
        filter: "blur(0px)",
        duration,
        ease: "power3.out",
        stagger: each,
      },
      at,
    )
    .set(split.chars, { clearProps: "filter,willChange" }, ">");
  return split;
}

/**
 * A hanko is stamped: it comes down turned and oversized, hits the paper,
 * squashes, and rocks back to its resting −2°. The ink bleed is a red halo
 * that flares under the seal and fades.
 */
export function sealStamp(
  timeline: gsap.core.Timeline,
  targets: gsap.TweenTarget,
  at: At,
  {
    duration = 0.35,
    stagger = 0.12,
    rotate = -2,
    from = 1.7,
    fromRotate = -14,
    bleed = true,
  }: {
    duration?: number;
    stagger?: number;
    rotate?: number;
    from?: number;
    fromRotate?: number;
    bleed?: boolean;
  } = {},
): void {
  const stamp = gsap.timeline();
  stamp
    .fromTo(
      targets,
      {
        autoAlpha: 0,
        scale: from,
        rotation: fromRotate,
        transformOrigin: "center center",
        willChange: "transform, opacity",
      },
      { autoAlpha: 1, scale: 1, rotation: rotate, duration, ease: "power4.in", stagger },
      0,
    )
    .to(targets, { scale: 0.94, duration: 0.07, ease: "power2.out", stagger }, duration)
    .to(targets, { scale: 1, duration: 0.4, ease: "elastic.out(1, 0.45)", stagger }, duration + 0.07);
  if (bleed) {
    // The ink squeezes out from under the stone as it lands, and soaks in.
    stamp
      .fromTo(
        targets,
        { filter: "drop-shadow(0 0 0px rgba(194, 59, 42, 0.75))" },
        { filter: "drop-shadow(0 0 9px rgba(194, 59, 42, 0))", duration: 0.7, ease: "power2.out", stagger },
        duration,
      )
      .set(targets, { clearProps: "filter" }, ">");
  }
  stamp.set(targets, { clearProps: "willChange" }, ">");
  timeline.add(stamp, at);
}

/**
 * Vertical text: the characters drop down the column one after another and
 * overshoot a hair, the way a brush lands. Returns the split to revert.
 */
export function pourDown(
  timeline: gsap.core.Timeline,
  el: HTMLElement,
  at: At,
  { duration = 0.45, each = 0.035 }: { duration?: number; each?: number } = {},
): SplitText {
  const split = SplitText.create(el, { type: "words,chars", aria: "auto" });
  gsap.set(el, { autoAlpha: 1 });
  timeline
    .fromTo(
      split.chars,
      { autoAlpha: 0, y: "-0.5em", willChange: "transform, opacity" },
      { autoAlpha: 1, y: 0, duration, ease: "back.out(1.4)", stagger: each },
      at,
    )
    .set(split.chars, { clearProps: "willChange" }, ">");
  return split;
}

/** A cartouche, a scroll, or a panel unrolls downward from its top edge. */
export function unroll(
  timeline: gsap.core.Timeline,
  el: gsap.TweenTarget,
  at: At,
  { duration = 0.9, stagger = 0 }: { duration?: number; stagger?: number } = {},
): void {
  timeline
    .fromTo(
      el,
      { autoAlpha: 1, clipPath: "inset(0 0 100% 0)", willChange: "clip-path" },
      { clipPath: "inset(0% 0% 0% 0%)", duration, ease: "power3.inOut", stagger },
      at,
    )
    .set(el, { clearProps: "clipPath,willChange" }, ">");
}

/**
 * Bokashi: the graded sky is wiped in from the top, the way the printer
 * wipes the pigment across the block before every pull.
 */
export function bokashiIn(
  timeline: gsap.core.Timeline,
  el: gsap.TweenTarget,
  at: At,
  { duration = 1.4 }: { duration?: number } = {},
): void {
  timeline
    .fromTo(
      el,
      { autoAlpha: 0, clipPath: "inset(0 0 100% 0)", willChange: "clip-path, opacity" },
      { autoAlpha: 1, clipPath: "inset(0% 0% 0% 0%)", duration, ease: "sine.out" },
      at,
    )
    .set(el, { clearProps: "clipPath,willChange" }, ">");
}

/* -------------------------------------------------------------- the sea */

/**
 * The wave rises: the flat water bands come up from below the sheet one
 * after another, then the crest grows out of them, then the foam pops from
 * the curl outward.
 */
export function waveRise(
  timeline: gsap.core.Timeline,
  svgRoot: SVGSVGElement | HTMLElement,
  at: At,
  { duration = 1.1, stagger = 0.14 }: { duration?: number; stagger?: number } = {},
): void {
  const layers = gsap.utils.toArray<SVGElement>("[data-wave-layer]", svgRoot);
  const crests = gsap.utils.toArray<SVGElement>("[data-wave-crest]", svgRoot);
  const foam = gsap.utils.toArray<SVGElement>("[data-wave-foam]", svgRoot);

  gsap.set(svgRoot, { autoAlpha: 1 });
  const rise = gsap.timeline();
  if (layers.length > 0) {
    rise
      .fromTo(
        layers,
        { yPercent: 100, autoAlpha: 1, willChange: "transform" },
        { yPercent: 0, duration, ease: "power3.out", stagger },
        0,
      )
      .set(layers, { clearProps: "willChange" }, ">");
  }
  if (crests.length > 0) {
    // A crest may be printed lighter (an `opacity` attribute); it comes back to that, not to solid.
    rise
      .fromTo(
        crests,
        { scale: 0.6, autoAlpha: 0, transformOrigin: "left bottom", willChange: "transform, opacity" },
        {
          scale: 1,
          visibility: "inherit",
          opacity: (_index, crest: Element) => Number(crest.getAttribute("data-opacity") ?? crest.getAttribute("opacity") ?? 1),
          duration: 0.9,
          ease: "back.out(1.1)",
          stagger: 0.1,
        },
        duration * 0.55,
      )
      .set(crests, { clearProps: "willChange" }, ">");
  }
  if (foam.length > 0) {
    rise.fromTo(
      foam,
      { scale: 0, autoAlpha: 0, transformOrigin: "center center" },
      { scale: 1, autoAlpha: 1, duration: 0.35, ease: "back.out(2.4)", stagger: 0.02 },
      duration * 0.9,
    );
  }
  timeline.add(rise, at);
}

/**
 * The sea never stops: the bands slide sideways at their own periods, the
 * crest breathes, and the foam twinkles. Returns the loop to kill on exit.
 */
export function waveDrift(svgRoot: SVGSVGElement | HTMLElement): gsap.core.Timeline {
  const timeline = gsap.timeline();
  const layers = gsap.utils.toArray<SVGElement>("[data-wave-layer]", svgRoot);
  const crests = gsap.utils.toArray<SVGElement>("[data-wave-crest]", svgRoot);
  const foam = gsap.utils.toArray<SVGElement>("[data-wave-foam]", svgRoot);

  // The bands are widened a hair first, so their sideways drift never
  // uncovers the sheet at either edge of the print.
  gsap.set(layers, { scaleX: 1.05, transformOrigin: "center bottom" });
  layers.forEach((layer, index) => {
    timeline.to(
      layer,
      {
        x: 8 + index * 6,
        duration: 5 + index * 1.6,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      },
      index * 0.4,
    );
  });
  if (crests.length > 0) {
    timeline.to(
      crests,
      {
        scaleY: 1.03,
        transformOrigin: "left bottom",
        duration: 3.4,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        stagger: 0.2,
      },
      0,
    );
  }
  if (foam.length > 0) {
    timeline.to(
      foam,
      {
        opacity: 0.45,
        duration: 1.1,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        stagger: { each: 0.09, from: "random" },
      },
      0,
    );
  }
  return timeline;
}

/* --------------------------------------------------------- the octopus */

/**
 * The octopus loop: every arm rocks about the mantle at its own period, the
 * head breathes, the eyes blink now and then, and the whole animal floats.
 * Returns the loop to kill on exit.
 */
export function armsSway(svgRoot: SVGSVGElement | HTMLElement): gsap.core.Timeline {
  const timeline = gsap.timeline();
  const arms = gsap.utils.toArray<SVGElement>("[data-arm]", svgRoot);
  const mantle = gsap.utils.toArray<SVGElement>("[data-mantle]", svgRoot);
  const eyes = gsap.utils.toArray<SVGElement>("[data-eye]", svgRoot);

  arms.forEach((arm, index) => {
    const swing = 3 + (index % 3);
    timeline.fromTo(
      arm,
      { rotation: -swing, transformOrigin: "50% 20%" },
      {
        rotation: swing,
        duration: 3.2 + index * 0.33,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      },
      index * 0.18,
    );
  });
  if (mantle.length > 0) {
    timeline.to(
      mantle,
      { scale: 1.02, transformOrigin: "50% 60%", duration: 2.6, ease: "sine.inOut", yoyo: true, repeat: -1 },
      0,
    );
  }
  if (eyes.length > 0) {
    // A blink is quick and irregular. It is its own little timeline so the
    // wait comes between blinks, not between the lids closing and opening,
    // and the wait is redrawn every time round.
    const blink = gsap.timeline({ repeat: -1, repeatDelay: gsap.utils.random(4, 7) });
    blink
      .to(eyes, { scaleY: 0.1, transformOrigin: "50% 50%", duration: 0.08, ease: "power2.in" })
      .to(eyes, { scaleY: 1, duration: 0.12, ease: "power2.out" });
    blink.eventCallback("onRepeat", () => blink.repeatDelay(gsap.utils.random(4, 7)));
    timeline.add(blink, 1.5);
  }
  timeline.to(
    svgRoot,
    { y: 8, duration: 4.5, ease: "sine.inOut", yoyo: true, repeat: -1 },
    0,
  );
  return timeline;
}

/** Suckers pop in along each arm, from the mantle outward. */
export function suckersPop(
  timeline: gsap.core.Timeline,
  svgRoot: SVGSVGElement | HTMLElement,
  at: At,
  { each = 0.015 }: { each?: number } = {},
): void {
  const suckers = gsap.utils.toArray<SVGElement>("[data-sucker]", svgRoot);
  if (suckers.length === 0) {
    return;
  }
  timeline.fromTo(
    suckers,
    { scale: 0, autoAlpha: 0, transformOrigin: "center center" },
    { scale: 1, autoAlpha: 1, duration: 0.3, ease: "back.out(2)", stagger: each },
    at,
  );
}

/* ------------------------------------------------------------ the page */

/** A watermark kanji spreads out of the paper the way a drop of ink does. */
export function inkDrop(
  timeline: gsap.core.Timeline,
  el: gsap.TweenTarget,
  at: At,
  { duration = 1.2, opacity = 0.14 }: { duration?: number; opacity?: number } = {},
): void {
  timeline
    .fromTo(
      el,
      { autoAlpha: 0, clipPath: "circle(0% at 50% 50%)", willChange: "clip-path, opacity" },
      { autoAlpha: opacity, clipPath: "circle(75% at 50% 50%)", duration, ease: "power2.out" },
      at,
    )
    .set(el, { clearProps: "clipPath,willChange" }, ">");
}

/** Prose arrives a line at a time. Returns the split so the caller can revert it. */
export function linesRise(
  timeline: gsap.core.Timeline,
  el: HTMLElement,
  at: At,
  { duration = 0.6, each = 0.07, y = 18 }: { duration?: number; each?: number; y?: number } = {},
): SplitText {
  const split = SplitText.create(el, { type: "lines", aria: "auto" });
  gsap.set(el, { autoAlpha: 1 });
  timeline
    .fromTo(
      split.lines,
      { autoAlpha: 0, y, willChange: "transform, opacity" },
      { autoAlpha: 1, y: 0, duration, ease: "power3.out", stagger: each },
      at,
    )
    .set(split.lines, { clearProps: "willChange" }, ">");
  return split;
}

/** A wave divider or a rule draws itself, one continuous stroke. */
export function strokeDraw(
  timeline: gsap.core.Timeline,
  path: SVGPathElement | SVGPathElement[],
  at: At,
  { duration = 1.2, stagger = 0.12 }: { duration?: number; stagger?: number } = {},
): void {
  const paths = Array.isArray(path) ? path : [path];
  if (paths.length === 0) {
    return;
  }
  for (const one of paths) {
    const length = one.getTotalLength();
    gsap.set(one, { strokeDasharray: length, strokeDashoffset: length, autoAlpha: 1 });
  }
  timeline
    .to(paths, { strokeDashoffset: 0, duration, ease: "power2.inOut", stagger }, at)
    .set(paths, { clearProps: "strokeDasharray,strokeDashoffset" }, ">");
}

/**
 * A fact's numeral counts up and the brush lifts off it at the end: the
 * figure swells a little as the last digit lands and settles back.
 */
export function countBrush(
  timeline: gsap.core.Timeline,
  el: HTMLElement,
  at: At,
  { to, duration = 1.1 }: { to: string; duration?: number },
): void {
  const decimals = (to.split(".")[1] ?? "").length;
  const target = Number.parseFloat(to);
  if (Number.isNaN(target)) {
    return;
  }
  const counter = { n: 0 };
  const count = gsap.timeline();
  count
    .to(
      counter,
      {
        n: target,
        duration,
        ease: "power2.out",
        onUpdate: () => {
          el.textContent = counter.n.toFixed(decimals);
        },
        onComplete: () => {
          el.textContent = to;
        },
      },
      0,
    )
    .fromTo(
      el,
      { scale: 1.15, transformOrigin: "left bottom" },
      { scale: 1, duration: 0.45, ease: "back.out(1.6)" },
      duration - 0.2,
    );
  timeline.add(count, at);
}

/* ------------------------------------------------------------- ambient */

/**
 * Hiroshige rain: a small pool of thin ink lines falling on a steep slant
 * through the sky. It builds its own layer inside `root` and takes it away
 * again, so nothing has to be in the markup. Returns the kill function.
 *
 * `root` must be positioned and clipped: rain belongs in the sky band, and
 * never over text.
 */
export function rain(
  root: HTMLElement,
  { count = 24, colors = ["var(--ukiyoe-mizu)", "var(--ukiyoe-indigo)"] }: { count?: number; colors?: string[] } = {},
): () => void {
  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  layer.dataset.ukiyoeRain = "";
  layer.style.cssText = "position:absolute;inset:0;overflow:hidden;pointer-events:none;";
  root.appendChild(layer);

  const drops: HTMLElement[] = [];
  const tweens: gsap.core.Tween[] = [];
  for (let index = 0; index < count; index += 1) {
    const drop = document.createElement("i");
    drop.style.cssText = [
      "position:absolute",
      "top:0",
      "left:0",
      "width:1px",
      `height:${gsap.utils.random(40, 90, 1)}px`,
      `background:${colors[index % colors.length]}`,
      `opacity:${gsap.utils.random(0.18, 0.42, 0.01)}`,
    ].join(";");
    layer.appendChild(drop);
    drops.push(drop);
  }

  // A 78° fall is 12° off vertical; each line recycles from above the band.
  const height = () => root.getBoundingClientRect().height || 400;
  for (const [index, drop] of drops.entries()) {
    tweens.push(
      gsap.fromTo(
        drop,
        {
          rotation: 12,
          transformOrigin: "top center",
          x: () => gsap.utils.random(-40, root.offsetWidth + 40, 1),
          y: () => -gsap.utils.random(40, 200, 1),
        },
        {
          y: () => height() + 120,
          x: `+=${gsap.utils.random(40, 90, 1)}`,
          duration: gsap.utils.random(0.9, 1.6, 0.01),
          ease: "none",
          repeat: -1,
          repeatRefresh: true,
          delay: (index / count) * 1.4,
        },
      ),
    );
  }

  return () => {
    for (const tween of tweens) {
      tween.kill();
    }
    layer.remove();
  };
}

/**
 * Pointer parallax: the print leans toward the pointer, the layers behind
 * it further than the ones in front. Each layer's `data-depth` multiplies
 * the travel. Returns the cleanup.
 */
export function parallax(root: HTMLElement, layers: HTMLElement[], travel = 24): () => void {
  const movers = layers.map((layer) => {
    const depth = Number.parseFloat(layer.dataset.depth ?? "1");
    return {
      x: gsap.quickTo(layer, "x", { duration: 0.9, ease: "power3.out" }),
      y: gsap.quickTo(layer, "y", { duration: 0.9, ease: "power3.out" }),
      depth,
    };
  });
  const onMove = (event: PointerEvent) => {
    const bounds = root.getBoundingClientRect();
    const nx = ((event.clientX - bounds.left) / bounds.width - 0.5) * 2;
    const ny = ((event.clientY - bounds.top) / bounds.height - 0.5) * 2;
    for (const mover of movers) {
      mover.x(nx * travel * mover.depth);
      mover.y(ny * travel * mover.depth);
    }
  };
  const onLeave = () => {
    for (const mover of movers) {
      mover.x(0);
      mover.y(0);
    }
  };
  root.addEventListener("pointermove", onMove);
  root.addEventListener("pointerleave", onLeave);
  return () => {
    root.removeEventListener("pointermove", onMove);
    root.removeEventListener("pointerleave", onLeave);
  };
}

/* --------------------------------------------------------------- hover */

/** A seal rocks under the pointer, as if it were about to be pressed again. */
export function sealWobble(el: HTMLElement, { rotate = 4, scale = 1.06 }: { rotate?: number; scale?: number } = {}): () => void {
  const enter = () => {
    gsap
      .timeline({ overwrite: "auto" })
      .to(el, { rotation: -2 - rotate, scale, duration: 0.16, ease: "power2.out", transformOrigin: "center center" })
      .to(el, { rotation: -2 + rotate, duration: 0.18, ease: "sine.inOut" })
      .to(el, { rotation: -2, duration: 0.6, ease: "elastic.out(1, 0.35)" });
  };
  const leave = () => {
    gsap.to(el, { rotation: -2, scale: 1, duration: 0.4, ease: "power3.out", overwrite: "auto" });
  };
  el.addEventListener("pointerenter", enter);
  el.addEventListener("pointerleave", leave);
  el.addEventListener("focus", enter);
  el.addEventListener("blur", leave);
  return () => {
    el.removeEventListener("pointerenter", enter);
    el.removeEventListener("pointerleave", leave);
    el.removeEventListener("focus", enter);
    el.removeEventListener("blur", leave);
    gsap.killTweensOf(el);
  };
}

/**
 * The block lifts off the paper: it rises two pixels and its hard offset
 * shadow opens from 4px to 6px, as if the light had moved.
 */
export function paperShift(el: HTMLElement, { lift = 2, from = 4, to = 6 }: { lift?: number; from?: number; to?: number } = {}): () => void {
  const shadow = (size: number) => `${size}px ${size}px 0 var(--ukiyoe-sumi)`;
  const enter = () => {
    gsap.to(el, { x: -lift, y: -lift, boxShadow: shadow(to), duration: 0.22, ease: "power3.out", overwrite: "auto" });
  };
  const leave = () => {
    gsap.to(el, { x: 0, y: 0, boxShadow: shadow(from), duration: 0.3, ease: "power3.out", overwrite: "auto" });
  };
  el.addEventListener("pointerenter", enter);
  el.addEventListener("pointerleave", leave);
  el.addEventListener("focus", enter);
  el.addEventListener("blur", leave);
  return () => {
    el.removeEventListener("pointerenter", enter);
    el.removeEventListener("pointerleave", leave);
    el.removeEventListener("focus", enter);
    el.removeEventListener("blur", leave);
    gsap.killTweensOf(el);
  };
}

/* --------------------------------------------------------------- scroll */

/**
 * A scene plays once, as it arrives. The timeline is built at the moment it
 * enters, so any SplitText inside it is cut against the layout the reader
 * actually has. Under reduced motion the scene is built and jumped to its
 * end as soon as it is on screen at all.
 */
export function registerScene(
  el: HTMLElement,
  build: (timeline: gsap.core.Timeline) => void,
): ScrollTrigger {
  const reduced = prefersReducedMotion();
  return ScrollTrigger.create({
    trigger: el,
    start: reduced ? "top bottom" : "top 80%",
    once: true,
    onEnter: () => {
      const timeline = gsap.timeline();
      build(timeline);
      if (reduced) {
        timeline.progress(1);
      }
    },
  });
}

/**
 * A chapter numeral drifts against the scroll: it starts `distance` percent
 * below where it sits and ends the same distance above, scrubbed. Returns
 * the tween; its `scrollTrigger` is the one to kill on exit.
 */
export function driftAgainstScroll(el: HTMLElement, distance = 18): gsap.core.Tween {
  return gsap.fromTo(
    el,
    { yPercent: distance },
    {
      yPercent: -distance,
      ease: "none",
      scrollTrigger: {
        trigger: el.closest<HTMLElement>("[data-scene]") ?? el,
        start: "top bottom",
        end: "bottom top",
        scrub: 0.6,
      },
    },
  );
}

/* ---------------------------------------------------------------- outro */

/**
 * The flood: the sea rises until it has covered the sheet. The wave SVG
 * climbs the viewport and grows, and a full-bleed indigo block follows the
 * crest up so the page ends in flat colour. The route hands off about half
 * way through. Returns the timeline.
 */
export function waveFlood(
  waves: SVGSVGElement | HTMLElement,
  flood: HTMLElement,
  {
    duration = 0.9,
    floodAt = duration * 0.1,
    floodDuration = duration * 0.85,
    type,
  }: { duration?: number; floodAt?: number; floodDuration?: number; type?: gsap.TweenTarget } = {},
): gsap.core.Timeline {
  const timeline = gsap.timeline();
  timeline
    .set(flood, { autoAlpha: 1, yPercent: 100 }, 0)
    .to(
      waves,
      {
        yPercent: -100,
        scaleY: 2.4,
        transformOrigin: "center bottom",
        duration,
        ease: "power3.in",
        overwrite: "auto",
      },
      0,
    )
    .to(flood, { yPercent: 0, duration: floodDuration, ease: "power2.in", overwrite: "auto" }, floodAt);
  if (type) {
    timeline.to(
      type,
      { y: -30, autoAlpha: 0, duration: duration * 0.6, ease: "power3.in", stagger: 0.04, overwrite: "auto" },
      0,
    );
  }
  return timeline;
}

/* ---- hero additions ---- */

/**
 * A block is laid on the sheet: it comes down the last few millimetres and
 * takes. The plainest entrance in the vocabulary, for the pieces that are
 * neither painted, poured, nor stamped — buttons, captions, plates.
 */
export function blockIn(
  timeline: gsap.core.Timeline,
  targets: gsap.TweenTarget,
  at: At,
  { y = 14, duration = 0.5, stagger = 0.12 }: { y?: number; duration?: number; stagger?: number } = {},
): void {
  timeline
    .fromTo(
      targets,
      { autoAlpha: 0, y, willChange: "transform, opacity" },
      { autoAlpha: 1, y: 0, duration, ease: "power3.out", stagger },
      at,
    )
    .set(targets, { clearProps: "willChange" }, ">");
}

/**
 * A beni rule is drawn under a word, left to right, the way the printer runs
 * a straight edge along it. The rule is the element's own background, so it
 * survives a SplitText cut and breaks with the line.
 */
export function underlineDraw(
  timeline: gsap.core.Timeline,
  targets: gsap.TweenTarget,
  at: At,
  { duration = 0.5, stagger = 0.12, weight = 2 }: { duration?: number; stagger?: number; weight?: number } = {},
): void {
  timeline.fromTo(
    targets,
    { backgroundSize: `0% ${weight}px` },
    { backgroundSize: `100% ${weight}px`, duration, ease: "power2.out", stagger },
    at,
  );
}

/**
 * The sun keeps its heat: a faint beni halo opens and closes around the disc,
 * slowly enough to be felt rather than watched. Returns the loop to kill.
 */
export function haloPulse(
  el: gsap.TweenTarget,
  { size = 14, duration = 3.4, color = "rgba(194, 59, 42, 0.18)" }: { size?: number; duration?: number; color?: string } = {},
): gsap.core.Tween {
  return gsap.fromTo(
    el,
    { boxShadow: `0 0 0 0 ${color}` },
    { boxShadow: `0 0 0 ${size}px ${color}`, duration, ease: "sine.inOut", yoyo: true, repeat: -1 },
  );
}

/**
 * A piece floats on the sheet: a few pixels up and down, forever, the way a
 * watermark seems to when the paper is turned in the light.
 */
export function floatY(
  el: gsap.TweenTarget,
  { distance = 6, duration = 5 }: { distance?: number; duration?: number } = {},
): gsap.core.Tween {
  return gsap.fromTo(
    el,
    { y: -distance },
    { y: distance, duration, ease: "sine.inOut", yoyo: true, repeat: -1 },
  );
}
