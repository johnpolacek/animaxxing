"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/components/motion";
import { filmGrit } from "@/lib/animation/effects/filmGrit";

/*
 * The print's wear, laid over the whole page behind the content: shifting
 * grain, a scratch now and then, a fleck of dust. It sits below everything
 * in the stacking order so the frame, type, and chrome read over it.
 */
export function CinematicGrit() {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current;
    if (!el) {
      return;
    }
    const grit = filmGrit(el);
    const onResize = () => grit.sync();
    window.addEventListener("resize", onResize);
    // The ink changes with the scheme; redraw the tiles when it does.
    const observer = new MutationObserver(() => grit.sync());
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-look"] });

    if (prefersReducedMotion()) {
      grit.still();
    } else {
      grit.play();
    }

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      grit.destroy();
    };
  }, []);

  return (
    <canvas
      ref={canvas}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  );
}
