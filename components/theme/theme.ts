export const THEME_STORAGE_KEY = "animaxxing-theme";
const THEME_TRANSITION_CLASS = "theme-transitioning";
const THEME_TRANSITION_CLEANUP_MS = 300;

let transitionCleanup: ReturnType<typeof setTimeout> | undefined;

export const THEME_CHOICES = ["light", "dark"] as const;

export type ThemeChoice = (typeof THEME_CHOICES)[number];

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return typeof value === "string" && (THEME_CHOICES as readonly string[]).includes(value);
}

export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;

  root.classList.add(THEME_TRANSITION_CLASS);
  root.setAttribute("data-theme", choice);

  if (transitionCleanup !== undefined) {
    clearTimeout(transitionCleanup);
  }
  transitionCleanup = setTimeout(() => {
    root.classList.remove(THEME_TRANSITION_CLASS);
    transitionCleanup = undefined;
  }, THEME_TRANSITION_CLEANUP_MS);
}

export function readStoredTheme(): ThemeChoice {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeChoice(stored) ? stored : "dark";
  } catch {
    return "dark";
  }
}

export function storeTheme(choice: ThemeChoice): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // A rejected write only costs persistence; the current page still switches.
  }
}
