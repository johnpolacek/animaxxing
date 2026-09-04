import type { Metadata } from "next";
import { Annotation, BodyCopy, Label, Statement } from "@/components/ui";
import { AESTHETICS } from "./aesthetics";
import { AestheticRow } from "./AestheticRow";
import { CommandBlock } from "./CommandBlock";

export const metadata: Metadata = {
  title: "Get Animaxxed — Animaxxing",
  description: "Install the Animaxxing agent skills and animate the shit out of your site.",
};

const SKILLS_REPO = "https://github.com/johnpolacek/animaxxing-skills";

const BUTTON =
  "inline-flex cursor-pointer items-center rounded-lg border-2 border-foreground px-6 py-3 font-sans text-4xl font-extrabold uppercase tracking-[-0.02em] text-foreground transition-colors hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus sm:px-8 sm:py-4 sm:text-5xl";

/*
 * The install page. Three numbered steps: put the skills in, pick a look,
 * and tell the agent. The command blocks draw themselves out of particles;
 * everything else takes part in the route transition as a standard item.
 */
export default function GetAnimaxxed() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="px-gutter pt-10 pb-16 sm:px-gutter-lg">
        <div className="mx-auto w-full max-w-7xl">
          <Statement as="h1" data-page-transition="letters">
            Get Animaxxed
          </Statement>
          <Annotation as="p" data-page-transition="letters-sides" className="mt-6 max-w-none!">
            Install the skills. Tell your agent to animate the shit out of it.
          </Annotation>

          <Label as="h2" data-page-transition className="mt-16 block border-t border-border pt-6 text-foreground">
            01 · Install
          </Label>
          <div className="mt-6 flex flex-col gap-6 [container-type:inline-size]">
            <CommandBlock index={0} label="Terminal" command="npx skills add https://github.com/greensock/gsap-skills" />
            <CommandBlock index={1} label="Terminal" command="npx skills add https://github.com/johnpolacek/animaxxing-skills" />
          </div>
          <Annotation as="p" data-page-transition className="mt-8">
            Claude Code takes the marketplace instead.
          </Annotation>
          <div className="mt-6 [container-type:inline-size]">
            <CommandBlock index={2} label="Claude Code" command="/plugin marketplace add johnpolacek/animaxxing-skills" />
          </div>

          <Label as="h2" data-page-transition className="mt-16 block border-t border-border pt-6 text-foreground">
            02 · Pick your aesthetic
          </Label>
          <ul className="mt-6" aria-label="Aesthetics">
            {AESTHETICS.map((aesthetic, index) => (
              <AestheticRow key={aesthetic.slug} aesthetic={aesthetic} index={index} />
            ))}
          </ul>

          <Label as="h2" data-page-transition className="mt-16 block border-t border-border pt-6 text-foreground">
            03 · Say the word
          </Label>
          <BodyCopy as="p" className="mt-6 text-muted" data-page-transition>
            Open your agent in the project and say &ldquo;animaxx it.&rdquo; The framework skill runs
            the lifecycle. The aesthetic decides how it looks.
          </BodyCopy>
          <div data-page-transition className="mt-10">
            <a href={SKILLS_REPO} className={BUTTON}>
              Read the skills →
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
