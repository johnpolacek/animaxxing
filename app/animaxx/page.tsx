import type { Metadata } from "next";
import { INSTALL, PROMPTS, SKILLS_REPO } from "./content";
import { Headline } from "./Headline";
import { Reveal } from "./Reveal";
import { Terminal } from "./Terminal";

export const metadata: Metadata = {
  title: "Get Animaxxed — Animaxxing",
  description: "Install the agent skills and have your agents animate the shit out of your website.",
};

const SHOUT = "font-sans text-statement font-extrabold uppercase";
const GITHUB =
  "inline-flex items-center gap-4 rounded-lg border-2 border-foreground px-6 py-4 font-sans text-2xl font-extrabold uppercase tracking-[-0.02em] text-foreground transition-colors hover:bg-inverse hover:text-inverse-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus sm:px-8 sm:py-5 sm:text-4xl";

/*
 * The headline scatters in and hums; the headings scatter in as they are
 * scrolled to; every command and prompt lives in a panel that resolves out
 * of a grid of dots.
 */
export default function GetAnimaxxed() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="px-gutter pt-10 pb-24 sm:px-gutter-lg">
        <div className="mx-auto w-full max-w-7xl [container-type:inline-size]">
          <Headline>Get Animaxxed</Headline>

          <Reveal as="h2" effect="scatter" delay={1.3} className={`${SHOUT} mt-20`}>
            Grab the skills&hellip;
          </Reveal>
          <Terminal label="Terminal" text={INSTALL} delay={1.5} className="mt-8" />

          <Reveal as="h2" effect="scatter" delay={2.6} className={`${SHOUT} mt-28 max-w-[22ch]`}>
            Then have your agents animate the shit out of your website
          </Reveal>
          <div className="mt-10 grid auto-rows-fr gap-6 lg:grid-cols-2">
            {PROMPTS.map((prompt, i) => (
              <Terminal key={prompt.label} label={prompt.label} text={prompt.text} delay={2.9 + i * 0.15} />
            ))}
          </div>

          <Reveal effect="rise" delay={3.4} className="mt-20">
            <a href={SKILLS_REPO} className={GITHUB}>
              <GitHubMark />
              Read the skills on GitHub
            </a>
          </Reveal>
        </div>
      </section>
    </main>
  );
}

function GitHubMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-8 w-8 shrink-0 fill-current sm:h-10 sm:w-10">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
