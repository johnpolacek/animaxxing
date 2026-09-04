"use client";

import { useId, useSyncExternalStore } from "react";
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

  function select(next: ThemeChoice) {
    storeTheme(next);
    applyTheme(next);
    for (const listener of listeners) {
      listener();
    }
  }

  return (
    <fieldset className={className}>
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
                onChange={() => select(option)}
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
