/*
 * Looks.
 *
 * A look is a whole design direction for the site, as opposed to the light
 * and dark schemes, which only swap ink and paper. The default look is
 * "posterize", the monochrome poster system the site was built in. Other
 * looks restyle the tokens and fonts through `data-look` on <html>, and
 * pages that compose differently under a look swap their components too.
 *
 * The choice is kept in a cookie, not localStorage, so the server can render
 * the page in the right look from the first byte: a look changes the
 * structure of a page, which no pre-paint script could correct.
 */
export const LOOKS = ["posterize", "cinematic", "bauhaus"] as const;

export type Look = (typeof LOOKS)[number];

export const DEFAULT_LOOK: Look = "posterize";

export const LOOK_COOKIE = "animaxxing-look";
/** A year, in seconds. */
const LOOK_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLook(value: unknown): value is Look {
  return typeof value === "string" && (LOOKS as readonly string[]).includes(value);
}

/** Reads the look from a cookie value, falling back to the default. */
export function lookFromCookie(value: string | undefined): Look {
  return isLook(value) ? value : DEFAULT_LOOK;
}

/** Writes the look to <html> and the cookie. Client only. */
export function persistLook(look: Look): void {
  document.documentElement.setAttribute("data-look", look);
  try {
    document.cookie = `${LOOK_COOKIE}=${look}; path=/; max-age=${LOOK_COOKIE_MAX_AGE}; samesite=lax`;
  } catch {
    // A rejected write only costs persistence; the current page still switches.
  }
}
