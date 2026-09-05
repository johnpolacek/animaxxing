import type { Scene } from "@/lib/animation/effects/film";

/*
 * The video site, restructured.
 *
 * Four views survive: the feed, the player, a channel, and search. There are
 * no videos, so every frame is footage drawn from a seed (see film.ts), and
 * every number is a fixed snapshot so the server and the browser agree.
 */

export const CHAPTERS = [
  { id: "feed", number: "01", title: "Feed" },
  { id: "watch", number: "02", title: "Watch" },
  { id: "channel", number: "03", title: "Channel" },
  { id: "search", number: "04", title: "Search" },
] as const;

export type Chapter = (typeof CHAPTERS)[number];

export const FILTERS = ["All", "Type", "Signal", "Motion", "Print", "Live"] as const;

export const TABS = ["Videos", "Shorts", "Live", "Playlists", "About"] as const;

export const SEARCH_FILTERS = ["Relevance", "Upload date", "View count", "Rating"] as const;

/** What the search field types into itself when the chapter comes into view. */
export const SEARCH_QUERY = "hairline";

export type Channel = {
  id: string;
  name: string;
  handle: string;
  /** Two letters stand in for the avatar. */
  mark: string;
  subscribers: string;
  videos: string;
  joined: string;
  about: string;
  /** The banner's footage. */
  scene: Scene;
  seed: number;
};

export const CHANNELS: Record<string, Channel> = {
  signal: {
    id: "signal",
    name: "Signal / Noise",
    handle: "@signalnoise",
    mark: "SN",
    subscribers: "1.24M",
    videos: "212",
    joined: "Joined 2014",
    about:
      "Test patterns, oscilloscopes, and the sound the picture makes. Everything here is shot in black and white, on purpose, and mostly in one take.",
    scene: "wave",
    seed: 11,
  },
  hairline: {
    id: "hairline",
    name: "Hairline",
    handle: "@hairline",
    mark: "HL",
    subscribers: "884K",
    videos: "97",
    joined: "Joined 2017",
    about: "Drawings that are one pixel wide.",
    scene: "orbit",
    seed: 3,
  },
  counterform: {
    id: "counterform",
    name: "Counterform",
    handle: "@counterform",
    mark: "CF",
    subscribers: "2.02M",
    videos: "340",
    joined: "Joined 2012",
    about: "The space inside the letters.",
    scene: "type",
    seed: 7,
  },
  testcard: {
    id: "testcard",
    name: "Test Card",
    handle: "@testcard",
    mark: "TC",
    subscribers: "5.6M",
    videos: "1,204",
    joined: "Joined 2009",
    about: "Broadcasting nothing, continuously.",
    scene: "bars",
    seed: 1,
  },
  motion: {
    id: "motion",
    name: "Set in Motion",
    handle: "@setinmotion",
    mark: "SM",
    subscribers: "3.1M",
    videos: "518",
    joined: "Joined 2011",
    about: "Title sequences, and how they were cut.",
    scene: "grid",
    seed: 5,
  },
};

export type Video = {
  id: string;
  title: string;
  channel: string;
  views: string;
  age: string;
  /** "m:ss" or "h:mm:ss"; "LIVE" for a stream. */
  duration: string;
  scene: Scene;
  seed: number;
  live?: boolean;
  /** Which feed filter it answers to. */
  kind: (typeof FILTERS)[number];
};

export const VIDEOS: Video[] = [
  {
    id: "breathe",
    title: "How a variable font breathes",
    channel: "counterform",
    views: "1.2M views",
    age: "3 weeks ago",
    duration: "12:41",
    scene: "halftone",
    seed: 21,
    kind: "Type",
  },
  {
    id: "clock",
    title: "Building a clock from hairlines",
    channel: "hairline",
    views: "402K views",
    age: "5 days ago",
    duration: "8:16",
    scene: "clock",
    seed: 4,
    kind: "Motion",
  },
  {
    id: "oscilloscope",
    title: "Oscilloscope music, side A",
    channel: "signal",
    views: "2.1M views",
    age: "1 year ago",
    duration: "18:30",
    scene: "wave",
    seed: 12,
    kind: "Signal",
  },
  {
    id: "grid",
    title: "The grid that never ends",
    channel: "motion",
    views: "731K views",
    age: "4 months ago",
    duration: "6:06",
    scene: "grid",
    seed: 9,
    kind: "Motion",
  },
  {
    id: "static",
    title: "Static: what the noise is made of",
    channel: "signal",
    views: "96K views",
    age: "2 weeks ago",
    duration: "11:09",
    scene: "static",
    seed: 31,
    kind: "Signal",
  },
  {
    id: "orbits",
    title: "Orbits, drawn by hand",
    channel: "hairline",
    views: "1.8M views",
    age: "8 months ago",
    duration: "4:44",
    scene: "orbit",
    seed: 6,
    kind: "Motion",
  },
  {
    id: "alphabet",
    title: "One letter a second: the alphabet as film",
    channel: "counterform",
    views: "318K views",
    age: "3 days ago",
    duration: "2:36",
    scene: "type",
    seed: 14,
    kind: "Type",
  },
  {
    id: "rain",
    title: "Rain, the digital kind",
    channel: "motion",
    views: "5.5M views",
    age: "3 years ago",
    duration: "9:58",
    scene: "rain",
    seed: 17,
    kind: "Motion",
  },
  {
    id: "scanlines",
    title: "Scanlines, and why your eyes miss them",
    channel: "testcard",
    views: "267K views",
    age: "6 days ago",
    duration: "7:21",
    scene: "scan",
    seed: 23,
    kind: "Signal",
  },
  {
    id: "sonar",
    title: "Sonar, slowed down one hundred times",
    channel: "signal",
    views: "148K views",
    age: "1 month ago",
    duration: "14:03",
    scene: "pulse",
    seed: 2,
    kind: "Signal",
  },
  {
    id: "stripes",
    title: "Stripes, marching",
    channel: "hairline",
    views: "92K views",
    age: "1 day ago",
    duration: "3:12",
    scene: "stripes",
    seed: 8,
    kind: "Print",
  },
  {
    id: "live",
    title: "The test card, live since 1967",
    channel: "testcard",
    views: "12K watching",
    age: "Started 4 hours ago",
    duration: "LIVE",
    scene: "bars",
    seed: 1,
    live: true,
    kind: "Live",
  },
  {
    id: "dots",
    title: "Halftone by hand: a print from 12,000 dots",
    channel: "counterform",
    views: "640K views",
    age: "2 months ago",
    duration: "21:40",
    scene: "halftone",
    seed: 33,
    kind: "Print",
  },
  {
    id: "whitenoise",
    title: "White noise, ten hours, an excerpt",
    channel: "signal",
    views: "4.4M views",
    age: "2 years ago",
    duration: "24:12",
    scene: "static",
    seed: 44,
    kind: "Signal",
  },
  {
    id: "squares",
    title: "Square wave, triangle wave, sine",
    channel: "signal",
    views: "512K views",
    age: "5 months ago",
    duration: "9:31",
    scene: "wave",
    seed: 45,
    kind: "Signal",
  },
  {
    id: "pulsetrain",
    title: "Pulse train",
    channel: "signal",
    views: "77K views",
    age: "3 weeks ago",
    duration: "5:05",
    scene: "pulse",
    seed: 46,
    kind: "Signal",
  },
  {
    id: "documentary",
    title: "Hairlines: a documentary in one stroke",
    channel: "motion",
    views: "1.1M views",
    age: "7 months ago",
    duration: "16:20",
    scene: "stripes",
    seed: 47,
    kind: "Motion",
  },
];

export function findVideo(id: string): Video {
  return VIDEOS.find((video) => video.id === id) ?? VIDEOS[0]!;
}

export function channelOf(video: Video): Channel {
  return CHANNELS[video.channel] ?? CHANNELS.signal!;
}

/** The feed: the first twelve. */
export const FEED = VIDEOS.slice(0, 12);

/** What plays when the page opens. */
export const FIRST = "oscilloscope";

/** The channel chapter. */
export const CHANNEL = CHANNELS.signal!;
export const CHANNEL_VIDEOS = VIDEOS.filter((video) => video.channel === CHANNEL.id);

/** "12:41" or "1:02:03" to seconds. */
export function toSeconds(code: string): number {
  if (code === "LIVE") {
    return 4 * 3600;
  }
  return code
    .split(":")
    .map(Number)
    .reduce((total, part) => total * 60 + part, 0);
}

export type Mark = { at: number; title: string };

/** Chapter marks along the scrub bar, as seconds into the film and a title. */
const MARKS: Record<string, Mark[]> = {
  oscilloscope: [
    { at: 0, title: "Tuning" },
    { at: 184, title: "Sine" },
    { at: 402, title: "Square" },
    { at: 655, title: "Both at once" },
    { at: 910, title: "Side A ends" },
  ],
};

export function marksFor(video: Video): Mark[] {
  const custom = MARKS[video.id];
  if (custom) {
    return custom;
  }
  const length = toSeconds(video.duration);
  return [
    { at: 0, title: "Intro" },
    { at: Math.round(length * 0.35), title: "Middle" },
    { at: Math.round(length * 0.8), title: "Ending" },
  ];
}

/** What sits beside the player. */
export const UP_NEXT = VIDEOS.slice(12);

export const ACTIONS = [
  { id: "like", label: "Like", count: 48212 },
  { id: "dislike", label: "Dislike", count: 0 },
  { id: "share", label: "Share", count: 0 },
  { id: "save", label: "Save", count: 0 },
] as const;

export const DESCRIPTION =
  "Recorded straight off the scope, no overdubs. Side B is coming when the second tube arrives. Chapters below.";

export type Comment = {
  id: string;
  mark: string;
  handle: string;
  age: string;
  text: string;
  likes: string;
  replies?: string;
};

export const COMMENT_COUNT = "3,412";

export const COMMENT_SORTS = ["Top", "Newest"] as const;

export const COMMENTS: Comment[] = [
  {
    id: "c1",
    mark: "AR",
    handle: "@arc",
    age: "2 days ago",
    text: "The moment at 6:55 where both waves lock up is the best thing I have heard this year. In black and white, somehow.",
    likes: "1.2K",
    replies: "34 replies",
  },
  {
    id: "c2",
    mark: "MJ",
    handle: "@mono.jane",
    age: "1 week ago",
    text: "Came for the sine, stayed for the square.",
    likes: "864",
    replies: "12 replies",
  },
  {
    id: "c3",
    mark: "KT",
    handle: "@ktonal",
    age: "3 weeks ago",
    text: "Can you post the patch? I want to run this on a real tube and watch it burn in.",
    likes: "402",
    replies: "8 replies",
  },
  {
    id: "c4",
    mark: "OS",
    handle: "@offset",
    age: "1 month ago",
    text: "Side B when",
    likes: "2.9K",
  },
  {
    id: "c5",
    mark: "LN",
    handle: "@lineweight",
    age: "2 months ago",
    text: "This is the only channel where the thumbnail is honest about what you are going to get.",
    likes: "318",
    replies: "3 replies",
  },
];

export const NAV = ["Upload", "Notifications", "Sign in"] as const;

export const TODAY = "Thu 04 Sep 2026";
