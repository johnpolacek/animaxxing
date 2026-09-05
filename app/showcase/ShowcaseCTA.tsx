"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap, prefersReducedMotion, useGSAP } from "@/components/motion";
import { useParticleEffect } from "@/components/motion/particles/useParticleEffect";
import { reactor } from "@/lib/animation/effects/particleButtons";
import { watchPageTransition } from "@/lib/animation/pageState";

export function ShowcaseCTA() {
  const scope = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const controls = useParticleEffect(scope, canvasRef, linkRef, reactor);

  useGSAP(
    (_context, contextSafe) => {
      const root = scope.current;
      if (!root || !contextSafe) return;

      if (prefersReducedMotion()) {
        gsap.set(root, { autoAlpha: 1 });
        return;
      }

      return watchPageTransition(root, {
        onIdle: contextSafe(() => {
          controls.enter();
          gsap.set(root, { autoAlpha: 1 });
        }),
        onExiting: contextSafe(() => controls.exit()),
      });
    },
    { scope },
  );

  return (
    <div ref={scope} data-particle-card className="mt-8 sm:mt-12">
      <span className="relative isolate inline-flex">
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="pointer-events-none absolute -z-10 text-foreground"
          style={{ left: -reactor.bleed, top: -reactor.bleed }}
        />
        <Link
          ref={linkRef}
          href="/animaxx"
          className="inline-flex items-center rounded-lg bg-inverse px-5 py-2.5 font-sans text-3xl font-extrabold uppercase tracking-[-0.02em] text-inverse-foreground transition-colors hover:bg-inverse-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus sm:px-8 sm:py-4 sm:text-5xl"
        >
          Get Animaxxed
        </Link>
      </span>
    </div>
  );
}
