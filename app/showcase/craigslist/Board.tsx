import {
  CHAPTERS,
  CITY,
  FOOTER_LINKS,
  HEADLINE,
  LEAD,
  PHOTO,
  REGIONS,
  SECTIONS,
  TODAY,
  type Section,
} from "./content";

/*
 * The board, animaxxed. Chapter 01.
 *
 * Layout: a sticky strip of chrome (wordmark, city, date, the account chips),
 * then a narrow rail of the four chapters set vertically along the left edge
 * and the chapter itself beside it. Inside the chapter, the headline takes
 * eight columns at poster scale with the two actions and a narrow lead below
 * it, and the photograph takes the other four, cropped hard at the gutter.
 * Under the rule, the nine sections sit in nine columns, each a numbered
 * list with a chip for the rest of it. A strip of the Bay's sub-regions
 * closes the page.
 *
 * This is the settled state of the page: no motion beyond the route
 * transition it shares with every other page.
 */

const MONO_LABEL = "font-mono text-caption font-bold uppercase tracking-[0.08em]";
const MONO_NOTE = "font-mono text-annotation uppercase tracking-[0.12em]";

const CHIP =
  "inline-flex h-8 items-center rounded-md border-2 px-3 font-mono text-annotation font-bold uppercase tracking-[0.08em] transition-colors";
const CHIP_OUTLINE = `${CHIP} border-foreground text-foreground hover:bg-surface-hover`;

const BUTTON =
  "inline-flex h-14 items-center rounded-lg px-6 font-sans text-[1.75rem] font-extrabold uppercase leading-none tracking-[-0.02em] transition-colors sm:h-[4.5rem] sm:px-8 sm:text-4xl";
const BUTTON_SOLID = `${BUTTON} bg-inverse text-inverse-foreground hover:bg-inverse-hover`;
const BUTTON_OUTLINE = `${BUTTON} border-2 border-foreground text-foreground hover:bg-surface-hover`;

const DISPLAY =
  "font-sans font-extrabold uppercase leading-[0.84] tracking-[-0.045em] [font-kerning:none]";

const RAIL_LINK = `${MONO_LABEL} inline-flex items-center gap-3 transition-colors lg:[writing-mode:vertical-rl] lg:rotate-180`;

const CURRENT = CHAPTERS[0];

export function Board() {
  return (
    <div>
      {/* The chrome */}
      <header
        data-page-transition
        className="sticky top-0 z-30 -mx-gutter border-b border-border bg-canvas px-gutter sm:-mx-gutter-lg sm:px-gutter-lg"
      >
        <div className="flex min-h-14 items-center gap-x-4 py-2">
          <p className={`${MONO_LABEL} shrink-0 text-foreground`}>The List</p>
          <span aria-hidden="true" className="h-4 w-px bg-border" />
          <p className={`${MONO_LABEL} font-medium text-muted`}>{CITY}</p>
          <div className="ml-auto flex items-center gap-x-6">
            <p className={`${MONO_LABEL} hidden font-medium text-muted sm:block`}>{TODAY}</p>
            <nav aria-label="Account" className="flex gap-2">
              <a href="#top" className={CHIP_OUTLINE}>
                Faves
              </a>
              <a href="#top" className={CHIP_OUTLINE}>
                Account
              </a>
            </nav>
          </div>
        </div>
      </header>

      <div className="mt-8 grid grid-cols-1 gap-x-6 lg:grid-cols-[2rem_minmax(0,1fr)]">
        {/* The rail: numbered chapters, set vertically along the left edge */}
        <nav aria-label="Chapters" data-page-transition className="lg:sticky lg:top-24 lg:self-start">
          <ol className="flex flex-wrap gap-x-6 gap-y-2 lg:mt-10 lg:flex-col lg:items-start lg:gap-10">
            {CHAPTERS.map((chapter) => {
              const active = chapter.id === CURRENT.id;
              return (
                <li key={chapter.id}>
                  <a
                    href={`#${chapter.id}`}
                    aria-current={active ? "page" : undefined}
                    className={
                      active
                        ? `${RAIL_LINK} text-foreground`
                        : `${RAIL_LINK} text-muted hover:text-foreground`
                    }
                  >
                    <span>
                      {chapter.number} {chapter.title}
                    </span>
                    {active ? (
                      <span aria-hidden="true" className="block size-2 bg-foreground" />
                    ) : null}
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* The chapter */}
        <section id={CURRENT.id} className="mt-8 scroll-mt-24 lg:mt-0 @container">
          <div className="grid grid-cols-12 gap-x-6 gap-y-8 border-b border-border pb-10">
            <div className="col-span-12 flex flex-col gap-10 xl:col-span-8">
              <div data-page-transition>
                <p className={`${MONO_LABEL} font-medium text-muted`}>
                  {CURRENT.number} <span aria-hidden="true">/</span> {CURRENT.title}
                </p>
                <h1
                  className={`${DISPLAY} mt-5 -ml-[0.04em] text-[clamp(3.25rem,10.5cqi,7.5rem)] text-balance`}
                >
                  {HEADLINE.map((line, index) => (
                    <span key={line} className="block">
                      {line}
                      {index < HEADLINE.length - 1 ? " " : null}
                    </span>
                  ))}
                </h1>
              </div>
              <div
                data-page-transition
                className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between"
              >
                <div className="flex flex-wrap gap-3">
                  <a href="#post" className={BUTTON_SOLID}>
                    Post an ad
                  </a>
                  <a href="#listings" className={BUTTON_OUTLINE}>
                    Search
                  </a>
                </div>
                <p className="max-w-[34ch] font-sans text-[13px] leading-[19px] font-medium text-muted text-pretty">
                  {LEAD}
                </p>
              </div>
            </div>

            {/* The photograph, cropped hard at the gutter */}
            <figure
              data-page-transition
              className="col-span-12 flex flex-col -mr-gutter sm:-mr-gutter-lg xl:col-span-4 xl:border-l xl:border-border"
            >
              <div className="relative aspect-[4/3] max-h-[28rem] min-h-[16rem] overflow-hidden sm:aspect-[16/9] xl:aspect-auto xl:max-h-none xl:flex-1">
                {/* Wikimedia Commons serves this; next/image would need the host allow-listed for no gain here. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={PHOTO.src}
                  alt={PHOTO.alt}
                  loading="eager"
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 h-full w-full object-cover object-[35%_50%] grayscale contrast-150"
                />
              </div>
              <figcaption className={`${MONO_NOTE} mt-3 pr-gutter text-muted sm:pr-gutter-lg`}>
                {PHOTO.caption} <span aria-hidden="true">·</span>{" "}
                <a
                  href={PHOTO.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-1 underline-offset-4 transition-colors hover:text-foreground"
                >
                  {PHOTO.credit}
                </a>{" "}
                <span aria-hidden="true">·</span>{" "}
                <a
                  href={PHOTO.licenseUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-1 underline-offset-4 transition-colors hover:text-foreground"
                >
                  {PHOTO.license}
                </a>
              </figcaption>
            </figure>
          </div>

          {/* The sections */}
          <ol
            data-page-transition
            aria-label="Sections"
            className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9"
          >
            {SECTIONS.map((section, index) => (
              <SectionColumn key={section.id} section={section} number={index + 1} />
            ))}
          </ol>

          {/* The sub-regions */}
          <footer
            data-page-transition
            className="mt-12 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t border-border pt-4"
          >
            <nav aria-label="Sub-region">
              <ul className="flex flex-wrap gap-x-6 gap-y-2">
                {REGIONS.map((region, index) => (
                  <li key={region.code}>
                    <a
                      href="#top"
                      title={region.name}
                      aria-current={index === 0 ? "true" : undefined}
                      className={
                        index === 0
                          ? `${MONO_LABEL} text-foreground`
                          : `${MONO_LABEL} font-medium text-muted transition-colors hover:text-foreground`
                      }
                    >
                      {region.code}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {FOOTER_LINKS.map((link) => (
                <li key={link}>
                  <a
                    href="#top"
                    className={`${MONO_LABEL} font-medium text-muted transition-colors hover:text-foreground`}
                  >
                    {link}
                  </a>
                </li>
              ))}
              <li className={`${MONO_LABEL} font-medium text-muted`}>
                Ch. {CURRENT.number} <span aria-hidden="true">/</span>{" "}
                {String(CHAPTERS.length).padStart(2, "0")}
              </li>
            </ul>
          </footer>
        </section>
      </div>
    </div>
  );
}

function SectionColumn({ section, number }: { section: Section; number: number }) {
  const shown = section.subcategories.slice(0, section.shown);
  const total = section.subcategories.length;
  return (
    <li className="flex flex-col items-start gap-2.5 [&>ul]:mb-1">
      <span className={`${MONO_LABEL} font-medium text-muted`}>
        {String(number).padStart(2, "0")}
      </span>
      <h2 className="font-sans text-xl leading-6 font-extrabold uppercase tracking-[-0.04em]">
        <a href="#listings" className="transition-colors hover:text-muted">
          {section.title}
        </a>
      </h2>
      <ul className="flex flex-col">
        {shown.map((name) => (
          <li key={name}>
            <a
              href="#listings"
              className="block font-sans text-[13px] leading-[18px] font-medium text-muted text-pretty transition-colors hover:text-foreground"
            >
              {name}
            </a>
          </li>
        ))}
      </ul>
      <a href="#listings" className={`${CHIP_OUTLINE} mt-auto`}>
        {total > shown.length ? `All ${total}` : "All"}
      </a>
    </li>
  );
}
