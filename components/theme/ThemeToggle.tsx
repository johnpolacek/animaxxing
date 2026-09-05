"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { prefersReducedMotion, useGSAP } from "@/components/motion";
import { ParticleField } from "@/components/motion/particles/field";
import { themeBurst } from "@/lib/animation/effects/themeBurst";
import { applyTheme, readStoredTheme, storeTheme, THEME_CHOICES, type ThemeChoice } from "./theme";

/*
 * The stored choice lives outside React (localStorage plus the data-theme
 * attribute the head script already applied), so it is read through
 * useSyncExternalStore. The server snapshot is always `dark`, and React
 * re-reads the real value right after hydration.
 */
const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  // Keep other tabs in step.
  window.addEventListener("storage", onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function serverSnapshot(): ThemeChoice {
  return "dark";
}

/**
 * Scheme switcher built from a native radio group, so arrow keys, a single tab
 * stop, and screen-reader semantics come for free. The inputs are visually
 * hidden but never removed; the labels carry the segmented-control treatment
 * and the focus ring follows the checked input.
 *
 * Every switch also fires a particle burst from the pressed label across the
 * whole viewport. The canvas for that is portaled to <body> and fixed over
 * the page, so no ancestor transform can pin it to the footer.
 */
export function ThemeToggle({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const groupId = useId();
  const choice = useSyncExternalStore(subscribe, readStoredTheme, serverSnapshot);
  const scope = useRef<HTMLFieldSetElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const field = useRef<ParticleField | null>(null);
  // The portal target does not exist on the server; mount the stage after hydration.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useGSAP(
    () => {
      if (!canvas.current || !stage.current) {
        return;
      }
      const particles = new ParticleField(canvas.current, stage.current, 0);
      field.current = particles;
      const resize = new ResizeObserver(() => particles.sync());
      resize.observe(stage.current);
      return () => {
        resize.disconnect();
        particles.destroy();
        field.current = null;
      };
    },
    { scope, dependencies: [mounted] },
  );

  function select(next: ThemeChoice, id: string) {
    storeTheme(next);
    applyTheme(next);
    for (const listener of listeners) {
      listener();
    }
    const particles = field.current;
    const label = scope.current?.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(id)}"]`);
    if (!particles || !label || prefersReducedMotion()) {
      return;
    }
    // The theme has just changed on <html>; the canvas sits outside the colour
    // blend, so re-reading it now gives the incoming scheme's ink.
    particles.sync();
    const rect = label.getBoundingClientRect();
    themeBurst(particles, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  }

  return (
    <fieldset ref={scope} className={className}>
      {mounted &&
        createPortal(
          <div
            ref={stage}
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-50"
          >
            <canvas
              ref={canvas}
              data-theme-burst
              className="absolute left-0 top-0 text-foreground"
            />
          </div>,
          document.body,
        )}
      <legend className="sr-only">Color scheme</legend>
      <div className="flex gap-1 rounded-sm border border-border p-1">
        {THEME_CHOICES.map((option) => {
          const id = `${groupId}-${option}`;
          return (
            <div key={option} className="flex">
              <input
                type="radio"
                id={id}
                name={`${groupId}-theme`}
                value={option}
                checked={choice === option}
                onChange={() => select(option, id)}
                className="peer sr-only"
              />
              <label
                htmlFor={id}
                className={[
                  "cursor-pointer rounded-xs uppercase text-muted transition-colors hover:bg-surface-hover hover:text-foreground peer-checked:bg-inverse peer-checked:text-inverse-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus",
                  compact
                    ? "px-1.5 py-0.5 font-mono text-[10px]"
                    : "px-3 py-1.5 font-mono text-caption",
                ].join(" ")}
              >
                {option}
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
