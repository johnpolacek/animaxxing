"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { gsap, SplitText, useGSAP } from "./gsap";
import { prefersReducedMotion } from "./preference";
import { DURATION, EASE, SHIFT } from "./tokens";

const ITEM_SELECTOR = "[data-page-transition]";
const LETTERS_EFFECT = "letters";
const HORIZONTAL_SLIDE_EFFECT = "slide-horizontal";
const NAVIGATION_EVENT = "animaxxing:navigate";
/** Seconds the page holds before the headline letters begin to implode. */
const LETTERS_DELAY = 0.75;
/** How far, in pixels, a headline letter starts from its place. */
const LETTER_SPREAD_X = () => window.innerWidth * 0.6;
const LETTER_SPREAD_Y = () => window.innerHeight * 0.6;

type LetterSplit = ReturnType<typeof SplitText.create>;
const activeLetterSplits = new WeakMap<HTMLElement, LetterSplit>();

export function navigateWithPageTransition(href: string): void {
  window.dispatchEvent(new CustomEvent(NAVIGATION_EVENT, { detail: href }));
}

function pageItems(container: HTMLElement): HTMLElement[] {
  const items = Array.from(container.querySelectorAll<HTMLElement>(ITEM_SELECTOR));
  return items.length > 0 ? items : [container];
}

function letterItems(items: HTMLElement[]): HTMLElement[] {
  return items.filter((item) => item.dataset.pageTransition === LETTERS_EFFECT);
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
  const horizontalSlide = horizontalSlideItems(items);
  const standardItems = items.filter(
    (item) => !letters.includes(item) && !horizontalSlide.includes(item),
  );
  const timeline = gsap.timeline({ defaults: { overwrite: "auto" } });
  const finish = () => {
    revertLetterSplits(letters);
    if (letters.length > 0) {
      gsap.set(letters, { autoAlpha: 1, clearProps: "transform,willChange" });
    }
    container.dataset.transitionState = "idle";
    onComplete?.();
  };
  timeline.eventCallback("onComplete", finish);
  timeline.eventCallback("onInterrupt", () => revertLetterSplits(letters));

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
  const horizontalSlide = horizontalSlideItems(items);
  const standardItems = items.filter(
    (item) => !letters.includes(item) && !horizontalSlide.includes(item),
  );
  revertLetterSplits(letters);
  let splits: LetterSplit[] = [];
  const timeline = gsap.timeline({
    defaults: { overwrite: "auto" },
    onComplete: () => {
      revertLetterSplits(letters);
      if (letters.length > 0) {
        gsap.set(letters, { autoAlpha: 0 });
      }
      // This state survives the React/Next route swap and overrides any
      // visible inline styles restored by GSAP context cleanup.
      container.dataset.transitionState = "waiting";
      onComplete();
    },
  });
  timeline.eventCallback("onInterrupt", () => revertLetterSplits(letters));

  container.dataset.transitionState = "exiting";

  if (horizontalSlide.length > 0) {
    gsap.set(horizontalSlide, { transition: "none" });
  }

  if (prefersReducedMotion()) {
    return timeline.set(items, { autoAlpha: 0 });
  }

  splits = letters.map((item) => splitLetters(item));
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

      const startNavigation = (destination: URL) => {
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
        exitPage(container, () => {
          router.push(`${destination.pathname}${destination.search}${destination.hash}`);
        });
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

      const handleRequestedNavigation = (event: Event) => {
        const { detail } = event as CustomEvent<string>;
        startNavigation(new URL(detail, window.location.href));
      };

      const safeLink = contextSafe ? contextSafe(handleLink) : handleLink;
      const safeRequest = contextSafe
        ? contextSafe(handleRequestedNavigation)
        : handleRequestedNavigation;
      // Capture before React/Next's delegated link handler so the route cannot
      // begin rendering until the outgoing timeline has fully completed.
      document.addEventListener("click", safeLink, true);
      window.addEventListener(NAVIGATION_EVENT, safeRequest);
      return () => {
        document.removeEventListener("click", safeLink, true);
        window.removeEventListener(NAVIGATION_EVENT, safeRequest);
      };
    },
    {
      dependencies: [pathname, held.key],
      revertOnUpdate: true,
      scope: containerRef,
    },
  );

  return (
    <div ref={containerRef} tabIndex={-1} className="flex flex-1 flex-col focus:outline-none">
      {isTransitioning ? held.node : children}
    </div>
  );
}
