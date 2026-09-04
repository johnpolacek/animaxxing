/*
 * The front page, restructured.
 *
 * Reddit's front page is a ranked list: a rank, a score, where it was posted,
 * who posted it, and a title. The posts here are a fixed snapshot so the
 * server and the browser render the same page.
 */

export const CHAPTERS = [
  { id: "feed", number: "01", title: "Feed" },
  { id: "post", number: "02", title: "Post" },
  { id: "subreddit", number: "03", title: "Subreddit" },
  { id: "submit", number: "04", title: "Submit" },
] as const;

export const SORTS = ["Hot", "New", "Top", "Rising"] as const;

export const TODAY = {
  date: "Wed 03 Sep 2026",
  posts: "1,204 posts",
  online: "48,211 online",
};

export type Post = {
  rank: string;
  score: string;
  subreddit: string;
  /** Two letters stand in for the avatar. */
  user: string;
  age: string;
  comments: string;
  kind?: "Photograph" | "Link";
  title: string;
  image?: {
    src: string;
    alt: string;
    size: string;
  };
};

export const POSTS: Post[] = [
  {
    rank: "01",
    score: "48.2K",
    subreddit: "R/EarthPorn",
    user: "MK",
    age: "5H",
    comments: "2,104 comments",
    kind: "Photograph",
    title: "First light on the dunes, Death Valley [OC]",
    image: {
      src: "/showcase/reddit/dunes.jpg",
      alt: "Dunes in hard monochrome light",
      size: "4000 × 5000",
    },
  },
  {
    rank: "02",
    score: "31.7K",
    subreddit: "R/AskReddit",
    user: "JL",
    age: "7H",
    comments: "9,412 comments",
    title: "What took you under a week to learn and still pays off years later?",
  },
  {
    rank: "03",
    score: "22.9K",
    subreddit: "R/Science",
    user: "RS",
    age: "9H",
    comments: "1,806 comments",
    kind: "Link",
    title: "Researchers map every one of a fruit fly's 140,000 neurons",
  },
  {
    rank: "04",
    score: "19.4K",
    subreddit: "R/MildlyInteresting",
    user: "TP",
    age: "11H",
    comments: "640 comments",
    title: "The shadow of my fire escape lines up with the tiles once a year",
  },
  {
    rank: "05",
    score: "15.8K",
    subreddit: "R/Programming",
    user: "AV",
    age: "12H",
    comments: "1,122 comments",
    kind: "Link",
    title: "The first web server carried a note: this machine is a server, do not power down",
  },
];
