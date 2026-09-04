import {
  ACTIONS,
  CHAPTERS,
  FILES,
  LATEST,
  LINKS,
  NAV,
  REPO,
  STATS,
  TOPICS,
  type File,
} from "./content";

/*
 * The repository page, animaxxed. Chapter 01, the overview.
 *
 * Layout: a sticky strip of chrome (wordmark, breadcrumb, the site links),
 * then a twelve-column grid with a rail of the four chapters in two columns
 * and the chapter itself in the other ten. Inside the chapter, the repo's
 * name is set at poster scale with the description and topics beside it in a
 * narrow measure, a row of chunky actions, then the file listing in eight
 * columns and the latest commit, the numbers, and the project links in the
 * other four.
 *
 * This is the settled state of the page: no motion beyond the route
 * transition it shares with every other page.
 */

const MONO_LABEL = "font-mono text-caption font-bold uppercase tracking-[0.08em]";
const MONO_NOTE = "font-mono text-annotation uppercase tracking-[0.08em]";

const CHIP =
  "inline-flex h-7 items-center rounded-md border-2 border-foreground px-2.5 font-mono text-caption font-bold uppercase tracking-[0.08em] text-foreground transition-colors hover:bg-surface-hover";

const BUTTON =
  "inline-flex h-14 items-center gap-3.5 rounded-lg px-6 font-sans text-[1.75rem] font-extrabold uppercase leading-none tracking-[-0.02em] transition-colors";
const BUTTON_SOLID = `${BUTTON} bg-inverse text-inverse-foreground hover:bg-inverse-hover`;
const BUTTON_OUTLINE = `${BUTTON} border-2 border-foreground text-foreground hover:bg-surface-hover`;

const RAIL_LINK = `${MONO_LABEL} flex h-9 items-center gap-4 rounded-md px-3 transition-colors`;

const DISPLAY =
  "font-sans font-extrabold uppercase leading-[0.84] tracking-[-0.045em] [font-kerning:none]";

const ROW = "grid grid-cols-[1fr_5rem] items-center gap-x-6 border-b border-border font-mono text-[13px] leading-4 sm:grid-cols-[14rem_1fr_5rem]";

const CURRENT = CHAPTERS[0];

export function Repo() {
  return (
    <div className="@container">
      {/* The chrome */}
      <header
        data-page-transition
        className="sticky top-0 z-30 -mx-gutter border-b border-border bg-canvas px-gutter sm:-mx-gutter-lg sm:px-gutter-lg"
      >
        <div className="flex min-h-14 items-center gap-x-8 py-2">
          <p className="shrink-0 font-mono text-base font-extrabold uppercase tracking-[0.24em] text-foreground">
            Repo
          </p>
          <p className={`${MONO_LABEL} hidden min-w-0 items-center gap-x-3 font-normal text-muted sm:flex`}>
            <span className="text-foreground">{REPO.owner}</span>
            <span aria-hidden="true">/</span>
            <span className="text-foreground">{REPO.name}</span>
            <span className="ml-2">{REPO.visibility}</span>
          </p>
          <nav aria-label="Site" className="ml-auto flex items-center gap-x-7">
            {NAV.map((link) => (
              <a
                key={link.label}
                href="#top"
                className={`${MONO_LABEL} whitespace-nowrap text-foreground transition-colors hover:text-muted`}
              >
                {link.label}
                {"count" in link ? <span className="ml-2 font-normal text-muted">{link.count}</span> : null}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <div className="mt-8 grid grid-cols-12 gap-x-6">
        {/* The rail */}
        <nav aria-label="Chapters" data-page-transition className="col-span-12 lg:col-span-2">
          <ol className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-0">
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
          <div data-page-transition className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-border pb-3">
            <p className={`${MONO_LABEL} text-foreground`}>
              {CURRENT.number}{" "}
              <span className="ml-1 font-normal">{CURRENT.title}</span>
            </p>
            <p className={`${MONO_NOTE} ml-auto text-muted`}>
              {REPO.branch} <span aria-hidden="true">·</span> {REPO.branches}{" "}
              <span aria-hidden="true">·</span> {REPO.tags} <span aria-hidden="true">·</span>{" "}
              {REPO.commits}
            </p>
          </div>

          {/* The name, at poster scale, with the description beside it */}
          <div className="grid grid-cols-12 items-end gap-x-6 pt-6 pb-7">
            <h1
              data-page-transition="letters"
              className={`${DISPLAY} col-span-12 -ml-[0.04em] text-[clamp(4rem,13cqi,11.5rem)] lg:col-span-9`}
            >
              {REPO.name}
            </h1>
            <div data-page-transition className="col-span-12 mt-6 flex flex-col gap-4 pb-2 lg:col-span-3 lg:mt-0">
              <p className="max-w-[30ch] font-sans text-lead tracking-[-0.01em] text-pretty">
                {REPO.description}
              </p>
              <ul aria-label="Topics" className="flex flex-wrap gap-2">
                {TOPICS.map((topic) => (
                  <li key={topic}>
                    <a href="#top" className={CHIP}>
                      {topic}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* The actions */}
          <div data-page-transition className="flex flex-wrap items-center gap-3 border-b border-border pb-7">
            {ACTIONS.map((action) => (
              <a
                key={action.label}
                href="#top"
                className={"solid" in action ? BUTTON_SOLID : BUTTON_OUTLINE}
              >
                {action.label}
                {"count" in action ? (
                  <span className="font-mono text-[13px] font-bold tracking-[0.08em]">{action.count}</span>
                ) : null}
              </a>
            ))}
            <a
              href="#top"
              className={`${MONO_NOTE} ml-auto text-foreground transition-colors hover:text-muted`}
            >
              {REPO.site} <span aria-hidden="true">↗</span>
            </a>
          </div>

          <div className="grid grid-cols-12 gap-x-6 gap-y-10 pt-6">
            {/* The files */}
            <div data-page-transition className="col-span-12 lg:col-span-8">
              <div className={`${ROW} h-8 border-foreground`}>
                <span className={`${MONO_NOTE} text-muted`}>Name</span>
                <span className={`${MONO_NOTE} hidden text-muted sm:block`}>Last commit</span>
                <span className={`${MONO_NOTE} text-right text-muted`}>Date</span>
              </div>
              <ul aria-label="Files">
                {FILES.map((file) => (
                  <FileRow key={file.name} file={file} />
                ))}
              </ul>
            </div>

            {/* The latest commit, the numbers, and the links */}
            <aside data-page-transition className="col-span-12 lg:col-span-4">
              <p className={`${MONO_NOTE} flex h-8 items-center border-b border-foreground text-muted`}>
                Latest commit
              </p>
              <div className="flex items-center gap-3.5 border-b border-border py-3.5">
                <span
                  aria-label={`Committed by ${LATEST.author}`}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-foreground font-mono text-caption font-bold uppercase tracking-[0.04em]"
                >
                  {LATEST.user}
                </span>
                <div className="flex min-w-0 flex-col gap-1">
                  <p className="font-sans text-body font-extrabold leading-[1.125] tracking-[-0.01em]">
                    {LATEST.message}
                  </p>
                  <p className={`${MONO_NOTE} text-muted`}>
                    {LATEST.sha} <span aria-hidden="true">·</span> {LATEST.age}
                  </p>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-x-6">
                {STATS.map((stat) => (
                  <div key={stat.label} className="flex flex-col gap-1.5 border-b border-border pt-3.5 pb-4">
                    <dd className="order-1 font-sans text-[2.75rem] font-extrabold leading-[0.9] tracking-[-0.04em]">
                      {stat.value}
                    </dd>
                    <dt className={`${MONO_NOTE} order-2 text-muted`}>{stat.label}</dt>
                  </div>
                ))}
              </dl>

              <ul aria-label="Project">
                {LINKS.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className={`${MONO_LABEL} flex h-8 items-center justify-between border-b border-border font-normal text-foreground transition-colors hover:text-muted`}
                    >
                      <span>{link.label}</span>
                      <span aria-hidden="true" className="text-muted">
                        {link.note}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
}

function FileRow({ file }: { file: File }) {
  return (
    <li className={`${ROW} h-8`}>
      <a href="#top" className="truncate text-foreground transition-colors hover:text-muted">
        {file.name}
        {file.kind === "dir" ? <span aria-hidden="true">/</span> : null}
      </a>
      <span className="hidden truncate text-muted sm:block">{file.message}</span>
      <span className={`${MONO_NOTE} text-right text-muted`}>{file.age}</span>
    </li>
  );
}
