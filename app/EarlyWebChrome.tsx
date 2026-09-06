"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useRef } from "react";
import {
  gsap,
  navigateWithPageTransition,
  prefersReducedMotion,
  replayPageTransition,
  useGSAP,
} from "@/components/motion";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import {
  progressSteps,
  retype,
  sparkleTrail,
  statusCycle,
  throbber,
} from "@/lib/animation/effects/earlyweb";
import { DEMOS } from "./showcase/demos";

/*
 * The Netscape Navigator window, wrapped around every route under the early
 * web look: title bar, menubar with the throbber, toolbar with the site logo
 * and the Themes switcher, and the Location field.
 *
 * The chrome is rendered settled and is never hidden: the window is there on
 * the first paint, the same way a browser's own frame is drawn before the
 * document arrives. Only the four readouts move — the title, the URL, the
 * status message and the transfer meter (the last two live in
 * `EarlyWebStatusBar`, reached here by attribute) — and they move together,
 * as one modem load.
 *
 * The choreography is driven by the route transition rather than by a timer.
 * `PageTransition` writes its phase onto `data-transition-state`; a
 * MutationObserver on the body picks that up. `entering` (and the first
 * mount, which happens before that attribute exists) starts the load;
 * `idle` finishes it, rushing whatever is left if the page arrived early;
 * `exiting` turns it round into `Contacting host...` and empties the meter.
 * The window itself never leaves.
 */

const BASE = "http://www.geocities.com/SiliconValley/Lab/4269/";

const MENUS = [
  "File",
  "Edit",
  "View",
  "Go",
  "Bookmarks",
  "Options",
  "Directory",
  "Window",
  "Help",
];

/** Toolbar buttons that do nothing but look the part. */
const DECORATIVE_TOOLS = ["Images", "Open", "Print", "Find", "Stop"];

const CONNECTING = "Connecting to www.geocities.com...";
const WAITING = "Waiting for reply...";
const TRANSFERRING = "Transferring data from www.geocities.com...";
const DONE = "Document: Done";
const LEAVING = "Contacting host...";

/**
 * A page that wants the transfer meter to follow its own scroll says so on
 * this event: `{ progress: 0..1, label: "Transferring data... 43%" }`. See
 * the comment block in `app/showcase/animaxxipedia/EarlyWebArticle.tsx`.
 */
const SCROLL_EVENT = "web-scroll";

/** The page's weight, as the footer's transfer summary reports it. */
const TOTAL_KB = 1.2;
const TOTAL_SECONDS = 3;

/**
 * Seconds the rest of the load is given once the page itself is ready, and
 * the shortest a whole load is ever allowed to be. A cached route can reach
 * `idle` in half a second; the window still has to read as a modem fetching
 * a document rather than as a readout flickering.
 */
const RUSH = 1.1;
const MIN_LOAD = 2.8;

function showcaseSlug(pathname: string): string {
  if (!pathname.startsWith("/showcase/")) {
    return "";
  }
  return pathname.slice("/showcase/".length).replace(/\/.*$/, "");
}

/** What the title bar calls this page. */
export function pageTitle(pathname: string): string {
  if (pathname === "/") {
    return "Animaxxing!!!";
  }
  if (pathname === "/animaxx") {
    return "Get Animaxxed!";
  }
  if (pathname === "/showcase") {
    return "Animaxxing Showcase";
  }
  if (pathname === "/showcase/animaxxipedia") {
    return "Animaxxipedia: Octopus";
  }
  const slug = showcaseSlug(pathname);
  if (slug) {
    // The redesign's own name reads better on a title bar than its slug.
    return `Animaxxing Showcase: ${DEMOS.find((demo) => demo.slug === slug)?.name ?? slug}`;
  }
  return "Animaxxing";
}

/** Where the Location field says this page lives, in 1997. */
export function pageUrl(pathname: string): string {
  if (pathname === "/") {
    return `${BASE}animaxxing.html`;
  }
  if (pathname === "/animaxx") {
    return `${BASE}animaxx.html`;
  }
  if (pathname === "/showcase") {
    return `${BASE}showcase.html`;
  }
  if (pathname === "/showcase/animaxxipedia") {
    return `${BASE}animaxxipedia/octopus.html`;
  }
  const slug = showcaseSlug(pathname);
  if (slug) {
    return `${BASE}showcase/${slug}.html`;
  }
  const rest = pathname.replace(/^\/+/, "").replace(/\/+$/, "");
  return `${BASE}${rest || "index"}.html`;
}

function titleBarText(pathname: string): string {
  return `Netscape Navigator — ${pageTitle(pathname)}`;
}

export function EarlyWebChrome() {
  const pathname = usePathname();
  const scope = useRef<HTMLElement>(null);
  /*
   * The title and the URL are typed by GSAP after the first paint, so React
   * must not own their text past hydration: it is rendered once, from the
   * route the server saw, and every later value is retyped instead. `latest`
   * is what the effect reads when a load starts.
   */
  const initial = useRef({ title: titleBarText(pathname), url: pageUrl(pathname) }).current;
  const latest = useRef(initial);
  latest.current = { title: titleBarText(pathname), url: pageUrl(pathname) };

  /** Back leaves a demo for the showcase index, and the showcase for home. */
  const backHref = showcaseSlug(pathname) ? "/showcase" : "/";
  const minimizing = useRef(false);

  /*
   * The joke button. It collapses the page — the container `PageTransition`
   * owns — into a bar and springs it back. `max-height` rather than
   * `height`, because the container is a flex item whose height the flex
   * algorithm decides; max-height still clamps it.
   */
  const minimize = useCallback(() => {
    const container = document.querySelector<HTMLElement>("[data-transition-state]");
    if (!container || minimizing.current) {
      return;
    }
    // Never fight the transition system: only a settled page can be minimized.
    if (container.dataset.transitionState !== "idle") {
      return;
    }
    minimizing.current = true;
    const full = container.getBoundingClientRect().height;
    const reduced = prefersReducedMotion();
    gsap
      .timeline({
        onComplete: () => {
          minimizing.current = false;
        },
      })
      // Units spelled out: `max-height` computes to `none`, so GSAP has no
      // unit to infer and a bare number would be dropped as invalid CSS.
      .set(container, { maxHeight: `${full}px`, overflow: "hidden" })
      .to(container, {
        maxHeight: "26px",
        duration: reduced ? 0 : 0.26,
        ease: "power3.in",
      })
      .to(
        container,
        { maxHeight: `${full}px`, duration: reduced ? 0 : 0.5, ease: "back.out(1.7)" },
        "+=0.6",
      )
      .set(container, { clearProps: "maxHeight,overflow" });
  }, []);

  useGSAP(
    (_context, contextSafe) => {
      const root = scope.current;
      if (!root) {
        return;
      }
      const titleEl = root.querySelector<HTMLElement>("[data-web-title]");
      const urlEl = root.querySelector<HTMLElement>("[data-web-url]");
      const throbberEl = root.querySelector<HTMLElement>("[data-web-throbber]");
      // The status bar is the shell's other half, a sibling of this header.
      const statusEl = document.querySelector<HTMLElement>("[data-web-status]");
      const lockEl = document.querySelector<HTMLElement>("[data-web-lock]");
      const bytesEl = document.querySelector<HTMLElement>("[data-web-bytes]");
      const segments = Array.from(
        document.querySelectorAll<HTMLElement>("[data-web-progress] > i"),
      );

      const write = (el: HTMLElement | null, text: string) => {
        if (el) {
          el.textContent = text;
        }
      };
      const transfer = (kb: number, seconds: number) => {
        write(
          bytesEl,
          `[ ${kb.toFixed(1)} KB, 0:${String(Math.round(seconds)).padStart(2, "0")} @ 28.8k ]`,
        );
      };
      const settled = () => {
        write(statusEl, DONE);
        write(titleEl, latest.current.title);
        write(urlEl, latest.current.url);
        transfer(TOTAL_KB, TOTAL_SECONDS);
        gsap.set(segments, { autoAlpha: 1 });
      };

      if (prefersReducedMotion()) {
        settled();
        return;
      }

      const teardowns: (() => void)[] = [sparkleTrail(document.body)];
      const shower = throbber(throbberEl, { count: 6, color: "#8ec7ff" });
      let load: gsap.core.Timeline | null = null;
      let phase: "loading" | "done" | "leaving" = "done";

      const drop = () => {
        if (load) {
          gsap.killTweensOf(load);
          load.kill();
          load = null;
        }
      };

      /** The padlock snaps shut with one wiggle, and nothing more. */
      const wiggleLock = () => {
        if (!lockEl) {
          return;
        }
        gsap.fromTo(
          lockEl,
          { rotation: -14 },
          {
            rotation: 0,
            duration: 0.5,
            ease: "elastic.out(1.4, 0.32)",
            transformOrigin: "50% 50%",
            overwrite: true,
          },
        );
      };

      /*
       * Once a page has landed, its own scroll can take the meter over. A
       * page that reports progress on a `web-scroll` event (the article does;
       * see its comment block) turns the transfer meter into a read-out of
       * how far through the document the reader is. Pages that never fire it
       * simply leave the bar saying `Document: Done`.
       */
      type ScrollReport = { progress: number; label: string };
      let report: ScrollReport | null = null;
      let reported = -1;
      let scrollDone = false;
      let idleTimer = 0;
      let handover: gsap.core.Tween | null = null;

      const paintScroll = ({ progress, label }: ScrollReport) => {
        const value = Math.min(1, Math.max(0, progress));
        const lit = Math.round(value * segments.length);
        segments.forEach((segment, index) => {
          gsap.set(segment, { autoAlpha: index < lit ? 1 : 0 });
        });
        write(statusEl, label);
        if (value >= 0.99) {
          gsap.set(segments, { autoAlpha: 1 });
          window.clearTimeout(idleTimer);
          shower.pause();
          if (!scrollDone) {
            scrollDone = true;
            wiggleLock();
          }
        } else {
          scrollDone = false;
          // The modem only works while the document is still coming in, so
          // the meteors run on the way down and stop again once the reader
          // holds still.
          if (value > reported) {
            shower.play();
            window.clearTimeout(idleTimer);
            idleTimer = window.setTimeout(() => shower.pause(), 400);
          }
        }
        reported = value;
      };

      const onScroll = (event: Event) => {
        const detail = (event as CustomEvent<Partial<ScrollReport>>).detail;
        if (!detail || typeof detail.progress !== "number") {
          return;
        }
        report = { progress: detail.progress, label: detail.label ?? DONE };
        // A route is still loading: remember where the page is, but let the
        // modem finish its sentence first.
        if (phase === "done") {
          paintScroll(report);
        }
      };

      /** The document has arrived: everything lands on its settled value. */
      const finishDone = () => {
        phase = "done";
        drop();
        settled();
        shower.pause();
        wiggleLock();
        reported = -1;
        scrollDone = false;
        handover?.kill();
        // A page that tracks its own scroll takes the meter over, a beat
        // after `Document: Done` has had time to register.
        if (report) {
          const first = report;
          handover = gsap.delayedCall(0.35, () => paintScroll(first));
        }
      };

      const startLoad = () => {
        if (phase === "loading") {
          return;
        }
        phase = "loading";
        drop();
        handover?.kill();
        window.clearTimeout(idleTimer);
        shower.play();

        const timeline = gsap.timeline({ onComplete: finishDone });
        load = timeline;
        statusCycle(timeline, statusEl, [CONNECTING, WAITING, TRANSFERRING], 0, { duration: 2 });
        progressSteps(timeline, segments, 0.25, { duration: 2.3, steps: segments.length });
        // Both readouts clear on the spot and fill in behind a block cursor.
        timeline.add(retype(titleEl, latest.current.title, { cps: 30 }), 0.05);
        timeline.add(retype(urlEl, latest.current.url, { cps: 46 }), 0.2);
        const meter = { kb: 0, seconds: 0 };
        timeline.to(
          meter,
          {
            kb: TOTAL_KB,
            seconds: TOTAL_SECONDS,
            duration: 2.5,
            ease: "none",
            onUpdate: () => transfer(meter.kb, meter.seconds),
          },
          0.15,
        );
      };

      /**
       * The page itself is ready. If the modem is still going, wind the rest
       * of it forward into a moment rather than cutting it off mid-word.
       */
      const finishLoad = () => {
        if (phase !== "loading" || !load) {
          finishDone();
          return;
        }
        const elapsed = load.time();
        const remaining = load.duration() - elapsed;
        const budget = Math.max(RUSH, MIN_LOAD - elapsed);
        if (remaining <= budget) {
          return;
        }
        gsap.to(load, { timeScale: remaining / budget, duration: 0.18, ease: "none" });
      };

      /** Leaving for another route: the same modem, running backwards. */
      const startUnload = () => {
        if (phase === "leaving") {
          return;
        }
        phase = "leaving";
        drop();
        // The page taking the meter over is the one that is leaving: forget
        // it, so a destination that never reports cannot inherit its number.
        handover?.kill();
        window.clearTimeout(idleTimer);
        report = null;
        reported = -1;
        scrollDone = false;
        shower.play();
        write(statusEl, LEAVING);
        const timeline = gsap.timeline();
        load = timeline;
        // The meter empties from the right, a few blocks at a time. Spelled
        // out here rather than run through `progressSteps`, which only ever
        // counts a transfer upwards.
        const lit = [...segments].reverse();
        const chunk = Math.max(1, Math.ceil(lit.length / 5));
        for (let index = 0; index < lit.length; index += chunk) {
          timeline.set(lit.slice(index, index + chunk), { autoAlpha: 0 }, (index / chunk) * 0.09);
        }
      };

      let last = "";
      const react = (state: string | undefined) => {
        if (!state || state === last) {
          return;
        }
        last = state;
        if (state === "entering") {
          startLoad();
        } else if (state === "idle") {
          finishLoad();
        } else if (state === "exiting") {
          startUnload();
        }
      };
      const safeReact = contextSafe ? contextSafe(react) : react;
      const safeScroll = contextSafe ? contextSafe(onScroll) : onScroll;
      window.addEventListener(SCROLL_EVENT, safeScroll);

      const observer = new MutationObserver((records) => {
        for (const record of records) {
          safeReact((record.target as HTMLElement).dataset.transitionState);
        }
      });
      observer.observe(document.body, {
        attributes: true,
        subtree: true,
        attributeFilter: ["data-transition-state"],
      });

      // The container does not carry the attribute yet on the first mount —
      // `PageTransition`'s own effect runs after this one — so the first load
      // is started here rather than waited for.
      startLoad();

      return () => {
        observer.disconnect();
        window.removeEventListener(SCROLL_EVENT, safeScroll);
        window.clearTimeout(idleTimer);
        handover?.kill();
        drop();
        shower.kill();
        for (const teardown of teardowns) {
          teardown();
        }
      };
    },
    { scope },
  );

  return (
    <header ref={scope} className="web-window relative z-30 px-[3px] pt-[3px]">
      {/* Title bar. */}
      <div className="web-titlebar flex items-center justify-between gap-3">
        <span data-web-title className="min-w-0 truncate">
          {initial.title}
        </span>
        <span className="flex shrink-0 gap-[2px]">
          <button
            type="button"
            onClick={minimize}
            data-tip="Minimize"
            aria-label="Minimize the page"
            className="web-winbtn web-tip"
          >
            <span aria-hidden="true">_</span>
          </button>
          <i aria-hidden="true" data-tip="Maximize" className="web-winbtn web-tip">
            ▫
          </i>
          <i aria-hidden="true" data-tip="Close" className="web-winbtn web-tip">
            ×
          </i>
        </span>
      </div>

      {/* Menubar, with the Netscape N at the far right. */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--web-dark)] px-[4px] py-[2px] text-[12px]">
        <span aria-hidden="true" className="hidden min-w-0 flex-1 gap-[6px] overflow-hidden sm:flex">
          {MENUS.map((item) => (
            <span key={item} className="web-menu">
              {item}
            </span>
          ))}
        </span>
        <span className="flex-1 sm:hidden" />
        <span data-web-throbber aria-hidden="true" className="web-throbber">
          <span>N</span>
        </span>
      </div>

      {/*
        Toolbar: the site logo, the buttons, the Themes switcher. On a phone
        the row wraps — logo and switcher on the first line, the three buttons
        that actually do something on the second — and the buttons that are
        only there for the look drop out rather than overflow.
      */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-[6px] py-[5px]">
        <Link
          href="/"
          className="web-mono order-1 shrink-0 text-[17px] font-bold tracking-[0.04em] text-black no-underline sm:text-[19px]"
        >
          <span data-logo-text>
            <span aria-hidden="true" data-logo-mark className="text-[var(--web-red)]">
              &gt;&gt;
            </span>
            ANIMAXXING
          </span>
        </Link>
        <span className="order-3 flex w-full min-w-0 items-center gap-[3px] overflow-hidden sm:order-2 sm:w-auto sm:flex-1">
          <button
            type="button"
            onClick={() => navigateWithPageTransition(backHref)}
            className="web-tbtn"
          >
            <span>Back</span>
          </button>
          <span aria-hidden="true" className="web-tbtn hidden opacity-60 sm:inline-block">
            Forward
          </span>
          <button
            type="button"
            onClick={() => navigateWithPageTransition("/")}
            className="web-tbtn"
          >
            <span>Home</span>
          </button>
          <button type="button" onClick={() => replayPageTransition()} className="web-tbtn">
            <span>Reload</span>
          </button>
          {DECORATIVE_TOOLS.map((tool) => (
            <span key={tool} aria-hidden="true" className="web-tbtn hidden sm:inline-block">
              {tool}
            </span>
          ))}
        </span>
        <ThemeSwitcher className="order-2 ml-auto shrink-0 sm:order-3" />
      </div>

      {/* Location field. */}
      <div className="flex items-center gap-2 px-[6px] pb-[5px] text-[12px]">
        <span className="shrink-0">Location:</span>
        <span className="web-field min-w-0 flex-1 truncate px-[4px] py-[2px] text-[12px]">
          <span data-web-url>
            {initial.url}
          </span>
        </span>
      </div>
    </header>
  );
}
