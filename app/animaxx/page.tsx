import type { Metadata } from "next";
import { Annotation, BodyCopy, Label, Statement } from "@/components/ui";
import { AESTHETICS, PROMPTS } from "./aesthetics";
import { AestheticRow } from "./AestheticRow";
import { CommandBlock } from "./CommandBlock";

export const metadata: Metadata = {
  title: "Get Animaxxed — Animaxxing",
  description: "Have us animaxx your site, or install the agent skills and do it yourself.",
};

/** Where "Contact us" goes. */
const CONTACT_HREF = "mailto:";
const SKILLS_REPO = "https://github.com/johnpolacek/animaxxing-skills";
const INSTALL =
  "npx skills add https://github.com/greensock/gsap-skills && npx skills add https://github.com/johnpolacek/animaxxing-skills";

const HEADING = "mt-16 block border-t border-border pt-6 text-foreground";
const BUTTON_BASE =
  "inline-flex cursor-pointer items-center rounded-lg px-6 py-3 font-sans text-4xl font-extrabold uppercase tracking-[-0.02em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus sm:px-8 sm:py-4 sm:text-5xl";
const BUTTON_SOLID = `${BUTTON_BASE} bg-inverse text-inverse-foreground hover:bg-inverse-hover`;
const BUTTON_OUTLINE = `${BUTTON_BASE} border-2 border-foreground text-foreground hover:bg-surface-hover`;

/*
 * Two ways in. Have us do it, or install the skills and tell your own agent.
 * The command and prompt blocks draw themselves out of particles; everything
 * else takes part in the route transition as a standard item.
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
            Have us do it, or do it yourself.
          </Annotation>

          <Label as="h2" data-page-transition className={HEADING}>
            01 · Contact us
          </Label>
          <BodyCopy as="p" data-page-transition className="mt-6 text-muted">
            Tell us about your site. We animate the shit out of it.
          </BodyCopy>
          <div data-page-transition className="mt-8">
            <a href={CONTACT_HREF} className={BUTTON_SOLID}>
              Contact us
            </a>
          </div>

          <Label as="h2" data-page-transition className={HEADING}>
            02 · Do it yourself
          </Label>
          <BodyCopy as="p" data-page-transition className="mt-6 text-muted">
            Install the skills. Your agent does the rest.
          </BodyCopy>
          <div className="mt-8 [container-type:inline-size]">
            <CommandBlock index={0} label="Terminal" command={INSTALL} />
          </div>
          <ul className="mt-10" aria-label="Aesthetics">
            {AESTHETICS.map((aesthetic, index) => (
              <AestheticRow key={aesthetic.slug} aesthetic={aesthetic} index={index} />
            ))}
          </ul>

          <Label as="h2" data-page-transition className={HEADING}>
            03 · Say the word
          </Label>
          <BodyCopy as="p" data-page-transition className="mt-6 text-muted">
            Open your agent in the project and paste one of these.
          </BodyCopy>
          <div className="mt-8 flex flex-col gap-6 [container-type:inline-size]">
            {PROMPTS.map((prompt, index) => (
              <CommandBlock key={prompt.label} index={index + 1} label={prompt.label} command={prompt.text} />
            ))}
          </div>
          <div data-page-transition className="mt-12">
            <a href={SKILLS_REPO} className={BUTTON_OUTLINE}>
              Read the skills →
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
