"use client";

import { useRef, useState } from "react";
import { gsap, prefersReducedMotion, useGSAP } from "@/components/motion";
import { useParticleEffect } from "@/components/motion/particles/useParticleEffect";
import { Label } from "@/components/ui";
import { ignite } from "@/lib/animation/effects/particleCommand";
import { watchPageTransition } from "@/lib/animation/pageState";

/*
 * One install command: a label, the command itself set as a rule of light,
 * and a copy button. The block draws itself out of particles once the route
 * entrance has settled, staggered by its position on the page, and winds
 * down when the route leaves. Copying throws everything the rule has at the
 * screen, then settles back down.
 */

/**
 * Seconds after the route entrance starts before the first block draws
 * itself. The headline letters begin to land at 0.75; the blocks run in
 * under them.
 */
const FIELD_DELAY = 0.75;
/** Seconds between one block's entrance starting and the next. */
const STAGGER = 0.25;
/** Seconds the block holds after a copy before it settles back into idling. */
const COPY_HOLD = 0.9;
/** Seconds the status reads "Copied". */
const COPIED_FOR = 1.4;

/*
 * Narrow: the label and the copy button share the first row and the command
 * runs full width beneath them. From `sm`: label, command, button in a row.
 */
const BLOCK =
  "grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-6 gap-y-3 border-b-[3px] border-foreground py-4 sm:grid-cols-[6rem_minmax(0,1fr)_auto]";
const LABEL = "col-start-1 row-start-1 sm:row-auto";
const COMMAND =
  "col-span-2 min-w-0 font-mono text-title font-bold tracking-[-0.01em] text-foreground [overflow-wrap:anywhere] select-all sm:col-span-1 sm:text-display";
const COPY_CELL = "col-start-2 row-start-1 justify-self-end sm:col-start-3 sm:row-auto";
const COPY =
  "inline-flex shrink-0 cursor-pointer items-center rounded-lg border-2 border-foreground px-4 py-2 font-sans text-caption font-extrabold uppercase tracking-[0.04em] text-foreground transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus";

export function CommandBlock({
  command,
  label,
  index,
}: {
  command: string;
  label: string;
  index: number;
}) {
  const scope = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const blockRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLElement>(null);
  const controls = useParticleEffect(scope, canvasRef, blockRef, ignite);
  const burst = useRef<() => void>(() => {});
  const [copied, setCopied] = useState(false);

  useGSAP(
    (_context, contextSafe) => {
      const root = scope.current;
      const block = blockRef.current;
      if (!root || !block || !contextSafe) {
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
          // The block kicks once.
          .to(
            block,
            { x: () => gsap.utils.random(-6, 6), y: () => gsap.utils.random(-4, 4), duration: 0.04, repeat: 4, yoyo: true, ease: "none" },
            0,
          )
          .set(block, { clearProps: "transform" })
          .call(
            () => {
              controls.idle();
              busy = false;
            },
            [],
            COPY_HOLD,
          );
      });

      let entered = false;
      const enter = (delay: number) => {
        entered = true;
        controls.enter(delay);
        gsap.set(root, { autoAlpha: 1 });
      };
      return watchPageTransition(root, {
        onEntering: () => enter(FIELD_DELAY + index * STAGGER),
        onIdle: () => {
          // Only when the entrance was missed, such as on a reduced-motion
          // page that reports idle straight away.
          if (!entered) {
            enter(0);
          }
        },
        onExiting: () => {
          entered = false;
          controls.exit();
        },
      });
    },
    { scope },
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      // No clipboard here: select the command so the user can copy it.
      const code = codeRef.current;
      if (code) {
        window.getSelection()?.selectAllChildren(code);
      }
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), COPIED_FOR * 1000);
    burst.current();
  };

  return (
    <div ref={scope} data-command-block className="relative isolate">
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute z-10 text-foreground"
        style={{ left: -ignite.bleed, top: -ignite.bleed }}
      />
      <div ref={blockRef} className={BLOCK}>
        <Label className={LABEL}>{label}</Label>
        <code ref={codeRef} className={COMMAND}>
          {command}
        </code>
        <button type="button" onClick={copy} className={`${COPY} ${COPY_CELL}`}>
          {copied ? "Copied" : "Copy"}
        </button>
        <span role="status" className="sr-only">
          {copied ? "Copied to clipboard" : ""}
        </span>
      </div>
    </div>
  );
}
