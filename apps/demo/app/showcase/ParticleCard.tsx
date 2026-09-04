"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap, prefersReducedMotion, useGSAP } from "@/components/motion";
import { useParticleEffect } from "@/components/motion/particles/useParticleEffect";
import { Annotation, Label } from "@/components/ui";
import { resolve } from "@/lib/animation/effects/particleCards";
import { watchPageTransition } from "@/lib/animation/pageState";
import type { Demo } from "./demos";

/*
 * One showcase card. It resolves out of particles once the route entrance
 * has settled, staggered by its position in the grid, and winds itself
 * down when the route leaves. The whole card is the link.
 */
const CARD =
  "group block h-full cursor-pointer rounded-lg border-2 border-border bg-surface p-6 transition-colors hover:border-foreground hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus sm:p-8";

/** Seconds between one card starting to resolve and the next. */
const STAGGER = 0.09;

export function ParticleCard({ demo, index }: { demo: Demo; index: number }) {
  const scope = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const controls = useParticleEffect(scope, canvasRef, linkRef, resolve);

  useGSAP(
    () => {
      const root = scope.current;
      if (!root) {
        return;
      }
      if (prefersReducedMotion()) {
        gsap.set(root, { autoAlpha: 1 });
        return;
      }
      return watchPageTransition(root, {
        onIdle: () => {
          // The link hides itself at the start of its entrance; only then is
          // the wrapper released so the canvas can show.
          controls.enter(index * STAGGER);
          gsap.set(root, { autoAlpha: 1 });
        },
        onExiting: () => controls.exit(),
      });
    },
    { scope },
  );

  const number = String(index + 1).padStart(2, "0");

  return (
    <div ref={scope} data-particle-card className="relative isolate h-full">
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute z-10 text-foreground"
        style={{ left: -resolve.bleed, top: -resolve.bleed }}
      />
      <Link ref={linkRef} href={demo.href ?? `/showcase/${demo.slug}`} className={CARD}>
        <div className="flex items-baseline justify-between gap-4">
          <Label>
            {number} · {demo.before}
          </Label>
          {!demo.ready && <Label>Soon</Label>}
        </div>
        <h2 className="mt-8 font-sans text-4xl font-extrabold uppercase tracking-[-0.03em] sm:text-5xl">
          {demo.name}
        </h2>
        <p className="mt-4 max-w-[36ch] font-sans text-body text-muted text-pretty">{demo.blurb}</p>
        <Annotation className="mt-8 text-foreground">
          {demo.cta ?? (demo.ready ? "Enter" : "Preview")} →
        </Annotation>
      </Link>
    </div>
  );
}
