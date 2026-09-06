"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { HugeiconsIcon } from "@hugeicons/react";
import { RefreshCcwIcon } from "@hugeicons/core-free-icons";
import { gsap, prefersReducedMotion, replayPageTransition, useGSAP } from "@/components/motion";
import { ParticleField } from "@/components/motion/particles/field";
import {
  crackle,
  fence,
  fenceOpen,
  openBurst,
  twitchBurst,
} from "@/lib/animation/effects/themeSwitcher";
import { EXPLORATIONS, isBuilt, type ExplorationSlug } from "./explorations";
import { LOOKS, type Look } from "./look";
import { useLook, useSetLook } from "./LookProvider";
import { ThemePreview } from "./ThemePreview";

/*
 * Theme switcher.
 *
 * A button in the header that will not sit still: every four seconds it
 * shakes itself and throws sparks. Pressing it opens a picker whose panel is
 * fenced in particles, with one tile per design exploration other than the
 * one in force. Choosing a built look closes the picker, switches the look,
 * and replays the page so it enters again in the new look. Tiles for looks
 * not built yet only say so.
 */

/** How far the button's canvas bleeds past it, in px. */
const BUTTON_BLEED = 90;
/** How far the panel's canvas bleeds past it, in px. */
const PANEL_BLEED = 160;
/** Seconds between twitches. */
const TWITCH_EVERY = 4;

export function ThemeSwitcher({ className }: { className?: string }) {
  const titleId = useId();
  const scope = useRef<HTMLSpanElement>(null);
  const buttonCanvas = useRef<HTMLCanvasElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const buttonField = useRef<ParticleField | null>(null);

  const overlay = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const panelScope = useRef<HTMLDivElement>(null);
  const panelCanvas = useRef<HTMLCanvasElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const panelField = useRef<ParticleField | null>(null);

  const look = useLook();
  /* The early web look wears the toolbar's bevel instead of the pill. */
  const earlyweb = look === "earlyweb";
  /* Strong Bad's chrome is a row of tabs on a black bar; this is the last one. */
  const strongbad = look === "strongbad";
  const setLook = useSetLook();
  const [open, setOpen] = useState(false);
  // The panel stays mounted through its exit; `visible` lags `open` on close.
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  /* ------------------------------------------------------------- button */
  useGSAP(
    () => {
      const canvas = buttonCanvas.current;
      const target = button.current;
      if (!canvas || !target) {
        return;
      }
      const field = new ParticleField(canvas, target, BUTTON_BLEED);
      buttonField.current = field;
      const resize = new ResizeObserver(() => field.sync());
      resize.observe(target);
      const theme = new MutationObserver(() => field.sync());
      theme.observe(document.documentElement, { attributes: true });

      let twitch: gsap.core.Timeline | null = null;
      let crackling: ((dt: number) => void) | null = null;
      // The Strong Bad look keeps the twitch but not the sparks and rings:
      // a cartoon drawn in one weight of ink has no hairline particles in
      // it. Read off <html> at the moment rather than closed over, so a
      // look chosen from the picker is honoured without remounting.
      const sparks = () => document.documentElement.dataset.look !== "strongbad";
      if (!prefersReducedMotion()) {
        gsap.set(target, { transformOrigin: "50% 50%" });
        twitch = gsap
          .timeline({ repeat: -1, repeatDelay: TWITCH_EVERY, delay: 1.5 })
          .call(() => {
            if (sparks()) {
              twitchBurst(field);
            }
          })
          .to(target, {
            keyframes: [
              { rotation: -8, x: -3, scale: 1.1, duration: 0.06 },
              { rotation: 7, x: 3, duration: 0.06 },
              { rotation: -6, x: -2, duration: 0.06 },
              { rotation: 5, x: 2, duration: 0.06 },
              { rotation: -3, x: -1, duration: 0.05 },
              { rotation: 0, x: 0, scale: 1, duration: 0.3, ease: "elastic.out(1, 0.35)" },
            ],
          })
          .to("[data-switcher-mark]", { rotation: "-=360", duration: 0.5, ease: "back.out(1.6)" }, "<");

        const on = () => {
          if (!crackling && sparks()) {
            crackling = crackle(field);
          }
        };
        const off = () => {
          if (crackling) {
            field.removeEmitter(crackling);
            crackling = null;
          }
        };
        target.addEventListener("pointerenter", on);
        target.addEventListener("pointerleave", off);
        target.addEventListener("focus", on);
        target.addEventListener("blur", off);
        return () => {
          target.removeEventListener("pointerenter", on);
          target.removeEventListener("pointerleave", off);
          target.removeEventListener("focus", on);
          target.removeEventListener("blur", off);
          twitch?.kill();
          resize.disconnect();
          theme.disconnect();
          field.destroy();
          buttonField.current = null;
        };
      }
      return () => {
        resize.disconnect();
        theme.disconnect();
        field.destroy();
        buttonField.current = null;
      };
    },
    { scope },
  );

  /* -------------------------------------------------------------- panel */
  useGSAP(
    () => {
      const root = overlay.current;
      const wrap = panelScope.current;
      const canvas = panelCanvas.current;
      const box = panel.current;
      const shade = backdrop.current;
      if (!visible || !root || !wrap || !canvas || !box || !shade) {
        return;
      }
      const reduced = prefersReducedMotion();
      const field = new ParticleField(canvas, box, PANEL_BLEED);
      panelField.current = field;
      const resize = new ResizeObserver(() => field.sync());
      resize.observe(box);

      const tiles = gsap.utils.toArray<HTMLElement>("[data-tile]", box);
      const tl = gsap.timeline();
      if (reduced) {
        tl.set([shade, box, tiles], { autoAlpha: 1 });
      } else {
        fenceOpen(field);
        fence(field);
        tl.fromTo(shade, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, 0)
          .fromTo(
            box,
            { autoAlpha: 0, scale: 0.55, rotation: -4, y: 40 },
            { autoAlpha: 1, scale: 1, rotation: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.55)" },
            0.05,
          )
          .fromTo(
            tiles,
            { autoAlpha: 0, y: 16 },
            { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out", stagger: 0.08 },
            0.25,
          )
          .call(() => tiles[0]?.focus({ preventScroll: true }), [], 0.3);
      }
      if (reduced) {
        tiles[0]?.focus({ preventScroll: true });
      }
      return () => {
        tl.kill();
        resize.disconnect();
        field.destroy();
        panelField.current = null;
      };
    },
    { scope: overlay, dependencies: [visible] },
  );

  // Exit: play the panel out, then unmount it.
  useGSAP(
    () => {
      const box = panel.current;
      const shade = backdrop.current;
      if (open || !visible || !box || !shade) {
        return;
      }
      panelField.current?.release(0.35);
      if (prefersReducedMotion()) {
        setVisible(false);
        return;
      }
      gsap
        .timeline({ onComplete: () => setVisible(false) })
        .to(box, { autoAlpha: 0, scale: 0.85, y: 20, duration: 0.22, ease: "power2.in" }, 0)
        .to(shade, { autoAlpha: 0, duration: 0.25 }, 0.05);
    },
    { dependencies: [open, visible] },
  );

  // Escape closes; the page behind does not scroll while the picker is up.
  useEffect(() => {
    if (!visible) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
      }
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function show() {
    const field = buttonField.current;
    if (field && !prefersReducedMotion() && look !== "strongbad") {
      openBurst(field);
    }
    setVisible(true);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    button.current?.focus({ preventScroll: true });
  }

  function choose(slug: ExplorationSlug) {
    let next: Look | null = null;
    if (slug === "random") {
      const others = LOOKS.filter((candidate) => candidate !== look);
      next = others[Math.floor(Math.random() * others.length)] ?? null;
    } else if (isBuilt(slug)) {
      next = slug;
    }
    if (!next) {
      return;
    }
    close();
    if (next === look) {
      return;
    }
    setLook(next);
    // The page composes differently under the new look: let it leave in the
    // old one and come back in the new.
    replayPageTransition();
  }

  return (
    <span ref={scope} className={["relative isolate inline-flex", className].filter(Boolean).join(" ")}>
      <canvas
        ref={buttonCanvas}
        aria-hidden="true"
        className="pointer-events-none absolute z-10 text-foreground"
        style={{ left: -BUTTON_BLEED, top: -BUTTON_BLEED }}
      />
      <button
        ref={button}
        type="button"
        onClick={show}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={
          // 1997 has no pill: in that look the switcher is a toolbar button
          // like the ones beside it, and its orbiting ring becomes the dotted
          // focus rectangle Windows drew inside a bevel. Strong Bad has no
          // pill either: there, it is another tab standing on the black bar,
          // and the ring gives way to a plain focus outline, since a tab is
          // already the loudest thing on the horizon.
          earlyweb
            ? "switcher-button web-switcher group relative inline-flex items-center gap-1.5 focus-visible:outline-none"
            : strongbad
              ? "switcher-button sb-switcher sb-tab group relative gap-1.5 px-3 pb-1.5 pt-2 text-[14px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus sm:gap-2 sm:px-[18px] sm:pb-[6px] sm:pt-[10px] sm:text-[19px]"
              : "switcher-button group relative inline-flex items-center gap-2.5 rounded-sm bg-inverse px-4 py-2 font-mono text-sm font-bold uppercase tracking-[0.16em] text-inverse-foreground transition-colors hover:bg-inverse-hover focus-visible:outline-none"
        }
      >
        <span
          aria-hidden="true"
          className={
            earlyweb
              ? "web-switcher-focus pointer-events-none absolute inset-[2px]"
              : strongbad
                ? "hidden"
                : "switcher-ring pointer-events-none absolute -inset-1.5 rounded-md"
          }
        />
        <HugeiconsIcon
          icon={RefreshCcwIcon}
          size={earlyweb ? 13 : strongbad ? 16 : 18}
          strokeWidth={2}
          aria-hidden="true"
          data-switcher-mark
          className={strongbad ? "shrink-0 self-center" : "shrink-0"}
        />
        {earlyweb ? <span className="web-switcher-label">Themes</span> : "Themes"}
      </button>

      {mounted &&
        visible &&
        createPortal(
          <div
            ref={overlay}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4 sm:p-8"
          >
            <div
              ref={backdrop}
              onClick={close}
              className="fixed inset-0 bg-canvas/85 opacity-0 backdrop-blur-sm"
            />
            <div ref={panelScope} className="relative isolate">
              <canvas
                ref={panelCanvas}
                aria-hidden="true"
                className="pointer-events-none absolute z-10 text-foreground"
                style={{ left: -PANEL_BLEED, top: -PANEL_BLEED }}
              />
              <div
                ref={panel}
                className="relative w-[min(92vw,64rem)] rounded-lg border-strong border-foreground bg-canvas p-5 opacity-0 sm:p-8"
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono text-caption uppercase tracking-[0.14em] text-muted">
                      Theme switcher
                    </p>
                    <h2
                      id={titleId}
                      className="mt-1 font-sans text-2xl font-bold tracking-tight sm:text-3xl"
                    >
                      Pick a look
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Close"
                    className="rounded-sm border border-border px-2.5 py-1 font-mono text-caption uppercase text-muted hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  >
                    Esc
                  </button>
                </div>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {EXPLORATIONS.filter((theme) => theme.slug !== look).map((theme) => {
                    const built = theme.slug === "random" || isBuilt(theme.slug);
                    return (
                      <li key={theme.slug} className="flex">
                        <button
                          type="button"
                          data-tile
                          onClick={() => choose(theme.slug)}
                          aria-disabled={!built}
                          className={[
                            "group relative aspect-square w-full overflow-hidden rounded-md border border-border text-left opacity-0 transition-[transform,border-color] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus",
                            built ? "hover:-translate-y-0.5 hover:border-foreground" : "cursor-default",
                          ].join(" ")}
                        >
                          <span
                            aria-hidden="true"
                            className={[
                              "absolute inset-0 transition-transform duration-300",
                              built ? "group-hover:scale-105" : "opacity-40 grayscale",
                            ].join(" ")}
                          >
                            <ThemePreview slug={theme.slug} />
                          </span>
                          <span className="absolute bottom-2 left-2 rounded-xs bg-inverse px-2 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-inverse-foreground">
                            {theme.name}
                          </span>
                          {!built && (
                            <span className="absolute right-2 top-2 rounded-xs bg-canvas/80 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                              Soon
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </span>
  );
}
