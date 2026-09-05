"use client";

import { useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import {
  charsRiseIn,
  charsWeightWave,
  gsap,
  linesMaskIn,
  prefersReducedMotion,
  ScrollTrigger,
  scrollRevealBatch,
  useGSAP,
} from "@/components/motion";
import { Label } from "@/components/ui";
import { createFilm, timecode, type Film } from "@/lib/animation/effects/film";
import { watchPageTransition } from "@/lib/animation/pageState";
import {
  ACTIONS,
  CHANNEL,
  CHANNEL_VIDEOS,
  CHAPTERS,
  channelOf,
  COMMENT_COUNT,
  COMMENT_SORTS,
  COMMENTS,
  DESCRIPTION,
  FEED,
  FILTERS,
  findVideo,
  FIRST,
  marksFor,
  NAV,
  SEARCH_FILTERS,
  SEARCH_QUERY,
  TABS,
  TODAY,
  toSeconds,
  UP_NEXT,
  VIDEOS,
  type Video,
} from "./content";

/*
 * The video site, animaxxed.
 *
 * Layout: a sticky strip of chrome (wordmark, search, the site links), then a
 * twelve-column grid with a sticky rail of the four chapters in two columns
 * and the chapters themselves in the other ten. Every video is a strict 16:9
 * frame: an inverse slab with footage drawn on a canvas in its own text
 * colour, a hairline of progress along its foot, and a timecode badge.
 *
 * Motion, all of it drawn from television:
 *  - every frame tunes in: a hairline snaps open into a picture, static
 *    resolves into footage. Cards do it in batches as they scroll into view
 *  - under the pointer a card plays: the footage runs, the progress hairline
 *    creeps, the badge counts up. Leave and it rewinds
 *  - picking a card switches that frame off (the picture collapses back to
 *    a line) and the player tunes in to it, and plays
 *  - the player has a working clock: a scrub bar with chapter ticks, a
 *    hairline cursor with a readout under the pointer, click to seek, a
 *    play button whose glyph swaps, and level bars that jump while it plays
 *  - the title masks in line by line; every number resolves out of noise;
 *    the comments print one by one; the comment field draws its rule
 *  - the like count ticks up and the thumb pops; subscribing rings the bell
 *  - the channel banner is footage too, with the name rising out of it
 *  - the search field types its own query, the count hunts for the total,
 *    and results leave and arrive as the query changes
 *  - the rail's marker drifts between chapters
 * Reduced motion snaps every one of these to its settled state: every frame
 * is a still, nothing plays unless asked, and the search is already typed.
 */

const MONO_LABEL = "font-mono text-caption font-bold uppercase tracking-[0.08em]";
const MONO_NOTE = "font-mono text-annotation uppercase tracking-[0.08em]";

const CHIP =
  "inline-flex h-9 items-center gap-2 rounded-md border-2 px-3.5 font-mono text-caption font-bold uppercase tracking-[0.08em] transition-colors";
const CHIP_OUTLINE = `${CHIP} border-foreground text-foreground hover:bg-surface-hover`;
const CHIP_SOLID = `${CHIP} border-inverse bg-inverse text-inverse-foreground hover:bg-inverse-hover`;
const CHIP_TOGGLE = `${CHIP} border-foreground text-foreground hover:bg-surface-hover aria-pressed:border-inverse aria-pressed:bg-inverse aria-pressed:text-inverse-foreground aria-pressed:hover:bg-inverse-hover`;
const CHIP_RAIL = `${CHIP} shrink-0 data-[active=true]:border-inverse data-[active=true]:bg-inverse data-[active=true]:text-inverse-foreground border-foreground text-foreground`;
/** A chip that sits on a frame, in the frame's colours. */
const CHIP_ON_FRAME =
  "inline-flex h-8 items-center gap-2 rounded-md border-2 border-inverse-foreground/60 px-2.5 font-mono text-annotation font-bold uppercase tracking-[0.08em] text-inverse-foreground transition-colors hover:border-inverse-foreground";

const BUTTON =
  "inline-flex h-14 items-center gap-3 rounded-lg px-6 font-sans text-[1.75rem] font-extrabold uppercase leading-none tracking-[-0.02em] transition-colors";
const BUTTON_SOLID = `${BUTTON} bg-inverse text-inverse-foreground hover:bg-inverse-hover`;
const BUTTON_OUTLINE = `${BUTTON} border-2 border-foreground text-foreground hover:bg-surface-hover`;

const DISPLAY =
  "font-sans font-extrabold uppercase leading-[0.88] tracking-[-0.04em] [font-kerning:none] [text-rendering:optimizeSpeed]";

const FRAME =
  "relative aspect-video overflow-hidden rounded-md bg-inverse text-inverse-foreground";

const CARD_TITLE =
  "font-sans text-[1.125rem] leading-[1.1] font-extrabold tracking-[-0.02em] text-pretty";

/** Seconds between one card in a batch tuning in and the next. */
const CARD_STAGGER = 0.09;
/** How long the static takes to clear once a frame is open. */
const TUNE = 0.7;

const rnd = gsap.utils.random;

/* --------------------------------------------------------------- motion */

/** Digits (or letters) resolving out of noise into whatever the element now says. */
function resolve(element: HTMLElement, at = 0, tl?: gsap.core.Timeline): void {
  const upper = element.dataset.live === "upper";
  const vars: gsap.TweenVars = {
    duration: upper ? 0.7 : 0.6,
    ease: "none",
    overwrite: "auto",
    scrambleText: {
      text: element.textContent ?? "",
      chars: upper ? "upperCase" : "0123456789",
      speed: 0.5,
      revealDelay: 0.15,
    },
  };
  if (tl) {
    tl.to(element, vars, at);
  } else {
    gsap.to(element, { ...vars, delay: at });
  }
}

/** The bell after a subscribe: it swings, and settles. */
function ring(bell: Element): gsap.core.Timeline {
  return gsap
    .timeline({ defaults: { overwrite: "auto", transformOrigin: "50% 8%" } })
    .to(bell, { rotation: 28, duration: 0.12, ease: "power2.out" })
    .to(bell, { rotation: -22, duration: 0.14, ease: "power1.inOut" })
    .to(bell, { rotation: 14, duration: 0.14, ease: "power1.inOut" })
    .to(bell, { rotation: 0, duration: 0.7, ease: "elastic.out(1, 0.35)", clearProps: "transform" });
}

/* ----------------------------------------------------------------- page */

export function Tube() {
  const scope = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(FIRST);
  const [playing, setPlaying] = useState(false);
  const [liked, setLiked] = useState(false);
  const [subscribed, setSubscribed] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");

  const video = findVideo(current);
  const channel = channelOf(video);
  const marks = marksFor(video);
  const length = toSeconds(video.duration);
  const likes = (ACTIONS[0].count + (liked ? 1 : 0)).toLocaleString("en-US");

  const films = useRef(new Map<HTMLCanvasElement, Film>());
  const player = useRef<Film | null>(null);
  const previous = useRef(current);
  const reducedRef = useRef(true);
  const idle = useRef(false);
  const searchArmed = useRef(false);
  const playingRef = useRef(playing);
  playingRef.current = playing;

  /* ------------------------------------------------ mount: the page */
  useGSAP(
    (_context, contextSafe) => {
      const root = scope.current;
      if (!root || !contextSafe) {
        return;
      }
      const reduced = prefersReducedMotion();
      reducedRef.current = reduced;
      const q = gsap.utils.selector(root);
      const cleanups: (() => void)[] = [];
      const sections = q<HTMLElement>("[data-chapter]");
      const marker = root.querySelector<HTMLElement>("[data-rail-marker]");
      const links = q<HTMLElement>("[data-rail-link]");
      const rules = q<HTMLElement>("[data-rule]");
      const frames = q<HTMLElement>("[data-frame]");

      if (marker) {
        gsap.set(marker, { autoAlpha: 0 });
      }
      gsap.set(frames, { autoAlpha: 0 });
      if (!reduced) {
        gsap.set(rules, { scaleX: 0, transformOrigin: "0% 50%" });
      }

      /* -------------------------------------------- the footage */
      const registry = films.current;
      for (const canvas of q<HTMLCanvasElement>("canvas[data-film]")) {
        const frame = canvas.closest<HTMLElement>("[data-frame]");
        const duration = Number(canvas.dataset.duration ?? 60);
        const isPlayer = canvas.dataset.player !== undefined;
        const progress = frame?.querySelector<HTMLElement>(isPlayer ? "[data-played]" : "[data-progress]");
        const head = frame?.querySelector<HTMLElement>("[data-head]");
        const scrubBar = frame?.querySelector<HTMLElement>("[data-scrub]");
        const time = frame?.querySelector<HTMLElement>(isPlayer ? "[data-clock]" : "[data-time]");
        const live = frame?.dataset.live !== undefined;
        const setProgress = progress ? gsap.quickSetter(progress, "scaleX") : null;
        const setHead = head ? gsap.quickSetter(head, "x", "px") : null;
        let second = -1;
        const film = createFilm(canvas, {
          scene: (canvas.dataset.scene ?? "static") as Video["scene"],
          seed: Number(canvas.dataset.seed ?? 1),
          duration,
          onTime: (t) => {
            const fraction = t / film.duration;
            if (!live) {
              setProgress?.(fraction);
              setHead?.(fraction * (scrubBar?.clientWidth ?? 0));
            }
            const s = Math.floor(t);
            if (s !== second && time) {
              second = s;
              time.textContent = timecode(t);
            }
          },
        });
        registry.set(canvas, film);
        if (isPlayer) {
          player.current = film;
        }
      }
      const filmOf = (element: Element | null): Film | null => {
        const canvas = element?.querySelector<HTMLCanvasElement>("canvas[data-film]") ?? null;
        return canvas ? (registry.get(canvas) ?? null) : null;
      };
      const syncAll = () => registry.forEach((film) => film.sync());

      // Size, colour, and visibility: one observer each for every frame on the page.
      let resizeCall: gsap.core.Tween | null = null;
      const resize = new ResizeObserver(() => {
        resizeCall?.kill();
        resizeCall = gsap.delayedCall(0.1, syncAll);
      });
      resize.observe(root);
      const theme = new MutationObserver(() => syncAll());
      theme.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
      const visible = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          filmOf(entry.target)?.setOnScreen(entry.isIntersecting);
        }
      });
      frames.forEach((frame) => visible.observe(frame));
      cleanups.push(() => {
        resize.disconnect();
        theme.disconnect();
        visible.disconnect();
        resizeCall?.kill();
      });

      /** A frame tunes in: a hairline snaps open into a picture and the static clears. */
      const tuneIn = (frame: HTMLElement | null, at = 0, tl: gsap.core.Timeline) => {
        if (!frame) {
          return;
        }
        const film = filmOf(frame);
        if (reduced || !film) {
          tl.set(frame, { autoAlpha: 1 }, at);
          return;
        }
        tl.call(
          () => {
            film.tune.noise = 1;
          },
          [],
          at,
        )
          .fromTo(
            frame,
            { autoAlpha: 1, scaleY: 0.02, scaleX: 1.04, transformOrigin: "50% 50%" },
            { scaleY: 1, scaleX: 1, duration: 0.5, ease: "power4.out", clearProps: "transform" },
            at,
          )
          .to(film.tune, { noise: 0, duration: TUNE, ease: "power2.in" }, at + 0.2);
      };

      /** The reverse: the picture collapses to a line, then comes back a beat later. */
      const switchOff = (frame: HTMLElement | null) => {
        const film = filmOf(frame);
        if (!frame || !film || reduced) {
          return;
        }
        const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
        tl.to(film.tune, { noise: 1, duration: 0.15, ease: "power2.in" }, 0)
          .to(frame, { scaleY: 0.02, scaleX: 1.04, transformOrigin: "50% 50%", duration: 0.28, ease: "power4.in" }, 0.05)
          .set(frame, { autoAlpha: 0 }, 0.34);
        tuneIn(frame, 1.1, tl);
      };

      /** Cards arriving: the frame tunes, the text prints beneath it. */
      const cardsIn = (batch: HTMLElement[]) => {
        const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
        batch.forEach((card, index) => {
          const at = index * CARD_STAGGER;
          card.dataset.shown = "";
          tl.set(card, { autoAlpha: 1 }, at);
          tuneIn(card.querySelector<HTMLElement>("[data-frame]"), at, tl);
          if (reduced) {
            return;
          }
          const title = card.querySelector<HTMLElement>("[data-card-title]");
          const meta = card.querySelectorAll<HTMLElement>("[data-card-meta]");
          const mark = card.querySelector<HTMLElement>("[data-mark]");
          if (title) {
            tl.add(linesMaskIn(title), at + 0.3);
          }
          if (mark) {
            tl.fromTo(
              mark,
              { autoAlpha: 0, scale: 0.4 },
              { autoAlpha: 1, scale: 1, duration: 0.35, ease: "back.out(2.4)", clearProps: "transform" },
              at + 0.35,
            );
          }
          if (meta.length > 0) {
            tl.fromTo(
              meta,
              { autoAlpha: 0, y: 8 },
              { autoAlpha: 1, y: 0, duration: 0.3, ease: "power2.out", stagger: 0.06, clearProps: "transform" },
              at + 0.45,
            );
            meta.forEach((el) => el.querySelectorAll<HTMLElement>("[data-live]").forEach((n) => resolve(n, at + 0.45, tl)));
          }
        });
        return tl;
      };

      /** A chapter's title rises behind its mask while its hairline draws across. */
      const chapterIn = (section: HTMLElement): gsap.core.Timeline => {
        const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
        const title = section.querySelector<HTMLElement>("[data-title]");
        const rule = section.querySelector<HTMLElement>("[data-rule]");
        if (rule && !reduced) {
          tl.to(rule, { scaleX: 1, duration: 0.7, ease: "power3.inOut", clearProps: "transform" }, 0);
        }
        if (title) {
          tl.add(charsRiseIn(title), 0.1);
        }
        return tl;
      };

      /* ------------------------------------------------- the rail */
      let active = -1;
      const driftTo = (index: number) => {
        if (index === active) {
          return;
        }
        active = index;
        const id = CHAPTERS[index]?.id;
        links.forEach((link) => {
          link.dataset.active = String(link.dataset.target === id);
        });
        const link = root.querySelector<HTMLElement>(`[data-rail] [data-rail-link][data-target="${id}"]`);
        if (!marker || !link) {
          return;
        }
        if (reduced) {
          gsap.set(marker, { y: link.offsetTop, autoAlpha: 1 });
          return;
        }
        gsap
          .timeline({ defaults: { overwrite: "auto" } })
          .to(marker, { autoAlpha: 1, duration: 0.15 }, 0)
          .to(marker, { y: link.offsetTop, duration: 0.65, ease: "power3.inOut" }, 0)
          .fromTo(
            marker,
            { scaleY: 1.35, transformOrigin: "50% 50%" },
            { scaleY: 1, duration: 0.5, ease: "power2.out" },
            0.2,
          );
      };

      /* ------------------------------------ hover: the card plays */
      const cardOf = (target: EventTarget | null): HTMLElement | null =>
        target instanceof Element ? target.closest<HTMLElement>("[data-card], [data-result]") : null;
      const startCard = (card: HTMLElement) => {
        const frame = card.querySelector<HTMLElement>("[data-frame]");
        const film = filmOf(frame);
        if (!film || reduced || card.dataset.shown === undefined) {
          return;
        }
        film.play();
        const title = card.querySelector<HTMLElement>("[data-card-title]");
        if (title) {
          gsap.to(title, { fontWeight: 800, x: 2, duration: 0.2, ease: "power2.out", overwrite: "auto" });
        }
      };
      const stopCard = (card: HTMLElement) => {
        const frame = card.querySelector<HTMLElement>("[data-frame]");
        const film = filmOf(frame);
        if (!film || !frame) {
          return;
        }
        film.pause();
        film.seek(0);
        const time = frame.querySelector<HTMLElement>("[data-time]");
        if (time && frame.dataset.label) {
          time.textContent = frame.dataset.label;
        }
        const title = card.querySelector<HTMLElement>("[data-card-title]");
        if (title) {
          gsap.to(title, { x: 0, duration: 0.25, ease: "power2.out", overwrite: "auto", clearProps: "transform" });
        }
      };
      const over = contextSafe((event: PointerEvent) => {
        const card = cardOf(event.target);
        if (card && !card.contains(event.relatedTarget as Node | null)) {
          startCard(card);
        }
      });
      const out = contextSafe((event: PointerEvent) => {
        const card = cardOf(event.target);
        if (card && !card.contains(event.relatedTarget as Node | null)) {
          stopCard(card);
        }
      });
      const focusIn = contextSafe((event: FocusEvent) => {
        const card = cardOf(event.target);
        if (card) {
          startCard(card);
        }
      });
      const focusOut = contextSafe((event: FocusEvent) => {
        const card = cardOf(event.target);
        if (card && !card.contains(event.relatedTarget as Node | null)) {
          stopCard(card);
        }
      });
      root.addEventListener("pointerover", over);
      root.addEventListener("pointerout", out);
      root.addEventListener("focusin", focusIn);
      root.addEventListener("focusout", focusOut);
      cleanups.push(() => {
        root.removeEventListener("pointerover", over);
        root.removeEventListener("pointerout", out);
        root.removeEventListener("focusin", focusIn);
        root.removeEventListener("focusout", focusOut);
      });

      /* --------------------------------------- pick: switch channels */
      const pick = contextSafe((event: MouseEvent) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
          return;
        }
        const anchor = event.target instanceof Element ? event.target.closest("a[href='#watch']") : null;
        const card = cardOf(anchor);
        const id = card?.dataset.video;
        if (!anchor || !card || !id) {
          return;
        }
        stopCard(card);
        switchOff(card.querySelector<HTMLElement>("[data-frame]"));
        setCurrent(id);
      });
      root.addEventListener("click", pick);
      cleanups.push(() => root.removeEventListener("click", pick));

      /* ------------------------------------------------ the player */
      const playerFrame = root.querySelector<HTMLElement>("[data-player-frame]");
      const scrub = root.querySelector<HTMLElement>("[data-scrub]");
      const cursor = root.querySelector<HTMLElement>("[data-scrub-cursor]");
      const readout = root.querySelector<HTMLElement>("[data-scrub-readout]");
      if (cursor) {
        gsap.set(cursor, { autoAlpha: 0 });
      }
      if (scrub && cursor && readout) {
        const moveX = gsap.quickTo(cursor, "x", { duration: 0.15, ease: "power3.out" });
        const fractionAt = (event: PointerEvent) => {
          const rect = scrub.getBoundingClientRect();
          return gsap.utils.clamp(0, 1, (event.clientX - rect.left) / rect.width);
        };
        const move = contextSafe((event: PointerEvent) => {
          const film = player.current;
          if (!film) {
            return;
          }
          const fraction = fractionAt(event);
          const x = fraction * scrub.clientWidth;
          if (reduced) {
            gsap.set(cursor, { x });
          } else {
            moveX(x);
          }
          readout.textContent = timecode(fraction * film.duration);
          readout.dataset.side = fraction > 0.75 ? "left" : "right";
        });
        const enter = contextSafe((event: PointerEvent) => {
          move(event);
          gsap.to(cursor, { autoAlpha: 1, duration: reduced ? 0 : 0.15, overwrite: "auto" });
        });
        const leave = contextSafe(() => {
          gsap.to(cursor, { autoAlpha: 0, duration: reduced ? 0 : 0.2, overwrite: "auto" });
        });
        const seek = contextSafe((event: PointerEvent) => {
          const film = player.current;
          if (!film) {
            return;
          }
          film.seek(fractionAt(event) * film.duration);
          // A nudge on the head, so the seek is felt.
          const head = playerFrame?.querySelector<HTMLElement>("[data-head]");
          if (head && !reduced) {
            gsap.fromTo(head, { scale: 1.8 }, { scale: 1, duration: 0.4, ease: "back.out(3)", overwrite: "auto" });
          }
        });
        scrub.addEventListener("pointerenter", enter);
        scrub.addEventListener("pointermove", move);
        scrub.addEventListener("pointerleave", leave);
        scrub.addEventListener("pointerdown", seek);
        cleanups.push(() => {
          scrub.removeEventListener("pointerenter", enter);
          scrub.removeEventListener("pointermove", move);
          scrub.removeEventListener("pointerleave", leave);
          scrub.removeEventListener("pointerdown", seek);
        });
      }

      /** The player and everything around it arrive. */
      const playerIn = (): gsap.core.Timeline => {
        const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
        const block = root.querySelector<HTMLElement>("[data-player]");
        if (!block) {
          return tl;
        }
        const title = block.querySelector<HTMLElement>("[data-watch-title]");
        const meta = block.querySelectorAll<HTMLElement>("[data-watch-meta]");
        const actions = block.querySelectorAll<HTMLElement>("[data-watch-actions] > *");
        const ticks = block.querySelectorAll<HTMLElement>("[data-tick]");
        const mark = block.querySelector<HTMLElement>("[data-watch-channel] [data-mark]");
        const comments = block.querySelectorAll<HTMLElement>("[data-comment]");
        const fields = block.querySelectorAll<HTMLElement>("[data-comment-field]");
        const rule = block.querySelector<HTMLElement>("[data-comment-rule]");
        if (reduced) {
          tl.set(block.querySelectorAll("[data-arrive]"), { autoAlpha: 1 });
          tl.set(playerFrame, { autoAlpha: 1 });
          return tl;
        }
        tuneIn(playerFrame, 0, tl);
        tl.call(
          () => {
            player.current?.play();
            setPlaying(true);
          },
          [],
          0.45,
        );
        if (ticks.length > 0) {
          tl.fromTo(
            ticks,
            { scaleY: 0, transformOrigin: "50% 50%" },
            { scaleY: 1, duration: 0.3, ease: "back.out(3)", stagger: 0.06, clearProps: "transform" },
            0.6,
          );
        }
        if (title) {
          tl.add(linesMaskIn(title), 0.3);
        }
        if (meta.length > 0) {
          tl.set(meta, { autoAlpha: 1 }, 0.45);
          meta.forEach((el, i) => el.querySelectorAll<HTMLElement>("[data-live]").forEach((n) => resolve(n, 0.45 + i * 0.05, tl)));
        }
        if (actions.length > 0) {
          tl.set(actions[0]?.parentElement ?? actions, { autoAlpha: 1 }, 0.55).fromTo(
            actions,
            { autoAlpha: 0, y: 10 },
            { autoAlpha: 1, y: 0, duration: 0.35, ease: "power2.out", stagger: 0.07, clearProps: "transform" },
            0.55,
          );
        }
        const channelRow = block.querySelector<HTMLElement>("[data-watch-channel]");
        if (channelRow) {
          tl.set(channelRow, { autoAlpha: 1 }, 0.7);
          if (mark) {
            tl.fromTo(
              mark,
              { autoAlpha: 0, scale: 0.4 },
              { autoAlpha: 1, scale: 1, duration: 0.4, ease: "back.out(2.4)", clearProps: "transform" },
              0.7,
            );
          }
          channelRow.querySelectorAll<HTMLElement>("[data-live]").forEach((n) => resolve(n, 0.75, tl));
        }
        const description = block.querySelector<HTMLElement>("[data-watch-description]");
        if (description) {
          tl.fromTo(
            description,
            { autoAlpha: 0, y: 8 },
            { autoAlpha: 1, y: 0, duration: 0.4, ease: "power2.out", clearProps: "transform" },
            0.9,
          );
        }
        if (rule) {
          tl.fromTo(
            rule,
            { scaleX: 0, transformOrigin: "0% 50%" },
            { scaleX: 1, duration: 0.7, ease: "power3.inOut", clearProps: "transform" },
            1,
          );
        }
        if (fields.length > 0) {
          tl.set(fields, { autoAlpha: 1 }, 1);
          fields.forEach((f) => f.querySelectorAll<HTMLElement>("[data-live]").forEach((n) => resolve(n, 1, tl)));
        }
        if (comments.length > 0) {
          tl.fromTo(
            comments,
            { autoAlpha: 0, x: -14 },
            { autoAlpha: 1, x: 0, duration: 0.35, ease: "power2.out", stagger: 0.09, clearProps: "transform" },
            1.1,
          );
          comments.forEach((c, i) => c.querySelectorAll<HTMLElement>("[data-live]").forEach((n) => resolve(n, 1.15 + i * 0.09, tl)));
        }
        return tl;
      };

      /* ------------------------------------------------ the banner */
      const bannerIn = (): gsap.core.Timeline => {
        const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
        const block = root.querySelector<HTMLElement>("[data-channel-block]");
        if (!block) {
          return tl;
        }
        const banner = block.querySelector<HTMLElement>("[data-banner]");
        const name = block.querySelector<HTMLElement>("[data-channel-name]");
        const mark = block.querySelector<HTMLElement>("[data-channel-mark]");
        const facts = block.querySelectorAll<HTMLElement>("[data-channel-fact]");
        const tabs = block.querySelectorAll<HTMLElement>("[data-channel-tabs] > *");
        if (reduced) {
          tl.set(block.querySelectorAll("[data-arrive]"), { autoAlpha: 1 });
          tl.set(banner, { autoAlpha: 1 });
          return tl;
        }
        tuneIn(banner, 0, tl);
        tl.call(
          () => {
            filmOf(banner)?.play();
          },
          [],
          0.4,
        );
        if (name) {
          tl.add(charsRiseIn(name), 0.35);
        }
        if (mark) {
          tl.fromTo(
            mark,
            { autoAlpha: 0, scale: 0.3, rotation: -12 },
            { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.5, ease: "back.out(2)", clearProps: "transform" },
            0.6,
          );
        }
        if (facts.length > 0) {
          tl.set(facts, { autoAlpha: 1 }, 0.7);
          facts.forEach((f, i) => f.querySelectorAll<HTMLElement>("[data-live]").forEach((n) => resolve(n, 0.7 + i * 0.06, tl)));
        }
        if (tabs.length > 0) {
          tl.set(tabs[0]?.parentElement ?? tabs, { autoAlpha: 1 }, 0.85).fromTo(
            tabs,
            { autoAlpha: 0, y: 10 },
            { autoAlpha: 1, y: 0, duration: 0.35, ease: "power2.out", stagger: 0.06, clearProps: "transform" },
            0.85,
          );
        }
        return tl;
      };

      /* ------------------------------------------------ the search */
      const input = root.querySelector<HTMLInputElement>("[data-search-input]");
      const armSearch = () => {
        searchArmed.current = true;
        const rows = q<HTMLElement>("[data-result]").filter((row) => row.style.display !== "none");
        ScrollTrigger.batch(rows, {
          start: "top 90%",
          once: true,
          interval: 0.08,
          batchMax: 4,
          onEnter: (batch) => cardsIn(batch as HTMLElement[]),
        });
        ScrollTrigger.refresh();
      };
      let typing: gsap.core.Timeline | null = null;
      const typeQuery = () => {
        const line = root.querySelector<HTMLElement>("[data-search-rule]");
        if (reduced || !input) {
          setQuery(SEARCH_QUERY);
          armSearch();
          return;
        }
        const proxy = { n: 0 };
        typing = gsap.timeline({ defaults: { overwrite: "auto" } });
        if (line) {
          typing.fromTo(
            line,
            { scaleX: 0, transformOrigin: "0% 50%" },
            { scaleX: 1, duration: 0.9, ease: "power3.inOut", clearProps: "transform" },
            0,
          );
        }
        typing
          .to(
            proxy,
            {
              n: SEARCH_QUERY.length,
              duration: SEARCH_QUERY.length * 0.11,
              ease: "none",
              snap: "n",
              onUpdate: () => setQuery(SEARCH_QUERY.slice(0, proxy.n)),
            },
            0.4,
          )
          .call(armSearch, [], `+=${0.2}`);
      };

      /* ------------------------------------- scroll, armed at idle */
      const armScroll = () => {
        scrollRevealBatch("[data-reveal]", root);
        sections.forEach((section, index) => {
          if (index > 0) {
            ScrollTrigger.create({
              trigger: section,
              start: "top 85%",
              once: true,
              onEnter: () => chapterIn(section),
            });
          }
          ScrollTrigger.create({
            trigger: section,
            start: "top 45%",
            end: "bottom 45%",
            onToggle: (self) => {
              if (self.isActive) {
                driftTo(index);
              }
            },
          });
        });
        if (reduced) {
          gsap.set(q("[data-card], [data-frame], [data-arrive]"), { autoAlpha: 1 });
          q<HTMLElement>("[data-card], [data-result]").forEach((card) => {
            card.dataset.shown = "";
          });
        } else {
          ScrollTrigger.batch("[data-card]", {
            start: "top 88%",
            once: true,
            interval: 0.1,
            batchMax: 6,
            onEnter: (batch) => cardsIn(batch as HTMLElement[]),
          });
        }
        const playerBlock = root.querySelector<HTMLElement>("[data-player]");
        if (playerBlock) {
          ScrollTrigger.create({ trigger: playerBlock, start: "top 75%", once: true, onEnter: playerIn });
        }
        const channelBlock = root.querySelector<HTMLElement>("[data-channel-block]");
        if (channelBlock) {
          ScrollTrigger.create({ trigger: channelBlock, start: "top 80%", once: true, onEnter: bannerIn });
        }
        const searchBlock = root.querySelector<HTMLElement>("[data-search-block]");
        if (searchBlock) {
          ScrollTrigger.create({ trigger: searchBlock, start: "top 75%", once: true, onEnter: typeQuery });
        }
      };

      /* ------------------------------------------------- arrival */
      let arrival: gsap.core.Timeline | null = null;
      const arrive = (): gsap.core.Timeline => {
        const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
        const chips = q<HTMLElement>("[data-arrive='chips'] > *");
        const feed = sections[0];
        if (reduced) {
          tl.set(q("[data-arrive]"), { autoAlpha: 1 });
          return tl;
        }
        if (feed) {
          const rule = feed.querySelector<HTMLElement>("[data-rule]");
          if (rule) {
            tl.set(rule, { autoAlpha: 1 }, 0).to(
              rule,
              { scaleX: 1, duration: 0.7, ease: "power3.inOut", clearProps: "transform" },
              0,
            );
          }
        }
        if (chips.length > 0) {
          tl.set(chips[0]?.parentElement ?? chips, { autoAlpha: 1 }, 0.15).fromTo(
            chips,
            { autoAlpha: 0, y: 10 },
            { autoAlpha: 1, y: 0, duration: 0.35, ease: "power2.out", stagger: 0.06, clearProps: "transform" },
            0.15,
          );
        }
        const date = root.querySelector<HTMLElement>("[data-feed-date]");
        if (date) {
          tl.set(date, { autoAlpha: 1 }, 0.1);
          date.querySelectorAll<HTMLElement>("[data-live]").forEach((n) => resolve(n, 0.1, tl));
        }
        return tl;
      };

      const unwatch = watchPageTransition(root, {
        onIdle: contextSafe(() => {
          idle.current = true;
          syncAll();
          arrival = arrive();
          armScroll();
        }),
        onExiting: () => {
          idle.current = false;
          arrival?.kill();
          typing?.kill();
          registry.forEach((film) => film.pause());
          gsap.to(q("[data-arrive], [data-reveal], [data-frame]"), { autoAlpha: 0, duration: 0.2, overwrite: "auto" });
        },
      });

      /* --------------------------------------------------- chips */
      for (const chip of q<HTMLElement>("[data-chip]")) {
        const label = chip.querySelector<HTMLElement>("[data-chip-label]") ?? chip;
        let armed = true;
        const wave = contextSafe(() => {
          if (reduced || !armed) {
            return;
          }
          armed = false;
          charsWeightWave(label);
        });
        const rearm = () => {
          armed = true;
        };
        chip.addEventListener("pointerenter", wave);
        chip.addEventListener("pointerleave", rearm);
        chip.addEventListener("focus", wave);
        chip.addEventListener("blur", rearm);
        cleanups.push(() => {
          chip.removeEventListener("pointerenter", wave);
          chip.removeEventListener("pointerleave", rearm);
          chip.removeEventListener("focus", wave);
          chip.removeEventListener("blur", rearm);
        });
      }

      return () => {
        unwatch();
        cleanups.forEach((fn) => fn());
        arrival?.kill();
        typing?.kill();
        registry.forEach((film) => film.destroy());
        registry.clear();
        player.current = null;
      };
    },
    { scope },
  );

  /* -------------------------------------- the player: a new video */
  useGSAP(
    () => {
      const root = scope.current;
      const film = player.current;
      if (!root || !film || previous.current === current) {
        return;
      }
      previous.current = current;
      const next = findVideo(current);
      const reduced = reducedRef.current;
      const frame = root.querySelector<HTMLElement>("[data-player-frame]");
      film.pause();
      setPlaying(false);
      film.setScene(next.scene, next.seed, toSeconds(next.duration));
      if (reduced || !frame) {
        return;
      }
      const block = root.querySelector<HTMLElement>("[data-player]");
      const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
      // The picture goes to static and comes back as the new one.
      tl.to(film.tune, { noise: 1, duration: 0.18, ease: "power2.in" }, 0)
        .fromTo(
          frame,
          { scaleY: 1 },
          { scaleY: 0.02, scaleX: 1.04, transformOrigin: "50% 50%", duration: 0.22, ease: "power4.in" },
          0.1,
        )
        .fromTo(
          frame,
          { scaleY: 0.02, scaleX: 1.04 },
          { scaleY: 1, scaleX: 1, duration: 0.5, ease: "power4.out", clearProps: "transform" },
          0.5,
        )
        .to(film.tune, { noise: 0, duration: TUNE, ease: "power2.in" }, 0.7)
        .call(
          () => {
            film.play();
            setPlaying(true);
          },
          [],
          1,
        );
      if (block) {
        const title = block.querySelector<HTMLElement>("[data-watch-title]");
        const ticks = block.querySelectorAll<HTMLElement>("[data-tick]");
        if (title) {
          tl.add(linesMaskIn(title), 0.5);
        }
        block.querySelectorAll<HTMLElement>("[data-live]").forEach((n, i) => resolve(n, 0.5 + Math.min(i * 0.03, 0.4), tl));
        if (ticks.length > 0) {
          tl.fromTo(
            ticks,
            { scaleY: 0, transformOrigin: "50% 50%" },
            { scaleY: 1, duration: 0.3, ease: "back.out(3)", stagger: 0.06, clearProps: "transform" },
            0.9,
          );
        }
        const mark = block.querySelector<HTMLElement>("[data-watch-channel] [data-mark]");
        if (mark) {
          tl.fromTo(
            mark,
            { scale: 0.4, autoAlpha: 0 },
            { scale: 1, autoAlpha: 1, duration: 0.4, ease: "back.out(2.4)", clearProps: "transform" },
            0.7,
          );
        }
      }
    },
    { scope, dependencies: [current] },
  );

  /* ------------------------------------------- play and pause */
  useGSAP(
    () => {
      const root = scope.current;
      if (!root) {
        return;
      }
      const reduced = reducedRef.current;
      const play = root.querySelector<HTMLElement>("[data-glyph='play']");
      const pause = root.querySelector<HTMLElement>("[data-glyph='pause']");
      const bars = gsap.utils.toArray<HTMLElement>("[data-level]", root);
      if (play && pause) {
        const on = playing ? pause : play;
        const off = playing ? play : pause;
        if (reduced) {
          gsap.set(on, { autoAlpha: 1, scale: 1 });
          gsap.set(off, { autoAlpha: 0 });
        } else {
          gsap.to(off, { autoAlpha: 0, scale: 0.5, duration: 0.12, ease: "power2.in", overwrite: "auto" });
          gsap.fromTo(
            on,
            { autoAlpha: 0, scale: 0.5 },
            { autoAlpha: 1, scale: 1, duration: 0.3, ease: "back.out(2.4)", overwrite: "auto", delay: 0.08 },
          );
        }
      }
      if (bars.length === 0 || reduced) {
        return;
      }
      if (!playing) {
        gsap.to(bars, { scaleY: 0.15, duration: 0.3, ease: "power2.out", overwrite: "auto", stagger: 0.03 });
        return;
      }
      const tweens = bars.map((bar, i) =>
        gsap.to(bar, {
          scaleY: () => rnd(0.2, 1),
          duration: () => rnd(0.12, 0.28),
          ease: "sine.inOut",
          repeat: -1,
          repeatRefresh: true,
          yoyo: true,
          delay: i * 0.04,
          overwrite: "auto",
        }),
      );
      return () => {
        tweens.forEach((t) => t.kill());
      };
    },
    { scope, dependencies: [playing] },
  );

  /* -------------------------------------------- search: the query */
  useGSAP(
    () => {
      const root = scope.current;
      if (!root) {
        return;
      }
      const reduced = reducedRef.current;
      const needle = query.trim().toLowerCase();
      const count = root.querySelector<HTMLElement>("[data-search-count]");
      const rows = gsap.utils.toArray<HTMLElement>("[data-result]", root);
      let changed = false;
      rows.forEach((row) => {
        const id = row.dataset.result ?? "";
        const item = findVideo(id);
        const hay = `${item.title} ${channelOf(item).name}`.toLowerCase();
        const match = needle === "" || hay.includes(needle);
        const visible = row.style.display !== "none";
        const shown = row.dataset.shown !== undefined;
        if (match && !visible) {
          changed = true;
          gsap.set(row, { display: "" });
          const canvas = row.querySelector<HTMLCanvasElement>("canvas[data-film]");
          const film = canvas ? films.current.get(canvas) : null;
          film?.sync();
          if (reduced) {
            gsap.set(row, { autoAlpha: 1 });
            row.dataset.shown = "";
          } else if (shown) {
            gsap.fromTo(row, { autoAlpha: 0, x: 16 }, { autoAlpha: 1, x: 0, duration: 0.3, ease: "power2.out", overwrite: "auto", clearProps: "transform" });
          } else if (searchArmed.current) {
            // Never seen: it tunes in like any other card.
            row.dataset.shown = "";
            const frame = row.querySelector<HTMLElement>("[data-frame]");
            const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
            tl.set(row, { autoAlpha: 1 });
            if (frame && film) {
              film.tune.noise = 1;
              tl.fromTo(
                frame,
                { autoAlpha: 1, scaleY: 0.02, scaleX: 1.04, transformOrigin: "50% 50%" },
                { scaleY: 1, scaleX: 1, duration: 0.5, ease: "power4.out", clearProps: "transform" },
                0,
              ).to(film.tune, { noise: 0, duration: TUNE, ease: "power2.in" }, 0.2);
            }
            const title = row.querySelector<HTMLElement>("[data-card-title]");
            if (title) {
              tl.add(linesMaskIn(title), 0.3);
            }
            tl.fromTo(
              row.querySelectorAll("[data-card-meta], [data-mark]"),
              { autoAlpha: 0, y: 8 },
              { autoAlpha: 1, y: 0, duration: 0.3, ease: "power2.out", stagger: 0.06, clearProps: "transform" },
              0.4,
            );
          }
        } else if (!match && visible) {
          changed = true;
          if (shown && !reduced) {
            gsap.to(row, {
              autoAlpha: 0,
              x: -16,
              duration: 0.2,
              ease: "power2.in",
              overwrite: "auto",
              onComplete: () => gsap.set(row, { display: "none", clearProps: "transform" }),
            });
          } else {
            gsap.set(row, { display: "none" });
          }
        }
      });
      if (count && !reduced && searchArmed.current) {
        resolve(count);
      }
      if (changed) {
        gsap.delayedCall(0.35, () => ScrollTrigger.refresh());
      }
    },
    { scope, dependencies: [query] },
  );

  /* ---------------------------------------------- interactions */
  const togglePlay = () => {
    const film = player.current;
    if (!film) {
      return;
    }
    if (film.playing) {
      film.pause();
      setPlaying(false);
    } else {
      film.play();
      setPlaying(true);
    }
  };

  const like = (event: ReactMouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    setLiked((value) => !value);
    if (reducedRef.current) {
      return;
    }
    const glyph = button.querySelector("[data-thumb]");
    const count = button.querySelector<HTMLElement>("[data-like-count]");
    if (glyph) {
      gsap
        .timeline({ defaults: { overwrite: "auto" } })
        .to(glyph, { scale: 1.5, rotation: liked ? 0 : -12, duration: 0.14, ease: "power2.out" })
        .to(glyph, { scale: 1, rotation: 0, duration: 0.6, ease: "elastic.out(1, 0.4)", clearProps: "transform" });
    }
    if (count) {
      // The count re-renders on the next paint; scramble to whatever it then says.
      gsap.delayedCall(0, () => resolve(count));
    }
  };

  const subscribe = (id: string) => (event: ReactMouseEvent<HTMLButtonElement>) => {
    const button = event.currentTarget;
    setSubscribed((value) => ({ ...value, [id]: !value[id] }));
    if (reducedRef.current) {
      return;
    }
    const bell = button.parentElement?.querySelector("[data-bell]");
    const label = button.querySelector<HTMLElement>("[data-subscribe-label]");
    if (bell) {
      ring(bell);
    }
    if (label) {
      gsap.delayedCall(0, () => resolve(label));
    }
    gsap
      .timeline({ defaults: { overwrite: "auto" } })
      .to(button, { scale: 0.94, duration: 0.1, ease: "power2.in" })
      .to(button, { scale: 1, duration: 0.5, ease: "elastic.out(1, 0.45)", clearProps: "transform" });
  };

  const results = VIDEOS.filter((item) => {
    const needle = query.trim().toLowerCase();
    return needle === "" || `${item.title} ${channelOf(item).name}`.toLowerCase().includes(needle);
  });

  const played = timecode(0);

  return (
    <div ref={scope} className="@container">
      {/* The chrome */}
      <header
        data-page-transition
        className="sticky top-0 z-30 -mx-gutter border-b border-border bg-canvas px-gutter sm:-mx-gutter-lg sm:px-gutter-lg"
      >
        <div className="flex min-h-14 flex-wrap items-center gap-x-6 gap-y-2 py-2">
          <a href="#top" className="shrink-0 font-mono text-base font-extrabold uppercase tracking-[0.24em] text-foreground">
            Tube
          </a>
          <span aria-hidden="true" className="hidden h-6 w-px bg-border sm:block" />
          <form role="search" className="hidden min-w-0 flex-1 sm:block" onSubmit={(event) => event.preventDefault()}>
            <label className="sr-only" htmlFor="tube-search">
              Search
            </label>
            <input
              id="tube-search"
              type="search"
              placeholder="SEARCH"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className={`${MONO_LABEL} h-9 w-full max-w-md rounded-lg border-2 border-foreground bg-transparent px-3.5 text-foreground placeholder:text-muted focus-visible:outline-offset-0`}
            />
          </form>
          <nav aria-label="Site" className="ml-auto flex items-center gap-x-5 sm:gap-x-7">
            {NAV.map((link) => (
              <a key={link} href="#top" className={`${MONO_LABEL} whitespace-nowrap text-foreground transition-colors hover:text-muted`}>
                {link}
              </a>
            ))}
          </nav>
        </div>
        <nav aria-label="Chapters" className="-mx-gutter overflow-x-auto px-gutter pb-3 lg:hidden">
          <ul className="flex gap-2">
            {CHAPTERS.map((chapter) => (
              <li key={chapter.id}>
                <a data-rail-link data-target={chapter.id} href={`#${chapter.id}`} className={CHIP_RAIL}>
                  <span>{chapter.number}</span>
                  <span>{chapter.title}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <div className="mt-6 grid grid-cols-12 gap-x-6">
        {/* The rail */}
        <nav data-page-transition aria-label="Chapters" className="sticky top-24 hidden self-start lg:col-span-2 lg:block">
          <ol data-rail className="relative">
            <span data-rail-marker aria-hidden="true" className="absolute top-0 left-0 h-9 w-full rounded-md bg-inverse" />
            {CHAPTERS.map((chapter) => (
              <li key={chapter.id}>
                <a
                  data-rail-link
                  data-chip
                  data-target={chapter.id}
                  href={`#${chapter.id}`}
                  className="relative z-10 flex h-9 items-center gap-4 rounded-md px-3 font-mono text-caption font-bold uppercase tracking-[0.08em] text-muted transition-colors hover:text-foreground data-[active=true]:text-inverse-foreground"
                >
                  <span>{chapter.number}</span>
                  <span data-chip-label>{chapter.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="col-span-12 lg:col-span-10">
          {/* 01 Feed */}
          <section id="feed" data-chapter className="scroll-mt-24">
            <ChapterHead chapter={CHAPTERS[0]} eager />
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
              <ul data-arrive="chips" className="flex flex-wrap gap-2" aria-label="Filter">
                {FILTERS.map((filter, index) => (
                  <li key={filter}>
                    <a href="#feed" data-chip aria-current={index === 0 ? "true" : undefined} className={index === 0 ? CHIP_SOLID : CHIP_OUTLINE}>
                      <span data-chip-label>{filter}</span>
                    </a>
                  </li>
                ))}
              </ul>
              <p data-feed-date data-arrive className={`${MONO_NOTE} text-muted`}>
                <span data-live="upper" className="text-foreground">{TODAY}</span> <span aria-hidden="true">·</span>{" "}
                <span data-live="digits">{FEED.length}</span> videos <span aria-hidden="true">·</span> recommended
              </p>
            </div>
            <ul className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3" aria-label="Videos">
              {FEED.map((item) => (
                <Card key={item.id} video={item} />
              ))}
            </ul>
          </section>

          {/* 02 Watch */}
          <section id="watch" data-chapter className="mt-section scroll-mt-24">
            <ChapterHead chapter={CHAPTERS[1]} />
            <div data-player className="mt-8 grid grid-cols-12 gap-x-6 gap-y-10">
              <div className="col-span-12 xl:col-span-8">
                {/* The player */}
                <div data-frame data-arrive data-player-frame data-live={video.live ? "" : undefined} className={`${FRAME} rounded-lg`}>
                  <canvas
                    data-film
                    data-player
                    data-scene={video.scene}
                    data-seed={video.seed}
                    data-duration={length}
                    role="img"
                    aria-label={`${video.title}, playing`}
                    className="absolute inset-0 h-full w-full font-sans"
                  />
                  <div data-controls className="absolute inset-x-0 bottom-0 px-4 pb-3 sm:px-6 sm:pb-4">
                    <div data-scrub className="relative h-8 cursor-pointer" role="slider" aria-label="Seek" aria-valuemin={0} aria-valuemax={length} aria-valuenow={0} tabIndex={0}>
                      <span aria-hidden="true" className="absolute inset-x-0 top-1/2 h-px bg-inverse-foreground opacity-40" />
                      <span data-played aria-hidden="true" className="absolute inset-x-0 top-1/2 h-0.5 origin-left -translate-y-px scale-x-0 bg-inverse-foreground" />
                      {marks.map((mark) => (
                        <span
                          key={`${current}-${mark.at}`}
                          data-tick
                          title={mark.title}
                          aria-hidden="true"
                          className="absolute top-1/2 h-2.5 w-0.5 -translate-y-1/2 bg-inverse-foreground"
                          style={{ left: `${((mark.at / length) * 100).toFixed(2)}%` }}
                        />
                      ))}
                      <span data-head aria-hidden="true" className="absolute top-1/2 left-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-inverse-foreground" />
                      <span data-scrub-cursor aria-hidden="true" className="pointer-events-none absolute top-0 left-0 h-full w-px bg-inverse-foreground">
                        <span
                          data-scrub-readout
                          className="absolute -top-5 left-2 whitespace-nowrap rounded-xs bg-inverse-foreground px-1 font-mono text-annotation font-bold tracking-[0.08em] text-inverse data-[side=left]:right-2 data-[side=left]:left-auto"
                        />
                      </span>
                    </div>
                    <div className="flex items-center gap-3 sm:gap-5">
                      <button
                        type="button"
                        onClick={togglePlay}
                        aria-pressed={playing}
                        aria-label={playing ? "Pause" : "Play"}
                        className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border-2 border-inverse-foreground text-inverse-foreground transition-colors hover:bg-inverse-foreground/15"
                      >
                        <svg data-glyph="play" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" className="absolute">
                          <path d="M3 1.5v13L14 8Z" fill="currentColor" />
                        </svg>
                        <svg data-glyph="pause" viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" className="absolute opacity-0">
                          <rect x="2.5" y="1.5" width="4" height="13" fill="currentColor" />
                          <rect x="9.5" y="1.5" width="4" height="13" fill="currentColor" />
                        </svg>
                      </button>
                      <span data-levels aria-hidden="true" className="flex h-6 items-end gap-0.5">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <span key={i} data-level className="block h-full w-1 origin-bottom scale-y-[0.15] bg-inverse-foreground" />
                        ))}
                      </span>
                      <span className={`${MONO_NOTE} text-inverse-foreground`}>
                        <span data-clock>{played}</span> <span aria-hidden="true">/</span>{" "}
                        <span data-live="digits">{video.live ? "Live" : video.duration}</span>
                      </span>
                      <span className="ml-auto hidden items-center gap-2 sm:flex">
                        {["Settings", "Theater", "Full"].map((control) => (
                          <button key={control} type="button" className={CHIP_ON_FRAME}>
                            {control}
                          </button>
                        ))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Beneath the player */}
                <h3
                  data-watch-title
                  data-arrive
                  className="mt-6 max-w-[22ch] font-sans text-[clamp(1.75rem,4cqi,3rem)] leading-[1] font-extrabold tracking-[-0.03em] text-pretty"
                >
                  {video.title}
                </h3>
                <p data-watch-meta data-arrive className={`${MONO_NOTE} mt-3 text-muted`}>
                  <span data-live="digits" className="text-foreground">{video.views}</span> <span aria-hidden="true">·</span>{" "}
                  <span data-live="upper">{video.age}</span> <span aria-hidden="true">·</span>{" "}
                  <span data-live="upper">{video.kind}</span>
                </p>
                <ul data-watch-actions data-arrive className="mt-5 flex flex-wrap gap-2" aria-label="Actions">
                  <li>
                    <button type="button" onClick={like} aria-pressed={liked} className={CHIP_TOGGLE}>
                      <svg data-thumb viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
                        <path d="M1.5 7h3v7h-3zM4.5 7.5 7.5 1.5c1 0 2 .7 2 2V6h3.5c.9 0 1.6.8 1.5 1.7l-.8 5.1c-.1.7-.7 1.2-1.5 1.2H4.5" />
                      </svg>
                      <span data-like-count data-live="digits">{likes}</span>
                    </button>
                  </li>
                  {ACTIONS.slice(1).map((action) => (
                    <li key={action.id}>
                      <button type="button" data-chip className={CHIP_OUTLINE}>
                        <span data-chip-label>{action.label}</span>
                      </button>
                    </li>
                  ))}
                </ul>
                <div data-watch-channel data-arrive className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-4 border-y border-border py-5">
                  <Mark mark={channel.mark} size="lg" />
                  <div className="min-w-0">
                    <p className="font-sans text-title font-extrabold tracking-[-0.01em]">
                      <span data-live="upper">{channel.name}</span>
                    </p>
                    <p className={`${MONO_NOTE} mt-1 text-muted`}>
                      <span data-live="digits">{channel.subscribers}</span> subscribers <span aria-hidden="true">·</span>{" "}
                      <span data-live="digits">{channel.videos}</span> videos
                    </p>
                  </div>
                  <Subscribe id={channel.id} on={subscribed[channel.id] ?? false} onClick={subscribe(channel.id)} className="sm:ml-auto" />
                </div>
                <p data-watch-description data-arrive className="mt-5 max-w-[60ch] font-sans text-body text-pretty text-muted">
                  {DESCRIPTION}
                </p>
                <ol data-arrive className="mt-3 flex flex-wrap gap-x-5 gap-y-1" aria-label="Chapters in this video">
                  {marks.map((mark) => (
                    <li key={mark.at} className={`${MONO_NOTE} text-muted`}>
                      <span className="text-foreground">{timecode(mark.at)}</span> {mark.title}
                    </li>
                  ))}
                </ol>

                {/* Comments */}
                <div className="mt-10">
                  <div data-comment-field data-arrive className="flex flex-wrap items-baseline justify-between gap-4">
                    <p className="font-sans text-title font-extrabold tracking-[-0.01em]">
                      <span data-live="digits">{COMMENT_COUNT}</span> comments
                    </p>
                    <ul className="flex gap-2" aria-label="Sort comments">
                      {COMMENT_SORTS.map((sort, index) => (
                        <li key={sort}>
                          <a href="#watch" data-chip aria-current={index === 0 ? "true" : undefined} className={index === 0 ? CHIP_SOLID : CHIP_OUTLINE}>
                            <span data-chip-label>{sort}</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div data-comment-field data-arrive className="mt-6 flex items-start gap-4">
                    <Mark mark="YO" />
                    <div className="min-w-0 flex-1">
                      <label className="sr-only" htmlFor="tube-comment">
                        Add a comment
                      </label>
                      <input
                        id="tube-comment"
                        type="text"
                        placeholder="ADD A COMMENT"
                        className={`${MONO_LABEL} h-9 w-full bg-transparent text-foreground placeholder:text-muted focus-visible:outline-none`}
                      />
                      <span data-comment-rule aria-hidden="true" className="block h-px w-full bg-foreground" />
                    </div>
                  </div>
                  <ol className="mt-6" aria-label="Comments">
                    {COMMENTS.map((comment) => (
                      <li key={comment.id} data-comment data-arrive className="flex items-start gap-4 border-b border-border py-5">
                        <Mark mark={comment.mark} />
                        <div className="min-w-0">
                          <p className={`${MONO_NOTE} text-muted`}>
                            <span className="font-bold text-foreground">{comment.handle}</span> <span aria-hidden="true">·</span>{" "}
                            <span data-live="upper">{comment.age}</span>
                          </p>
                          <p className="mt-2 max-w-[60ch] font-sans text-body text-pretty">{comment.text}</p>
                          <p className={`${MONO_NOTE} mt-2 flex gap-4 text-muted`}>
                            <span>
                              <span data-live="digits" className="text-foreground">{comment.likes}</span> likes
                            </span>
                            {comment.replies ? <span data-live="digits">{comment.replies}</span> : null}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {/* Up next */}
              <aside className="col-span-12 xl:col-span-4" aria-label="Up next">
                <div data-reveal className="flex items-center justify-between gap-4">
                  <Label as="p" className="font-bold text-foreground">
                    Up next
                  </Label>
                  <button type="button" data-chip aria-pressed="true" className={CHIP_TOGGLE}>
                    <span data-chip-label>Autoplay</span>
                  </button>
                </div>
                <ol className="mt-4 border-t border-border">
                  {UP_NEXT.map((item) => (
                    <Card key={item.id} video={item} row />
                  ))}
                </ol>
              </aside>
            </div>
          </section>

          {/* 03 Channel */}
          <section id="channel" data-chapter className="mt-section scroll-mt-24">
            <ChapterHead chapter={CHAPTERS[2]} />
            <div data-channel-block className="mt-8">
              <div data-frame data-arrive data-banner className="relative aspect-[2/1] overflow-hidden rounded-lg bg-inverse text-inverse-foreground sm:aspect-[4/1]">
                <canvas
                  data-film
                  data-scene={CHANNEL.scene}
                  data-seed={CHANNEL.seed}
                  data-duration={600}
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full font-sans"
                />
                <p
                  data-channel-name
                  data-arrive
                  className={`${DISPLAY} absolute bottom-4 left-5 text-[clamp(2.5rem,8cqi,7rem)] text-inverse-foreground sm:bottom-6 sm:left-8`}
                >
                  {CHANNEL.name}
                </p>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-5">
                <span data-channel-mark data-arrive className="inline-flex">
                  <Mark mark={CHANNEL.mark} size="xl" />
                </span>
                <div className="min-w-0">
                  <p data-channel-fact data-arrive className={`${MONO_NOTE} text-muted`}>
                    <span data-live="upper" className="text-foreground">{CHANNEL.handle}</span> <span aria-hidden="true">·</span>{" "}
                    <span data-live="digits" className="text-foreground">{CHANNEL.subscribers}</span> subscribers{" "}
                    <span aria-hidden="true">·</span> <span data-live="digits" className="text-foreground">{CHANNEL.videos}</span> videos{" "}
                    <span aria-hidden="true">·</span> <span data-live="upper">{CHANNEL.joined}</span>
                  </p>
                  <p data-channel-fact data-arrive className="mt-2 max-w-[60ch] font-sans text-body text-pretty text-muted">
                    {CHANNEL.about}
                  </p>
                </div>
                <span data-channel-fact data-arrive className="inline-flex sm:ml-auto">
                  <Subscribe id={`channel-${CHANNEL.id}`} on={subscribed[`channel-${CHANNEL.id}`] ?? false} onClick={subscribe(`channel-${CHANNEL.id}`)} />
                </span>
              </div>
              <ul data-channel-tabs data-arrive className="mt-6 flex flex-wrap gap-2 border-b border-border pb-6" aria-label="Channel sections">
                {TABS.map((tab, index) => (
                  <li key={tab}>
                    <a href="#channel" data-chip aria-current={index === 0 ? "true" : undefined} className={index === 0 ? CHIP_SOLID : CHIP_OUTLINE}>
                      <span data-chip-label>{tab}</span>
                    </a>
                  </li>
                ))}
              </ul>
              <ul className="mt-8 grid gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3" aria-label="Channel videos">
                {CHANNEL_VIDEOS.map((item) => (
                  <Card key={`channel-${item.id}`} video={item} />
                ))}
              </ul>
            </div>
          </section>

          {/* 04 Search */}
          <section id="search" data-chapter className="mt-section scroll-mt-24">
            <ChapterHead chapter={CHAPTERS[3]} />
            <div data-search-block className="mt-8">
              <form data-reveal role="search" onSubmit={(event) => event.preventDefault()}>
                <label className="sr-only" htmlFor="tube-query">
                  Search
                </label>
                <input
                  id="tube-query"
                  data-search-input
                  type="search"
                  autoComplete="off"
                  placeholder="SEARCH"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className={`${DISPLAY} w-full bg-transparent pb-3 text-[clamp(2.5rem,8cqi,7rem)] text-foreground placeholder:text-border focus-visible:outline-none`}
                />
                <span data-search-rule aria-hidden="true" className="block h-0.5 w-full bg-foreground" />
              </form>
              <div data-reveal className="mt-5 flex flex-wrap items-center justify-between gap-4">
                <p className={`${MONO_NOTE} text-muted`} aria-live="polite">
                  <span data-search-count className="font-bold text-foreground">{`${results.length} results`}</span>{" "}
                  <span aria-hidden="true">·</span> in 0.31 seconds
                </p>
                <ul className="flex flex-wrap gap-2" aria-label="Sort results">
                  {SEARCH_FILTERS.map((filter, index) => (
                    <li key={filter}>
                      <a href="#search" data-chip aria-current={index === 0 ? "true" : undefined} className={index === 0 ? CHIP_SOLID : CHIP_OUTLINE}>
                        <span data-chip-label>{filter}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <ol className="mt-6 border-t border-border" aria-label="Results">
                {VIDEOS.map((item) => (
                  <Card key={`result-${item.id}`} video={item} row result />
                ))}
              </ol>
            </div>
          </section>

          <div data-reveal className="mt-section flex flex-wrap gap-4 border-t border-border pt-10">
            <a className={BUTTON_SOLID} href="#top">
              Back to top
            </a>
            <a className={BUTTON_OUTLINE} href="/showcase/github">
              Repo
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- pieces */

function ChapterHead({ chapter, eager = false }: { chapter: (typeof CHAPTERS)[number]; eager?: boolean }) {
  const title = `${DISPLAY} mt-3 text-[clamp(2.75rem,8.5cqi,7.5rem)]`;
  if (eager) {
    return (
      <div>
        <p data-page-transition className="font-mono text-caption uppercase tracking-[0.08em] text-muted">
          {chapter.number} <span aria-hidden="true">/</span> {String(CHAPTERS.length).padStart(2, "0")}
        </p>
        <h2 data-page-transition="letters" className={title}>
          {chapter.title}
        </h2>
        <span data-rule data-arrive aria-hidden="true" className="mt-4 block h-px w-full bg-foreground" />
      </div>
    );
  }
  return (
    <div data-reveal>
      <p className="font-mono text-caption uppercase tracking-[0.08em] text-muted">
        {chapter.number} <span aria-hidden="true">/</span> {String(CHAPTERS.length).padStart(2, "0")}
      </p>
      <h2 data-title data-arrive className={title}>
        {chapter.title}
      </h2>
      <span data-rule aria-hidden="true" className="mt-4 block h-px w-full bg-foreground" />
    </div>
  );
}

/** Two letters in a square: the avatar. */
function Mark({ mark, size = "md" }: { mark: string; size?: "md" | "lg" | "xl" }) {
  const box = size === "xl" ? "h-20 w-20 text-2xl" : size === "lg" ? "h-12 w-12 text-base" : "h-9 w-9 text-[11px]";
  return (
    <span
      data-mark
      aria-hidden="true"
      className={`${box} inline-flex shrink-0 items-center justify-center rounded-sm border-2 border-foreground font-mono font-bold uppercase tracking-[0.04em] text-foreground`}
    >
      {mark}
    </span>
  );
}

function Subscribe({
  id,
  on,
  onClick,
  className = "",
}: {
  id: string;
  on: boolean;
  onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <button type="button" id={`subscribe-${id}`} onClick={onClick} aria-pressed={on} className={on ? CHIP_OUTLINE : CHIP_SOLID}>
        <span data-subscribe-label data-live="upper">
          {on ? "Subscribed" : "Subscribe"}
        </span>
      </button>
      <span
        data-bell
        aria-hidden="true"
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border-2 border-foreground text-foreground"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round">
          <path d="M3.5 11V7a4.5 4.5 0 0 1 9 0v4l1 1.5h-11zM6.5 14h3" />
        </svg>
      </span>
    </span>
  );
}

/** The footage in its frame: a strict 16:9, a progress hairline, a timecode badge. */
function Frame({ video, className = "" }: { video: Video; className?: string }) {
  return (
    <div data-frame data-label={video.duration} data-live={video.live ? "" : undefined} className={`${FRAME} ${className}`}>
      <canvas
        data-film
        data-scene={video.scene}
        data-seed={video.seed}
        data-duration={toSeconds(video.duration)}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full font-sans"
      />
      {video.live ? null : (
        <span data-progress aria-hidden="true" className="absolute bottom-0 left-0 h-0.5 w-full origin-left scale-x-0 bg-inverse-foreground" />
      )}
      <span
        className="absolute right-2 bottom-2 inline-flex h-5 items-center gap-1.5 rounded-xs bg-canvas px-1.5 font-mono text-annotation font-bold tracking-[0.08em] text-foreground"
      >
        {video.live ? <span aria-hidden="true" className="block h-1.5 w-1.5 rounded-full bg-foreground" /> : null}
        <span data-time>{video.duration}</span>
      </span>
    </div>
  );
}

/**
 * One video: a card in a grid, or a row in a list. The whole thing is the link
 * to the player; it plays under the pointer and switches channels when picked.
 */
function Card({ video, row = false, result = false }: { video: Video; row?: boolean; result?: boolean }) {
  const channel = channelOf(video);
  const tag = result ? { "data-result": video.id } : { "data-card": "" };
  if (row) {
    return (
      <li {...tag} data-arrive data-video={video.id} className="border-b border-border">
        <a href="#watch" className={`group grid gap-x-4 py-4 ${result ? "grid-cols-12 gap-y-3" : "grid-cols-[minmax(7rem,40%)_1fr]"}`}>
          <Frame video={video} className={result ? "col-span-12 sm:col-span-5 lg:col-span-4" : ""} />
          <div className={`min-w-0 ${result ? "col-span-12 sm:col-span-7 lg:col-span-8" : ""}`}>
            <h3 data-card-title className={`${CARD_TITLE} ${result ? "max-w-[30ch] text-[clamp(1.25rem,2.6cqi,1.75rem)]" : ""}`}>
              {video.title}
            </h3>
            <p data-card-meta className={`${MONO_NOTE} mt-2 text-muted`}>
              <span data-live="upper" className="text-foreground">{channel.name}</span>
            </p>
            <p data-card-meta className={`${MONO_NOTE} mt-1 text-muted`}>
              <span data-live="digits">{video.views}</span> <span aria-hidden="true">·</span> <span data-live="upper">{video.age}</span>
            </p>
            {result ? (
              <p data-card-meta className="mt-3 hidden max-w-[52ch] font-sans text-body text-pretty text-muted sm:block">
                {channel.about}
              </p>
            ) : null}
          </div>
        </a>
      </li>
    );
  }
  return (
    <li {...tag} data-arrive data-video={video.id}>
      <a href="#watch" className="group block">
        <Frame video={video} />
        <div className="mt-3 flex items-start gap-3">
          <Mark mark={channel.mark} />
          <div className="min-w-0">
            <h3 data-card-title className={`${CARD_TITLE} max-w-[28ch]`}>
              {video.title}
            </h3>
            <p data-card-meta className={`${MONO_NOTE} mt-2 text-muted`}>
              <span data-live="upper" className="text-foreground">{channel.name}</span>
            </p>
            <p data-card-meta className={`${MONO_NOTE} mt-1 text-muted`}>
              <span data-live="digits">{video.views}</span> <span aria-hidden="true">·</span> <span data-live="upper">{video.age}</span>
            </p>
          </div>
        </div>
      </a>
    </li>
  );
}

