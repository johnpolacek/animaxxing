"use client";

import { usePathname, useRouter } from "next/navigation";
import { Fragment, useRef, useState, type ReactNode } from "react";
import { gsap, SplitText, useGSAP } from "./gsap";
import { prefersReducedMotion } from "./preference";
import { DURATION, EASE, SHIFT } from "./tokens";

const ITEM_SELECTOR = "[data-page-transition]";
const LETTERS_EFFECT = "letters";
const SIDE_LETTERS_EFFECT = "letters-sides";
const HORIZONTAL_SLIDE_EFFECT = "slide-horizontal";
const NAVIGATION_EVENT = "animaxxing:navigate";
const REPLAY_EVENT = "animaxxing:replay";
/** Seconds the page holds before the headline letters begin to implode. */
const LETTERS_DELAY = 0.75;
/** Milliseconds of quiet after the last width change before the page replays its entrance. */
const RESIZE_SETTLE = 300;
/** Pixels the width must move, from where the page last entered, to count as a resize. A scrollbar coming or going is less. */
const RESIZE_THRESHOLD = 24;
/** How far, in pixels, a headline letter starts from its place. */
const LETTER_SPREAD_X = () => window.innerWidth * 0.6;
const LETTER_SPREAD_Y = () => window.innerHeight * 0.6;

type LetterSplit = ReturnType<typeof SplitText.create>;
const activeLetterSplits = new WeakMap<HTMLElement, LetterSplit>();

type NavigationRequest = {
  href: string;
  /** The page has already cleared itself: skip the exit and swap at once. */
  immediate?: boolean;
};

export function navigateWithPageTransition(
  href: string,
  options: Omit<NavigationRequest, "href"> = {},
): void {
  window.dispatchEvent(
    new CustomEvent<NavigationRequest>(NAVIGATION_EVENT, { detail: { href, ...options } }),
  );
}

/**
 * Play the current page again: it exits the way it would before a navigation,
 * then remounts and enters from scratch, the same way it does after a resize.
 */
export function replayPageTransition(): void {
  window.dispatchEvent(new Event(REPLAY_EVENT));
}

function pageItems(container: HTMLElement): HTMLElement[] {
  const items = Array.from(container.querySelectorAll<HTMLElement>(ITEM_SELECTOR));
  return items.length > 0 ? items : [container];
}

function letterItems(items: HTMLElement[]): HTMLElement[] {
  return items.filter((item) => item.dataset.pageTransition === LETTERS_EFFECT);
}

function sideLetterItems(items: HTMLElement[]): HTMLElement[] {
  return items.filter((item) => item.dataset.pageTransition === SIDE_LETTERS_EFFECT);
}

/** Alternate letters come from opposite sides, so a line zips together. */
function sideOffset(index: number): number {
  return (index % 2 === 0 ? -1 : 1) * LETTER_SPREAD_X();
}

function horizontalSlideItems(items: HTMLElement[]): HTMLElement[] {
  return items.filter((item) => item.dataset.pageTransition === HORIZONTAL_SLIDE_EFFECT);
}

function splitLetters(item: HTMLElement): LetterSplit {
  revertLetterSplit(item);
  const split = SplitText.create(item, { type: "chars", smartWrap: true, aria: "auto" });
  activeLetterSplits.set(item, split);
  return split;
}

function revertLetterSplit(item: HTMLElement): void {
  const split = activeLetterSplits.get(item);
  if (!split) {
    return;
  }
  gsap.killTweensOf(split.chars);
  split.revert();
  activeLetterSplits.delete(item);
}

function revertLetterSplits(items: HTMLElement[]): void {
  items.forEach(revertLetterSplit);
}

function enterPage(container: HTMLElement, onComplete?: () => void): gsap.core.Timeline {
  const items = pageItems(container);
  const letters = letterItems(items);
  const sideLetters = sideLetterItems(items);
  const allLetters = [...letters, ...sideLetters];
  const horizontalSlide = horizontalSlideItems(items);
  const standardItems = items.filter(
    (item) => !allLetters.includes(item) && !horizontalSlide.includes(item),
  );
  const timeline = gsap.timeline({ defaults: { overwrite: "auto" } });
  const finish = () => {
    revertLetterSplits(allLetters);
    if (allLetters.length > 0) {
      gsap.set(allLetters, { autoAlpha: 1, clearProps: "transform,willChange" });
    }
    container.dataset.transitionState = "idle";
    onComplete?.();
  };
  timeline.eventCallback("onComplete", finish);
  timeline.eventCallback("onInterrupt", () => revertLetterSplits(allLetters));

  if (prefersReducedMotion()) {
    container.dataset.transitionState = "entering";
    if (horizontalSlide.length > 0) {
      gsap.set(horizontalSlide, { transition: "none" });
    }
    timeline.set(items, { autoAlpha: 1, clearProps: "transform,willChange" });
    if (horizontalSlide.length > 0) {
      timeline.set(horizontalSlide, { clearProps: "transition" });
    }
    return timeline;
  }

  // Prepare the incoming DOM while the container is still behind the CSS
  // waiting barrier. Only release the barrier after every item is hidden.
  if (standardItems.length > 0) {
    gsap.set(standardItems, { autoAlpha: 0, y: 16 });
  }
  if (horizontalSlide.length > 0) {
    gsap.set(horizontalSlide, { autoAlpha: 0, x: -SHIFT.page, transition: "none" });
  }
  const splits = letters.map((item) => {
    const split = splitLetters(item);
    gsap.set(item, { autoAlpha: 1, y: 0 });
    // Letters implode from well outside the heading rather than jostling in
    // place; the spread scales with the viewport so it reads the same on a
    // phone and a wide monitor.
    gsap.set(split.chars, {
      autoAlpha: 0,
      x: () => gsap.utils.random(-LETTER_SPREAD_X(), LETTER_SPREAD_X()),
      y: () => gsap.utils.random(-LETTER_SPREAD_Y(), LETTER_SPREAD_Y()),
      rotation: () => gsap.utils.random(-90, 90),
      scale: 0.5,
    });
    return split;
  });
  const sideSplits = sideLetters.map((item) => {
    const split = splitLetters(item);
    gsap.set(item, { autoAlpha: 1, y: 0 });
    gsap.set(split.chars, { autoAlpha: 0, x: (index: number) => sideOffset(index), y: 0 });
    return split;
  });
  container.dataset.transitionState = "entering";

  timeline.addLabel("enter", 0).set(items, { willChange: "transform, opacity" }, "enter");
  splits.forEach((split) => {
    timeline.to(
      split.chars,
      {
        autoAlpha: 1,
        x: 0,
        y: 0,
        rotation: 0,
        scale: 1,
        duration: 0.75,
        ease: "power4.out",
        stagger: { each: 0.02, from: "random" },
      },
      `enter+=${LETTERS_DELAY}`,
    );
  });
  sideSplits.forEach((split) => {
    timeline.to(
      split.chars,
      {
        autoAlpha: 1,
        x: 0,
        duration: 0.6,
        ease: "power4.out",
        stagger: { each: 0.012, from: "center" },
      },
      `enter+=${LETTERS_DELAY + 0.14}`,
    );
  });
  if (standardItems.length > 0) {
    timeline.to(
      standardItems,
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.42,
        ease: "power3.out",
        stagger: 0.09,
      },
      letters.length > 0 ? `enter+=${LETTERS_DELAY + 0.14}` : "enter",
    );
  }
  if (horizontalSlide.length > 0) {
    timeline.to(
      horizontalSlide,
      {
        autoAlpha: 1,
        x: 0,
        duration: DURATION.component,
        ease: EASE.entrance,
      },
      letters.length > 0 ? `enter+=${LETTERS_DELAY + 0.23}` : "enter+=0.09",
    );
  }
  return timeline.set(
    items,
    { clearProps: "transform,transition,willChange" },
    timeline.duration(),
  );
}

function exitPage(container: HTMLElement, onComplete: () => void): gsap.core.Timeline {
  const items = pageItems(container).reverse();
  const letters = letterItems(items);
  const sideLetters = sideLetterItems(items);
  const allLetters = [...letters, ...sideLetters];
  const horizontalSlide = horizontalSlideItems(items);
  const standardItems = items.filter(
    (item) => !allLetters.includes(item) && !horizontalSlide.includes(item),
  );
  revertLetterSplits(allLetters);
  let splits: LetterSplit[] = [];
  const timeline = gsap.timeline({
    defaults: { overwrite: "auto" },
    onComplete: () => {
      revertLetterSplits(allLetters);
      if (allLetters.length > 0) {
        gsap.set(allLetters, { autoAlpha: 0 });
      }
      // This state survives the React/Next route swap and overrides any
      // visible inline styles restored by GSAP context cleanup.
      container.dataset.transitionState = "waiting";
      onComplete();
    },
  });
  timeline.eventCallback("onInterrupt", () => revertLetterSplits(allLetters));

  container.dataset.transitionState = "exiting";

  if (horizontalSlide.length > 0) {
    gsap.set(horizontalSlide, { transition: "none" });
  }

  if (prefersReducedMotion()) {
    return timeline.set(items, { autoAlpha: 0 });
  }

  splits = letters.map((item) => splitLetters(item));
  const sideSplits = sideLetters.map((item) => splitLetters(item));
  if (horizontalSlide.length > 0) {
    gsap.set(horizontalSlide, { y: 0 });
  }
  timeline.addLabel("exit", 0).set(items, { willChange: "transform, opacity" }, "exit");
  standardItems.forEach((item, index) => {
    timeline.to(
      item,
      { autoAlpha: 0, y: -8, duration: 0.22, ease: "power2.in" },
      `exit+=${index * 0.055}`,
    );
  });
  if (horizontalSlide.length > 0) {
    timeline.to(
      horizontalSlide,
      {
        autoAlpha: 0,
        x: SHIFT.component,
        duration: DURATION.micro,
        ease: EASE.exit,
      },
      "exit",
    );
  }
  splits.forEach((split) => {
    timeline.to(
      split.chars,
      {
        autoAlpha: 0,
        x: () => gsap.utils.random(-LETTER_SPREAD_X(), LETTER_SPREAD_X()),
        y: () => gsap.utils.random(-LETTER_SPREAD_Y(), LETTER_SPREAD_Y()),
        rotation: () => gsap.utils.random(-90, 90),
        scale: 1.6,
        duration: 0.28,
        ease: "power2.in",
        stagger: { each: 0.012, from: "edges" },
      },
      standardItems.length > 0 ? "exit+=0.1" : "exit",
    );
  });
  sideSplits.forEach((split) => {
    timeline.to(
      split.chars,
      {
        autoAlpha: 0,
        x: (index: number) => sideOffset(index),
        duration: 0.24,
        ease: "power2.in",
        stagger: { each: 0.008, from: "center" },
      },
      "exit",
    );
  });
  return timeline;
}

/**
 * Route-level exit and entrance.
 *
 * Pages opt their major elements into the sequence with `data-page-transition`.
 * On a route change the old elements leave in reverse order. Only then is the
 * tree swapped, and the incoming elements enter in document order. Pages with
 * no marked elements fall back to one whole-page tween.
 *
 * Unmodified internal-link clicks wait for the exit before the router moves.
 * Modified clicks, external links, downloads, and same-page links keep their
 * native behavior. Back-button and programmatic navigation use the fallback
 * route-change sequence.
 *
 * Focus moves to the page container only when a navigation left focus on
 * <body>. If the participant is still in a field or on a control, their focus
 * is left alone.
 *
 * Resizing resets the page. Once the width has moved and settled, the page
 * subtree is remounted and enters again from scratch, the same way it does
 * after a navigation, so every effect starts fresh at the new size. Height
 * alone never counts: mobile browsers change it on every scroll.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const navigated = useRef(false);
  const exitedBeforeNavigation = useRef(false);
  const [held, setHeld] = useState<{ key: string; node: ReactNode }>({
    key: pathname,
    node: children,
  });
  /** Bumped when a resize settles; keys the page subtree so it remounts. */
  const [epoch, setEpoch] = useState(0);

  const isTransitioning = held.key !== pathname;

  useGSAP(
    (_context, contextSafe) => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      if (isTransitioning) {
        navigated.current = true;
        const incoming = children;
        if (exitedBeforeNavigation.current) {
          exitedBeforeNavigation.current = false;
          setHeld({ key: pathname, node: incoming });
          return;
        }
        const finishExit = () => setHeld({ key: pathname, node: incoming });
        exitPage(container, contextSafe ? contextSafe(finishExit) : finishExit);
        return;
      }

      const finishEnter = () => {
        if (navigated.current && document.activeElement === document.body) {
          container.focus({ preventScroll: true });
        }
      };
      const entrance = enterPage(container, contextSafe ? contextSafe(finishEnter) : finishEnter);

      // A settled resize replays the page. The width the page entered at is
      // the reference, so a slow drag still counts once it has gone far enough.
      const enteredWidth = container.offsetWidth;
      let resizeTimer: number | undefined;
      const resize = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect.width ?? container.offsetWidth;
        if (Math.abs(width - enteredWidth) < RESIZE_THRESHOLD || prefersReducedMotion()) {
          return;
        }
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
          entrance.kill();
          container.dataset.transitionState = "waiting";
          setEpoch((value) => value + 1);
        }, RESIZE_SETTLE);
      });
      resize.observe(container);

      const startNavigation = (destination: URL, immediate = false) => {
        if (
          destination.origin !== window.location.origin ||
          (destination.pathname === window.location.pathname &&
            destination.search === window.location.search)
        ) {
          return false;
        }

        if (exitedBeforeNavigation.current) {
          return true;
        }

        exitedBeforeNavigation.current = true;
        entrance.kill();
        const go = () => {
          router.push(`${destination.pathname}${destination.search}${destination.hash}`);
        };
        if (immediate) {
          container.dataset.transitionState = "waiting";
          go();
          return true;
        }
        exitPage(container, go);
        return true;
      };

      const handleLink = (event: MouseEvent) => {
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }

        const origin = event.target;
        const anchor =
          origin instanceof Element ? origin.closest<HTMLAnchorElement>("a[href]") : null;
        if (!anchor || anchor.target || anchor.hasAttribute("download")) {
          return;
        }

        const destination = new URL(anchor.href, window.location.href);
        if (!startNavigation(destination)) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
      };

      let replaying = false;
      const handleReplay = () => {
        if (replaying || exitedBeforeNavigation.current) {
          return;
        }
        replaying = true;
        entrance.kill();
        exitPage(container, () => setEpoch((value) => value + 1));
      };

      const handleRequestedNavigation = (event: Event) => {
        const { detail } = event as CustomEvent<NavigationRequest>;
        startNavigation(new URL(detail.href, window.location.href), detail.immediate);
      };

      const safeLink = contextSafe ? contextSafe(handleLink) : handleLink;
      const safeRequest = contextSafe
        ? contextSafe(handleRequestedNavigation)
        : handleRequestedNavigation;
      const safeReplay = contextSafe ? contextSafe(handleReplay) : handleReplay;
      // Capture before React/Next's delegated link handler so the route cannot
      // begin rendering until the outgoing timeline has fully completed.
      document.addEventListener("click", safeLink, true);
      window.addEventListener(NAVIGATION_EVENT, safeRequest);
      window.addEventListener(REPLAY_EVENT, safeReplay);
      return () => {
        resize.disconnect();
        window.clearTimeout(resizeTimer);
        document.removeEventListener("click", safeLink, true);
        window.removeEventListener(NAVIGATION_EVENT, safeRequest);
        window.removeEventListener(REPLAY_EVENT, safeReplay);
      };
    },
    {
      dependencies: [pathname, held.key, epoch],
      revertOnUpdate: true,
      scope: containerRef,
    },
  );

  return (
    <div ref={containerRef} tabIndex={-1} className="flex flex-1 flex-col focus:outline-none">
      <Fragment key={epoch}>{isTransitioning ? held.node : children}</Fragment>
    </div>
  );
}
