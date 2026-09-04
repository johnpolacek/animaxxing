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
    ready: false,
  },
  {
    slug: "hackernews",
    name: "The Feed",
    before: "Hacker News",
    blurb: "The ranked list and a nested thread, type and numbers only.",
    ready: false,
  },
  {
    slug: "etsy",
    name: "Made",
    before: "Etsy",
    blurb: "Browse, item, shop, and cart, with the photograph as the hero.",
    ready: false,
  },
  {
    slug: "youtube",
    name: "Tube",
    before: "YouTube",
    blurb: "The feed, the player, a channel, and search, in strict 16:9 frames.",
    ready: false,
  },
  {
    slug: "github",
    name: "Repo",
    before: "GitHub",
    blurb: "sindresorhus/awesome: overview, readme, issues, and commits.",
    ready: false,
  },
  {
    slug: "reddit",
    name: "The Front Page",
    before: "Reddit",
    blurb: "The feed, a post and its thread, a subreddit, and the submit form.",
    ready: false,
  },
  {
    slug: "your-site",
    name: "Your Site",
    before: "Yours",
    blurb: "Enter a website. We'll animate the shit out of it.",
    ready: true,
    href: "/animaxx",
    cta: "Animaxx it",
  },
];

export function findDemo(slug: string): Demo | undefined {
  return DEMOS.find((demo) => demo.slug === slug);
}
