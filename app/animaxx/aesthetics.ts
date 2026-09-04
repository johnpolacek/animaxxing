/*
 * The aesthetics: one skill per look. Order is the order the rows appear.
 */
export type Aesthetic = {
  slug: string;
  name: string;
  blurb: string;
  /** What to tell the agent. */
  say: string;
  /** Published and installable, or still a placeholder. */
  ready: boolean;
  /** Where the skill lives. */
  href?: string;
};

export const AESTHETICS: Aesthetic[] = [
  {
    slug: "animaxxing",
    name: "Animaxxing",
    blurb:
      "Monochrome editorial. Rethink Sans and JetBrains Mono, hairlines, poster type, letters that scatter in. The look you are looking at.",
    say: "Use the aesthetic-animaxxing skill.",
    ready: true,
    href: "https://github.com/johnpolacek/animaxxing-skills/tree/main/skills/aesthetic-animaxxing",
  },
];
