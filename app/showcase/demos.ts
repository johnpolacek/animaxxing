/*
 * The showcase: one well-known site per entry, redesigned and animaxxed.
 * Order is the order the cards appear.
 */
export type Demo = {
  slug: string;
  /** The redesign's own name. */
  name: string;
  /** The site it started as. */
  before: string;
  blurb: string;
  /** Built and browsable, or still a placeholder. */
  ready: boolean;
  /** Where the card goes, when it is not a demo of its own. */
  href?: string;
  /** The card's call to action, when "Enter" is not it. */
  cta?: string;
};

export const DEMOS: Demo[] = [
  {
    slug: "animaxxipedia",
    name: "Animaxxipedia",
    before: "Wikipedia",
    blurb: "The Octopus article: same structure, set in monochrome and in motion.",
    ready: true,
  },
  {
    slug: "weather",
    name: "Sky",
    before: "Weather",
    blurb: "Current conditions, the hours, the week, and radar, drawn in hairlines.",
    ready: true,
  },
  {
    slug: "craigslist",
    name: "The List",
    before: "Craigslist",
    blurb: "The category board, a ledger of listings, and one listing, kept dense.",
    ready: true,
  },
  {
    slug: "hackernews",
    name: "The Feed",
    before: "Hacker News",
    blurb: "The ranked list and a nested thread, type and numbers only.",
    ready: true,
  },
  {
    slug: "etsy",
    name: "Made",
    before: "Etsy",
    blurb: "Browse, item, shop, and cart, with the photograph as the hero.",
    ready: true,
  },
  {
    slug: "youtube",
    name: "Tube",
    before: "YouTube",
    blurb: "The feed, the player, a channel, and search, in strict 16:9 frames.",
    ready: true,
  },
  {
    slug: "github",
    name: "Repo",
    before: "GitHub",
    blurb: "sindresorhus/awesome: overview, readme, issues, and commits.",
    ready: true,
  },
  {
    slug: "reddit",
    name: "The Front Page",
    before: "Reddit",
    blurb: "The feed, a post and its thread, a subreddit, and the submit form.",
    ready: true,
  },
  {
    slug: "your-site",
    name: "Your Site",
    before: "Yours",
    blurb: "Install the skills. Your agents animate the shit out of it.",
    ready: true,
    href: "/animaxx",
    cta: "Get Animaxxed",
  },
];

export function findDemo(slug: string): Demo | undefined {
  return DEMOS.find((demo) => demo.slug === slug);
}

/** The demo after this one in showcase order, wrapping at the end. Cards that lead elsewhere are skipped. */
export function nextDemo(slug: string): Demo | undefined {
  const pages = DEMOS.filter((demo) => !demo.href);
  const index = pages.findIndex((demo) => demo.slug === slug);
  return index === -1 ? undefined : pages[(index + 1) % pages.length];
}
