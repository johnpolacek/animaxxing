"use client";

import { useRef } from "react";
import { gsap, prefersReducedMotion, replayPageTransition } from "@/components/motion";
import { useLook } from "@/components/theme/LookProvider";

/*
 * Plays the demo again. The page exits the way it would before a navigation,
 * then remounts and enters from scratch, this button included. The icon
 * takes one turn as it goes.
 */
const BUTTON =
  "inline-flex cursor-pointer items-center gap-2 rounded-lg border-2 border-border bg-surface px-3 py-2 font-mono text-caption uppercase text-muted transition-colors hover:border-foreground hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus";
/* 1997: a dialog button that sinks into its bevel when you push it. */
const WEB_BUTTON =
  "web-navbtn inline-flex cursor-pointer items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus";
/* Strong Bad: a yellow sticker button that lifts on hover and squashes flat when pressed. */
const SB_BUTTON =
  "sb-art-btn sb-art-btn-yellow focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus";

export function ShowcaseReplay() {
  const iconRef = useRef<SVGSVGElement>(null);
  const look = useLook();
  const earlyweb = look === "earlyweb";
  const strongbad = look === "strongbad";

  const replay = () => {
    if (iconRef.current && !prefersReducedMotion()) {
      gsap.fromTo(
        iconRef.current,
        { rotation: 0 },
        { rotation: 360, duration: 0.5, ease: "power2.inOut", overwrite: "auto" },
      );
    }
    replayPageTransition();
  };

  return (
    <div data-page-transition>
      <button
        type="button"
        className={strongbad ? SB_BUTTON : earlyweb ? WEB_BUTTON : BUTTON}
        onClick={replay}
        aria-label="Replay the animation"
      >
        <svg
          ref={iconRef}
          aria-hidden="true"
          viewBox="0 0 16 16"
          width="14"
          height="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0"
        >
          <path d="M13.5 8a5.5 5.5 0 1 1-1.61-3.89" />
          <path d="M13.5 2.5v3h-3" />
        </svg>
        <span>{earlyweb ? "Reload" : "Replay"}</span>
      </button>
    </div>
  );
}
