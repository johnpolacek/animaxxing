/*
 * The repository page, restructured.
 *
 * A GitHub repository page is a header, a file listing, and a column of
 * facts about the project. The numbers here are a fixed snapshot of
 * sindresorhus/awesome so the server and the browser render the same page.
 */

export const CHAPTERS = [
  { id: "overview", number: "01", title: "Overview" },
  { id: "readme", number: "02", title: "Readme" },
  { id: "issues", number: "03", title: "Issues" },
  { id: "commits", number: "04", title: "Commits" },
] as const;

export const REPO = {
  owner: "sindresorhus",
  name: "awesome",
  visibility: "Public",
  description:
    "Awesome lists about all kinds of interesting topics. Pull requests are temporarily disabled until the existing ones are caught up.",
  branch: "main",
  branches: "2 branches",
  tags: "0 tags",
  commits: "1,209 commits",
  site: "awesome.re",
};

export const NAV = [
  { label: "Issues", count: "12" },
  { label: "Pull requests", count: "41" },
  { label: "Sign in" },
] as const;

export const TOPICS = ["awesome", "awesome-list", "lists", "resources", "unicorns"] as const;

export const ACTIONS = [
  { label: "Star", count: "503K", solid: true },
  { label: "Fork", count: "36.7K" },
  { label: "Watch", count: "2.4K" },
  { label: "Sponsor" },
] as const;

export type File = {
  name: string;
  kind: "dir" | "file";
  message: string;
  /** Abbreviated age: how long since the file last changed. */
  age: string;
};

export const FILES: File[] = [
  { name: ".github/workflows", kind: "dir", message: "Fix: Prevent repo linter from crashing on deletion-only PRs (#4283)", age: "3 mo" },
  { name: "media", kind: "dir", message: "Meta tweaks", age: "2 d" },
  { name: ".editorconfig", kind: "file", message: "add .editorconfig", age: "10 yr" },
  { name: ".gitattributes", kind: "file", message: "Prevent the lint script from affecting repo language stats", age: "7 yr" },
  { name: "awesome.md", kind: "file", message: "Fix typo (#3975)", age: "5 mo" },
  { name: "code-of-conduct.md", kind: "file", message: "Fix typos (#2835)", age: "3 yr" },
  { name: "contributing.md", kind: "file", message: "Improve contribution instructions for beginners (#3856)", age: "8 mo" },
  { name: "create-list.md", kind: "file", message: "Remove Yeoman generator suggestion (#4299)", age: "3 wk" },
  { name: "license", kind: "file", message: "Use HTTPS links", age: "6 yr" },
  { name: "pull_request_template.md", kind: "file", message: "Update GitHub topics docs link (#4146)", age: "4 mo" },
  { name: "readme.md", kind: "file", message: "Meta tweaks", age: "2 d" },
];

export const LATEST = {
  /** Two letters stand in for the avatar. */
  user: "SS",
  author: "sindresorhus",
  message: "Meta tweaks",
  sha: "bc98e51",
  age: "2 days ago",
};

export const STATS = [
  { value: "503K", label: "Stars" },
  { value: "36.7K", label: "Forks" },
  { value: "1,209", label: "Commits" },
  { value: "CC0", label: "License 1.0" },
] as const;

export const LINKS = [
  { label: "Readme", note: "02", href: "#readme" },
  { label: "Code of conduct", note: "↗", href: "#top" },
  { label: "Contributing", note: "↗", href: "#top" },
] as const;
