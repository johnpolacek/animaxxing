"use client";

/*
 * The route transition reports its phase on a `data-transition-state`
 * attribute of the page container. Effects that want to play alongside the
 * entrance, want the letters after it has finished, or need to hand them
 * back before the exit starts, watch that attribute here instead of guessing
 * at timings.
 */
export function watchPageTransition(
  el: HTMLElement,
  handlers: { onEntering?: () => void; onIdle: () => void; onExiting?: () => void },
): () => void {
  let idle = false;
  let entering = false;
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      const target = record.target as HTMLElement;
      if (!target.contains(el)) {
        continue;
      }
      const state = target.dataset.transitionState;
      if (state === "entering" && !entering) {
        entering = true;
        handlers.onEntering?.();
      } else if (state === "idle" && !idle) {
        idle = true;
        handlers.onIdle();
      } else if (state === "exiting" && idle) {
        idle = false;
        entering = false;
        handlers.onExiting?.();
      }
    }
  });
  observer.observe(document.body, {
    attributes: true,
    subtree: true,
    attributeFilter: ["data-transition-state"],
  });
  const current = el.closest<HTMLElement>("[data-transition-state]")?.dataset.transitionState;
  if (current === "entering") {
    entering = true;
    handlers.onEntering?.();
  } else if (current === "idle") {
    idle = true;
    handlers.onIdle();
  }
  return () => observer.disconnect();
}
