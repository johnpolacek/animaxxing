"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, prefersReducedMotion, useGSAP } from "@/components/motion";
import { useParticleEffect } from "@/components/motion/particles/useParticleEffect";
import { Label } from "@/components/ui";
import { resolve } from "@/lib/animation/effects/particleCards";
import { watchPageTransition } from "@/lib/animation/pageState";

/*
 * A panel holding one thing to copy: a command or a prompt in a read-only
 * text area, with a copy button. The panel resolves out of a grid of dots
 * the first time it is on screen, a light wanders its outline while it
 * idles, and copying flashes the outline and kicks the panel.
 */

/** Seconds the panel holds after a copy before its ambient loop restarts. */
const COPY_HOLD = 0.8;
/** Seconds the status reads "Copied". */
const COPIED_FOR = 1.4;

const PANEL =
  "flex h-full flex-col rounded-lg border-2 border-border bg-surface p-5 transition-colors hover:border-foreground focus-within:border-foreground sm:p-6";
const TEXT =
  "mt-4 block w-full resize-none overflow-hidden bg-transparent font-code text-body leading-6 text-foreground outline-none select-all sm:text-lead sm:leading-7";
const COPY =
  "inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border-2 border-foreground px-4 py-2 font-sans text-caption font-extrabold uppercase tracking-[0.04em] text-foreground transition-colors hover:bg-inverse hover:text-inverse-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus";

export function Terminal({
  label,
  text,
  delay = 0,
  className,
}: {
  label: string;
  text: string;
  /** Seconds after the route entrance starts, when the panel is already in view. */
  delay?: number;
  className?: string;
}) {
  const scope = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const controls = useParticleEffect(scope, canvasRef, panelRef, resolve);
  const burst = useRef<() => void>(() => {});
  const [copied, setCopied] = useState(false);

  // The text area takes the height of its text, and follows it on resize.
  useEffect(() => {
    const area = areaRef.current;
    if (!area) {
      return;
    }
    const fit = () => {
      area.style.height = "0px";
      area.style.height = `${area.scrollHeight}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(area);
    return () => observer.disconnect();
  }, [text]);

  useGSAP(
    (_context, contextSafe) => {
      const root = scope.current;
      const panel = panelRef.current;
      if (!root || !panel || !contextSafe) {
        return;
      }
      if (prefersReducedMotion()) {
        gsap.set(root, { autoAlpha: 1 });
        burst.current = () => {};
        return;
      }

      let busy = false;
      burst.current = contextSafe(() => {
        if (busy) {
          return;
        }
        busy = true;
        controls.blast();
        gsap
          .timeline({ defaults: { overwrite: "auto" } })
          .to(
            panel,
            { x: () => gsap.utils.random(-5, 5), y: () => gsap.utils.random(-3, 3), duration: 0.04, repeat: 4, yoyo: true, ease: "none" },
            0,
          )
          .set(panel, { clearProps: "transform" })
          .call(
            () => {
              controls.idle();
              busy = false;
            },
            [],
            COPY_HOLD,
          );
      });

      let armed = false;
      let entered = false;
      const inView = () => {
        const r = root.getBoundingClientRect();
        return r.bottom > 0 && r.top < window.innerHeight;
      };
      const enter = (wait: number) => {
        entered = true;
        // The panel hides itself at the start of its entrance; only then is
        // the wrapper released so the canvas can show.
        controls.enter(wait);
        gsap.set(root, { autoAlpha: 1 });
      };
      const observer = new IntersectionObserver(([entry]) => {
        if (entry?.isIntersecting && armed && !entered) {
          enter(0);
        }
      });
      observer.observe(root);
      const unwatch = watchPageTransition(root, {
        onEntering: () => {
          armed = true;
          if (!entered && inView()) {
            enter(delay);
          }
        },
        onIdle: () => {
          armed = true;
          if (!entered && inView()) {
            enter(0);
          }
        },
        onExiting: () => {
          armed = false;
          entered = false;
          controls.exit();
        },
      });
      return () => {
        observer.disconnect();
        unwatch();
      };
    },
    { scope },
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // No clipboard here: select the text so the user can copy it.
      areaRef.current?.select();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), COPIED_FOR * 1000);
    burst.current();
  };

  return (
    <div ref={scope} data-terminal className={["relative isolate h-full", className].filter(Boolean).join(" ")}>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute z-10 text-foreground"
        style={{ left: -resolve.bleed, top: -resolve.bleed }}
      />
      <div ref={panelRef} className={PANEL}>
        <div className="flex items-center justify-between gap-4">
          <Label className="text-foreground">{label}</Label>
          <button type="button" onClick={copy} className={COPY}>
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <textarea
          ref={areaRef}
          readOnly
          rows={1}
          value={text}
          aria-label={label}
          spellCheck={false}
          className={TEXT}
        />
        <span role="status" className="sr-only">
          {copied ? "Copied to clipboard" : ""}
        </span>
      </div>
    </div>
  );
}

const ICON = "h-3.5 w-3.5 shrink-0";

function CopyIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className={ICON} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5.5" y="5.5" width="8.5" height="8.5" rx="1.5" />
      <path d="M10.5 5.5V3.5A1.5 1.5 0 0 0 9 2H3.5A1.5 1.5 0 0 0 2 3.5V9a1.5 1.5 0 0 0 1.5 1.5h2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className={ICON} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8.5l3.2 3.2L13 5" />
    </svg>
  );
}
