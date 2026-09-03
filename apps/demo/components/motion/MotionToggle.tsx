"use client";

import { useId, useSyncExternalStore } from "react";
import {
  applyMotion,
  MOTION_CHOICES,
  readMotionChoice,
  REDUCED_MOTION_QUERY,
  type MotionChoice,
} from "./preference";

/*
 * The motion equivalent of the theme switch: the operating-system setting is
 * the default, and the override exists so reduced motion can be reviewed here
 * without changing system preferences. State lives on <html data-motion>, so
 * it is read through useSyncExternalStore rather than duplicated in React.
 */
const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    query.removeEventListener("change", onStoreChange);
  };
}

function serverSnapshot(): MotionChoice {
  return "system";
}

export function MotionToggle({ className }: { className?: string }) {
  const groupId = useId();
  const choice = useSyncExternalStore(subscribe, readMotionChoice, serverSnapshot);

  function select(next: MotionChoice) {
    applyMotion(next);
    for (const listener of listeners) {
      listener();
    }
  }

  return (
    <fieldset className={className}>
      <legend className="sr-only">Motion</legend>
      <div className="flex gap-1 rounded-sm border border-border p-1">
        {MOTION_CHOICES.map((option) => {
          const id = `${groupId}-${option}`;
          return (
            <div key={option} className="flex">
              <input
                type="radio"
                id={id}
                name={`${groupId}-motion`}
                value={option}
                checked={choice === option}
                onChange={() => select(option)}
                className="peer sr-only"
              />
              <label
                htmlFor={id}
                className="cursor-pointer rounded-xs px-3 py-1.5 font-mono text-caption uppercase text-muted transition-colors hover:bg-surface-hover hover:text-foreground peer-checked:bg-inverse peer-checked:text-inverse-foreground peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus"
              >
                {option === "system" ? "system motion" : option}
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
