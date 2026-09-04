"use client";

import { useRef, type ReactNode } from "react";
import { prefersReducedMotion, useGSAP } from "@/components/motion";
import { Statement } from "@/components/ui";
import { watchPageTransition } from "@/lib/animation/pageState";
import { startWave, type WaveOptions } from "./wave";

/** A heading that starts waving its letters once the route entrance settles. */
export function WaveHeadline({
  className,
  period,
  children,
}: {
  className: string;
  period?: WaveOptions["period"];
  children: ReactNode;
}) {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP(
    (_context, contextSafe) => {
      const heading = scope.current?.querySelector<HTMLElement>("h1");
      if (!heading || !contextSafe || prefersReducedMotion()) {
        return;
      }
      let stop: ((keepSplit?: boolean) => void) | null = null;
      const unwatch = watchPageTransition(heading, {
        onIdle: contextSafe(() => {
          stop = startWave(heading, period === undefined ? {} : { period });
        }),
        onExiting: () => {
          stop?.(true);
          stop = null;
        },
      });
      return () => {
        unwatch();
        stop?.();
      };
    },
    { scope },
  );

  return (
    <div ref={scope}>
      <Statement as="h1" data-page-transition="letters" className={className}>
        {children}
      </Statement>
    </div>
  );
}
