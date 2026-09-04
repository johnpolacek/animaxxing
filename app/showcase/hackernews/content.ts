/*
 * The front page, restructured.
 *
 * Hacker News is a ranked list: a rank, a title, where it points, a score, a
 * poster, an age, and a comment count. The thirty stories here are a fixed
 * snapshot of one front page so the server and the browser render the same
 * page.
 */

export const CHAPTERS = [
  { id: "front", number: "01", title: "Front" },
  { id: "thread", number: "02", title: "Thread" },
  { id: "ask", number: "03", title: "Ask" },
  { id: "submit", number: "04", title: "Submit" },
] as const;

export const NAV = ["New", "Past", "Comments", "Ask", "Show", "Jobs", "Submit"] as const;

export const TODAY = {
  date: "Thu 03 Sep 2026",
  time: "14:26 UTC",
};

export type Story = {
  rank: string;
  title: string;
  /** The host the title points at, or nothing for a self post. */
  source?: string;
  /** Absent on a job posting, which is not voted on. */
  points?: string;
  comments?: string;
  by?: string;
  age: string;
  /** A line under the lead, for the one story set as display type. */
  summary?: string;
};

export const STORIES: Story[] = [
  {
    rank: "01",
    title: "ChatGPT Is Throwing 404",
    source: "chatgpt.com",
    points: "168",
    comments: "93",
    by: "stacktrace",
    age: "26 min",
    summary:
      "Reports of a site-wide 404 on chatgpt.com began 26 minutes ago. The thread is tracking status-page updates and mirrors as they land.",
  },
  { rank: "02", title: "Audacity 4.0", source: "github.com/audacity", points: "575", comments: "142", by: "ClydeN", age: "4 h" },
  { rank: "03", title: "Elevated Errors for Multiple Models", source: "claude.com", points: "142", comments: "123", by: "__vivek", age: "1 h" },
  { rank: "04", title: "Pre-Release of Polars 2.0", source: "pola.rs", points: "297", comments: "95", by: "komape", age: "8 h" },
  { rank: "05", title: "The Browser's Main Thread Is Expensive", source: "kciter.so", points: "260", comments: "86", by: "kciter", age: "7 h" },
  { rank: "06", title: "Codex Is Down", source: "github.com/openai", points: "40", comments: "18", by: "armcat", age: "19 min" },
  { rank: "07", title: "Invisible Companies", source: "colossus.com", points: "84", comments: "26", by: "ltononro", age: "4 h" },
  { rank: "08", title: "What I Learned from My Mom (1941–2026)", source: "experimentalliving.substack.com", points: "159", comments: "8", by: "NaOH", age: "7 h" },
  { rank: "09", title: "Intrusive Linked Lists", source: "data-structures-in-practice.com", points: "42", comments: "22", by: "tripdout", age: "4 h" },
  { rank: "10", title: "Gemini 3.8 Flash and 3.8 Flash Cyber", source: "blog.google", points: "1110", comments: "628", by: "bratao", age: "1 d" },
  { rank: "11", title: "Muse Spark 1.3", source: "meta.com", points: "650", comments: "426", by: "bvaldivielso", age: "19 h" },
  { rank: "12", title: "9 Mothers (YC P26) Is Hiring in Austin, TX", source: "9mothers.com", age: "3 h" },
  { rank: "13", title: "Nvidia to Acquire Hugging Face", source: "nvidia.com", points: "130", comments: "40", by: "tosh", age: "3 h" },
  { rank: "14", title: "Amazon Stonehenge: Parque Arqueológico do Solstício", source: "wikipedia.org", points: "20", comments: "6", by: "nycdatasci", age: "3 h" },
  { rank: "15", title: "Fish Bad, Sugar Good and Other Medieval Ideas About Food", source: "lithub.com", points: "65", comments: "44", by: "mooreds", age: "6 h" },
  { rank: "16", title: "Three sites made 215,128 “best software” pages for AI. Perplexity cites them", source: "trellner.com", points: "486", comments: "237", by: "jakobgreenfeld", age: "1 d" },
  { rank: "17", title: "Google avoids a breakup of its ad tech business", source: "nytimes.com", points: "442", comments: "312", by: "donohoe", age: "20 h" },
  { rank: "18", title: "The Computer Museum of America reclamation project", source: "computer-museum.org", points: "80", comments: "33", by: "rbanffy", age: "11 h" },
  { rank: "19", title: "Holden's Lightning Flight", source: "wikipedia.org", points: "203", comments: "44", by: "ColinWright", age: "17 h" },
  { rank: "20", title: "Astronomers Detect a 10-Sided Structure in Saturn's Atmosphere", source: "sciencealert.com", points: "22", comments: "2", by: "jjgreen", age: "1 h" },
  { rank: "21", title: "Can I opt out of my input or output data being used for training?", source: "mistral.ai", points: "479", comments: "226", by: "teekert", age: "1 d" },
  { rank: "22", title: "Fable 5.1 World Modeling", source: "github.com/philolabs", points: "305", comments: "86", by: "surreal_", age: "19 h" },
  { rank: "23", title: "Florida revokes permits for license plate readers on state highways", source: "wusf.org", points: "41", comments: "8", by: "ilamont", age: "2 h" },
  { rank: "24", title: "Google Antigravity TOS: 3rd party usage can get Google account suspended", source: "twitter.com/gergelyorosz", points: "97", comments: "60", by: "tosh", age: "4 h" },
  { rank: "25", title: "Three schoolgirls in Kinsale pulled up a pea plant covered in warts (2016)", source: "scienceblog.com", points: "122", comments: "51", by: "DamonHD", age: "8 h" },
  { rank: "26", title: "Reverse Engineering Unknown File Formats with ImHex", source: "werwolv.net", points: "236", comments: "45", by: "carlos-menezes", age: "19 h" },
  { rank: "27", title: "Aging brains blend memories together instead of just forgetting them", source: "studyfinds.com", points: "322", comments: "128", by: "mdp2021", age: "1 d" },
  { rank: "28", title: "Biggest dark matter detector spots a single weird particle", source: "science.org", points: "326", comments: "119", by: "randycupertino", age: "1 d" },
  { rank: "29", title: "Launch HN: RonanRX (YC S26) – Personalized Peptides and GLP-1s", points: "77", comments: "76", by: "lloydarmbrust", age: "16 h" },
  { rank: "30", title: "Wendell Berry has died", source: "nytimes.com", points: "224", comments: "113", by: "Curiositry", age: "21 h" },
];
