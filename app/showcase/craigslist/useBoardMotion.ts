"use client";

import { useRef } from "react";
import { gsap, prefersReducedMotion, useGSAP } from "@/components/motion";
import { watchPageTransition } from "@/lib/animation/pageState";

export function useBoardMotion() {
  const scope = useRef<HTMLDivElement>(null);

  useGSAP((_context, contextSafe) => {
    const root = scope.current;
    if (!root || !contextSafe || prefersReducedMotion()) return;
    const columns = [...root.querySelectorAll<HTMLElement>("[data-board-column]")];
    const photo = root.querySelector<HTMLElement>("[data-board-photo]");
    const scan = root.querySelector<HTMLElement>("[data-board-scan]");
    const ticker = root.querySelector<HTMLElement>("[data-board-ticker]");
    const cleanups: (() => void)[] = [];
    const loops: gsap.core.Tween[] = [];
    let exiting = false;

    // Children own their reveal; the route boundary owns the outer geometry.
    gsap.set(columns.flatMap(column => [...column.children]), { autoAlpha: 0, y: 32 });
    gsap.set(photo, { clipPath: "inset(0 100% 0 0)" });

    const reveal = new IntersectionObserver(contextSafe(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting || exiting) continue;
        const column = entry.target as HTMLElement;
        const rows = column.querySelectorAll("ul li");
        gsap.timeline({ defaults: { ease: "power3.out", overwrite: "auto" } })
          .to(column.children, {
            autoAlpha: 1, y: 0, duration: 0.65, stagger: 0.08,
            clearProps: "transform,opacity,visibility",
          })
          .from(rows, { x: -18, autoAlpha: 0, duration: 0.4, stagger: 0.045, clearProps: "all" }, 0.22);
        reveal.unobserve(column);
      }
    }), { threshold: 0.08 });

    const unwatch = watchPageTransition(root, {
      onIdle: contextSafe(() => {
        columns.forEach(column => reveal.observe(column));
        if (photo) {
          gsap.timeline({ defaults: { overwrite: "auto" } })
            .to(photo, { clipPath: "inset(0 0% 0 0)", duration: 1, ease: "power4.inOut", clearProps: "clipPath" })
            .from(photo.querySelector("img"), { scale: 1.3, duration: 1.4, ease: "power3.out", clearProps: "transform" }, 0);
        }
        if (scan) loops.push(gsap.fromTo(scan, { yPercent: -100 }, {
          yPercent: 650, duration: 3.5, repeat: -1, repeatDelay: 1.1, ease: "none",
        }));
        if (ticker) loops.push(gsap.to(ticker, { xPercent: -50, duration: 22, repeat: -1, ease: "none" }));

        // Pause each ambient surface when it leaves the viewport or the tab is hidden.
        loops.forEach(loop => {
          const target = loop.targets()[0] as HTMLElement;
          let visible = true;
          const sync = () => loop.paused(!visible || document.hidden || exiting);
          const observer = new IntersectionObserver(([entry]) => {
            visible = entry?.isIntersecting ?? false;
            sync();
          });
          observer.observe(target.parentElement!);
          document.addEventListener("visibilitychange", sync);
          cleanups.push(() => { observer.disconnect(); document.removeEventListener("visibilitychange", sync); });
        });
      }),
      onExiting: () => { exiting = true; reveal.disconnect(); loops.forEach(loop => loop.pause()); },
    });

    root.querySelectorAll<HTMLElement>("[data-board-column] a, [data-board-chip]").forEach(link => {
      const enter = contextSafe(() => {
        if (exiting) return;
        gsap.to(link, { x: 5, duration: 0.22, ease: "power2.out", overwrite: "auto" });
        const title = link.closest("h2");
        if (title) gsap.fromTo(title, { skewX: -8 }, { skewX: 0, duration: 0.5, ease: "elastic.out(1,0.4)", overwrite: "auto", clearProps: "transform" });
      });
      const leave = contextSafe(() => {
        gsap.to(link, { x: 0, duration: 0.25, overwrite: "auto", clearProps: "transform" });
      });
      link.addEventListener("pointerenter", enter);
      link.addEventListener("pointerleave", leave);
      link.addEventListener("focus", enter);
      link.addEventListener("blur", leave);
      cleanups.push(() => {
        link.removeEventListener("pointerenter", enter); link.removeEventListener("pointerleave", leave);
        link.removeEventListener("focus", enter); link.removeEventListener("blur", leave);
      });
    });

    return () => { unwatch(); reveal.disconnect(); cleanups.forEach(cleanup => cleanup()); };
  }, { scope });

  return scope;
}
