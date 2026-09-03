"use client";

import { useRef, useState, type ReactNode } from "react";
import { useGSAP } from "./gsap";
import { messageIn, messageOut, type MotionOptions } from "./primitives";

type Runner = (element: HTMLElement, options?: MotionOptions) => gsap.core.Timeline;

export type PresenceProps = {
  /** The desired state. The element stays mounted until its exit finishes. */
  show: boolean;
  enter?: Runner;
  exit?: Runner;
  className?: string;
  children: ReactNode;
};

/**
 * Keeps a conditional element in the DOM until its exit timeline completes.
 *
 * React would otherwise unmount the node the moment the condition flips,
 * leaving the exit nothing to animate. Interruptions are handled by reversing
 * the running exit rather than restarting: flipping back mid-exit continues
 * from where it is instead of snapping to a start state.
 */
export function Presence({
  show,
  enter = messageIn,
  exit = messageOut,
  className,
  children,
}: PresenceProps) {
  const [mounted, setMounted] = useState(show);
  const elementRef = useRef<HTMLDivElement>(null);
  const active = useRef<{ timeline: gsap.core.Timeline; kind: "in" | "out" } | null>(null);

  // Adjusting state during render (React's documented pattern): the node has
  // to exist before the entrance can run, and waiting for an effect would
  // paint one frame of unanimated content first.
  if (show && !mounted) {
    setMounted(true);
  }

  useGSAP(
    () => {
      const element = elementRef.current;
      if (!element) {
        return;
      }
      const current = active.current;

      if (show) {
        // Interrupted exit: reverse it and cancel the pending unmount.
        if (current?.kind === "out" && current.timeline.isActive()) {
          current.timeline.eventCallback("onComplete", null);
          current.timeline.reverse();
          active.current = { timeline: current.timeline, kind: "in" };
          return;
        }
        current?.timeline.kill();
        active.current = { timeline: enter(element), kind: "in" };
        return;
      }

      if (!mounted) {
        return;
      }
      current?.timeline.kill();
      active.current = {
        timeline: exit(element, { onComplete: () => setMounted(false) }),
        kind: "out",
      };
    },
    { dependencies: [show, mounted] },
  );

  if (!mounted) {
    return null;
  }

  return (
    <div ref={elementRef} className={className}>
      {children}
    </div>
  );
}
