"use client";

import { useRef, type ReactNode } from "react";
import { charsWeightWave, prefersReducedMotion, useGSAP } from "@/components/motion";

/*
 * A word in a footer credit: a dotted underline whose dots march under the pointer,
 * while a wave of weight runs through the letters.
 */
const LINK = "dotted-link transition-colors hover:text-foreground focus-visible:text-foreground";

export function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  const ref = useRef<HTMLAnchorElement>(null);

  useGSAP(
    (_context, contextSafe) => {
      const link = ref.current;
      if (!link || !contextSafe) {
        return;
      }
      let wave: ReturnType<typeof charsWeightWave> | null = null;
      const ripple = contextSafe(() => {
        if (prefersReducedMotion() || wave?.isActive()) {
          return;
        }
        wave = charsWeightWave(link);
      });
      link.addEventListener("pointerenter", ripple);
      link.addEventListener("focus", ripple);
      return () => {
        link.removeEventListener("pointerenter", ripple);
        link.removeEventListener("focus", ripple);
      };
    },
    { scope: ref },
  );

  return (
    <a ref={ref} href={href} className={LINK}>
      {children}
    </a>
  );
}
