"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP } from "@/components/motion";
import { useParticleEffect } from "@/components/motion/particles/useParticleEffect";
import { marquee, reactor } from "@/lib/animation/effects/particleButtons";
import { watchPageTransition } from "@/lib/animation/pageState";

export function BoardAction({ href, className, primary, children }: {
  href: string; className: string; primary?: boolean; children: ReactNode;
}) {
  const scope = useRef<HTMLSpanElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const link = useRef<HTMLAnchorElement>(null);
  const effect = primary ? reactor : marquee;
  const controls = useParticleEffect(scope, canvas, link, effect);
  useGSAP((_context, contextSafe) => {
    const root = scope.current;
    if (!root || !contextSafe) return;
    return watchPageTransition(root, {
      onIdle: contextSafe(() => { controls.enter(); gsap.set(root, { autoAlpha: 1 }); }),
      onExiting: contextSafe(() => controls.exit()),
    });
  }, { scope });
  return (
    <span ref={scope} data-particle-card className="relative isolate inline-flex">
      <canvas ref={canvas} aria-hidden="true"
        className={`pointer-events-none absolute text-foreground ${primary ? "-z-10" : "z-10"}`}
        style={{ left: -effect.bleed, top: -effect.bleed }} />
      <a ref={link} href={href} className={className}>{children}</a>
    </span>
  );
}
