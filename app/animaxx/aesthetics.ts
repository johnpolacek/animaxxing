/*
 * The aesthetics: one skill per look. Order is the order the rows appear.
 */
export type Aesthetic = {
  slug: string;
  name: string;
  blurb: string;
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
    ready: true,
    href: "https://github.com/johnpolacek/animaxxing-skills/tree/main/skills/aesthetic-animaxxing",
  },
];

/*
 * Things to say to an agent once the skills are in. Order is the order they
 * appear.
 */
export type Prompt = { label: string; text: string };

export const PROMPTS: Prompt[] = [
  {
    label: "Redesign",
    text: "Animaxx it. Use the aesthetic-animaxxing skill with the gsap skill for this framework and redesign this site in the Animaxxing look.",
  },
  {
    label: "Motion only",
    text: "Keep my design. Use the gsap skill for this framework to add page transitions: headlines scatter in, everything else rises, and the outro finishes before navigation.",
  },
  {
    label: "One page",
    text: "Animaxx the home page only. Split-text entrance on the headline, particle treatments on the calls to action, nothing else moves.",
  },
];
