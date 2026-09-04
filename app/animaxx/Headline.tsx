"use client";

import { useRef } from "react";
import { gsap, prefersReducedMotion, useGSAP } from "@/components/motion";
import { useParticleEffect } from "@/components/motion/particles/useParticleEffect";
import { aura } from "@/lib/animation/effects/particleAura";
import { startWave } from "@/lib/animation/effects/wave";
import { watchPageTransition } from "@/lib/animation/pageState";

/*
 * The headline. Its letters scatter in with the route entrance; as they land
 * an aura of motes and glints starts up around them, and once the page has
 * settled the letters wave.
 */

/** Seconds after the route entrance starts before the aura lights. The letters land from 0.75. */
const AURA_DELAY = 1.2;
const WAVE_PERIOD = 2;
/** Milliseconds after a resize before the wave starts again, when the page did not replay. Longer than the page's own settle. */
const WAVE_RESTART = 450;

const HEADLINE =
  "font-sans text-[clamp(3rem,11cqi,10rem)] font-extrabold uppercase leading-[0.84] tracking-[-0.045em] text-balance [margin-inline-start:-0.055em]";

export function Headline({ children }: { children: string }) {
  const scope = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const controls = useParticleEffect(scope, canvasRef, headingRef, aura);

  useGSAP(
    () => {
      const heading = headingRef.current;
      if (!heading || prefersReducedMotion()) {
        return;
      }
      let stopWave = () => {};
      let idle = false;
      let restart: number | undefined;
      // The wave pins each letter to a pixel width. The moment the headline
      // is resized those widths are wrong, so hand the letters back and let
      // the type reflow. A settled resize replays the whole page; a smaller
      // one does not, so the wave starts again on its own after a beat.
      const scopeWidth = scope.current?.offsetWidth ?? 0;
      const resize = new ResizeObserver((entries) => {
        if (Math.abs((entries[0]?.contentRect.width ?? scopeWidth) - scopeWidth) < 1) {
          return;
        }
        stopWave();
        stopWave = () => {};
        window.clearTimeout(restart);
        restart = window.setTimeout(() => {
          if (idle) {
            stopWave = startWave(heading, { period: WAVE_PERIOD });
          }
        }, WAVE_RESTART);
      });
      if (scope.current) {
        resize.observe(scope.current);
      }
      const unwatch = watchPageTransition(heading, {
        onEntering: () => controls.enter(AURA_DELAY),
        onIdle: () => {
          idle = true;
          stopWave = startWave(heading, { period: WAVE_PERIOD });
        },
        onExiting: () => {
          idle = false;
          window.clearTimeout(restart);
          stopWave();
          stopWave = () => {};
          controls.exit();
          // The route outro owns the letters; put the heading back for it.
          gsap.set(heading, { clearProps: "opacity,visibility" });
        },
      });
      return () => {
        resize.disconnect();
        window.clearTimeout(restart);
        stopWave();
        unwatch();
      };
    },
    { scope },
  );

  return (
    <div ref={scope} className="relative isolate">
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute -z-10 text-foreground"
        style={{ left: -aura.bleed, top: -aura.bleed }}
      />
      <h1 ref={headingRef} data-page-transition="letters" className={HEADLINE}>
        {children}
      </h1>
    </div>
  );
}
