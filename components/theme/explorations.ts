import { DEFAULT_LOOK, isLook, type Look } from "./look";

/*
 * The design explorations that can be previewed from the header switcher.
 * The picker draws each one as a tiny CSS poster (see ThemePreview), so the
 * list only needs a name. Explorations whose slug is a built look (see
 * look.ts) can be chosen; the rest are on the way. `random` is the picker's
 * own entry, not a look.
 */
export type ExplorationSlug =
  | Look
  | "earlyweb"
  | "pinned"
  | "strongbad"
  | "ukiyoe"
  | "random";

export type Exploration = {
  slug: ExplorationSlug;
  name: string;
};

export const EXPLORATIONS: readonly Exploration[] = [
  { slug: DEFAULT_LOOK, name: "Posterize" },
  { slug: "cinematic", name: "Cinematic" },
  { slug: "bauhaus", name: "Bauhaus" },
  { slug: "constructivist", name: "Constructivist" },
  { slug: "earlyweb", name: "Early Web" },
  { slug: "pinned", name: "Pinned" },
  { slug: "strongbad", name: "Strong Bad" },
  { slug: "ukiyoe", name: "Ukiyo-e" },
  { slug: "random", name: "Random" },
] as const;

/** Whether choosing the tile changes the site's look. */
export function isBuilt(slug: ExplorationSlug): slug is Look {
  return isLook(slug);
}
