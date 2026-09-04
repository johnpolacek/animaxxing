import Image from "next/image";
import { CHAPTERS, POSTS, SORTS, TODAY, type Post } from "./content";

/*
 * The front page, animaxxed. Chapter 01, the feed.
 *
 * Layout: a sticky strip of chrome (wordmark, search, the site links), then a
 * twelve-column grid with a rail of the four chapters in two columns and the
 * chapter itself in the other ten. Inside the chapter, the ranked list takes
 * seven columns and the top post's photograph the other five, cropped hard
 * at the column edge and the gutter.
 *
 * This is the settled state of the page: no motion beyond the route
 * transition it shares with every other page.
 */

const MONO_LABEL = "font-mono text-caption font-bold uppercase tracking-[0.08em]";
const MONO_NOTE = "font-mono text-annotation uppercase tracking-[0.08em]";

const CHIP =
  "inline-flex h-9 items-center rounded-md border-2 px-3.5 font-sans text-[13px] font-extrabold uppercase tracking-[0.02em] transition-colors";
const CHIP_OUTLINE = `${CHIP} border-foreground text-foreground hover:bg-surface-hover`;
const CHIP_SOLID = `${CHIP} border-inverse bg-inverse text-inverse-foreground hover:bg-inverse-hover`;

const RAIL_LINK = `${MONO_LABEL} flex h-9 items-center gap-4 rounded-md px-3 transition-colors`;

const DISPLAY =
  "font-sans font-extrabold uppercase leading-[0.88] tracking-[-0.045em] [font-kerning:none]";

const CURRENT = CHAPTERS[0];

export function FrontPage() {
  const lead = POSTS[0];
  return (
    <div className="@container">
      {/* The chrome */}
      <header
        data-page-transition
        className="sticky top-0 z-30 -mx-gutter border-b border-border bg-canvas px-gutter sm:-mx-gutter-lg sm:px-gutter-lg"
      >
        <div className="flex min-h-14 flex-wrap items-center gap-x-6 gap-y-2 py-2">
          <p className="shrink-0 font-mono text-sm font-extrabold uppercase tracking-[0.24em] text-foreground sm:text-base">
            The Front Page
          </p>
          <span aria-hidden="true" className="hidden h-6 w-px bg-border sm:block" />
          <form role="search" className="hidden min-w-0 flex-1 sm:block">
            <label className="sr-only" htmlFor="front-page-search">
              Search
            </label>
            <input
              id="front-page-search"
              type="search"
              placeholder="SEARCH"
              className={`${MONO_LABEL} h-9 w-full rounded-lg border-2 border-foreground bg-transparent px-3.5 text-foreground placeholder:text-muted focus-visible:outline-offset-0`}
            />
          </form>
          <nav aria-label="Site" className="ml-auto flex items-center gap-x-5 sm:gap-x-7">
            {["Popular", "All", "Log in"].map((link) => (
              <a key={link} href="#top" className={`${MONO_LABEL} text-foreground transition-colors hover:text-muted`}>
                {link}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <div className="mt-8 grid grid-cols-12 gap-x-6">
        {/* The rail */}
        <nav aria-label="Chapters" data-page-transition className="col-span-12 mb-6 lg:col-span-2 lg:mb-0">
          <ol className="-mx-gutter flex gap-2 overflow-x-auto px-gutter pb-2 sm:-mx-gutter-lg sm:px-gutter-lg lg:mx-0 lg:flex-col lg:gap-0 lg:px-0 lg:pb-0">
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
          </ol>
        </nav>

        {/* The chapter */}
        <section id={CURRENT.id} className="col-span-12 scroll-mt-24 lg:col-span-10">
          <div className="grid grid-cols-12 gap-x-6">
            <div data-page-transition className="col-span-12 lg:col-span-7">
              <p className={`${MONO_LABEL} font-normal text-muted`}>
                {CURRENT.number} <span aria-hidden="true">/</span>{" "}
                {String(CHAPTERS.length).padStart(2, "0")}
              </p>
              <h1 className={`${DISPLAY} mt-3 -ml-[0.04em] text-[clamp(4.5rem,14cqi,10.5rem)]`}>
                {CURRENT.title}
              </h1>
            </div>
            <div data-page-transition className="col-span-12 mt-4 lg:col-span-5 lg:mt-0">
              <p className={`${MONO_LABEL} text-foreground`}>{TODAY.date}</p>
              <p className={`${MONO_NOTE} mt-1 text-muted`}>
                {TODAY.posts} <span aria-hidden="true">·</span> {TODAY.online}
              </p>
            </div>
          </div>

          <span data-page-transition aria-hidden="true" className="mt-4 block h-px w-full bg-foreground" />

          <div className="grid grid-cols-12 gap-x-6">
            {/* The sort, then the list */}
            <div className="col-span-12 lg:col-span-7">
              <ul data-page-transition aria-label="Sort" className="mt-5 flex flex-wrap gap-2">
                {SORTS.map((sort, index) => (
                  <li key={sort}>
                    <a
                      href="#feed"
                      aria-current={index === 0 ? "true" : undefined}
                      className={index === 0 ? CHIP_SOLID : CHIP_OUTLINE}
                    >
                      {sort}
                    </a>
                  </li>
                ))}
              </ul>

              <ol data-page-transition className="mt-5 border-t border-border" aria-label="Posts">
                {POSTS.map((post) => (
                  <PostRow key={post.rank} post={post} />
                ))}
              </ol>
            </div>

            {/* The top post's photograph */}
            {lead?.image ? (
              <figure data-page-transition className="col-span-12 mt-8 lg:col-span-5 lg:mt-0">
                <figcaption className="flex h-9 items-center gap-3 lg:mt-5">
                  <span className={`${MONO_NOTE} font-bold text-foreground`}>{lead.rank}</span>
                  <span className={`${MONO_NOTE} text-muted`}>
                    {lead.subreddit} <span aria-hidden="true">·</span> {lead.image.size}{" "}
                    <span aria-hidden="true">·</span> {lead.user}
                  </span>
                </figcaption>
                <div className="relative mt-5 aspect-[4/5] overflow-hidden -mr-gutter sm:-mr-gutter-lg lg:aspect-auto lg:h-[36rem]">
                  <Image
                    src={lead.image.src}
                    alt={lead.image.alt}
                    fill
                    sizes="(min-width: 1024px) 40vw, 100vw"
                    className="object-cover object-[50%_40%] grayscale contrast-125"
                    priority
                  />
                </div>
              </figure>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function PostRow({ post }: { post: Post }) {
  return (
    <li className="grid grid-cols-[3rem_4.5rem_1fr] items-start border-b border-border py-5">
      <span className={`${MONO_LABEL} pt-1 font-normal text-muted`}>{post.rank}</span>
      <Votes score={post.score} />
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span
            aria-label={`Posted by ${post.user}`}
            className="inline-flex h-[22px] w-6 items-center justify-center rounded-sm border border-foreground font-mono text-[10px] font-bold uppercase tracking-[0.04em]"
          >
            {post.user}
          </span>
          <span className={`${MONO_NOTE} font-bold text-foreground`}>{post.subreddit}</span>
          <span className={`${MONO_NOTE} text-muted`}>
            {post.age} <span aria-hidden="true">·</span> {post.comments}
            {post.kind ? (
              <>
                {" "}
                <span aria-hidden="true">·</span> {post.kind}
              </>
            ) : null}
          </span>
        </p>
        <h2 className="mt-2.5 max-w-[32ch] font-sans text-[1.625rem] leading-[1.04] font-extrabold tracking-[-0.03em] text-pretty">
          <a href="#post" className="transition-colors hover:text-muted">
            {post.title}
          </a>
        </h2>
      </div>
    </li>
  );
}

/** Two outline triangles around a bold count. Static: the page is a snapshot. */
function Votes({ score }: { score: string }) {
  return (
    <div className="flex flex-col items-start gap-1 pt-0.5" aria-label={`${score} points`}>
      <Triangle direction="up" />
      <span className="font-sans text-xl leading-none font-extrabold tracking-[-0.02em]">{score}</span>
      <Triangle direction="down" />
    </div>
  );
}

function Triangle({ direction }: { direction: "up" | "down" }) {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true" className="text-foreground">
      <path
        d={direction === "up" ? "M8 1.5 14.5 10.5H1.5Z" : "M8 10.5 1.5 1.5H14.5Z"}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
