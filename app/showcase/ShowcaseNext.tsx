"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, type MouseEvent } from "react";
import { gsap, prefersReducedMotion, useGSAP } from "@/components/motion";
import { useParticleEffect } from "@/components/motion/particles/useParticleEffect";
import { useLook } from "@/components/theme/LookProvider";
import { slipstream } from "@/lib/animation/effects/slipstream";
import { watchPageTransition } from "@/lib/animation/pageState";
import { nextDemo } from "./demos";

/*
 * The way on to the next demo. It rides in on a slipstream once the route
 * entrance has settled, winds down when the route leaves, and when pressed
 * it launches off to the right while the route exit clears the rest.
 */
const BUTTON =
  "inline-flex cursor-pointer items-center gap-3 rounded-lg border-2 border-border bg-surface px-4 py-2 font-mono text-caption uppercase text-muted transition-colors hover:border-foreground hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus";
/* 1997: the same bevel as Replay, with a >> that will not stop blinking. */
const WEB_BUTTON =
  "web-navbtn inline-flex cursor-pointer items-center gap-2 no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";

/** How far, in px, the button launches on its way out. */
const LAUNCH = 64;

export function ShowcaseNext({ slug }: { slug?: string | undefined }) {
  // The slug is read once: while the route transition holds the old page,
  // the pathname has already moved on, and the button must not follow it.
  const pathname = usePathname();
  const earlyweb = useLook() === "earlyweb";
  const [demo] = useState(() => nextDemo(slug ?? pathname.split("/")[2] ?? ""));
  const scope = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const controls = useParticleEffect(scope, canvasRef, linkRef, slipstream);
  const departing = useRef(false);

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
          departing.current = false;
          // The link hides itself at the start of its entrance; only then is
          // the wrapper released so the canvas can show.
          controls.enter();
          gsap.set(root, { autoAlpha: 1 });
        },
        onExiting: () => {
          // A press has already seen the button out; leave it that way.
          if (!departing.current) {
            controls.exit();
          }
        },
      });
    },
    { scope },
  );

  const launch = (event: MouseEvent) => {
    const link = linkRef.current;
    const modified = event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
    if (!link || modified || event.button !== 0 || departing.current || prefersReducedMotion()) {
      return;
    }
    departing.current = true;
    controls.blast();
    gsap.to(link, { x: LAUNCH, autoAlpha: 0, duration: 0.3, ease: "power3.in", overwrite: "auto" });
  };

  if (!demo) {
    return null;
  }

  return (
    <div ref={scope} data-showcase-next className="relative isolate">
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute z-10 text-foreground"
        style={{ left: -slipstream.bleed, top: -slipstream.bleed }}
      />
      <Link
        ref={linkRef}
        href={`/showcase/${demo.slug}`}
        className={earlyweb ? WEB_BUTTON : BUTTON}
        onClick={launch}
      >
        <span>Next</span>
        <span aria-hidden="true" className={earlyweb ? "web-blink" : undefined}>
          {earlyweb ? ">>" : "→"}
        </span>
      </Link>
    </div>
  );
}
