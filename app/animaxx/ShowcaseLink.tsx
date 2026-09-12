"use client";

import Link from "next/link";
import { useRef } from "react";
import { gsap, prefersReducedMotion, useGSAP } from "@/components/motion";
import { useLook } from "@/components/theme/LookProvider";
import type { Look } from "@/components/theme/look";
import styles from "./ShowcaseLink.module.css";

type LinkTheme = {
  caption: string;
  mark: string;
  from: gsap.TweenVars;
  out: gsap.TweenVars;
  ease: string;
};

const THEMES: Record<Look, LinkTheme> = {
  posterize: { caption: "Less talk. More motion.", mark: "↗", from: { y: 48, rotation: -5, scale: 0.8 }, out: { y: -30, scale: 1.12, rotation: 4 }, ease: "back.out(1.8)" },
  bauhaus: { caption: "Form follows motion / 02", mark: "●", from: { x: -70, rotation: -90, scale: 0.7 }, out: { x: 60, rotation: 90, scale: 0.6 }, ease: "back.out(1.4)" },
  cinematic: { caption: "Now showing · Motion studies", mark: "▶", from: { scaleX: 0.6, scaleY: 0.08 }, out: { scaleY: 0.02, scaleX: 1.08 }, ease: "expo.out" },
  constructivist: { caption: "Action / Experiment / Repeat", mark: "↗", from: { x: -100, y: 45, skewX: -18 }, out: { x: 100, y: -35, skewX: 18 }, ease: "power4.out" },
  pinned: { caption: "Keep going. There’s more.", mark: "↓", from: { y: 85, rotationX: -65, transformPerspective: 700 }, out: { y: -90, rotationX: 35 }, ease: "power3.out" },
  earlyweb: { caption: "showcase.exe — ready to launch", mark: "▣", from: { scale: 0.15, transformOrigin: "bottom left" }, out: { scale: 0.05, transformOrigin: "bottom right" }, ease: "steps(6)" },
  strongbad: { caption: "Click it. Your eyeballs can take it.", mark: "★", from: { rotation: 12, scaleX: 1.3, scaleY: 0.2 }, out: { rotation: -15, scaleX: 0.3, scaleY: 1.4 }, ease: "elastic.out(1, 0.5)" },
  ukiyoe: { caption: "動きの世界 / A world in motion", mark: "印", from: { y: 20, scaleX: 0.05, transformOrigin: "left center" }, out: { scaleX: 0, transformOrigin: "right center" }, ease: "power2.inOut" },
};

export function ShowcaseLink() {
  const look = useLook();
  const theme = THEMES[look];
  const scope = useRef<HTMLDivElement>(null);

  useGSAP((_context, contextSafe) => {
    const root = scope.current;
    const link = root?.querySelector("a");
    if (!root || !link || !contextSafe || prefersReducedMotion()) return;
    // The boundary may not have published its first phase during child setup.
    const page = root.closest<HTMLElement>("[data-transition-state], [tabindex='-1']");
    if (!page) return;
    let phase: string | undefined;
    let intro: gsap.core.Timeline | undefined;
    const sync = contextSafe(() => {
      const next = page.dataset.transitionState;
      if (next === phase) return;
      phase = next;
      if (next === "entering" || (next === "idle" && !intro)) {
        intro = gsap.timeline().fromTo(link, { ...theme.from, autoAlpha: 0 }, {
          autoAlpha: 1, x: 0, y: 0, rotation: 0, rotationX: 0, skewX: 0, scale: 1,
          duration: 0.75, delay: next === "entering" ? 0.85 : 0,
          ease: theme.ease, clearProps: "all",
        });
      } else if (next === "exiting") {
        intro?.kill();
        gsap.to(link, { ...theme.out, autoAlpha: 0, duration: 0.2, ease: "power2.in", overwrite: true });
      }
    });
    // Observe the boundary directly so leaving during the intro also kills it.
    // The 0.2s outro fits inside the existing page exit before the route swap.
    const observer = new MutationObserver(sync);
    observer.observe(page, { attributes: true, attributeFilter: ["data-transition-state"] });
    sync();
    return () => observer.disconnect();
  }, { scope, dependencies: [look], revertOnUpdate: true });

  return (
    <div ref={scope} className={styles.slot}>
      <Link href="/showcase" className={`${styles.link} ${styles[look]}`}>
        <span className={styles.copy}>
          <span className={styles.caption}>{theme.caption}</span>
          <span className={styles.title}>Explore the showcase</span>
        </span>
        <span aria-hidden="true" className={styles.mark}>{theme.mark}</span>
      </Link>
    </div>
  );
}
