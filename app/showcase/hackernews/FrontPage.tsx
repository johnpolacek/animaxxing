import { CHAPTERS, NAV, STORIES, TODAY, type Story } from "./content";

/*
 * The front page, animaxxed. Chapter 01, the front.
 *
 * Layout: a sticky strip of chrome (wordmark, the site links, the clock), then
 * a twelve-column grid with the four chapters set on their side in a rail one
 * column wide and the chapter itself in the other eleven. Inside the chapter
 * the top story is set as display type over its actions, and the other
 * twenty-nine are a hairline-ruled table: number, title, source, points,
 * comments, age. Below the large breakpoint the rail turns into a row of
 * chips and each table row folds its figures into a line under the title.
 *
 * This is the settled state of the page: no motion beyond the route
 * transition it shares with every other page.
 */

const MONO_LABEL = "font-mono text-caption font-bold uppercase tracking-[0.08em]";
const MONO_NOTE = "font-mono text-annotation uppercase tracking-[0.08em]";
const FIGURE = `${MONO_NOTE} tabular-nums`;

const CHIP =
  "inline-flex h-12 items-center gap-2.5 rounded-xl border-2 px-5 font-sans text-[13px] font-extrabold uppercase tracking-[0.04em] transition-colors";
const CHIP_SOLID = `${CHIP} border-inverse bg-inverse text-inverse-foreground hover:bg-inverse-hover`;
const CHIP_OUTLINE = `${CHIP} border-foreground text-foreground hover:bg-surface-hover`;
const CHIP_QUIET = `${CHIP} border-border text-muted hover:border-foreground hover:text-foreground`;

const SMALL_CHIP =
  "inline-flex h-10 items-center rounded-lg border-2 border-foreground px-4 font-sans text-caption font-extrabold uppercase tracking-[0.04em] text-foreground transition-colors hover:bg-surface-hover";

const RAIL_LINK = `${MONO_LABEL} inline-flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 transition-colors lg:py-2.5`;

const DISPLAY = "font-sans font-extrabold leading-[0.84] tracking-[-0.045em] [font-kerning:none]";

const ROW =
  "grid grid-cols-[3rem_minmax(0,1fr)] items-start gap-x-6 border-b border-border py-3 lg:min-h-10 lg:grid-cols-[4rem_minmax(0,1fr)_14.5rem_5.5rem_5.5rem_4.5rem] lg:items-center lg:py-2.5";

const CURRENT = CHAPTERS[0];
const [lead, ...rest] = STORIES as [Story, ...Story[]];

export function FrontPage() {
  return (
    <div className="@container">
      {/* The chrome */}
      <header
        data-page-transition
        className="sticky top-0 z-30 -mx-gutter border-b border-border bg-canvas px-gutter sm:-mx-gutter-lg sm:px-gutter-lg"
      >
        <div className="flex min-h-14 items-center gap-x-8 py-2">
          <p className={`${MONO_LABEL} shrink-0 text-foreground`}>The Feed</p>
          <nav aria-label="Site" className="hidden items-center gap-x-5 md:flex">
            {NAV.map((link) => (
              <a key={link} href="#top" className={`${MONO_NOTE} text-muted transition-colors hover:text-foreground`}>
                {link}
              </a>
            ))}
          </nav>
          <p className={`${FIGURE} ml-auto hidden text-muted lg:block`}>
            {TODAY.date} <span aria-hidden="true">—</span> {TODAY.time}
          </p>
          <a href="#top" className={`${SMALL_CHIP} ml-auto lg:ml-0`}>
            Log in
          </a>
        </div>
      </header>

      <div className="mt-8 grid grid-cols-12 gap-x-6 gap-y-8">
        {/* The rail: the four chapters, on their side at the left edge */}
        {/* The transition moves the wrapper; the nav's own rotation must not be overwritten by it. */}
        <div data-page-transition className="col-span-12 lg:col-span-1">
          <nav
            aria-label="Chapters"
            className="lg:sticky lg:top-20 lg:h-[calc(100vh-6rem)] lg:rotate-180 lg:border-l lg:border-border lg:pl-3 lg:[writing-mode:vertical-rl]"
          >
            <ol className="flex gap-2 overflow-x-auto lg:h-full lg:gap-4 lg:overflow-visible">
              {CHAPTERS.map((chapter) => {
                const active = chapter.id === CURRENT.id;
                return (
                  <li key={chapter.id} className="shrink-0">
                    <a
                      href={`#${chapter.id}`}
                      aria-current={active ? "page" : undefined}
                      className={
                        active
                          ? `${RAIL_LINK} bg-inverse text-inverse-foreground`
                          : `${RAIL_LINK} text-muted hover:text-foreground`
                      }
                    >
                      <span>{chapter.number}</span>
                      <span>{chapter.title}</span>
                    </a>
                  </li>
                );
              })}
              <li aria-hidden="true" className="hidden flex-1 lg:block" />
              <li className={`${MONO_NOTE} hidden shrink-0 px-2.5 text-muted lg:block`}>
                Ch {CURRENT.number} <span aria-hidden="true">/</span> {String(CHAPTERS.length).padStart(2, "0")}
              </li>
            </ol>
          </nav>
        </div>

        {/* The chapter */}
        <section id={CURRENT.id} className="col-span-12 scroll-mt-24 @container lg:col-span-11">
          {/* The lead */}
          <article data-page-transition>
            <p className="flex flex-wrap items-baseline gap-x-7 gap-y-1">
              <span className={`${FIGURE} font-bold text-foreground`}>
                {lead.rank} <span aria-hidden="true">/</span> {String(STORIES.length).padStart(2, "0")}
              </span>
              <span className={`${MONO_NOTE} text-muted`}>{CURRENT.title} page</span>
              {lead.points ? <span className={`${FIGURE} text-muted`}>{lead.points} pts</span> : null}
              {lead.comments ? <span className={`${FIGURE} text-muted`}>{lead.comments} cmts</span> : null}
              <span className={`${FIGURE} text-muted`}>{lead.age}</span>
              {lead.by ? <span className={`${MONO_NOTE} text-muted`}>By {lead.by}</span> : null}
            </p>
            <h1 className={`${DISPLAY} mt-5 -ml-[0.04em] max-w-[11ch] text-[clamp(3.25rem,10.3cqi,7.5rem)] text-balance`}>
              <a href="#thread" className="transition-colors hover:text-muted">
                {lead.title}
              </a>
            </h1>
          </article>

          <div data-page-transition className="mt-6 grid grid-cols-12 items-end gap-x-6 gap-y-6">
            <ul aria-label="Actions" className="col-span-12 flex flex-wrap gap-3 lg:col-span-8">
              <li>
                <a href="#thread" className={CHIP_SOLID}>
                  <UpArrow />
                  Upvote
                </a>
              </li>
              {lead.comments ? (
                <li>
                  <a href="#thread" className={CHIP_OUTLINE}>
                    {lead.comments} comments
                  </a>
                </li>
              ) : null}
              {lead.source ? (
                <li>
                  <a href="#thread" className={CHIP_QUIET}>
                    {lead.source}
                  </a>
                </li>
              ) : null}
              <li>
                <a href="#thread" className={CHIP_QUIET}>
                  Hide
                </a>
              </li>
            </ul>
            {lead.summary ? (
              <p className="col-span-12 max-w-[34ch] font-sans text-[0.875rem] leading-5 text-muted text-pretty lg:col-span-4">
                {lead.summary}
              </p>
            ) : null}
          </div>

          {/* The table */}
          <div data-page-transition className="mt-8">
            <div className={`${ROW} hidden text-muted lg:grid`} aria-hidden="true">
              <span className={MONO_NOTE}>No.</span>
              <span className={MONO_NOTE}>Title</span>
              <span className={MONO_NOTE}>Source</span>
              <span className={MONO_NOTE}>Points</span>
              <span className={MONO_NOTE}>Comments</span>
              <span className={MONO_NOTE}>Age</span>
            </div>
            <ol className="border-t border-border lg:border-t-0" aria-label="Stories">
              {rest.map((story) => (
                <StoryRow key={story.rank} story={story} />
              ))}
            </ol>

            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
              <a href="#front" className={SMALL_CHIP}>
                More
              </a>
              <p className={`${FIGURE} text-muted`}>
                Showing {lead.rank}–{String(STORIES.length).padStart(2, "0")}{" "}
                <span aria-hidden="true">·</span> Page 1
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function StoryRow({ story }: { story: Story }) {
  const job = !story.points;
  return (
    <li className={ROW}>
      <span className={`${FIGURE} pt-0.5 text-muted lg:pt-0`}>{story.rank}</span>
      <div className="min-w-0">
        <h2 className="font-sans text-[0.9375rem] leading-5 font-semibold text-pretty">
          <a href="#thread" className="transition-colors hover:text-muted">
            {story.title}
          </a>
        </h2>
        {/* Below the large breakpoint the figures fold into one line. */}
        <p className={`${FIGURE} mt-1.5 flex flex-wrap gap-x-3 text-muted lg:hidden`}>
          {story.source ? <span>{story.source}</span> : null}
          {job ? (
            <span>Job</span>
          ) : (
            <>
              <span>{story.points} pts</span>
              <span>{story.comments} cmts</span>
            </>
          )}
          <span>{story.age}</span>
        </p>
      </div>
      <span className={`${MONO_NOTE} hidden truncate text-muted lg:block`}>{story.source ?? "Self"}</span>
      <span className={`${FIGURE} hidden text-foreground lg:block`}>{job ? "Job" : story.points}</span>
      <span className={`${FIGURE} hidden text-foreground lg:block`}>{job ? "" : story.comments}</span>
      <span className={`${FIGURE} hidden text-muted lg:block`}>{story.age}</span>
    </li>
  );
}

function UpArrow() {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="square"
      strokeLinejoin="miter"
    >
      <path d="M8 13V3M3.5 7.5L8 3l4.5 4.5" />
    </svg>
  );
}
